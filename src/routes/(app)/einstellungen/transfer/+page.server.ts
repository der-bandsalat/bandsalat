import { error, fail } from '@sveltejs/kit';
import { createCassette, distinctSerien, listCassettes } from '$lib/server/db/cassettes';
import { ALL_COLUMNS, parseSpreadsheet, toCsv, toXlsx } from '$lib/server/export/full';
import { autoMap, mapRow, TARGET_FIELDS } from '$lib/server/export/import-mapper';
import { MEDIA_FORMATS } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { ensureEditor } from '$lib/server/auth/guard';

export const load: PageServerLoad = () => {
	return {
		serien: distinctSerien(),
		formats: MEDIA_FORMATS,
		columns: ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
		targetFields: TARGET_FIELDS
	};
};

function pickColumns(form: FormData) {
	const picked = ALL_COLUMNS.filter((c) => form.get(`col_${c.key}`) === 'on');
	return picked.length > 0 ? picked : ALL_COLUMNS;
}

function filterRows(form: FormData) {
	const serie = String(form.get('serie') ?? '').trim();
	const format = String(form.get('format') ?? '').trim();
	const all = listCassettes();
	return all.filter((c) => {
		if (serie && c.serie !== serie) return false;
		if (format && c.format !== format) return false;
		return true;
	});
}

export const actions: Actions = {
	parseUpload: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { stage: 'upload', importError: 'Bitte Datei auswählen.' });
		}
		if (file.size > 20 * 1024 * 1024) {
			return fail(400, { stage: 'upload', importError: 'Datei zu groß (>20 MiB).' });
		}
		const buf = Buffer.from(await file.arrayBuffer());
		let rows: string[][];
		try {
			rows = parseSpreadsheet(buf, file.name);
		} catch (e) {
			return fail(400, {
				stage: 'upload',
				importError: e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden.'
			});
		}
		if (rows.length === 0) {
			return fail(400, { stage: 'upload', importError: 'Keine Zeilen gefunden.' });
		}
		const headers = rows[0].map((h) => h.trim());
		const dataRows = rows.slice(1);
		const mapping = autoMap(headers);
		// Datei + Header + Daten ins Form-State zurückgeben, damit Schritt 2
		// auf dem Client mit den gleichen Rows arbeitet (kein Re-Upload nötig).
		return {
			stage: 'map' as const,
			filename: file.name,
			headers,
			previewRows: dataRows.slice(0, 5),
			allRows: dataRows,
			mapping
		};
	},

	import: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const rowsJson = String(form.get('allRows') ?? '');
		const headersJson = String(form.get('headers') ?? '');
		let rows: string[][];
		let headers: string[];
		try {
			rows = JSON.parse(rowsJson);
			headers = JSON.parse(headersJson);
		} catch {
			return fail(400, { importError: 'Interne Daten verloren — bitte Datei neu hochladen.' });
		}

		const mapping: Record<string, string> = {};
		for (const h of headers) {
			const v = form.get(`map_${h}`);
			mapping[h] = typeof v === 'string' ? v : '';
		}

		// Pflichtfelder prüfen.
		const mapped = Object.values(mapping);
		if (!mapped.includes('serie') || !mapped.includes('titel')) {
			return fail(400, {
				stage: 'map' as const,
				filename: String(form.get('filename') ?? ''),
				headers,
				previewRows: rows.slice(0, 5),
				allRows: rows,
				mapping,
				importError: 'Bitte mindestens "Serie" und "Titel" zuordnen.'
			});
		}

		const skipDuplicates = form.get('skipDuplicates') === 'on';
		const existing = listCassettes();
		const knownReleaseIds = new Set(
			existing.map((c) => c.discogsReleaseId).filter((n): n is number => n != null)
		);
		const knownSerieFolge = new Set(
			existing.map((c) => `${c.serie.toLowerCase()}|${c.folgeNr ?? ''}`)
		);

		let imported = 0;
		let skipped = 0;
		let errors = 0;
		const errorLines: { line: number; msg: string }[] = [];

		for (let i = 0; i < rows.length; i++) {
			const { draft, error: e } = mapRow(rows[i], headers, mapping);
			if (e || !draft) {
				errors++;
				if (errorLines.length < 20) errorLines.push({ line: i + 2, msg: e ?? 'unbekannt' });
				continue;
			}
			if (skipDuplicates) {
				if (draft.discogsReleaseId && knownReleaseIds.has(draft.discogsReleaseId)) {
					skipped++;
					continue;
				}
				const key = `${draft.serie.toLowerCase()}|${draft.folgeNr ?? ''}`;
				if (knownSerieFolge.has(key)) {
					skipped++;
					continue;
				}
			}
			try {
				createCassette({
					serie: draft.serie,
					titel: draft.titel,
					folgeNr: draft.folgeNr,
					folgeNrLabel: draft.folgeNrLabel,
					format: draft.format,
					label: draft.label,
					auflageVariante: draft.auflageVariante,
					jahr: draft.jahr,
					seriennummer: draft.seriennummer,
					zustandMc: draft.zustandMc,
					zustandHuelle: draft.zustandHuelle,
					originalhuelle: draft.originalhuelle,
					vollstaendig: draft.vollstaendig,
					kaufdatum: draft.kaufdatum,
					kaufpreisCent: draft.kaufpreisCent,
					kaufort: draft.kaufort,
					folder: draft.folder,
					rating: draft.rating,
					review: draft.review,
					notiz: draft.notiz,
					discogsReleaseId: draft.discogsReleaseId,
					discogsUrl: draft.discogsUrl,
					discogsCoverUrl: draft.discogsCoverUrl,
					discogsCoverCachePath: null,
					coverFotoPath: null,
					auflageId: null
				});
				imported++;
				if (draft.discogsReleaseId) knownReleaseIds.add(draft.discogsReleaseId);
				knownSerieFolge.add(`${draft.serie.toLowerCase()}|${draft.folgeNr ?? ''}`);
			} catch (err) {
				errors++;
				if (errorLines.length < 20)
					errorLines.push({
						line: i + 2,
						msg: err instanceof Error ? err.message : 'create fehlgeschlagen'
					});
			}
		}

		return {
			stage: 'done' as const,
			summary: { imported, skipped, errors, total: rows.length, errorLines }
		};
	}
};

/** Download-Endpunkte werden als +server.ts in Sub-Pfaden gemacht — siehe ./csv und ./xlsx */
export function _exportHelpers(form: FormData) {
	const columns = pickColumns(form);
	const rows = filterRows(form);
	return { columns, rows };
}

export const _export = { pickColumns, filterRows, toCsv, toXlsx };

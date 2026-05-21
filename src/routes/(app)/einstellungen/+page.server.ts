import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { createCassette, listCassettes } from '$lib/server/db/cassettes';
import { parseCsv } from '$lib/server/export/csv';
import { CassetteFormSchema } from '$lib/validation/cassette';
import {
	MEDIA_GRADES,
	SLEEVE_GRADES,
	type MediaGrade,
	type SleeveGrade
} from '$lib/server/db/schema';
import { env } from '$lib/server/env';
import { getDiscogsToken, getDiscogsUsername } from '$lib/server/settings';
import { getCachedFolderName } from '$lib/server/discogs/collection';
import { ensureEditor } from '$lib/server/auth/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const items = listCassettes();
	return {
		total: items.length,
		dataDir: env().DATA_DIR,
		folderName: getCachedFolderName(),
		hasDiscogs: Boolean(getDiscogsToken() && getDiscogsUsername()),
		me: locals.user
	};
};

const ImportRowSchema = z.object({
	release_id: z
		.string()
		.transform((s) => Number.parseInt(s, 10))
		.refine((n) => Number.isInteger(n) && n > 0, 'release_id ist Pflicht'),
	Artist: z.string().optional(),
	Title: z.string().optional(),
	Label: z.string().optional(),
	Released: z.string().optional(),
	'Collection Media Condition': z.string().optional(),
	'Collection Sleeve Condition': z.string().optional(),
	'Collection Notes': z.string().optional(),
	'Date Added': z.string().optional()
});

function asMediaGrade(v: string | undefined): MediaGrade | null {
	if (!v) return null;
	return (MEDIA_GRADES as readonly string[]).includes(v) ? (v as MediaGrade) : null;
}
function asSleeveGrade(v: string | undefined): SleeveGrade | null {
	if (!v) return null;
	return (SLEEVE_GRADES as readonly string[]).includes(v) ? (v as SleeveGrade) : null;
}
function asYear(v: string | undefined): number | null {
	if (!v) return null;
	const n = Number.parseInt(v.slice(0, 4), 10);
	return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
}
function asDate(v: string | undefined): string | null {
	if (!v) return null;
	const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return m ? m[0] : null;
}

export const actions: Actions = {
	importCsv: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { importError: 'Bitte CSV-Datei hochladen.' });
		}
		if (file.size > 10 * 1024 * 1024) {
			return fail(400, { importError: 'Datei zu groß (>10 MiB).' });
		}
		const text = await file.text();
		const rows = parseCsv(text);
		if (rows.length === 0) {
			return fail(400, { importError: 'Keine Zeilen gefunden.' });
		}

		const existing = listCassettes();
		const known = new Set(existing.map((c) => c.discogsReleaseId).filter(Boolean));

		let imported = 0;
		let skipped = 0;
		let errors = 0;
		const errorLines: { line: number; msg: string }[] = [];

		for (let i = 0; i < rows.length; i++) {
			const raw = rows[i];
			const parsed = ImportRowSchema.safeParse(raw);
			if (!parsed.success) {
				errors++;
				if (errorLines.length < 10)
					errorLines.push({ line: i + 2, msg: parsed.error.issues[0]?.message ?? 'invalid' });
				continue;
			}
			const r = parsed.data;
			if (known.has(r.release_id)) {
				skipped++;
				continue;
			}
			const form = {
				serie: r.Artist ?? 'Unbekannt',
				titel: r.Title ?? `Discogs ${r.release_id}`,
				label: r.Label ?? '',
				jahr: asYear(r.Released) ?? '',
				discogsReleaseId: r.release_id,
				discogsUrl: `https://www.discogs.com/release/${r.release_id}`,
				discogsCoverUrl: '',
				zustandMc: asMediaGrade(r['Collection Media Condition']) ?? '',
				zustandHuelle: asSleeveGrade(r['Collection Sleeve Condition']) ?? '',
				originalhuelle: 'on',
				vollstaendig: 'on',
				kaufdatum: asDate(r['Date Added']) ?? '',
				kaufpreisCent: '',
				kaufort: '',
				notiz: r['Collection Notes'] ?? '',
				seriennummer: '',
				auflageVariante: '',
				folgeNr: '',
				folgeNrLabel: ''
			};
			const v = CassetteFormSchema.safeParse(form);
			if (!v.success) {
				errors++;
				if (errorLines.length < 10)
					errorLines.push({
						line: i + 2,
						msg: v.error.issues[0]?.message ?? 'Validierung fehlgeschlagen'
					});
				continue;
			}
			createCassette(v.data);
			known.add(r.release_id);
			imported++;
		}

		return { importSummary: { imported, skipped, errors, errorLines, total: rows.length } };
	}
};

import { error, fail, redirect } from '@sveltejs/kit';
import {
	DREI_SERIE,
	addAuflage,
	deleteAuflage,
	getAllFolgenWithAuflagen,
	getFolgeAuflagenStatus,
	listAuflagen,
	updateAuflage
} from '$lib/server/db/drei-auflagen';
import { getAllSeriesTargets } from '$lib/server/db/series';
import { cacheCoverFromUrl } from '$lib/server/discogs/cover-cache';
import { isDreiAuflagenEnabled } from '$lib/server/settings';
import { getAllFolgeTitelMap, upsertFolgeCover } from '$lib/server/db/folge-cover';
import { upsertFolgeSynopsis } from '$lib/server/db/folge-synopsis';
import { fetchFolge } from '$lib/server/sources/dreimetadaten';
import type { Actions, PageServerLoad } from './$types';
import { ensureEditor } from '$lib/server/auth/guard';

export const load: PageServerLoad = ({ params }) => {
	const serie = decodeURIComponent(params.name);
	if (serie !== DREI_SERIE) {
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	}
	if (!isDreiAuflagenEnabled()) {
		throw redirect(303, '/einstellungen/sammlung');
	}
	const targets = getAllSeriesTargets();
	const target = targets.get(serie) ?? undefined;
	const folgen = getAllFolgenWithAuflagen(target);
	const titelMap = Object.fromEntries(getAllFolgeTitelMap());
	return { serie, folgen, target: target ?? null, folgeTitel: titelMap };
};

function parseFolge(form: FormData): number {
	const raw = String(form.get('folgeNr') ?? '').trim();
	const n = Number.parseInt(raw, 10);
	if (!Number.isInteger(n) || n <= 0 || n > 9999) {
		throw error(400, 'Ungültige Folgennummer.');
	}
	return n;
}

export const actions: Actions = {
	addManual: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const folgeNr = parseFolge(form);
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { auflagenError: 'Name darf nicht leer sein.' });
		const yearRaw = String(form.get('year') ?? '').trim();
		const year = yearRaw ? Number.parseInt(yearRaw, 10) : null;
		const notes = String(form.get('notes') ?? '').trim() || null;
		addAuflage(folgeNr, {
			name,
			source: 'manual',
			year: Number.isInteger(year) && year! > 1900 && year! < 2100 ? year : null,
			discogsReleaseId: null,
			coverUrl: null,
			coverCachePath: null,
			notes
		});
		throw redirect(303, `/serien/${encodeURIComponent(DREI_SERIE)}/auflagen#folge-${folgeNr}`);
	},

	addDiscogs: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const folgeNr = parseFolge(form);
		const releaseId = Number.parseInt(String(form.get('discogsReleaseId') ?? ''), 10);
		const name = String(form.get('name') ?? '').trim();
		const yearRaw = String(form.get('year') ?? '').trim();
		const coverUrl = String(form.get('coverUrl') ?? '').trim() || null;
		const discogsUrl = String(form.get('discogsUrl') ?? '').trim() || null;
		if (!Number.isInteger(releaseId) || releaseId <= 0) {
			return fail(400, { auflagenError: 'Ungültige Discogs-Release-ID.' });
		}
		if (!name) return fail(400, { auflagenError: 'Name fehlt.' });
		let coverCachePath: string | null = null;
		if (coverUrl) {
			try {
				const cached = await cacheCoverFromUrl(coverUrl, releaseId);
				coverCachePath = cached?.original ?? null;
			} catch (e) {
				console.warn('[drei-auflagen/cover]', e);
			}
		}
		addAuflage(folgeNr, {
			name,
			source: 'discogs',
			year: yearRaw ? Number.parseInt(yearRaw, 10) || null : null,
			discogsReleaseId: releaseId,
			coverUrl,
			coverCachePath,
			notes: discogsUrl
		});
		throw redirect(303, `/serien/${encodeURIComponent(DREI_SERIE)}/auflagen#folge-${folgeNr}`);
	},

	rename: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const folgeNr = parseFolge(form);
		const id = String(form.get('id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		if (!id || !name) return fail(400, { auflagenError: 'Name darf nicht leer sein.' });
		updateAuflage(folgeNr, id, { name });
		throw redirect(303, `/serien/${encodeURIComponent(DREI_SERIE)}/auflagen#folge-${folgeNr}`);
	},

	delete: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const folgeNr = parseFolge(form);
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { auflagenError: 'ID fehlt.' });
		deleteAuflage(folgeNr, id);
		throw redirect(303, `/serien/${encodeURIComponent(DREI_SERIE)}/auflagen#folge-${folgeNr}`);
	},

	/**
	 * Holt Cover + Klappentext + Titel einer Folge in einem Rutsch von
	 * dreimetadaten.de. Wird auf der Auflagen-Seite pro Folge-Karte
	 * angeboten (auch ohne dass eine Kassette dieser Folge existiert).
	 */
	fetchDreimetadaten: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const folgeNr = parseFolge(form);
		const { cover, metadata } = await fetchFolge(folgeNr);
		if (!cover && !metadata) {
			return fail(502, { auflagenError: `dreimetadaten.de lieferte nichts für Folge ${folgeNr}.` });
		}
		if (cover) {
			upsertFolgeCover({
				serie: DREI_SERIE,
				folgeNr,
				source: 'dreimetadaten',
				sourceUrl: cover.sourceUrl,
				cachePath: cover.original,
				thumbPath: cover.thumb,
				titel: metadata?.titel ?? null
			});
		}
		if (metadata?.beschreibung) {
			upsertFolgeSynopsis({
				serie: DREI_SERIE,
				folgeNr,
				text: metadata.beschreibung,
				source: 'dreimetadaten',
				sourceUrl: `https://dreimetadaten.de/data/Serie/${folgeNr.toString().padStart(3, '0')}/metadata.json`
			});
		}
		throw redirect(303, `/serien/${encodeURIComponent(DREI_SERIE)}/auflagen#folge-${folgeNr}`);
	}
};

export type FolgeAuflagenStatusSerialized = ReturnType<typeof getFolgeAuflagenStatus>;
export type ListAuflagenSerialized = ReturnType<typeof listAuflagen>;

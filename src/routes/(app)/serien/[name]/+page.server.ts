import { error, fail, redirect } from '@sveltejs/kit';
import {
	getSeriesDetail,
	setSeriesColor,
	setSeriesLogo,
	setSeriesTarget
} from '$lib/server/db/series';
import { deletePhoto } from '$lib/server/storage/photos';
import { extractDominantColor, saveLogo, saveLogoFromUrl } from '$lib/server/storage/logos';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { uploadsDir } from '$lib/server/db/client';
import { getRelease } from '$lib/server/discogs';
import { discogs, DiscogsError } from '$lib/server/discogs/client';
import { isDreiAuflagenEnabled } from '$lib/server/settings';
import { getAllFolgeCoversMap } from '$lib/server/db/folge-cover';
import { MEDIA_GRADES, SLEEVE_GRADES } from '$lib/server/db/schema';
import { getEnrichStatus, resetEnrichStatus, startSeriesEnrich } from '$lib/server/series-enrich';
import { isSupported as isDreiSupported } from '$lib/server/sources/dreimetadaten';
import { getDiscogsToken, getDiscogsUsername } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';
import { ensureEditor } from '$lib/server/auth/guard';

export const load: PageServerLoad = ({ params, url }) => {
	const name = decodeURIComponent(params.name);
	const kindParam = url.searchParams.get('kind');
	const kind = kindParam === 'folder' ? 'folder' : kindParam === 'serie' ? 'serie' : undefined;
	const detail = getSeriesDetail(name, kind);
	if (!detail) throw error(404, 'Nicht gefunden.');
	return {
		detail,
		dreiAuflagenEnabled: isDreiAuflagenEnabled(),
		folgeCovers: Object.fromEntries(getAllFolgeCoversMap()),
		mediaGrades: MEDIA_GRADES,
		sleeveGrades: SLEEVE_GRADES,
		enrichStatus: getEnrichStatus(),
		// Quellen-Verfügbarkeit für die Massenaktion-Buttons
		enrichSources: {
			dreimetadaten: isDreiSupported(name),
			discogs: Boolean(getDiscogsToken() && getDiscogsUsername())
		}
	};
};

export const actions: Actions = {
	startEnrich: async ({ request, params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const form = await request.formData();
		const synopses = form.get('synopses') === 'on';
		const covers = form.get('covers') === 'on';
		try {
			const status = startSeriesEnrich({ serie, synopses, covers });
			return { enrichStarted: true, enrichStatus: status };
		} catch (e) {
			return fail(409, {
				enrichError: e instanceof Error ? e.message : 'Massenaktion fehlgeschlagen.'
			});
		}
	},

	resetEnrich: async ({ locals }) => {
		ensureEditor(locals);
		return { enrichReset: true, enrichStatus: resetEnrichStatus() };
	},

	uploadLogo: async ({ request, params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);

		const form = await request.formData();
		const file = form.get('logo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { logoError: 'Keine Datei ausgewählt.' });
		}
		try {
			const saved = await saveLogo(file);
			if (existing.logoPath) await deletePhoto(existing.logoPath);
			setSeriesLogo(serie, saved.filename);
			if (saved.dominantColor) setSeriesColor(serie, saved.dominantColor);
		} catch (e) {
			return fail(400, {
				logoError: e instanceof Error ? e.message : 'Logo konnte nicht gespeichert werden.'
			});
		}
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	logoFromDiscogs: async ({ params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);

		// Beste Repräsentation der Serie: niedrigste Folge mit Discogs-Verknüpfung,
		// fallback auf älteste Folge nach Jahr.
		const candidates = existing.items.filter((c) => c.discogsReleaseId);
		if (candidates.length === 0) {
			return fail(400, {
				logoError: 'Keine Discogs-verknüpfte Folge in dieser Serie gefunden.'
			});
		}
		candidates.sort((a, b) => {
			const af = a.folgeNr ?? Number.MAX_SAFE_INTEGER;
			const bf = b.folgeNr ?? Number.MAX_SAFE_INTEGER;
			if (af !== bf) return af - bf;
			return (a.jahr ?? 9999) - (b.jahr ?? 9999);
		});
		const pick = candidates[0];

		try {
			const release = await getRelease(pick.discogsReleaseId!);
			let coverUrl: string | null = null;
			if (release.master_id) {
				try {
					const master = await discogs.get<{ images?: { type?: string; uri?: string }[] }>(
						`/masters/${release.master_id}`
					);
					coverUrl =
						master.images?.find((i) => i.type === 'primary')?.uri ??
						master.images?.[0]?.uri ??
						null;
				} catch (e) {
					if (!(e instanceof DiscogsError && e.status === 404))
						console.warn('[logoFromDiscogs/master]', e);
				}
			}
			if (!coverUrl) {
				coverUrl =
					release.images?.find((i) => i.type === 'primary')?.uri ??
					release.images?.[0]?.uri ??
					null;
			}
			if (!coverUrl) {
				return fail(400, { logoError: 'Kein Cover beim Discogs-Master gefunden.' });
			}

			const saved = await saveLogoFromUrl(coverUrl);
			if (!saved) {
				return fail(500, { logoError: 'Cover-Download fehlgeschlagen.' });
			}
			if (existing.logoPath) await deletePhoto(existing.logoPath);
			setSeriesLogo(serie, saved.filename);
			if (saved.dominantColor) setSeriesColor(serie, saved.dominantColor);
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					logoError: `Discogs: ${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, { logoError: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
		}
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	removeLogo: async ({ params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);
		if (existing.logoPath) await deletePhoto(existing.logoPath);
		setSeriesLogo(serie, null);
		setSeriesColor(serie, null);
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	setColor: async ({ request, params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);
		const form = await request.formData();
		const hex = String(form.get('color') ?? '')
			.trim()
			.toLowerCase();
		if (!/^#[0-9a-f]{6}$/.test(hex)) {
			return fail(400, { colorError: 'Bitte gültigen Hex-Wert (#rrggbb) angeben.' });
		}
		setSeriesColor(serie, hex);
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	autoColor: async ({ params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);
		if (!existing.logoPath) {
			return fail(400, { colorError: 'Kein Logo vorhanden — nichts zum Ableiten.' });
		}
		try {
			const buf = await readFile(join(uploadsDir(), existing.logoPath));
			const color = await extractDominantColor(buf);
			if (!color) return fail(400, { colorError: 'Konnte keine Farbe ableiten.' });
			setSeriesColor(serie, color);
		} catch (e) {
			return fail(500, {
				colorError: e instanceof Error ? e.message : 'Logo konnte nicht gelesen werden.'
			});
		}
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	clearColor: async ({ params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		setSeriesColor(serie, null);
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	setTarget: async ({ request, params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		const existing = getSeriesDetail(serie);
		if (!existing) throw error(404);
		const form = await request.formData();
		const minRaw = String(form.get('target_min') ?? '').trim();
		const maxRaw = String(form.get('target_max') ?? '').trim();
		const min = Number.parseInt(minRaw, 10);
		const max = Number.parseInt(maxRaw, 10);
		if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
			return fail(400, {
				targetError: 'Min/Max sind nicht plausibel (positiv, Min ≤ Max).'
			});
		}
		setSeriesTarget(serie, { min, max });
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	},

	clearTarget: async ({ params, locals }) => {
		ensureEditor(locals);
		const serie = decodeURIComponent(params.name);
		setSeriesTarget(serie, null);
		throw redirect(303, `/serien/${encodeURIComponent(serie)}`);
	}
};

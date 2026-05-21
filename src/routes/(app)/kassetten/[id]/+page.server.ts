import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteCassette,
	distinctFolders,
	distinctLabels,
	distinctSerien,
	getCassette,
	updateCassette
} from '$lib/server/db/cassettes';
import { deletePhoto, savePhoto } from '$lib/server/storage/photos';
import { cacheCoverFromUrl } from '$lib/server/discogs/cover-cache';
import { DiscogsError } from '$lib/server/discogs/client';
import { pullOne, pushOne, removeOne } from '$lib/server/discogs/sync';
import { addListen, deleteListen, listListens, getListenStats } from '$lib/server/db/listen-log';
import { MEDIA_GRADES, SLEEVE_GRADES } from '$lib/server/db/schema';
import { CassetteFormSchema } from '$lib/validation/cassette';
import { getEnabledFormats } from '$lib/server/settings';
import { deleteFolgeCover, getFolgeCover, upsertFolgeCover } from '$lib/server/db/folge-cover';
import {
	deleteFolgeSynopsis,
	getFolgeSynopsis,
	upsertFolgeSynopsis
} from '$lib/server/db/folge-synopsis';
import { fetchFolge, isSupported as isDreiSupported } from '$lib/server/sources/dreimetadaten';
import { extractSynopsisFromReleaseId } from '$lib/server/sources/discogs-notes';
import { ensureEditor } from '$lib/server/auth/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const cassette = getCassette(params.id);
	if (!cassette) throw error(404, 'Kassette nicht gefunden.');
	const folgeCover =
		cassette.folgeNr != null ? getFolgeCover(cassette.serie, cassette.folgeNr) : undefined;
	const folgeSynopsis =
		cassette.folgeNr != null ? getFolgeSynopsis(cassette.serie, cassette.folgeNr) : undefined;
	return {
		cassette,
		serien: distinctSerien(),
		labels: distinctLabels(),
		folders: distinctFolders(),
		mediaGrades: MEDIA_GRADES,
		sleeveGrades: SLEEVE_GRADES,
		listens: listListens(cassette.id),
		listenStats: getListenStats(cassette.id),
		enabledFormats: getEnabledFormats(),
		folgeCover: folgeCover ?? null,
		folgeSynopsis: folgeSynopsis ?? null,
		dreiSupported: isDreiSupported(cassette.serie) && cassette.folgeNr != null
	};
};

function formObject(form: FormData): Record<string, FormDataEntryValue> {
	const obj: Record<string, FormDataEntryValue> = {};
	for (const [k, v] of form.entries()) {
		if (v instanceof File) continue;
		obj[k] = v;
	}
	return obj;
}

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);

		const form = await request.formData();
		const parsed = CassetteFormSchema.safeParse(formObject(form));
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const path = issue.path.join('.');
				if (!fieldErrors[path]) fieldErrors[path] = issue.message;
			}
			return fail(400, {
				error: 'Bitte korrigiere die markierten Felder.',
				fieldErrors,
				values: Object.fromEntries(Object.entries(formObject(form)).map(([k, v]) => [k, String(v)]))
			});
		}

		let coverFotoPath = existing.coverFotoPath;
		const photo = form.get('photo');
		const removePhoto = form.get('removePhoto') === 'on';
		if (removePhoto && coverFotoPath) {
			await deletePhoto(coverFotoPath);
			coverFotoPath = null;
		}
		if (photo instanceof File && photo.size > 0) {
			try {
				const saved = await savePhoto(photo);
				if (existing.coverFotoPath && existing.coverFotoPath !== saved.original) {
					await deletePhoto(existing.coverFotoPath);
				}
				coverFotoPath = saved.original;
			} catch (e) {
				return fail(400, {
					error: e instanceof Error ? e.message : 'Foto konnte nicht gespeichert werden.',
					fieldErrors: { photo: 'Fehler beim Foto-Upload.' },
					values: Object.fromEntries(
						Object.entries(formObject(form)).map(([k, v]) => [k, String(v)])
					)
				});
			}
		}

		// Discogs-Cover cachen, wenn URL gesetzt aber kein Cache-Pfad existiert
		// (oder wenn sich die Release-ID geändert hat).
		let discogsCoverCachePath = existing.discogsCoverCachePath;
		const releaseChanged = parsed.data.discogsReleaseId !== existing.discogsReleaseId;
		if (releaseChanged) discogsCoverCachePath = null;
		if (parsed.data.discogsReleaseId && parsed.data.discogsCoverUrl && !discogsCoverCachePath) {
			try {
				const cached = await cacheCoverFromUrl(
					parsed.data.discogsCoverUrl,
					parsed.data.discogsReleaseId
				);
				discogsCoverCachePath = cached?.original ?? null;
			} catch (e) {
				console.warn('[discogs/cover]', e);
			}
		}

		updateCassette(existing.id, {
			...parsed.data,
			coverFotoPath,
			discogsCoverCachePath
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	delete: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (existing.coverFotoPath) await deletePhoto(existing.coverFotoPath);
		deleteCassette(existing.id);
		throw redirect(303, '/kassetten');
	},

	pullFromDiscogs: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (!existing.discogsReleaseId) {
			return fail(400, { discogsError: 'Keine Discogs-Release-ID hinterlegt.' });
		}
		const form = await request.formData();
		const overrideAll = form.get('override') === 'on';
		try {
			await pullOne(existing, { overrideAll });
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					discogsError: `Discogs: ${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, {
				discogsError: e instanceof Error ? e.message : 'Unbekannter Fehler.'
			});
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	pushToDiscogs: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		try {
			await pushOne(existing);
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					discogsError: `${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, { discogsError: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	removeFromDiscogs: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		try {
			await removeOne(existing);
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					discogsError: `${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, { discogsError: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	addListen: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		const form = await request.formData();
		const dateRaw = String(form.get('listened_at') ?? '').trim();
		const note = String(form.get('note') ?? '').trim();
		let listenedAt: string | undefined;
		if (dateRaw) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
				return fail(400, { listenError: 'Datum muss YYYY-MM-DD sein.' });
			}
			// Store as full ISO with start-of-day time
			listenedAt = `${dateRaw}T12:00:00.000Z`;
		}
		addListen(existing.id, {
			listenedAt,
			note: note ? note.slice(0, 500) : null
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	deleteListen: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { listenError: 'Listen-ID fehlt.' });
		deleteListen(id);
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	setRating: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		const form = await request.formData();
		const raw = String(form.get('rating') ?? '').trim();
		let rating: number | null;
		if (raw === '' || raw === '0') {
			rating = null;
		} else {
			const n = Number(raw);
			if (!Number.isInteger(n) || n < 1 || n > 10) {
				return fail(400, { ratingError: 'Bewertung muss 1–10 Halbsterne sein.' });
			}
			rating = n;
		}
		updateCassette(existing.id, { rating });
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	uploadCoverPhoto: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		const form = await request.formData();
		const file = form.get('photo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { coverError: 'Keine Datei ausgewählt.' });
		}
		try {
			const saved = await savePhoto(file);
			if (existing.coverFotoPath && existing.coverFotoPath !== saved.original) {
				await deletePhoto(existing.coverFotoPath);
			}
			updateCassette(existing.id, {
				coverFotoPath: saved.original,
				// Direkt auf 'photo' setzen — User hat aktiv hochgeladen.
				coverSource: 'photo'
			});
		} catch (e) {
			return fail(400, {
				coverError: e instanceof Error ? e.message : 'Foto konnte nicht gespeichert werden.'
			});
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	removeCoverPhoto: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (existing.coverFotoPath) await deletePhoto(existing.coverFotoPath);
		updateCassette(existing.id, {
			coverFotoPath: null,
			// Wenn aktive Quelle 'photo' war, auf 'auto' zurückfallen.
			...(existing.coverSource === 'photo' ? { coverSource: 'auto' } : {})
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	setCoverSource: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		const form = await request.formData();
		const source = String(form.get('source') ?? '').trim();
		if (!['auto', 'photo', 'discogs', 'external'].includes(source)) {
			return fail(400, { coverError: 'Ungültige Cover-Quelle.' });
		}
		updateCassette(existing.id, {
			coverSource: source as 'auto' | 'photo' | 'discogs' | 'external'
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	fetchFolgeCoverFromDreimetadaten: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (!isDreiSupported(existing.serie) || existing.folgeNr == null) {
			return fail(400, {
				coverError: 'dreimetadaten.de unterstützt nur "Die drei ???" mit Folgennummer.'
			});
		}
		const { cover, metadata } = await fetchFolge(existing.folgeNr);
		if (!cover) {
			return fail(502, { coverError: 'dreimetadaten.de hat kein Cover geliefert.' });
		}
		upsertFolgeCover({
			serie: existing.serie,
			folgeNr: existing.folgeNr,
			source: 'dreimetadaten',
			sourceUrl: cover.sourceUrl,
			cachePath: cover.original,
			thumbPath: cover.thumb,
			titel: metadata?.titel ?? null
		});
		// Klappentext gleich mit, falls vorhanden — sonst der User klickt
		// trotzdem oft nur fürs Cover und hat danach auch den Text.
		if (metadata?.beschreibung) {
			upsertFolgeSynopsis({
				serie: existing.serie,
				folgeNr: existing.folgeNr,
				text: metadata.beschreibung,
				source: 'dreimetadaten',
				sourceUrl: `https://dreimetadaten.de/data/Serie/${existing.folgeNr.toString().padStart(3, '0')}/metadata.json`
			});
		}
		// Aktive Cover-Quelle direkt auf 'external' setzen — der User klickte
		// schließlich auf "hol's von dreimetadaten".
		updateCassette(existing.id, { coverSource: 'external' });
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	clearFolgeCover: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (existing.folgeNr != null) deleteFolgeCover(existing.serie, existing.folgeNr);
		// coverSource auf 'auto' zurück (User soll nicht mit 'external' ohne
		// Datenquelle hängen bleiben).
		if (existing.coverSource === 'external') {
			updateCassette(existing.id, { coverSource: 'auto' });
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	fetchSynopsisFromDreimetadaten: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (!isDreiSupported(existing.serie) || existing.folgeNr == null) {
			return fail(400, { synopsisError: 'dreimetadaten.de nur für "Die drei ???".' });
		}
		const { metadata } = await fetchFolge(existing.folgeNr);
		if (!metadata?.beschreibung) {
			return fail(502, { synopsisError: 'Keine Beschreibung gefunden.' });
		}
		upsertFolgeSynopsis({
			serie: existing.serie,
			folgeNr: existing.folgeNr,
			text: metadata.beschreibung,
			source: 'dreimetadaten',
			sourceUrl: `https://dreimetadaten.de/data/Serie/${existing.folgeNr.toString().padStart(3, '0')}/metadata.json`
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	fetchSynopsisFromDiscogs: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (!existing.discogsReleaseId || existing.folgeNr == null) {
			return fail(400, {
				synopsisError: 'Discogs-Release-ID und Folgennummer werden gebraucht.'
			});
		}
		try {
			const result = await extractSynopsisFromReleaseId(existing.discogsReleaseId);
			if (!result) {
				return fail(502, {
					synopsisError: 'Discogs hat keine Beschreibung (oder es ist nur eine Tracklist).'
				});
			}
			upsertFolgeSynopsis({
				serie: existing.serie,
				folgeNr: existing.folgeNr,
				text: result.text,
				source: 'discogs',
				sourceUrl: result.sourceUrl
			});
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					synopsisError: `Discogs: ${e.message}`
				});
			}
			return fail(500, {
				synopsisError: e instanceof Error ? e.message : 'Unbekannter Fehler.'
			});
		}
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	setSynopsisManual: async ({ params, request, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (existing.folgeNr == null) {
			return fail(400, { synopsisError: 'Eine Folgennummer wird gebraucht.' });
		}
		const form = await request.formData();
		const text = String(form.get('text') ?? '').trim();
		if (text.length < 5) {
			return fail(400, { synopsisError: 'Mindestens 5 Zeichen.' });
		}
		if (text.length > 5000) {
			return fail(400, { synopsisError: 'Max. 5000 Zeichen.' });
		}
		upsertFolgeSynopsis({
			serie: existing.serie,
			folgeNr: existing.folgeNr,
			text,
			source: 'manual',
			sourceUrl: null
		});
		throw redirect(303, `/kassetten/${existing.id}`);
	},

	clearSynopsis: async ({ params, locals }) => {
		ensureEditor(locals);
		const existing = getCassette(params.id);
		if (!existing) throw error(404);
		if (existing.folgeNr != null) deleteFolgeSynopsis(existing.serie, existing.folgeNr);
		throw redirect(303, `/kassetten/${existing.id}`);
	}
};

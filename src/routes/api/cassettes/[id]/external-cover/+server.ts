import { error, json } from '@sveltejs/kit';
import { ensureEditor } from '$lib/server/auth/guard';
import { getCassette, updateCassette } from '$lib/server/db/cassettes';
import { deleteFolgeCover, getFolgeCover } from '$lib/server/db/folge-cover';
import { deletePhoto } from '$lib/server/storage/photos';
import type { RequestHandler } from './$types';

/** Loescht externe Cover-Quellen einer Kassette — entweder den gecachten
 *  Discogs-Cover (?kind=discogs) oder das Dreimetadaten-Folge-Cover
 *  (?kind=external). Datei wird mitgeloescht, coverSource auf 'auto'
 *  zurueckgesetzt wenn er auf die jetzt geloeschte Quelle gezeigt hat. */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');

	const kind = url.searchParams.get('kind');
	if (kind === 'discogs') {
		if (cas.discogsCoverCachePath) {
			await deletePhoto(cas.discogsCoverCachePath);
			// Thumb wird konventionsgemaess als <stem>.thumb.jpg abgelegt.
			const stem = cas.discogsCoverCachePath.replace(/\.[^.]+$/, '');
			await deletePhoto(`${stem}.thumb.jpg`);
		}
		const patch: { discogsCoverCachePath: null; coverSource?: 'auto' } = {
			discogsCoverCachePath: null
		};
		if (cas.coverSource === 'discogs') patch.coverSource = 'auto';
		updateCassette(cas.id, patch);
		return json({ ok: true });
	}

	if (kind === 'external') {
		if (cas.folgeNr == null) throw error(400, 'Keine Folgen-Nummer hinterlegt.');
		const cover = getFolgeCover(cas.serie, cas.folgeNr);
		if (cover) {
			await deletePhoto(cover.cachePath);
			if (cover.thumbPath) await deletePhoto(cover.thumbPath);
			deleteFolgeCover(cas.serie, cas.folgeNr);
		}
		if (cas.coverSource === 'external') {
			updateCassette(cas.id, { coverSource: 'auto' });
		}
		return json({ ok: true });
	}

	throw error(400, 'Ungültiger kind-Parameter (discogs | external erwartet).');
};

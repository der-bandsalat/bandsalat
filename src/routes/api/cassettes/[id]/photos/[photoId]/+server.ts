import { error, json } from '@sveltejs/kit';
import { ensureEditor } from '$lib/server/auth/guard';
import { getCassette, updateCassette } from '$lib/server/db/cassettes';
import {
	deleteCassettePhoto,
	getCassettePhoto,
	listCassettePhotos,
	updateCassettePhoto
} from '$lib/server/db/cassette-photos';
import { CASSETTE_PHOTO_ROLES, type CassettePhotoRole } from '$lib/server/db/schema';
import { deletePhoto, thumbForOriginal } from '$lib/server/storage/photos';
import type { RequestHandler } from './$types';

const isRole = (v: unknown): v is CassettePhotoRole =>
	typeof v === 'string' && (CASSETTE_PHOTO_ROLES as readonly string[]).includes(v);

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');
	const photo = getCassettePhoto(params.photoId);
	if (!photo || photo.cassetteId !== cas.id) throw error(404, 'Foto nicht gefunden.');

	const body = (await request.json().catch(() => null)) as {
		role?: unknown;
		caption?: unknown;
	} | null;
	if (!body) throw error(400, 'Body fehlt.');

	const patch: { role?: CassettePhotoRole; caption?: string | null } = {};
	if (body.role !== undefined) {
		if (!isRole(body.role)) throw error(400, 'Ungültige Rolle.');
		patch.role = body.role;
	}
	if (body.caption !== undefined) {
		if (body.caption !== null && typeof body.caption !== 'string') {
			throw error(400, 'caption muss string oder null sein.');
		}
		patch.caption = body.caption;
	}
	const wasFront = photo.role === 'front';
	const becomesFront = patch.role === 'front';
	const updated = updateCassettePhoto(photo.id, patch);
	// Cover-Quelle bei Rollenwechsel synchron halten.
	if (!wasFront && becomesFront && cas.coverSource !== 'photo') {
		updateCassette(cas.id, { coverSource: 'photo' });
	} else if (wasFront && patch.role && !becomesFront && cas.coverSource === 'photo') {
		const remainingFronts = listCassettePhotos(cas.id).filter((p) => p.role === 'front');
		if (remainingFronts.length === 0) {
			updateCassette(cas.id, { coverSource: 'auto' });
		}
	}
	return json({ photo: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');
	const photo = getCassettePhoto(params.photoId);
	if (!photo || photo.cassetteId !== cas.id) throw error(404, 'Foto nicht gefunden.');

	const wasFront = photo.role === 'front';
	const removed = deleteCassettePhoto(photo.id);
	if (removed) {
		await deletePhoto(removed.path);
		const thumb = removed.thumbPath ?? thumbForOriginal(removed.path);
		if (thumb) await deletePhoto(thumb);
	}
	// Wenn das letzte Front-Foto entfernt wurde und Cover-Quelle 'photo' war,
	// auf 'auto' zurückfallen — sonst hätte die Kassette keine Cover-Quelle
	// mehr, obwohl ggf. Discogs/External verfügbar wäre.
	if (wasFront && cas.coverSource === 'photo') {
		const remaining = listCassettePhotos(cas.id).filter((p) => p.role === 'front');
		if (remaining.length === 0) {
			updateCassette(cas.id, { coverSource: 'auto' });
		}
	}
	return json({ ok: true });
};

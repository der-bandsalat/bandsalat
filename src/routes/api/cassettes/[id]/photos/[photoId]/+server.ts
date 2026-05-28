import { error, json } from '@sveltejs/kit';
import { ensureEditor } from '$lib/server/auth/guard';
import { getCassette } from '$lib/server/db/cassettes';
import {
	deleteCassettePhoto,
	getCassettePhoto,
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
	const updated = updateCassettePhoto(photo.id, patch);
	return json({ photo: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');
	const photo = getCassettePhoto(params.photoId);
	if (!photo || photo.cassetteId !== cas.id) throw error(404, 'Foto nicht gefunden.');

	const removed = deleteCassettePhoto(photo.id);
	if (removed) {
		await deletePhoto(removed.path);
		const thumb = removed.thumbPath ?? thumbForOriginal(removed.path);
		if (thumb) await deletePhoto(thumb);
	}
	return json({ ok: true });
};

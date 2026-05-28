import { error, json } from '@sveltejs/kit';
import { ensureEditor } from '$lib/server/auth/guard';
import { getCassette } from '$lib/server/db/cassettes';
import { addCassettePhoto, listCassettePhotos, reorderRole } from '$lib/server/db/cassette-photos';
import { CASSETTE_PHOTO_ROLES, type CassettePhotoRole } from '$lib/server/db/schema';
import { savePhoto } from '$lib/server/storage/photos';
import type { RequestHandler } from './$types';

const isRole = (v: unknown): v is CassettePhotoRole =>
	typeof v === 'string' && (CASSETTE_PHOTO_ROLES as readonly string[]).includes(v);

export const GET: RequestHandler = async ({ params, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');
	return json({ photos: listCassettePhotos(cas.id) });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');

	const form = await request.formData().catch(() => null);
	if (!form) throw error(400, 'Multipart-Body erwartet.');
	const file = form.get('file');
	const roleRaw = form.get('role');
	const caption = form.get('caption');
	if (!(file instanceof File)) throw error(400, 'Datei fehlt.');
	const role: CassettePhotoRole = isRole(roleRaw) ? roleRaw : 'extra';

	let saved;
	try {
		saved = await savePhoto(file);
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Foto konnte nicht gespeichert werden.');
	}
	const id = addCassettePhoto({
		cassetteId: cas.id,
		role,
		path: saved.original,
		thumbPath: saved.thumb,
		caption: typeof caption === 'string' && caption ? caption : null
	});
	return json({ id, path: saved.original, thumbPath: saved.thumb, role }, { status: 201 });
};

/** Reorder einer Rollen-Reihe: { role, photoIds: string[] } */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	ensureEditor(locals);
	const cas = getCassette(params.id);
	if (!cas) throw error(404, 'Kassette nicht gefunden.');
	const body = (await request.json().catch(() => null)) as {
		role?: unknown;
		photoIds?: unknown;
	} | null;
	if (!body || !isRole(body.role) || !Array.isArray(body.photoIds)) {
		throw error(400, 'role + photoIds[] erwartet.');
	}
	if (!body.photoIds.every((v) => typeof v === 'string')) {
		throw error(400, 'photoIds[] muss strings enthalten.');
	}
	reorderRole(cas.id, body.role, body.photoIds as string[]);
	return json({ photos: listCassettePhotos(cas.id) });
};

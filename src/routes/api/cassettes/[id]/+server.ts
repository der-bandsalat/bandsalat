import { error, json } from '@sveltejs/kit';
import { getCassette, updateCassette } from '$lib/server/db/cassettes';
import { ensureEditor } from '$lib/server/auth/guard';
import { CassetteUpdateSchema } from '$lib/validation/cassette';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	ensureEditor(locals);
	const existing = getCassette(params.id);
	if (!existing) throw error(404, 'Kassette nicht gefunden.');

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') throw error(400, 'Ungültiger Body.');

	const parsed = CassetteUpdateSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0]?.message ?? 'Validierung fehlgeschlagen.');
	}
	if (Object.keys(parsed.data).length === 0) {
		throw error(400, 'Keine Felder zum Aktualisieren.');
	}

	const updated = updateCassette(existing.id, parsed.data);
	return json({ ok: true, cassette: updated });
};

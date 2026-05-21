import { error, json } from '@sveltejs/kit';
import { getCassette, updateCassette } from '$lib/server/db/cassettes';
import { ensureEditor } from '$lib/server/auth/guard';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	ensureEditor(locals);
	const existing = getCassette(params.id);
	if (!existing) throw error(404, 'Kassette nicht gefunden.');

	const body = await request.json().catch(() => null);
	const raw = (body as { rating?: unknown } | null)?.rating;

	let rating: number | null;
	if (raw === null || raw === undefined || raw === '' || raw === 0 || raw === '0') {
		rating = null;
	} else {
		const n = Number(raw);
		if (!Number.isInteger(n) || n < 1 || n > 10) {
			throw error(400, 'Bewertung muss 1–10 Halbsterne sein.');
		}
		rating = n;
	}

	updateCassette(existing.id, { rating });
	return json({ id: existing.id, rating });
};

import { error, json, type RequestHandler } from '@sveltejs/kit';
import { searchReleases, searchReleasesCassetteFirst } from '$lib/server/discogs';
import { DiscogsError } from '$lib/server/discogs/client';
import { consumeRateLimit } from '$lib/server/auth/rate-limit';

export const GET: RequestHandler = async ({ url, locals, getClientAddress }) => {
	// Auch Viewer dürfen suchen, aber rate-limited gegen Skript-Hammern.
	const key = locals.user ? `dsearch-u:${locals.user.id}` : `dsearch-ip:${getClientAddress()}`;
	const rl = consumeRateLimit(key, 120, 60 * 60 * 1000);
	if (!rl.allowed) {
		throw error(429, 'Zu viele Discogs-Suchen — bitte später wieder.');
	}
	const q = url.searchParams.get('q') ?? '';
	const formatParam = url.searchParams.get('format');
	const format = formatParam === '' || formatParam === 'all' ? null : (formatParam ?? 'Cassette');

	// fallback=1: ohne Kassetten-Treffer auf alle Formate ausweichen (Scanner).
	const fallback = url.searchParams.get('fallback') === '1' && format === 'Cassette';
	try {
		if (fallback) return json(await searchReleasesCassetteFirst(q));
		const results = await searchReleases(q, { format });
		return json({ results, fellBack: false });
	} catch (e) {
		if (e instanceof DiscogsError) {
			return json(
				{ error: e.message, detail: e.detail ?? null },
				{ status: e.status === 0 ? 503 : e.status || 500 }
			);
		}
		const msg = e instanceof Error ? e.message : 'Unbekannter Fehler.';
		return json({ error: msg }, { status: 500 });
	}
};

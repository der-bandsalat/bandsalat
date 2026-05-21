import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getRelease, releaseUrl } from '$lib/server/discogs';
import { DiscogsError } from '$lib/server/discogs/client';
import { cacheCoverFromUrl } from '$lib/server/discogs/cover-cache';

export const GET: RequestHandler = async ({ params, url }) => {
	const id = Number.parseInt(params.id ?? '', 10);
	if (!Number.isInteger(id) || id <= 0) throw error(400, 'Ungültige Release-ID.');
	const withCover = url.searchParams.get('cover') === '1';

	try {
		const release = await getRelease(id);
		let cover: { original: string; thumb: string } | null = null;
		if (withCover) {
			const coverUrl =
				release.images?.find((i) => i.type === 'primary')?.uri ?? release.images?.[0]?.uri;
			if (coverUrl) {
				try {
					cover = await cacheCoverFromUrl(coverUrl, id);
				} catch (e) {
					console.warn('[discogs/cover-cache]', e);
				}
			}
		}
		return json({ release, url: releaseUrl(id), cover });
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

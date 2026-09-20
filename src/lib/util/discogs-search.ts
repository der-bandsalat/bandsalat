import type { SearchResult } from '$lib/server/discogs/types';

export type DiscogsFormatChoice = 'Cassette' | 'all';

/**
 * Clientseitige Discogs-Suche über /api/discogs/search — eine Stelle für
 * DiscogsSearch-Modal und Scanner (URL-Bau, Fehlerform, Fallback-Flag).
 */
export async function searchDiscogsReleases(
	q: string,
	format: DiscogsFormatChoice,
	opts: { fallback?: boolean; signal?: AbortSignal } = {}
): Promise<{ results: SearchResult[]; fellBack: boolean }> {
	const url = new URL('/api/discogs/search', location.origin);
	url.searchParams.set('q', q);
	url.searchParams.set('format', format);
	if (opts.fallback) url.searchParams.set('fallback', '1');
	const res = await fetch(url, { signal: opts.signal });
	const body = await res.json().catch(() => null);
	// json() schluckt den AbortError sonst als „leeres Ergebnis".
	if (opts.signal?.aborted) throw new DOMException('Suche abgebrochen', 'AbortError');
	if (!res.ok) throw new Error(body?.error ?? body?.message ?? `Fehler ${res.status}`);
	return { results: body?.results ?? [], fellBack: Boolean(body?.fellBack) };
}

export function fmtSearchHit(r: SearchResult): string {
	return [r.year, r.label?.[0], r.country, r.catno].filter(Boolean).join(' · ');
}

import { discogs } from './client';
import type { ReleaseDetails, SearchResponse, SearchResult } from './types';

export async function searchReleases(
	q: string,
	opts: { format?: string | null; perPage?: number } = {}
): Promise<SearchResult[]> {
	const trimmed = q.trim();
	if (trimmed.length === 0) return [];
	const params: Record<string, string | number> = {
		q: trimmed,
		type: 'release',
		per_page: opts.perPage ?? 20
	};
	if (opts.format !== null && opts.format !== '') {
		params.format = opts.format ?? 'Cassette';
	}
	const res = await discogs.get<SearchResponse>('/database/search', params);
	return res.results ?? [];
}

export async function getRelease(id: number): Promise<ReleaseDetails> {
	return discogs.get<ReleaseDetails>(`/releases/${id}`);
}

export function releaseUrl(id: number): string {
	return `https://www.discogs.com/release/${id}`;
}

export { discogs } from './client';
export type * from './types';

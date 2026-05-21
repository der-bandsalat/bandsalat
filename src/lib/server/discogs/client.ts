import { getDiscogsToken } from '../settings';
import { RateLimitQueue, sleep } from './queue';

const BASE_URL = 'https://api.discogs.com';
const USER_AGENT = 'HoerspielKatalog/1.0 (+https://github.com/der-bandsalat/bandsalat)';
const MIN_INTERVAL_MS = 1100; // 60 req/min mit etwas Puffer
const MAX_RETRIES = 4;

export class DiscogsError extends Error {
	constructor(
		public status: number,
		message: string,
		public detail?: string
	) {
		super(message);
		this.name = 'DiscogsError';
	}
}

let _queue: RateLimitQueue | null = null;
let _fetcher: typeof fetch = fetch.bind(globalThis);

export function getQueue(): RateLimitQueue {
	if (!_queue) _queue = new RateLimitQueue(MIN_INTERVAL_MS);
	return _queue;
}

/** Nur für Tests: Queue & Fetcher zurücksetzen / mocken. */
export function _resetForTest(opts?: { fetcher?: typeof fetch; intervalMs?: number }) {
	_queue = new RateLimitQueue(opts?.intervalMs ?? 0);
	if (opts?.fetcher) _fetcher = opts.fetcher;
	else _fetcher = fetch.bind(globalThis);
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): URL {
	const url = new URL(path, BASE_URL);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			if (v === undefined || v === null || v === '') continue;
			url.searchParams.set(k, String(v));
		}
	}
	return url;
}

async function rawFetch(url: URL, init: RequestInit = {}, attempt = 0): Promise<Response> {
	const token = getDiscogsToken();
	if (!token) throw new DiscogsError(0, 'DISCOGS_TOKEN nicht gesetzt.');

	const headers = new Headers(init.headers);
	headers.set('User-Agent', USER_AGENT);
	headers.set('Authorization', `Discogs token=${token}`);
	if (!headers.has('Accept')) headers.set('Accept', 'application/json');

	const res = await _fetcher(url.toString(), { ...init, headers });
	if (res.status === 429 && attempt < MAX_RETRIES) {
		const retryAfter = Number(res.headers.get('retry-after'));
		const wait =
			Number.isFinite(retryAfter) && retryAfter > 0
				? retryAfter * 1000
				: Math.min(60_000, 1000 * 2 ** (attempt + 1));
		await sleep(wait);
		return rawFetch(url, init, attempt + 1);
	}
	return res;
}

async function request<T>(
	method: string,
	path: string,
	opts: {
		params?: Record<string, string | number | undefined>;
		body?: unknown;
	} = {}
): Promise<T> {
	const url = buildUrl(path, opts.params);
	const init: RequestInit = { method };
	if (opts.body !== undefined) {
		init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
		init.headers = { 'content-type': 'application/json' };
	}

	return getQueue().run(async () => {
		const res = await rawFetch(url, init);
		const text = await res.text();
		const json = text ? safeJson(text) : null;
		if (!res.ok) {
			let detail: string | undefined;
			if (json && typeof json === 'object' && 'message' in json) {
				detail = String((json as { message: unknown }).message);
			} else if (text) {
				detail = text;
			}
			throw new DiscogsError(res.status, `Discogs API ${res.status} ${res.statusText}`, detail);
		}
		return json as T;
	});
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

export const discogs = {
	get<T>(path: string, params?: Record<string, string | number | undefined>) {
		return request<T>('GET', path, { params });
	},
	post<T>(path: string, body?: unknown, params?: Record<string, string | number | undefined>) {
		return request<T>('POST', path, { params, body });
	},
	delete<T>(path: string) {
		return request<T>('DELETE', path);
	}
};

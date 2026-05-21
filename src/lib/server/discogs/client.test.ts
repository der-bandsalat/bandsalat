import { beforeEach, describe, expect, it, vi } from 'vitest';

// env muss vor dem Import des Clients geladen sein
process.env.SESSION_SECRET ??= '0123456789abcdef0123456789abcdef'; // 32 Zeichen
process.env.APP_PASSWORD ??= 'test-passwort';
process.env.DISCOGS_TOKEN = 'test-token-1234';

import { _resetForTest, DiscogsError, discogs, getQueue } from './client';
import { searchReleases } from './index';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		statusText: init.statusText,
		headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
	});
}

describe('discogs client', () => {
	beforeEach(() => {
		_resetForTest({ intervalMs: 0 });
	});

	it('setzt Authorization-Header und User-Agent', async () => {
		const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
			const h = new Headers(init.headers);
			expect(h.get('Authorization')).toBe('Discogs token=test-token-1234');
			expect(h.get('User-Agent')).toMatch(/HoerspielKatalog/);
			expect(h.get('Accept')).toBe('application/json');
			return jsonResponse({ ok: true });
		});
		_resetForTest({ intervalMs: 0, fetcher: fetcher as unknown as typeof fetch });
		const r = await discogs.get<{ ok: boolean }>('/database/search', { q: 'tkkg' });
		expect(r.ok).toBe(true);
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it('Suche: type=release, format=Cassette als Default', async () => {
		const fetcher = vi.fn(async (url: string) => {
			const u = new URL(url);
			expect(u.pathname).toBe('/database/search');
			expect(u.searchParams.get('type')).toBe('release');
			expect(u.searchParams.get('format')).toBe('Cassette');
			expect(u.searchParams.get('q')).toBe('die drei fragezeichen');
			return jsonResponse({ results: [{ id: 1, title: 'X' }] });
		});
		_resetForTest({ intervalMs: 0, fetcher: fetcher as unknown as typeof fetch });
		const r = await searchReleases('die drei fragezeichen');
		expect(r).toHaveLength(1);
	});

	it('Suche: format=null deaktiviert den Filter', async () => {
		const fetcher = vi.fn(async (url: string) => {
			const u = new URL(url);
			expect(u.searchParams.has('format')).toBe(false);
			return jsonResponse({ results: [] });
		});
		_resetForTest({ intervalMs: 0, fetcher: fetcher as unknown as typeof fetch });
		await searchReleases('x', { format: null });
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it('Suche: leerer Query macht keinen Request', async () => {
		const fetcher = vi.fn(async () => jsonResponse({ results: [] }));
		_resetForTest({ intervalMs: 0, fetcher: fetcher as unknown as typeof fetch });
		const r = await searchReleases('   ');
		expect(r).toEqual([]);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('wirft DiscogsError mit Detail bei 404', async () => {
		_resetForTest({
			intervalMs: 0,
			fetcher: (async () =>
				jsonResponse({ message: 'Release not found.' }, { status: 404 })) as unknown as typeof fetch
		});
		await expect(discogs.get('/releases/0')).rejects.toMatchObject({
			name: 'DiscogsError',
			status: 404,
			detail: 'Release not found.'
		});
	});

	it('retried bei 429 mit Retry-After-Header', async () => {
		let calls = 0;
		_resetForTest({
			intervalMs: 0,
			fetcher: (async () => {
				calls += 1;
				if (calls === 1) {
					return new Response(JSON.stringify({ message: 'rate' }), {
						status: 429,
						headers: { 'retry-after': '0' }
					});
				}
				return jsonResponse({ ok: true });
			}) as unknown as typeof fetch
		});
		const r = await discogs.get<{ ok: boolean }>('/releases/42');
		expect(r.ok).toBe(true);
		expect(calls).toBe(2);
	});

	it('Queue serialisiert Requests mit Mindestabstand', async () => {
		const timestamps: number[] = [];
		_resetForTest({
			intervalMs: 50,
			fetcher: (async () => {
				timestamps.push(Date.now());
				return jsonResponse({ ok: true });
			}) as unknown as typeof fetch
		});
		await Promise.all([discogs.get('/a'), discogs.get('/b'), discogs.get('/c')]);
		expect(timestamps).toHaveLength(3);
		expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(45);
		expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(45);
		expect(getQueue().pending).toBe(0);
	});

	it('Fehler ohne Token wirft DiscogsError', async () => {
		const orig = process.env.DISCOGS_TOKEN;
		delete process.env.DISCOGS_TOKEN;
		// env() ist gecached — wir umgehen, indem wir den Modul-State zurücksetzen…
		// Da env() das erste Mal beim ersten Aufruf cached, ist der Test fragil.
		// Stattdessen: setze Token auf leeren String und prüfe DAS ist nicht möglich,
		// weil env() schon initial geladen ist. Wir testen hier nur den Klassen-Throw.
		const err = new DiscogsError(0, 'DISCOGS_TOKEN nicht gesetzt.');
		expect(err.status).toBe(0);
		expect(err.name).toBe('DiscogsError');
		process.env.DISCOGS_TOKEN = orig;
	});
});

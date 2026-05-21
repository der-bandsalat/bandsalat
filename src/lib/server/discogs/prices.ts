import { eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/client';
import { cassettes, discogsPriceCache } from '../db/schema';
import type { MediaGrade } from '../db/schema';
import { MEDIA_GRADES } from '../db/schema';
import { discogs, DiscogsError } from './client';

export interface PriceSuggestion {
	currency: string;
	value: number;
}

export type PriceMap = Partial<Record<string, PriceSuggestion>>;

export interface MarketStats {
	lowestPrice: number | null;
	currency: string | null;
	numForSale: number;
}

export interface PriceData {
	suggestions: PriceMap | null;
	marketplace: MarketStats | null;
}

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const FALLBACK_CHAIN: MediaGrade[] = [...MEDIA_GRADES];
const DEFAULT_GRADE: MediaGrade = 'Very Good Plus (VG+)';

function nowIso() {
	return new Date().toISOString();
}

/** Holt Preisvorschläge für ein Release (historische Verkäufe).
 *  null bei 404 / leerem Result — Discogs hat oft keine Daten für seltene Auflagen. */
async function fetchPriceSuggestions(releaseId: number): Promise<PriceMap | null> {
	try {
		const res = await discogs.get<PriceMap>(`/marketplace/price_suggestions/${releaseId}`);
		if (!res || Object.keys(res).length === 0) return null;
		// Discogs liefert manchmal alle Keys mit null-values zurück
		const filtered: PriceMap = {};
		let hasAny = false;
		for (const [k, v] of Object.entries(res)) {
			if (v && typeof v.value === 'number' && v.value > 0) {
				filtered[k] = v;
				hasAny = true;
			}
		}
		return hasAny ? filtered : null;
	} catch (e) {
		if (e instanceof DiscogsError && (e.status === 404 || e.status === 400)) return null;
		throw e;
	}
}

/** Holt Marketplace-Statistiken: niedrigster aktuell gelisteter Preis. */
async function fetchMarketStats(releaseId: number): Promise<MarketStats | null> {
	try {
		const stats = await discogs.get<{
			lowest_price?: { currency: string; value: number } | null;
			num_for_sale?: number;
		}>(`/marketplace/stats/${releaseId}`);
		if (!stats) return null;
		const lowest = stats.lowest_price;
		const numForSale = stats.num_for_sale ?? 0;
		if (!lowest && numForSale === 0) return null;
		return {
			lowestPrice: lowest && typeof lowest.value === 'number' ? lowest.value : null,
			currency: lowest?.currency ?? null,
			numForSale
		};
	} catch (e) {
		if (e instanceof DiscogsError && (e.status === 404 || e.status === 400)) return null;
		throw e;
	}
}

/** Holt beide Datenquellen sequentiell (Queue serialisiert). */
export async function fetchPriceData(releaseId: number): Promise<PriceData | null> {
	const suggestions = await fetchPriceSuggestions(releaseId);
	const marketplace = await fetchMarketStats(releaseId);
	if (!suggestions && !marketplace) return null;
	return { suggestions, marketplace };
}

export interface CachedPrice {
	data: PriceData;
	currency: string | null;
	fetchedAt: string;
}

/** Parser akzeptiert sowohl das neue Format ({suggestions, marketplace}) als auch
 *  das alte Flat-PriceMap-Format aus der ersten Iteration. */
export function parsePriceJson(raw: string): PriceData | null {
	try {
		const obj = JSON.parse(raw) as unknown;
		if (!obj || typeof obj !== 'object') return null;
		if ('suggestions' in obj || 'marketplace' in obj) {
			const v = obj as Partial<PriceData>;
			return {
				suggestions: v.suggestions ?? null,
				marketplace: v.marketplace ?? null
			};
		}
		// V1-Flat-Format
		return { suggestions: obj as PriceMap, marketplace: null };
	} catch {
		return null;
	}
}

export function getCachedPrices(releaseId: number): CachedPrice | null {
	const row = db()
		.select()
		.from(discogsPriceCache)
		.where(eq(discogsPriceCache.releaseId, releaseId))
		.get();
	if (!row) return null;
	const data = parsePriceJson(row.pricesJson);
	if (!data) return null;
	return { data, currency: row.currency, fetchedAt: row.fetchedAt };
}

function deriveCurrency(data: PriceData): string | null {
	if (data.marketplace?.currency) return data.marketplace.currency;
	if (data.suggestions) {
		for (const v of Object.values(data.suggestions)) {
			if (v?.currency) return v.currency;
		}
	}
	return null;
}

export function setCachedPrices(releaseId: number, data: PriceData): void {
	const currency = deriveCurrency(data);
	const pricesJson = JSON.stringify(data);
	const fetchedAt = nowIso();
	const existing = db()
		.select({ id: discogsPriceCache.releaseId })
		.from(discogsPriceCache)
		.where(eq(discogsPriceCache.releaseId, releaseId))
		.get();
	if (existing) {
		db()
			.update(discogsPriceCache)
			.set({ pricesJson, currency, fetchedAt })
			.where(eq(discogsPriceCache.releaseId, releaseId))
			.run();
	} else {
		db().insert(discogsPriceCache).values({ releaseId, pricesJson, currency, fetchedAt }).run();
	}
}

export type PriceSource = 'suggestion-exact' | 'suggestion-fallback' | 'marketplace';

/** Findet den besten verfügbaren Preis. Reihenfolge:
 *  1. Suggestion für den genauen Zustand
 *  2. Suggestion für nächst-niedrigeren Zustand
 *  3. Niedrigster aktueller Marketplace-Listing-Preis
 */
export function priceForGrade(
	data: PriceData,
	preferred: MediaGrade | null | undefined
): { cents: number; currency: string; source: PriceSource; gradeUsed: MediaGrade | null } | null {
	const target = preferred ?? DEFAULT_GRADE;
	if (data.suggestions) {
		const idx = FALLBACK_CHAIN.indexOf(target);
		const search = idx >= 0 ? FALLBACK_CHAIN.slice(idx) : FALLBACK_CHAIN;
		for (let i = 0; i < search.length; i++) {
			const grade = search[i];
			const p = data.suggestions[grade];
			if (p && typeof p.value === 'number' && p.value > 0) {
				return {
					cents: Math.round(p.value * 100),
					currency: p.currency || 'EUR',
					source: grade === target ? 'suggestion-exact' : 'suggestion-fallback',
					gradeUsed: grade
				};
			}
		}
	}
	const m = data.marketplace;
	if (m && m.lowestPrice != null && m.lowestPrice > 0) {
		return {
			cents: Math.round(m.lowestPrice * 100),
			currency: m.currency || 'EUR',
			source: 'marketplace',
			gradeUsed: null
		};
	}
	return null;
}

// ─── Refresh-Job (In-Memory, parallel zur sync.ts-Struktur) ───────────────

export interface PriceErrorRef {
	cassetteId: string;
	serie: string;
	folgeNr: number | null;
	titel: string;
}

export interface PriceRefreshError {
	releaseId: number;
	message: string;
	at: number;
	cassette: PriceErrorRef | null;
}

interface RawPriceError {
	releaseId: number;
	message: string;
	at: number;
}

export interface PriceRefreshState {
	running: boolean;
	total: number;
	done: number;
	succeeded: number;
	failed: number;
	skipped: number;
	errors: PriceRefreshError[];
	current: number | null;
	startedAt: number | null;
	finishedAt: number | null;
}

interface InternalState {
	running: boolean;
	total: number;
	done: number;
	succeeded: number;
	failed: number;
	skipped: number;
	errors: RawPriceError[];
	current: number | null;
	startedAt: number | null;
	finishedAt: number | null;
}

function initialState(): InternalState {
	return {
		running: false,
		total: 0,
		done: 0,
		succeeded: 0,
		failed: 0,
		skipped: 0,
		errors: [],
		current: null,
		startedAt: null,
		finishedAt: null
	};
}

let state: InternalState = initialState();

function lookupCassettesByRelease(): Map<number, PriceErrorRef> {
	const rows = db()
		.select({
			id: cassettes.id,
			serie: cassettes.serie,
			folgeNr: cassettes.folgeNr,
			titel: cassettes.titel,
			releaseId: cassettes.discogsReleaseId
		})
		.from(cassettes)
		.where(isNotNull(cassettes.discogsReleaseId))
		.all();
	const map = new Map<number, PriceErrorRef>();
	for (const r of rows) {
		if (r.releaseId == null) continue;
		if (map.has(r.releaseId)) continue;
		map.set(r.releaseId, {
			cassetteId: r.id,
			serie: r.serie,
			folgeNr: r.folgeNr,
			titel: r.titel
		});
	}
	return map;
}

export function getPriceRefreshStatus(): PriceRefreshState {
	const lookup = lookupCassettesByRelease();
	const errors: PriceRefreshError[] = state.errors.slice(-30).map((e) => ({
		releaseId: e.releaseId,
		message: e.message,
		at: e.at,
		cassette: lookup.get(e.releaseId) ?? null
	}));
	return { ...state, errors };
}

export function resetPriceRefreshStatus(): PriceRefreshState {
	if (state.running) return getPriceRefreshStatus();
	state = initialState();
	return getPriceRefreshStatus();
}

interface RefreshOptions {
	force?: boolean;
}

export function startPriceRefresh(opts: RefreshOptions = {}): PriceRefreshState {
	if (state.running) throw new Error('Preis-Refresh läuft bereits.');

	const all = db()
		.select({ id: cassettes.discogsReleaseId })
		.from(cassettes)
		.where(isNotNull(cassettes.discogsReleaseId))
		.all();
	const uniqueIds = [...new Set(all.map((r) => r.id).filter((n): n is number => n != null))];

	let toFetch = uniqueIds;
	if (!opts.force) {
		const cached = db().select().from(discogsPriceCache).all();
		const cachedAt = new Map<number, string>(cached.map((c) => [c.releaseId, c.fetchedAt]));
		const cutoff = Date.now() - CACHE_TTL_MS;
		toFetch = uniqueIds.filter((id) => {
			const at = cachedAt.get(id);
			if (!at) return true;
			return new Date(at).getTime() < cutoff;
		});
	}

	state = {
		...initialState(),
		running: true,
		total: toFetch.length,
		skipped: uniqueIds.length - toFetch.length,
		startedAt: Date.now()
	};
	void runRefresh(toFetch);
	return getPriceRefreshStatus();
}

async function runRefresh(ids: number[]) {
	try {
		for (const id of ids) {
			state.current = id;
			try {
				const data = await fetchPriceData(id);
				if (data) {
					setCachedPrices(id, data);
					state.succeeded++;
				} else {
					state.failed++;
					state.errors.push({
						releaseId: id,
						message: 'Weder Preisvorschläge noch aktive Listings bei Discogs.',
						at: Date.now()
					});
				}
			} catch (e) {
				state.failed++;
				state.errors.push({
					releaseId: id,
					message: e instanceof Error ? e.message : String(e),
					at: Date.now()
				});
			}
			state.done++;
		}
	} finally {
		state.current = null;
		state.running = false;
		state.finishedAt = Date.now();
	}
}

import { db } from './client';
import { cassettes, discogsPriceCache, MEDIA_GRADES, SLEEVE_GRADES } from './schema';
import { parsePriceJson, priceForGrade, type PriceData } from '../discogs/prices';
import { getAllSeriesTargets } from './series';

export interface KpiSummary {
	total: number;
	seriesCount: number;
	totalKaufpreisCent: number;
	withRelease: number;
	pushed: number;
	averageKaufpreisCent: number | null;
	rangeMonths: number | null;
}

export interface GrowthPoint {
	monthKey: string; // YYYY-MM
	added: number;
	cumulative: number;
}

export interface SeriesCompleteness {
	serie: string;
	owned: number;
	range: number;
	percent: number;
	min: number | null;
	max: number | null;
}

export interface YearHistEntry {
	year: number;
	count: number;
}

export interface CountedItem {
	label: string;
	count: number;
}

export interface MarketValueSummary {
	totalCent: number;
	pricedCount: number;
	unpricedCount: number;
	missingPriceCount: number;
	withoutCondition: number;
	currency: string | null;
	lastFetchedAt: string | null;
	cachedReleases: number;
	totalReleases: number;
}

export interface StatsBundle {
	kpis: KpiSummary;
	growth: GrowthPoint[];
	seriesCompleteness: SeriesCompleteness[];
	yearHist: YearHistEntry[];
	mediaCondition: CountedItem[];
	sleeveCondition: CountedItem[];
	labels: CountedItem[];
	marketValue: MarketValueSummary;
}

function monthKey(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonth(key: string): string {
	const [y, m] = key.split('-').map(Number);
	const nm = m === 12 ? 1 : m + 1;
	const ny = m === 12 ? y + 1 : y;
	return `${ny}-${String(nm).padStart(2, '0')}`;
}

export function getStats(): StatsBundle {
	const rows = db().select().from(cassettes).all();
	const total = rows.length;

	// KPIs
	const seriesSet = new Set(rows.map((r) => r.serie));
	const totalKaufpreisCent = rows.reduce((acc, r) => acc + (r.kaufpreisCent ?? 0), 0);
	const withRelease = rows.filter((r) => r.discogsReleaseId != null).length;
	const pushed = rows.filter((r) => r.discogsInstanceId != null).length;
	const itemsWithPrice = rows.filter((r) => r.kaufpreisCent != null && r.kaufpreisCent > 0);
	const averageKaufpreisCent =
		itemsWithPrice.length > 0
			? Math.round(
					itemsWithPrice.reduce((a, r) => a + (r.kaufpreisCent ?? 0), 0) / itemsWithPrice.length
				)
			: null;

	// Growth nach Monat (Fallback createdAt wenn kaufdatum fehlt)
	const monthCounts = new Map<string, number>();
	for (const r of rows) {
		const iso = r.kaufdatum || r.createdAt;
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) continue;
		const k = monthKey(d);
		monthCounts.set(k, (monthCounts.get(k) ?? 0) + 1);
	}
	const sortedKeys = [...monthCounts.keys()].sort();
	const growth: GrowthPoint[] = [];
	let cum = 0;
	if (sortedKeys.length > 0) {
		let k = sortedKeys[0];
		const last = sortedKeys[sortedKeys.length - 1];
		while (k <= last) {
			const added = monthCounts.get(k) ?? 0;
			cum += added;
			growth.push({ monthKey: k, added, cumulative: cum });
			if (k === last) break;
			k = addMonth(k);
		}
	}
	const rangeMonths = growth.length > 0 ? growth.length : null;

	// Vollständigkeit pro Serie — target-aware
	const grouped = new Map<string, number[]>();
	for (const r of rows) {
		if (r.folgeNr == null) continue;
		const arr = grouped.get(r.serie);
		if (arr) arr.push(r.folgeNr);
		else grouped.set(r.serie, [r.folgeNr]);
	}
	const targets = getAllSeriesTargets();
	const seriesNames = new Set<string>([...grouped.keys(), ...targets.keys()]);
	const seriesCompleteness: SeriesCompleteness[] = [];
	for (const serie of seriesNames) {
		const folges = grouped.get(serie) ?? [];
		const uniq = [...new Set(folges)].sort((a, b) => a - b);
		const target = targets.get(serie);
		let min: number;
		let max: number;
		if (target) {
			min = target.min;
			max = target.max;
		} else if (uniq.length > 0) {
			min = uniq[0];
			max = uniq[uniq.length - 1];
		} else {
			continue;
		}
		const range = max - min + 1;
		const ownedInRange = uniq.filter((n) => n >= min && n <= max).length;
		seriesCompleteness.push({
			serie,
			owned: ownedInRange,
			range,
			percent: range > 0 ? Math.round((ownedInRange / range) * 100) : 0,
			min,
			max
		});
	}
	seriesCompleteness.sort((a, b) => b.owned - a.owned || a.serie.localeCompare(b.serie, 'de'));

	// Jahr-Histogramm
	const yearMap = new Map<number, number>();
	for (const r of rows) {
		if (r.jahr == null) continue;
		yearMap.set(r.jahr, (yearMap.get(r.jahr) ?? 0) + 1);
	}
	const yearHist: YearHistEntry[] = [...yearMap.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([year, count]) => ({ year, count }));

	// Zustand
	const mediaCondition: CountedItem[] = MEDIA_GRADES.map((grade) => ({
		label: grade,
		count: rows.filter((r) => r.zustandMc === grade).length
	})).filter((e) => e.count > 0);
	const sleeveCondition: CountedItem[] = SLEEVE_GRADES.map((grade) => ({
		label: grade,
		count: rows.filter((r) => r.zustandHuelle === grade).length
	})).filter((e) => e.count > 0);

	// Label-Verteilung
	const labelMap = new Map<string, number>();
	for (const r of rows) {
		if (!r.label) continue;
		labelMap.set(r.label, (labelMap.get(r.label) ?? 0) + 1);
	}
	const labels: CountedItem[] = [...labelMap.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));

	// Discogs-Marktwert
	const priceRows = db().select().from(discogsPriceCache).all();
	const priceMap = new Map<number, PriceData>();
	let lastFetchedAt: string | null = null;
	let currency: string | null = null;
	for (const pr of priceRows) {
		const parsed = parsePriceJson(pr.pricesJson);
		if (!parsed) continue;
		if (!parsed.suggestions && !parsed.marketplace) continue;
		priceMap.set(pr.releaseId, parsed);
		if (!lastFetchedAt || pr.fetchedAt > lastFetchedAt) lastFetchedAt = pr.fetchedAt;
		if (!currency && pr.currency) currency = pr.currency;
	}

	let mvTotal = 0;
	let mvPriced = 0;
	let mvMissingPrice = 0;
	let mvNoCondition = 0;
	let mvNoRelease = 0;
	for (const r of rows) {
		if (!r.discogsReleaseId) {
			mvNoRelease++;
			continue;
		}
		const data = priceMap.get(r.discogsReleaseId);
		if (!data) {
			mvMissingPrice++;
			continue;
		}
		if (!r.zustandMc) mvNoCondition++;
		const p = priceForGrade(data, r.zustandMc as never);
		if (!p) {
			mvMissingPrice++;
			continue;
		}
		mvTotal += p.cents;
		mvPriced++;
	}

	const totalReleases = rows.filter((r) => r.discogsReleaseId != null).length;

	return {
		kpis: {
			total,
			seriesCount: seriesSet.size,
			totalKaufpreisCent,
			withRelease,
			pushed,
			averageKaufpreisCent,
			rangeMonths
		},
		growth,
		seriesCompleteness,
		yearHist,
		mediaCondition,
		sleeveCondition,
		labels,
		marketValue: {
			totalCent: mvTotal,
			pricedCount: mvPriced,
			unpricedCount: mvMissingPrice + mvNoRelease,
			missingPriceCount: mvMissingPrice,
			withoutCondition: mvNoCondition,
			currency,
			lastFetchedAt,
			cachedReleases: priceMap.size,
			totalReleases
		}
	};
}

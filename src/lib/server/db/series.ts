import { and, asc, desc, eq, isNull, like } from 'drizzle-orm';
import { db } from './client';
import { appMeta, cassettes, type Cassette } from './schema';
import { getMeta, setMeta } from './meta';
import { findGaps, type SerieTarget } from '../gaps';
import { coverThumbUrl } from '$lib/util/cover';

const LOGO_PREFIX = 'serie_logo:';
const COLOR_PREFIX = 'serie_color:';
const TARGET_PREFIX = 'serie_target:';

export type { SerieTarget };

export type GroupKind = 'serie' | 'folder';

export interface SeriesEntry {
	/** Name der Gruppe — entweder Serien-Name oder Ordner-Name. */
	serie: string;
	/** Diskriminator: echte Serie (folder IS NULL) oder vom User definierter Ordner. */
	kind: GroupKind;
	count: number;
	/** Effektives Minimum: Target wenn gesetzt, sonst niedrigste besessene Folge. */
	min: number | null;
	/** Effektives Maximum: Target wenn gesetzt, sonst höchste besessene Folge. */
	max: number | null;
	/** Fehlende Folgen im effektiven Bereich. */
	missing: number[];
	withRelease: number;
	pushed: number;
	latestCovers: string[];
	logoPath: string | null;
	/** Hintergrundfarbe der Karte (auto aus Logo oder manuell gesetzt, #rrggbb). */
	color: string | null;
	target: SerieTarget | null;
	/** Anzahl besessener Folgen die außerhalb des Targets liegen (nur wenn Target gesetzt). */
	outsideTarget: number;
}

function thumbsFor(items: Cassette[], max = 4): string[] {
	const out: string[] = [];
	for (const c of items) {
		const u = coverThumbUrl(c);
		if (u && !out.includes(u)) out.push(u);
		if (out.length >= max) break;
	}
	return out;
}

function parseTarget(raw: string | null): SerieTarget | null {
	if (!raw) return null;
	try {
		const p = JSON.parse(raw);
		if (
			p &&
			typeof p === 'object' &&
			typeof p.min === 'number' &&
			typeof p.max === 'number' &&
			Number.isInteger(p.min) &&
			Number.isInteger(p.max) &&
			p.min >= 0 &&
			p.max >= p.min
		) {
			return { min: p.min, max: p.max };
		}
		return null;
	} catch {
		return null;
	}
}

export function getSeriesTarget(serie: string): SerieTarget | null {
	return parseTarget(getMeta(TARGET_PREFIX + serie));
}

export function setSeriesTarget(serie: string, target: SerieTarget | null): void {
	setMeta(TARGET_PREFIX + serie, target ? JSON.stringify(target) : null);
}

export function getAllSeriesTargets(): Map<string, SerieTarget> {
	const rows = db()
		.select()
		.from(appMeta)
		.where(like(appMeta.key, TARGET_PREFIX + '%'))
		.all();
	const map = new Map<string, SerieTarget>();
	for (const row of rows) {
		const target = parseTarget(row.value);
		if (target) {
			const serie = row.key.slice(TARGET_PREFIX.length);
			map.set(serie, target);
		}
	}
	return map;
}

/** Aggregiert alle Kassetten in Gruppen — Serien (folder IS NULL) und User-Ordner. */
export function listSeries(): SeriesEntry[] {
	const rows = db().select().from(cassettes).orderBy(desc(cassettes.createdAt)).all();

	const serieGroups = new Map<string, Cassette[]>();
	const folderGroups = new Map<string, Cassette[]>();
	for (const r of rows) {
		if (r.folder) {
			const list = folderGroups.get(r.folder);
			if (list) list.push(r);
			else folderGroups.set(r.folder, [r]);
		} else {
			const list = serieGroups.get(r.serie);
			if (list) list.push(r);
			else serieGroups.set(r.serie, [r]);
		}
	}

	const targets = getAllSeriesTargets();
	// Lücken nur für echte Serien — Ordner werden ignoriert (sind heterogen).
	const gaps = findGaps(
		rows.filter((r) => !r.folder).map((r) => ({ serie: r.serie, folgeNr: r.folgeNr })),
		targets
	);
	const gapsMap = new Map(gaps.map((g) => [g.serie, g.missing]));

	const result: SeriesEntry[] = [];

	for (const [serie, items] of serieGroups) {
		const folges = items.map((i) => i.folgeNr).filter((n): n is number => n != null);
		const target = targets.get(serie) ?? null;
		const ownedMin = folges.length ? Math.min(...folges) : null;
		const ownedMax = folges.length ? Math.max(...folges) : null;
		const min = target?.min ?? ownedMin;
		const max = target?.max ?? ownedMax;
		const outsideTarget = target
			? folges.filter((f) => f < target.min || f > target.max).length
			: 0;
		result.push({
			serie,
			kind: 'serie',
			count: items.length,
			min,
			max,
			missing: gapsMap.get(serie) ?? [],
			withRelease: items.filter((i) => i.discogsReleaseId != null).length,
			pushed: items.filter((i) => i.discogsInstanceId != null).length,
			latestCovers: thumbsFor(items),
			logoPath: getSeriesLogo(serie),
			color: getSeriesColor(serie),
			target,
			outsideTarget
		});
	}

	for (const [folder, items] of folderGroups) {
		result.push({
			serie: folder,
			kind: 'folder',
			count: items.length,
			min: null,
			max: null,
			missing: [],
			withRelease: items.filter((i) => i.discogsReleaseId != null).length,
			pushed: items.filter((i) => i.discogsInstanceId != null).length,
			latestCovers: thumbsFor(items),
			logoPath: getSeriesLogo(folder),
			color: getSeriesColor(folder),
			target: null,
			outsideTarget: 0
		});
	}

	return result.sort((a, b) => b.count - a.count || a.serie.localeCompare(b.serie, 'de'));
}

export interface SeriesDetail extends SeriesEntry {
	items: Cassette[];
}

/**
 * Folgen einer einzelnen Gruppe + Stats. Handhabt Serien (folder IS NULL)
 * und User-Ordner (folder = name). Wenn kind nicht angegeben, wird zuerst
 * Ordner geprüft, dann Serie.
 */
export function getSeriesDetail(name: string, kind?: GroupKind): SeriesDetail | null {
	// Folder first if not specified, or if explicitly 'folder'
	if (kind !== 'serie') {
		const folderItems = db()
			.select()
			.from(cassettes)
			.where(eq(cassettes.folder, name))
			.orderBy(asc(cassettes.serie), asc(cassettes.folgeNr), asc(cassettes.createdAt))
			.all();
		if (folderItems.length > 0) {
			return {
				serie: name,
				kind: 'folder',
				count: folderItems.length,
				min: null,
				max: null,
				missing: [],
				withRelease: folderItems.filter((i) => i.discogsReleaseId != null).length,
				pushed: folderItems.filter((i) => i.discogsInstanceId != null).length,
				latestCovers: thumbsFor(folderItems),
				logoPath: getSeriesLogo(name),
				color: getSeriesColor(name),
				target: null,
				outsideTarget: 0,
				items: folderItems
			};
		}
		if (kind === 'folder') return null;
	}

	const items = db()
		.select()
		.from(cassettes)
		.where(and(eq(cassettes.serie, name), isNull(cassettes.folder)))
		.orderBy(asc(cassettes.folgeNr), asc(cassettes.createdAt))
		.all();
	const target = getSeriesTarget(name);
	if (items.length === 0 && !target) return null;

	const folges = items.map((i) => i.folgeNr).filter((n): n is number => n != null);
	const ownedMin = folges.length ? Math.min(...folges) : null;
	const ownedMax = folges.length ? Math.max(...folges) : null;
	const min = target?.min ?? ownedMin;
	const max = target?.max ?? ownedMax;

	const targetsMap = target ? new Map([[name, target]]) : undefined;
	const gaps = findGaps(
		items.map((i) => ({ serie: i.serie, folgeNr: i.folgeNr })),
		targetsMap
	);
	const missing = gaps[0]?.missing ?? [];
	const outsideTarget = target ? folges.filter((f) => f < target.min || f > target.max).length : 0;

	return {
		serie: name,
		kind: 'serie',
		count: items.length,
		min,
		max,
		missing,
		withRelease: items.filter((i) => i.discogsReleaseId != null).length,
		pushed: items.filter((i) => i.discogsInstanceId != null).length,
		latestCovers: thumbsFor(items),
		logoPath: getSeriesLogo(name),
		color: getSeriesColor(name),
		target,
		outsideTarget,
		items
	};
}

export function getSeriesLogo(serie: string): string | null {
	return getMeta(LOGO_PREFIX + serie);
}

export function setSeriesLogo(serie: string, path: string | null): void {
	setMeta(LOGO_PREFIX + serie, path);
}

export function getSeriesColor(serie: string): string | null {
	return getMeta(COLOR_PREFIX + serie);
}

export function setSeriesColor(serie: string, hex: string | null): void {
	setMeta(COLOR_PREFIX + serie, hex);
}

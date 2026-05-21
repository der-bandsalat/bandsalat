/**
 * Verwaltung der bekannten "Die drei ???"-Kassetten-Auflagen pro Folge.
 *
 * Speicherung: `app_meta` mit Key `drei_auflagen:{folgeNr}` als JSON-Array.
 * Eine Auflage hat eine stabile ID `discogs:<release_id>` oder `manual:<uuid>`.
 * Eine Kassette gilt als "besessen" für eine Auflage, wenn ihr `auflageId`
 * mit dieser ID übereinstimmt — oder bei Discogs-Auflagen alternativ über
 * die `discogsReleaseId`.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './client';
import { cassettes, type Cassette } from './schema';
import { getMeta, setMeta } from './meta';

export const DREI_SERIE = 'Die drei ???';

export interface DreiAuflage {
	id: string;
	name: string;
	source: 'discogs' | 'manual';
	year: number | null;
	discogsReleaseId: number | null;
	coverUrl: string | null;
	coverCachePath: string | null;
	notes: string | null;
	createdAt: string;
}

function metaKey(folgeNr: number): string {
	return `drei_auflagen:${folgeNr}`;
}

export function listAuflagen(folgeNr: number): DreiAuflage[] {
	const raw = getMeta(metaKey(folgeNr));
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((a): a is DreiAuflage => isAuflage(a));
	} catch {
		return [];
	}
}

function isAuflage(v: unknown): v is DreiAuflage {
	if (!v || typeof v !== 'object') return false;
	const o = v as Record<string, unknown>;
	return typeof o.id === 'string' && typeof o.name === 'string';
}

export function saveAuflagen(folgeNr: number, list: DreiAuflage[]): void {
	if (list.length === 0) {
		setMeta(metaKey(folgeNr), null);
		return;
	}
	setMeta(metaKey(folgeNr), JSON.stringify(list));
}

export function addAuflage(
	folgeNr: number,
	patch: Omit<DreiAuflage, 'id' | 'createdAt'> & { id?: string }
): DreiAuflage {
	const existing = listAuflagen(folgeNr);
	const id =
		patch.id ??
		(patch.source === 'discogs' && patch.discogsReleaseId
			? `discogs:${patch.discogsReleaseId}`
			: `manual:${randomUUID()}`);
	// Duplikate (gleiche ID) ersetzen statt verdoppeln.
	const filtered = existing.filter((a) => a.id !== id);
	const next: DreiAuflage = {
		id,
		name: patch.name,
		source: patch.source,
		year: patch.year ?? null,
		discogsReleaseId: patch.discogsReleaseId ?? null,
		coverUrl: patch.coverUrl ?? null,
		coverCachePath: patch.coverCachePath ?? null,
		notes: patch.notes ?? null,
		createdAt: new Date().toISOString()
	};
	filtered.push(next);
	saveAuflagen(folgeNr, filtered);
	return next;
}

export function updateAuflage(
	folgeNr: number,
	id: string,
	patch: Partial<Omit<DreiAuflage, 'id' | 'createdAt'>>
): DreiAuflage | null {
	const list = listAuflagen(folgeNr);
	const idx = list.findIndex((a) => a.id === id);
	if (idx === -1) return null;
	const updated: DreiAuflage = { ...list[idx], ...patch, id, createdAt: list[idx].createdAt };
	list[idx] = updated;
	saveAuflagen(folgeNr, list);
	return updated;
}

export function deleteAuflage(folgeNr: number, id: string): void {
	const list = listAuflagen(folgeNr).filter((a) => a.id !== id);
	saveAuflagen(folgeNr, list);
}

/**
 * Welche Kassetten in der DB matchen welche Auflage einer Folge.
 * Eine Kassette zählt nur, wenn Serie = "Die drei ???" und Format = cassette
 * und folgeNr passt — und entweder ihre `auflageId` mit der Auflage-ID
 * matched, oder bei Discogs-Auflagen ihre `discogsReleaseId`.
 */
export function ownedCassettesForFolge(folgeNr: number): Cassette[] {
	return db()
		.select()
		.from(cassettes)
		.where(
			and(
				eq(cassettes.serie, DREI_SERIE),
				eq(cassettes.format, 'cassette'),
				eq(cassettes.folgeNr, folgeNr)
			)
		)
		.all();
}

export interface FolgeAuflagenStatus {
	folgeNr: number;
	auflagen: DreiAuflage[];
	owned: Cassette[];
	/** Map auflageId → Cassette (erste passende), wenn besessen. */
	ownedBy: Record<string, Cassette>;
}

export function getFolgeAuflagenStatus(folgeNr: number): FolgeAuflagenStatus {
	const auflagen = listAuflagen(folgeNr);
	const owned = ownedCassettesForFolge(folgeNr);
	const ownedBy: Record<string, Cassette> = {};
	for (const a of auflagen) {
		const match = owned.find((c) => {
			if (c.auflageId === a.id) return true;
			if (a.source === 'discogs' && a.discogsReleaseId && c.discogsReleaseId === a.discogsReleaseId)
				return true;
			return false;
		});
		if (match) ownedBy[a.id] = match;
	}
	return { folgeNr, auflagen, owned, ownedBy };
}

/**
 * Welche Folgen sollen in der Auflagen-Übersicht angezeigt werden? Quellen:
 * 1. Folgen mit existierenden Kassetten (Serie=Drei??? / Format=cassette)
 * 2. Folgen mit definierten Auflagen-Listen im app_meta
 * 3. Wenn ein Target-Range angegeben ist: alle Folgen im Bereich [min..max]
 *
 * Die dritte Quelle füllt Lücken — wenn du Folge 1, 2, 3 besitzt und Target
 * 1–100 gesetzt hast, siehst du alle 100, inkl. der fehlenden 4–100.
 */
export function getAllFolgenWithAuflagen(targetRange?: {
	min: number;
	max: number;
}): FolgeAuflagenStatus[] {
	const folgenRows = db()
		.select({ folgeNr: cassettes.folgeNr })
		.from(cassettes)
		.where(
			and(
				eq(cassettes.serie, DREI_SERIE),
				eq(cassettes.format, 'cassette'),
				sql`${cassettes.folgeNr} IS NOT NULL`
			)
		)
		.groupBy(cassettes.folgeNr)
		.all();
	const folgen = new Set<number>(
		folgenRows.map((r) => r.folgeNr).filter((n): n is number => n != null)
	);

	const metaRows = db()
		.select({ key: sql<string>`key` })
		.from(sql`app_meta`)
		.where(sql`key LIKE 'drei_auflagen:%'`)
		.all() as { key: string }[];
	for (const r of metaRows) {
		const m = r.key.match(/^drei_auflagen:(\d+)$/);
		if (m) folgen.add(Number.parseInt(m[1], 10));
	}

	if (targetRange && targetRange.max >= targetRange.min) {
		for (let n = targetRange.min; n <= targetRange.max; n++) folgen.add(n);
	}

	const sorted = [...folgen].sort((a, b) => a - b);
	return sorted.map((n) => getFolgeAuflagenStatus(n));
}

import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	like,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { db } from './client';
import { cassettes, listenLog, type Cassette, type NewCassette } from './schema';
import type { SearchFilter } from '$lib/validation/cassette';

const nowIso = () => new Date().toISOString();

export function listCassettes(filter: SearchFilter = {}): Cassette[] {
	const conds: SQL[] = [];

	if (filter.q) {
		const needle = `%${filter.q.toLowerCase()}%`;
		conds.push(
			or(
				like(sql`lower(${cassettes.serie})`, needle),
				like(sql`lower(${cassettes.titel})`, needle),
				like(sql`lower(coalesce(${cassettes.seriennummer}, ''))`, needle),
				like(sql`lower(coalesce(${cassettes.notiz}, ''))`, needle)
			) as SQL
		);
	}
	if (filter.serie) conds.push(eq(cassettes.serie, filter.serie));
	if (filter.label) conds.push(eq(cassettes.label, filter.label));
	if (filter.format) conds.push(eq(cassettes.format, filter.format));
	if (filter.zustand) conds.push(eq(cassettes.zustandMc, filter.zustand));
	if (filter.originalhuelle === 'ja') conds.push(eq(cassettes.originalhuelle, true));
	if (filter.originalhuelle === 'nein') conds.push(eq(cassettes.originalhuelle, false));
	if (filter.hatDiscogs === 'ja') conds.push(isNotNull(cassettes.discogsReleaseId));
	if (filter.hatDiscogs === 'nein') conds.push(isNull(cassettes.discogsReleaseId));
	if (filter.kaufVon) conds.push(sql`${cassettes.kaufdatum} >= ${filter.kaufVon}`);
	if (filter.kaufBis) conds.push(sql`${cassettes.kaufdatum} <= ${filter.kaufBis}`);

	const where = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);

	// Korrelierte Subqueries für die Hör-Protokoll-Sortierungen. SQLite
	// optimiert die mit dem listen_log_cassette_idx-Index gut.
	const lastListenedExpr = sql<
		string | null
	>`(SELECT MAX(${listenLog.listenedAt}) FROM ${listenLog} WHERE ${listenLog.cassetteId} = ${cassettes.id})`;
	const timesListenedExpr = sql<number>`(SELECT COUNT(*) FROM ${listenLog} WHERE ${listenLog.cassetteId} = ${cassettes.id})`;

	const orderBy = (() => {
		switch (filter.sort) {
			case 'created_asc':
				return [asc(cassettes.createdAt)];
			case 'serie':
				return [asc(cassettes.serie), asc(cassettes.folgeNr)];
			case 'folge_asc':
				return [asc(cassettes.serie), asc(cassettes.folgeNr)];
			case 'folge_desc':
				return [asc(cassettes.serie), desc(cassettes.folgeNr)];
			case 'jahr_desc':
				return [desc(cassettes.jahr), asc(cassettes.serie)];
			case 'jahr_asc':
				return [asc(cassettes.jahr), asc(cassettes.serie)];
			case 'preis_desc':
				return [desc(cassettes.kaufpreisCent), asc(cassettes.serie)];
			case 'preis_asc':
				return [asc(cassettes.kaufpreisCent), asc(cassettes.serie)];
			case 'last_listened_desc':
				// Zuletzt gehörte zuerst; nie-Gehörte ans Ende.
				return [sql`${lastListenedExpr} IS NULL`, sql`${lastListenedExpr} DESC`];
			case 'last_listened_asc':
				// Am längsten nicht gehörte zuerst (Empfehlungs-Modus).
				// Nie-Gehörte ans Ende, damit der User die zuerst nicht sieht.
				return [sql`${lastListenedExpr} IS NULL`, sql`${lastListenedExpr} ASC`];
			case 'most_listened':
				return [sql`${timesListenedExpr} DESC`, asc(cassettes.serie)];
			case 'rating_desc':
				return [sql`${cassettes.rating} IS NULL`, sql`${cassettes.rating} DESC`];
			case 'rating_asc':
				return [sql`${cassettes.rating} IS NULL`, sql`${cassettes.rating} ASC`];
			case 'created_desc':
			default:
				return [desc(cassettes.createdAt)];
		}
	})();

	const q = db().select().from(cassettes);
	const filtered = where ? q.where(where) : q;
	return filtered.orderBy(...orderBy).all();
}

export function getCassette(id: string): Cassette | undefined {
	return db().select().from(cassettes).where(eq(cassettes.id, id)).get();
}

export function createCassette(
	data: Omit<NewCassette, 'id' | 'createdAt' | 'updatedAt'>
): Cassette {
	const id = crypto.randomUUID();
	const ts = nowIso();
	const row: NewCassette = { id, createdAt: ts, updatedAt: ts, ...data };
	db().insert(cassettes).values(row).run();
	return db().select().from(cassettes).where(eq(cassettes.id, id)).get()!;
}

export function updateCassette(
	id: string,
	data: Partial<Omit<NewCassette, 'id' | 'createdAt'>>
): Cassette | undefined {
	const ts = nowIso();
	db()
		.update(cassettes)
		.set({ ...data, updatedAt: ts })
		.where(eq(cassettes.id, id))
		.run();
	return getCassette(id);
}

export function deleteCassette(id: string): void {
	db().delete(cassettes).where(eq(cassettes.id, id)).run();
}

export function distinctSerien(): string[] {
	const rows = db()
		.select({ serie: cassettes.serie })
		.from(cassettes)
		.groupBy(cassettes.serie)
		.orderBy(asc(cassettes.serie))
		.all();
	return rows.map((r) => r.serie);
}

export function distinctLabels(): string[] {
	const rows = db()
		.select({ label: cassettes.label })
		.from(cassettes)
		.where(isNotNull(cassettes.label))
		.groupBy(cassettes.label)
		.orderBy(asc(cassettes.label))
		.all();
	return rows.map((r) => r.label).filter((l): l is string => !!l);
}

export function distinctFolders(): string[] {
	const rows = db()
		.select({ folder: cassettes.folder })
		.from(cassettes)
		.where(isNotNull(cassettes.folder))
		.groupBy(cassettes.folder)
		.orderBy(asc(cassettes.folder))
		.all();
	return rows.map((r) => r.folder).filter((f): f is string => !!f);
}

export interface DuplicateMatch {
	cassette: Cassette;
	reason: 'exact' | 'release';
}

/**
 * Sucht potentielle Duplikate für eine neu erkannte/eingegebene Folge.
 * Match-Strategien:
 *  - "exact":   serie + folge_nr identisch (case-insensitive bei Serie)
 *  - "release": discogs_release_id liegt in den übergebenen IDs
 *
 * Beide werden zusammengeführt; bei doppelten Treffern gewinnt 'exact'.
 */
export function findPotentialDuplicates(query: {
	serie?: string | null;
	folgeNr?: number | null;
	releaseIds?: readonly number[];
}): DuplicateMatch[] {
	const out: DuplicateMatch[] = [];
	const seen = new Set<string>();

	if (query.serie && query.folgeNr != null && Number.isInteger(query.folgeNr)) {
		const matches = db()
			.select()
			.from(cassettes)
			.where(
				and(
					sql`lower(${cassettes.serie}) = lower(${query.serie})`,
					eq(cassettes.folgeNr, query.folgeNr)
				)
			)
			.all();
		for (const m of matches) {
			if (seen.has(m.id)) continue;
			out.push({ cassette: m, reason: 'exact' });
			seen.add(m.id);
		}
	}

	if (query.releaseIds && query.releaseIds.length > 0) {
		const matches = db()
			.select()
			.from(cassettes)
			.where(inArray(cassettes.discogsReleaseId, [...query.releaseIds]))
			.all();
		for (const m of matches) {
			if (seen.has(m.id)) continue;
			out.push({ cassette: m, reason: 'release' });
			seen.add(m.id);
		}
	}

	return out;
}

import { randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from './client';
import { listenLog, type ListenLogEntry } from './schema';

const nowIso = () => new Date().toISOString();

export function listListens(cassetteId: string, limit = 100): ListenLogEntry[] {
	return db()
		.select()
		.from(listenLog)
		.where(eq(listenLog.cassetteId, cassetteId))
		.orderBy(desc(listenLog.listenedAt))
		.limit(limit)
		.all();
}

export function addListen(
	cassetteId: string,
	opts: { listenedAt?: string; note?: string | null } = {}
): ListenLogEntry {
	const id = randomUUID();
	const row = {
		id,
		cassetteId,
		listenedAt: opts.listenedAt ?? nowIso(),
		note: opts.note ?? null,
		createdAt: nowIso()
	};
	db().insert(listenLog).values(row).run();
	return row;
}

export function deleteListen(id: string): void {
	db().delete(listenLog).where(eq(listenLog.id, id)).run();
}

export interface ListenStats {
	count: number;
	lastListenedAt: string | null;
}

export function getListenStats(cassetteId: string): ListenStats {
	const row = db()
		.select({
			count: sql<number>`count(*)`,
			last: sql<string | null>`max(${listenLog.listenedAt})`
		})
		.from(listenLog)
		.where(eq(listenLog.cassetteId, cassetteId))
		.get();
	return {
		count: row?.count ?? 0,
		lastListenedAt: row?.last ?? null
	};
}

import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from './client';
import { wantlist, type NewWantlistEntry, type WantlistEntry } from './schema';

const nowIso = () => new Date().toISOString();

export function listWantlist(): WantlistEntry[] {
	return db()
		.select()
		.from(wantlist)
		.orderBy(desc(wantlist.priority), desc(wantlist.createdAt))
		.all();
}

export function getWantlistEntry(id: string): WantlistEntry | undefined {
	return db().select().from(wantlist).where(eq(wantlist.id, id)).get();
}

export function findWantlistByRelease(releaseId: number): WantlistEntry | undefined {
	return db()
		.select()
		.from(wantlist)
		.where(and(eq(wantlist.discogsReleaseId, releaseId), isNotNull(wantlist.discogsReleaseId)))
		.get();
}

type CreateInput = Omit<NewWantlistEntry, 'id' | 'createdAt' | 'updatedAt'>;

export function createWantlistEntry(input: CreateInput): WantlistEntry {
	const id = randomUUID();
	const now = nowIso();
	const row: NewWantlistEntry = {
		id,
		createdAt: now,
		updatedAt: now,
		...input
	};
	db().insert(wantlist).values(row).run();
	return getWantlistEntry(id)!;
}

type UpdateInput = Partial<Omit<NewWantlistEntry, 'id' | 'createdAt'>>;

export function updateWantlistEntry(id: string, patch: UpdateInput): void {
	db()
		.update(wantlist)
		.set({ ...patch, updatedAt: nowIso() })
		.where(eq(wantlist.id, id))
		.run();
}

export function deleteWantlistEntry(id: string): void {
	db().delete(wantlist).where(eq(wantlist.id, id)).run();
}

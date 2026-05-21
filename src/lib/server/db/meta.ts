import { eq } from 'drizzle-orm';
import { db } from './client';
import { appMeta } from './schema';

export function getMeta(key: string): string | null {
	const row = db().select().from(appMeta).where(eq(appMeta.key, key)).get();
	return row?.value ?? null;
}

export function setMeta(key: string, value: string | null): void {
	const existing = db().select().from(appMeta).where(eq(appMeta.key, key)).get();
	const ts = new Date().toISOString();
	if (existing) {
		db().update(appMeta).set({ value, updatedAt: ts }).where(eq(appMeta.key, key)).run();
	} else {
		db().insert(appMeta).values({ key, value, updatedAt: ts }).run();
	}
}

export function getMetaJSON<T>(key: string): T | null {
	const v = getMeta(key);
	if (!v) return null;
	try {
		return JSON.parse(v) as T;
	} catch {
		return null;
	}
}

export function setMetaJSON(key: string, value: unknown): void {
	setMeta(key, JSON.stringify(value));
}

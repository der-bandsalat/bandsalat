import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from './client';
import { folgeCover, type FolgeCover, type NewFolgeCover } from './schema';

const nowIso = () => new Date().toISOString();

export function getFolgeCover(serie: string, folgeNr: number): FolgeCover | undefined {
	return db()
		.select()
		.from(folgeCover)
		.where(and(eq(folgeCover.serie, serie), eq(folgeCover.folgeNr, folgeNr)))
		.get();
}

export interface UpsertFolgeCoverInput {
	serie: string;
	folgeNr: number;
	source: 'dreimetadaten' | 'manual';
	sourceUrl: string | null;
	cachePath: string;
	thumbPath: string;
	titel?: string | null;
}

export function upsertFolgeCover(input: UpsertFolgeCoverInput): FolgeCover {
	const existing = getFolgeCover(input.serie, input.folgeNr);
	const now = nowIso();
	if (existing) {
		db()
			.update(folgeCover)
			.set({
				source: input.source,
				sourceUrl: input.sourceUrl,
				cachePath: input.cachePath,
				thumbPath: input.thumbPath,
				titel: input.titel ?? existing.titel,
				fetchedAt: now,
				updatedAt: now
			})
			.where(eq(folgeCover.id, existing.id))
			.run();
		return getFolgeCover(input.serie, input.folgeNr)!;
	}
	const row: NewFolgeCover = {
		id: randomUUID(),
		serie: input.serie,
		folgeNr: input.folgeNr,
		source: input.source,
		sourceUrl: input.sourceUrl,
		cachePath: input.cachePath,
		thumbPath: input.thumbPath,
		titel: input.titel ?? null,
		fetchedAt: now,
		createdAt: now,
		updatedAt: now
	};
	db().insert(folgeCover).values(row).run();
	return getFolgeCover(input.serie, input.folgeNr)!;
}

export function deleteFolgeCover(serie: string, folgeNr: number): void {
	db()
		.delete(folgeCover)
		.where(and(eq(folgeCover.serie, serie), eq(folgeCover.folgeNr, folgeNr)))
		.run();
}

/**
 * Batch-Lookup für Listen-Views. Liefert eine Map mit Key "<serie>|<folgeNr>"
 * → { original, thumb }. Wird vom Grid + Liste auf /kassetten und der Serien-
 * Detailseite genutzt.
 */
export function getAllFolgeCoversMap(): Map<string, { original: string; thumb: string }> {
	const rows = db().select().from(folgeCover).all();
	const map = new Map<string, { original: string; thumb: string }>();
	for (const r of rows) {
		map.set(`${r.serie}|${r.folgeNr}`, { original: r.cachePath, thumb: r.thumbPath });
	}
	return map;
}

/** Batch-Lookup für Titel pro Folge ("<serie>|<folgeNr>" → titel). */
export function getAllFolgeTitelMap(): Map<string, string> {
	const rows = db().select().from(folgeCover).all();
	const map = new Map<string, string>();
	for (const r of rows) {
		if (r.titel) map.set(`${r.serie}|${r.folgeNr}`, r.titel);
	}
	return map;
}

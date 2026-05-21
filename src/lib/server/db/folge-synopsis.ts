import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from './client';
import { folgeSynopsis, type FolgeSynopsis, type NewFolgeSynopsis } from './schema';

const nowIso = () => new Date().toISOString();

export function getFolgeSynopsis(serie: string, folgeNr: number): FolgeSynopsis | undefined {
	return db()
		.select()
		.from(folgeSynopsis)
		.where(and(eq(folgeSynopsis.serie, serie), eq(folgeSynopsis.folgeNr, folgeNr)))
		.get();
}

export interface UpsertSynopsisInput {
	serie: string;
	folgeNr: number;
	text: string;
	source: 'dreimetadaten' | 'discogs' | 'manual';
	sourceUrl: string | null;
}

export function upsertFolgeSynopsis(input: UpsertSynopsisInput): FolgeSynopsis {
	const existing = getFolgeSynopsis(input.serie, input.folgeNr);
	const now = nowIso();
	if (existing) {
		db()
			.update(folgeSynopsis)
			.set({
				text: input.text,
				source: input.source,
				sourceUrl: input.sourceUrl,
				fetchedAt: now,
				updatedAt: now
			})
			.where(eq(folgeSynopsis.id, existing.id))
			.run();
		return getFolgeSynopsis(input.serie, input.folgeNr)!;
	}
	const row: NewFolgeSynopsis = {
		id: randomUUID(),
		...input,
		fetchedAt: now,
		createdAt: now,
		updatedAt: now
	};
	db().insert(folgeSynopsis).values(row).run();
	return getFolgeSynopsis(input.serie, input.folgeNr)!;
}

export function deleteFolgeSynopsis(serie: string, folgeNr: number): void {
	db()
		.delete(folgeSynopsis)
		.where(and(eq(folgeSynopsis.serie, serie), eq(folgeSynopsis.folgeNr, folgeNr)))
		.run();
}

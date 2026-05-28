/**
 * CRUD + Reorder für die mehrfach-Bilder pro Kassette. Synchronisiert
 * cassettes.coverFotoPath bidirektional mit dem aktuellen ersten 'front'-Foto,
 * damit der vorhandene "Cover-Source"-Mechanismus auf der Visualisierung
 * weiter funktioniert.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from './client';
import { cassettePhotos, cassettes, type CassettePhotoRole } from './schema';

const nowIso = () => new Date().toISOString();

export interface CassettePhotoInput {
	cassetteId: string;
	role: CassettePhotoRole;
	path: string;
	thumbPath: string | null;
	caption?: string | null;
}

export function listCassettePhotos(cassetteId: string) {
	return db()
		.select()
		.from(cassettePhotos)
		.where(eq(cassettePhotos.cassetteId, cassetteId))
		.orderBy(asc(cassettePhotos.sortOrder), asc(cassettePhotos.createdAt))
		.all();
}

/** Anzahl Fotos pro Kassette für eine Liste — eine Aggregat-Query statt N
 *  Einzel-Queries beim Rendern der Kassetten-Übersicht. */
export function photoCountsForCassettes(cassetteIds: string[]): Map<string, number> {
	const out = new Map<string, number>();
	if (cassetteIds.length === 0) return out;
	const rows = db()
		.select({
			cassetteId: cassettePhotos.cassetteId,
			cnt: sql<number>`count(*)`
		})
		.from(cassettePhotos)
		.where(sql`${cassettePhotos.cassetteId} IN ${cassetteIds}`)
		.groupBy(cassettePhotos.cassetteId)
		.all();
	for (const r of rows) out.set(r.cassetteId, Number(r.cnt));
	return out;
}

export function getCassettePhoto(photoId: string) {
	return db().select().from(cassettePhotos).where(eq(cassettePhotos.id, photoId)).get();
}

export function addCassettePhoto(input: CassettePhotoInput): string {
	const id = randomUUID();
	// sort_order: ans Ende der gleichen Rolle anhängen.
	const maxOrder =
		db()
			.select({ m: sql<number>`coalesce(max(${cassettePhotos.sortOrder}), -1)` })
			.from(cassettePhotos)
			.where(
				and(eq(cassettePhotos.cassetteId, input.cassetteId), eq(cassettePhotos.role, input.role))
			)
			.get()?.m ?? -1;
	db()
		.insert(cassettePhotos)
		.values({
			id,
			cassetteId: input.cassetteId,
			role: input.role,
			sortOrder: maxOrder + 1,
			path: input.path,
			thumbPath: input.thumbPath,
			caption: input.caption ?? null
		})
		.run();
	if (input.role === 'front') syncCoverPath(input.cassetteId);
	return id;
}

export function deleteCassettePhoto(
	photoId: string
): { path: string; thumbPath: string | null; cassetteId: string } | null {
	const photo = getCassettePhoto(photoId);
	if (!photo) return null;
	db().delete(cassettePhotos).where(eq(cassettePhotos.id, photoId)).run();
	syncCoverPath(photo.cassetteId);
	return { path: photo.path, thumbPath: photo.thumbPath, cassetteId: photo.cassetteId };
}

export function updateCassettePhoto(
	photoId: string,
	patch: { role?: CassettePhotoRole; sortOrder?: number; caption?: string | null }
) {
	const photo = getCassettePhoto(photoId);
	if (!photo) return null;
	const set: Record<string, unknown> = {};
	if (patch.role !== undefined) set.role = patch.role;
	if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
	if (patch.caption !== undefined) set.caption = patch.caption;
	if (Object.keys(set).length === 0) return photo;
	db().update(cassettePhotos).set(set).where(eq(cassettePhotos.id, photoId)).run();
	if (patch.role !== undefined) syncCoverPath(photo.cassetteId);
	return getCassettePhoto(photoId);
}

/** Reorder einer ganzen Rollen-Reihe. `photoIds` muss alle Fotos der angegebenen
 *  Rolle in gewünschter Reihenfolge enthalten. */
export function reorderRole(cassetteId: string, role: CassettePhotoRole, photoIds: string[]) {
	const existing = listCassettePhotos(cassetteId).filter((p) => p.role === role);
	const validIds = new Set(existing.map((p) => p.id));
	for (const id of photoIds) {
		if (!validIds.has(id)) continue;
	}
	let order = 0;
	for (const id of photoIds) {
		if (!validIds.has(id)) continue;
		db().update(cassettePhotos).set({ sortOrder: order++ }).where(eq(cassettePhotos.id, id)).run();
	}
}

/** Aktualisiert cassettes.coverFotoPath auf das erste 'front'-Foto (oder null). */
function syncCoverPath(cassetteId: string) {
	const front = db()
		.select({ path: cassettePhotos.path })
		.from(cassettePhotos)
		.where(and(eq(cassettePhotos.cassetteId, cassetteId), eq(cassettePhotos.role, 'front')))
		.orderBy(asc(cassettePhotos.sortOrder), asc(cassettePhotos.createdAt))
		.get();
	db()
		.update(cassettes)
		.set({ coverFotoPath: front?.path ?? null, updatedAt: nowIso() })
		.where(eq(cassettes.id, cassetteId))
		.run();
}

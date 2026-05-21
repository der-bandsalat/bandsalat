import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from './client';
import { shares, type NewShare, type Share } from './schema';

const nowIso = () => new Date().toISOString();

function generateToken(): string {
	// 18 bytes → 24 chars base64url, urlsafe und unguessable
	return randomBytes(18).toString('base64url');
}

export interface CreateShareInput {
	scope: 'collection' | 'serie';
	scopeRef: string | null;
	title?: string | null;
	createdByUserId: string;
	expiresAt?: string | null;
}

export function createShare(input: CreateShareInput): Share {
	const id = randomUUID();
	const token = generateToken();
	const now = nowIso();
	const row: NewShare = {
		id,
		token,
		scope: input.scope,
		scopeRef: input.scopeRef,
		title: input.title ?? null,
		createdByUserId: input.createdByUserId,
		expiresAt: input.expiresAt ?? null,
		createdAt: now,
		updatedAt: now,
		revokedAt: null
	};
	db().insert(shares).values(row).run();
	return getShareById(id)!;
}

export function getShareById(id: string): Share | undefined {
	return db().select().from(shares).where(eq(shares.id, id)).get();
}

export function listSharesByUser(userId: string): Share[] {
	return db()
		.select()
		.from(shares)
		.where(eq(shares.createdByUserId, userId))
		.orderBy(desc(shares.createdAt))
		.all();
}

export function listAllShares(): Share[] {
	return db().select().from(shares).orderBy(desc(shares.createdAt)).all();
}

export function findActiveShareByToken(token: string): Share | undefined {
	const now = nowIso();
	return db()
		.select()
		.from(shares)
		.where(
			and(
				eq(shares.token, token),
				isNull(shares.revokedAt),
				or(isNull(shares.expiresAt), sql`${shares.expiresAt} > ${now}`)
			)
		)
		.get();
}

export function revokeShare(id: string): void {
	db()
		.update(shares)
		.set({ revokedAt: nowIso(), updatedAt: nowIso() })
		.where(eq(shares.id, id))
		.run();
}

export function deleteShare(id: string): void {
	db().delete(shares).where(eq(shares.id, id)).run();
}

import { randomUUID } from 'node:crypto';
import { eq, or, sql } from 'drizzle-orm';
import argon2 from 'argon2';
import { db } from './client';
import { users, type NewUser, type User, type UserRole } from './schema';

const nowIso = () => new Date().toISOString();

export function listUsers(): User[] {
	return db().select().from(users).orderBy(users.createdAt).all();
}

export function countUsers(): number {
	const row = db()
		.select({ c: sql<number>`count(*)` })
		.from(users)
		.get();
	return row?.c ?? 0;
}

export function getUserById(id: string): User | undefined {
	return db().select().from(users).where(eq(users.id, id)).get();
}

export function getUserByLogin(login: string): User | undefined {
	// "login" kann Username oder E-Mail sein.
	const needle = login.trim().toLowerCase();
	return db()
		.select()
		.from(users)
		.where(or(sql`lower(${users.username}) = ${needle}`, sql`lower(${users.email}) = ${needle}`))
		.get();
}

export function isUsernameTaken(username: string, exceptId?: string): boolean {
	const row = db()
		.select({ id: users.id })
		.from(users)
		.where(sql`lower(${users.username}) = ${username.trim().toLowerCase()}`)
		.get();
	if (!row) return false;
	return exceptId ? row.id !== exceptId : true;
}

export function isEmailTaken(email: string, exceptId?: string): boolean {
	const row = db()
		.select({ id: users.id })
		.from(users)
		.where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
		.get();
	if (!row) return false;
	return exceptId ? row.id !== exceptId : true;
}

export interface CreateUserInput {
	username: string;
	email: string;
	password?: string;
	passwordHash?: string;
	role?: UserRole;
	active?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<User> {
	const passwordHash =
		input.passwordHash ?? (await argon2.hash(input.password ?? '', { type: argon2.argon2id }));
	const id = randomUUID();
	const now = nowIso();
	const row: NewUser = {
		id,
		username: input.username.trim(),
		email: input.email.trim().toLowerCase(),
		passwordHash,
		role: input.role ?? 'viewer',
		active: input.active ?? true,
		createdAt: now,
		updatedAt: now,
		lastLoginAt: null
	};
	db().insert(users).values(row).run();
	return getUserById(id)!;
}

export async function setUserPassword(id: string, newPassword: string): Promise<void> {
	const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
	db().update(users).set({ passwordHash: hash, updatedAt: nowIso() }).where(eq(users.id, id)).run();
}

export function updateUser(
	id: string,
	patch: Partial<Pick<User, 'username' | 'email' | 'role' | 'active'>>
): User | undefined {
	const set: Record<string, unknown> = { updatedAt: nowIso() };
	if (patch.username !== undefined) set.username = patch.username.trim();
	if (patch.email !== undefined) set.email = patch.email.trim().toLowerCase();
	if (patch.role !== undefined) set.role = patch.role;
	if (patch.active !== undefined) set.active = patch.active;
	db().update(users).set(set).where(eq(users.id, id)).run();
	return getUserById(id);
}

export function deleteUser(id: string): void {
	db().delete(users).where(eq(users.id, id)).run();
}

export function recordLogin(id: string): void {
	db().update(users).set({ lastLoginAt: nowIso() }).where(eq(users.id, id)).run();
}

export async function verifyUserPassword(user: User, password: string): Promise<boolean> {
	try {
		return await argon2.verify(user.passwordHash, password);
	} catch {
		return false;
	}
}

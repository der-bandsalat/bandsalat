/**
 * Rollen-basierte Authorization-Helpers. Wird in Form-Actions und +server.ts
 * eingesetzt, um Endpoints abzusichern.
 *
 * Rolle  | darf
 * -------|-------------------------------
 * admin  | alles (User-Verwaltung inklusive)
 * editor | CRUD auf Sammlung, Wantlist, Auflagen, Shares
 * viewer | nur lesen
 */
import { error } from '@sveltejs/kit';
import type { UserRole } from '$lib/server/db/schema';

const RANK: Record<UserRole, number> = { admin: 3, editor: 2, viewer: 1 };

export function hasRole(user: App.Locals['user'], min: UserRole): boolean {
	if (!user) return false;
	return RANK[user.role] >= RANK[min];
}

export function ensureRole(locals: App.Locals, min: UserRole): void {
	if (!locals.user) throw error(401);
	if (RANK[locals.user.role] < RANK[min]) {
		throw error(403, `Du brauchst die Rolle ${min} oder höher für diese Aktion.`);
	}
}

export function ensureEditor(locals: App.Locals): void {
	ensureRole(locals, 'editor');
}

export function ensureAdmin(locals: App.Locals): void {
	ensureRole(locals, 'admin');
}

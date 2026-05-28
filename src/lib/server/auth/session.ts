import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '../env';

export const SESSION_COOKIE = 'bandsalat_session';

function sign(payload: string): string {
	return createHmac('sha256', env().SESSION_SECRET).update(payload).digest('base64url');
}

function constEq(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
}

/**
 * Token-Format: `<userId>.<expMs>.<nonce>.<sig>`. User-ID kann auch
 * leer sein (Legacy-Token vor Multi-User), dann wird der Token akzeptiert
 * aber ohne User-Identität — Migrations-Pfad.
 */
export function createSessionToken(
	userId: string,
	options?: { expiresAt?: Date }
): { token: string; expiresAt: Date } {
	const expiresAt =
		options?.expiresAt ?? new Date(Date.now() + env().SESSION_DAYS * 24 * 60 * 60 * 1000);
	const exp = expiresAt.getTime().toString(10);
	const nonce = randomBytes(16).toString('base64url');
	const payload = `${userId}.${exp}.${nonce}`;
	const sig = sign(payload);
	return { token: `${payload}.${sig}`, expiresAt };
}

export interface VerifiedSession {
	valid: true;
	userId: string;
	expiresAt: Date;
}

export function verifySessionToken(token: string | undefined): VerifiedSession | null {
	if (!token) return null;
	const parts = token.split('.');
	// Neues Format: userId.exp.nonce.sig (4 Teile)
	if (parts.length !== 4) return null;
	const [userId, exp, nonce, sig] = parts;
	const expected = sign(`${userId}.${exp}.${nonce}`);
	if (!constEq(expected, sig)) return null;
	const expMs = Number.parseInt(exp, 10);
	if (!Number.isFinite(expMs) || expMs < Date.now()) return null;
	return { valid: true, userId, expiresAt: new Date(expMs) };
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: env().NODE_ENV === 'production',
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

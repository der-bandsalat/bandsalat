import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env';

export type DemoAction = 'login' | 'extend';

export interface VerifiedDemoToken {
	action: DemoAction;
	username: string;
	expMs: number;
	nonce: string;
}

function sign(payload: string): string {
	const secret = env().DEMO_HMAC_SECRET;
	if (!secret) throw new Error('DEMO_HMAC_SECRET nicht gesetzt');
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

function constEq(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
}

/**
 * Token-Format: `<action>.<username>.<expMs>.<nonce>.<sig>`.
 * Vom Orchestrator erzeugt, hier verifiziert. Nonces sind single-use innerhalb
 * der TTL (in-memory, pro Container — ausreichend weil jeder Slot eigener
 * Container ist und Tokens nur Sekunden gültig sind).
 */
export function verifyDemoToken(token: string | undefined): VerifiedDemoToken | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 5) return null;
	const [action, username, exp, nonce, sig] = parts;
	if (action !== 'login' && action !== 'extend') return null;
	let expected: string;
	try {
		expected = sign(`${action}.${username}.${exp}.${nonce}`);
	} catch {
		return null;
	}
	if (!constEq(expected, sig)) return null;
	const expMs = Number.parseInt(exp, 10);
	if (!Number.isFinite(expMs) || expMs < Date.now()) return null;
	return { action, username, expMs, nonce };
}

const NONCE_TTL_MS = 10 * 60 * 1000;
const usedNonces = new Map<string, number>();

export function consumeNonce(nonce: string): boolean {
	const now = Date.now();
	for (const [key, expiresAt] of usedNonces) {
		if (expiresAt < now) usedNonces.delete(key);
	}
	if (usedNonces.has(nonce)) return false;
	usedNonces.set(nonce, now + NONCE_TTL_MS);
	return true;
}

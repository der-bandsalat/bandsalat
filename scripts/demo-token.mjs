#!/usr/bin/env node
/**
 * Erzeugt einen Magic-Token zum Demo-Login oder Session-Extend.
 *
 * Im Produktivbetrieb erzeugt der Orchestrator diese Tokens. Dieses Script
 * existiert nur, um Demo-Mode lokal manuell zu testen.
 *
 * Usage:
 *   DEMO_HMAC_SECRET=... node scripts/demo-token.mjs [login|extend] [username]
 *
 * Defaults: action=login, username=demo.
 *
 * Token läuft 60s ab Erzeugung.
 */
import { createHmac, randomBytes } from 'node:crypto';

const action = process.argv[2] ?? 'login';
const username = process.argv[3] ?? 'demo';

if (action !== 'login' && action !== 'extend') {
	console.error(`Unbekannte Action: ${action}. Erlaubt: login, extend.`);
	process.exit(1);
}

const secret = process.env.DEMO_HMAC_SECRET;
if (!secret || secret.length < 32) {
	console.error('DEMO_HMAC_SECRET ist nicht gesetzt oder zu kurz (>=32 Zeichen).');
	process.exit(1);
}

const expMs = Date.now() + 60 * 1000;
const nonce = randomBytes(16).toString('base64url');
const payload = `${action}.${username}.${expMs}.${nonce}`;
const sig = createHmac('sha256', secret).update(payload).digest('base64url');
const token = `${payload}.${sig}`;

const base = process.env.BANDSALAT_URL ?? 'http://localhost:3000';
console.log(`${base}/api/demo/${action}?token=${token}`);

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db/client';
import { countUsers, createUser } from './db/users';
import { env } from './env';
import argon2 from 'argon2';

let initialized = false;

export function initApp() {
	if (initialized) return;
	const here = fileURLToPath(new URL('.', import.meta.url));
	const candidates = [
		resolve(here, '../../../drizzle'),
		resolve(process.cwd(), 'drizzle'),
		resolve(process.cwd(), '../drizzle')
	];
	const migrationsFolder = candidates.find((p) => existsSync(p));
	if (!migrationsFolder) {
		throw new Error(
			`Migrations-Ordner nicht gefunden. Geprüft:\n${candidates.map((c) => `  - ${c}`).join('\n')}`
		);
	}
	migrate(db(), { migrationsFolder });

	// Erst-Setup: wenn Users-Tabelle leer ist und APP_PASSWORD/_HASH gesetzt,
	// einen initialen Admin anlegen. Damit funktioniert das Multi-User-Update
	// kompatibel zum bisherigen Single-User-Env-Setup.
	void seedAdminIfNeeded();

	initialized = true;
}

async function seedAdminIfNeeded(): Promise<void> {
	try {
		if (countUsers() > 0) return;
		const e = env();
		if (!e.APP_PASSWORD && !e.APP_PASSWORD_HASH) {
			console.warn('[init] Users-Tabelle leer + kein APP_PASSWORD/_HASH — kein Admin-Seed.');
			return;
		}
		const passwordHash = e.APP_PASSWORD_HASH
			? e.APP_PASSWORD_HASH
			: await argon2.hash(e.APP_PASSWORD!, { type: argon2.argon2id });
		await createUser({
			username: e.APP_ADMIN_USERNAME ?? 'admin',
			email: e.APP_ADMIN_EMAIL ?? 'admin@bandsalat.local',
			passwordHash,
			role: 'admin',
			active: true
		});
		console.log(
			`[init] Initial-Admin angelegt: username=${e.APP_ADMIN_USERNAME ?? 'admin'} email=${e.APP_ADMIN_EMAIL ?? 'admin@bandsalat.local'}`
		);
	} catch (err) {
		console.error('[init] Admin-Seed fehlgeschlagen:', err);
	}
}

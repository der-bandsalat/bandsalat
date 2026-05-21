import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../env';
import * as schema from './schema';

let cached: BetterSQLite3Database<typeof schema> | null = null;
let cachedRaw: Database.Database | null = null;

export function dbPath(): string {
	return resolve(env().DATA_DIR, 'bandsalat.sqlite');
}

export function uploadsDir(): string {
	return resolve(env().DATA_DIR, 'uploads');
}

export function rawDb(): Database.Database {
	if (cachedRaw) return cachedRaw;
	const dir = env().DATA_DIR;
	mkdirSync(dir, { recursive: true });
	mkdirSync(uploadsDir(), { recursive: true });
	const sqlite = new Database(dbPath());
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('synchronous = NORMAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	cachedRaw = sqlite;
	return sqlite;
}

export function db(): BetterSQLite3Database<typeof schema> {
	if (cached) return cached;
	cached = drizzle(rawDb(), { schema });
	return cached;
}

export { schema };

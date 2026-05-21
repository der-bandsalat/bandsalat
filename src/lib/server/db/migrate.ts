import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { db, dbPath } from './client';

const here = new URL('.', import.meta.url).pathname;
const migrationsFolder = resolve(here, '../../../../drizzle');

console.log(`[migrate] DB: ${dbPath()}`);
console.log(`[migrate] Migrations: ${migrationsFolder}`);
migrate(db(), { migrationsFolder });
console.log('[migrate] Done.');

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rawDb } from '../db/client';

/**
 * Erzeugt einen WAL-konsistenten Snapshot der SQLite-Datei in Memory.
 * Nutzt better-sqlite3 .backup(target) und liest die Zieldatei.
 */
export async function snapshotSqlite(): Promise<Buffer> {
	const dir = mkdtempSync(join(tmpdir(), 'bandsalat-export-'));
	const target = join(dir, 'snapshot.sqlite');
	try {
		await rawDb().backup(target);
		return readFileSync(target);
	} finally {
		try {
			rmSync(dir, { recursive: true, force: true });
		} catch {
			// best effort
		}
	}
}

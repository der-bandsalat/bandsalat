/**
 * Vitest-Setup: legt eine frische, migrierte SQLite-DB pro Test-Run an.
 * Verhindert, dass Tests gegen die Dev-DB laufen und stellt sicher, dass
 * Code, der getMeta()/listSeries() etc. nutzt, auch in CI funktioniert.
 *
 * DATA_DIR wird auf ein temporäres Verzeichnis umgebogen BEVOR irgendein
 * Modul `env()` aufruft (deshalb läuft das Setup in vitest's globalem
 * Pre-Init).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll } from 'vitest';

let tmp: string | null = null;

beforeAll(async () => {
	tmp = mkdtempSync(join(tmpdir(), 'bandsalat-test-'));
	process.env.DATA_DIR = tmp;
	process.env.SESSION_SECRET ??= 'test-secret-test-secret-test-secret-test-secret-test';
	process.env.APP_PASSWORD ??= 'test-password';
	process.env.ORIGIN ??= 'http://localhost';

	// initApp() führt Drizzle-Migrationen + Admin-Seed aus. Lazy-importieren,
	// damit die Env-Variablen davor in process.env stehen.
	const { initApp } = await import('./lib/server/init');
	initApp();
});

afterAll(() => {
	if (tmp) {
		try {
			rmSync(tmp, { recursive: true, force: true });
		} catch {
			/* best effort */
		}
	}
});

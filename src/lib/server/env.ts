import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Lädt .env-Werte aus der Datei in process.env, **ohne** existierende Variablen
 * zu überschreiben. Wird einmalig beim ersten env()-Aufruf ausgeführt.
 */
function loadDotEnvFile(path: string): void {
	if (!existsSync(path)) return;
	const text = readFileSync(path, 'utf8');
	for (const rawLine of text.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

const Env = z.object({
	APP_PASSWORD: z.string().min(8).optional(),
	APP_PASSWORD_HASH: z.string().optional(),
	APP_ADMIN_USERNAME: z.string().min(2).optional(),
	APP_ADMIN_EMAIL: z.string().email().optional(),
	SESSION_SECRET: z.string().min(32, 'SESSION_SECRET muss mindestens 32 Zeichen lang sein.'),
	SESSION_DAYS: z.coerce.number().int().positive().default(30),
	DISCOGS_TOKEN: z.string().optional(),
	DISCOGS_USERNAME: z.string().optional(),
	ANTHROPIC_API_KEY: z.string().optional(),
	SCAN_MODEL: z.string().default('claude-haiku-4-5-20251001'),
	DATA_DIR: z.string().default('./data'),
	PORT: z.coerce.number().int().positive().default(3000),
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type AppEnv = z.infer<typeof Env>;

let cached: AppEnv | null = null;
let dotEnvLoaded = false;

export function env(): AppEnv {
	if (cached) return cached;
	if (!dotEnvLoaded) {
		loadDotEnvFile(resolve(process.cwd(), '.env'));
		dotEnvLoaded = true;
	}
	const parsed = Env.safeParse(process.env);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Ungültige Umgebungsvariablen:\n${issues}`);
	}
	if (!parsed.data.APP_PASSWORD && !parsed.data.APP_PASSWORD_HASH) {
		throw new Error('APP_PASSWORD oder APP_PASSWORD_HASH muss gesetzt sein.');
	}
	cached = parsed.data;
	return cached;
}

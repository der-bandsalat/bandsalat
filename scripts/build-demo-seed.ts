/**
 * Baut das Seed-Volume für eine Demo-Instanz:
 *   - frische SQLite mit Migrations
 *   - leerer uploads/-Ordner
 *   - Demo-User (durch initApp + DEMO_MODE)
 *   - kuratierte Beispiel-Kassetten
 *
 * Output: ein tar.gz, das auf dem Demo-Server in /opt/bandsalat-seed/ entpackt
 * wird. Beim Start einer neuen Demo-Session kopiert der Orchestrator das
 * Verzeichnis nach /srv/slots/sN/.
 *
 * Aufruf:
 *   pnpm tsx scripts/build-demo-seed.ts
 *
 * ENV (optional):
 *   SEED_OUT_DIR=./build/seed        Wo der Output landet
 *   SEED_TARBALL=bandsalat-demo-seed.tar.gz
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const OUT_DIR = resolve(process.env.SEED_OUT_DIR ?? './build/seed');
const TARBALL = process.env.SEED_TARBALL ?? 'bandsalat-demo-seed.tar.gz';
const DATA_DIR = resolve(OUT_DIR, 'data');

// DEMO_MODE muss vor dem env-Modul-Import gesetzt sein, damit der Demo-User
// angelegt wird. Die anderen Werte sind nur fürs Seed-Bauen relevant.
process.env.DATA_DIR = DATA_DIR;
process.env.DEMO_MODE = 'true';
process.env.DEMO_HMAC_SECRET = process.env.DEMO_HMAC_SECRET ?? 'a'.repeat(64);
process.env.DEMO_USERNAME = process.env.DEMO_USERNAME ?? 'demo';
process.env.APP_PASSWORD = process.env.APP_PASSWORD ?? 'seed-only-not-used';
process.env.APP_ADMIN_USERNAME = process.env.APP_ADMIN_USERNAME ?? 'admin';
process.env.APP_ADMIN_EMAIL = process.env.APP_ADMIN_EMAIL ?? 'admin@bandsalat.local';
process.env.SESSION_SECRET =
	process.env.SESSION_SECRET ?? 'seed-build-not-used-replaced-at-runtime-by-orchestrator';
process.env.NODE_ENV = 'production';

console.log(`[seed] OUT_DIR=${OUT_DIR}`);
if (existsSync(OUT_DIR)) {
	console.log('[seed] Räume altes Build-Verzeichnis…');
	rmSync(OUT_DIR, { recursive: true, force: true });
}
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(resolve(DATA_DIR, 'uploads'), { recursive: true });

// Erst nach ENV-Setup importieren (sonst cached env() falsche Werte).
const { initApp } = await import('../src/lib/server/init');
const { db, rawDb } = await import('../src/lib/server/db/client');
const { cassettes } = await import('../src/lib/server/db/schema');

console.log('[seed] Migrations + Demo-User-Seed…');
initApp();
// Demo-User-Seed läuft async; kurz warten, damit der INSERT durch ist.
await new Promise((r) => setTimeout(r, 200));

type SeedCassette = {
	serie: string;
	folgeNr: number | null;
	folgeNrLabel?: string;
	titel: string;
	label?: string;
	jahr?: number;
	auflageVariante?: string;
	zustandMc?: string;
	zustandHuelle?: string;
	originalhuelle?: boolean;
	vollstaendig?: boolean;
	kaufpreisCent?: number;
	kaufort?: string;
	notiz?: string;
	rating?: number; // Halbsterne 1..10
};

/**
 * Kuratierte Liste echter Hörspielklassiker. Jahre und Labels werden, wo
 * möglich, vom Discogs-Enrich-Step überschrieben — hier nur Plausibilitäts-
 * Defaults für den Fall dass die Suche nichts findet.
 */
const SEED: SeedCassette[] = [
	{
		serie: 'Die drei ???',
		folgeNr: 1,
		titel: 'Der Super-Papagei',
		label: 'Europa',
		zustandMc: 'Very Good Plus (VG+)',
		zustandHuelle: 'Very Good (VG)',
		kaufpreisCent: 350,
		kaufort: 'Flohmarkt Maintal',
		rating: 9,
		notiz: 'Erste Folge der Serie — Klassiker.'
	},
	{
		serie: 'Die drei ???',
		folgeNr: 2,
		titel: 'Der Karpatenhund',
		label: 'Europa',
		zustandMc: 'Near Mint (NM or M-)',
		zustandHuelle: 'Very Good Plus (VG+)',
		kaufpreisCent: 480,
		rating: 9
	},
	{
		serie: 'Die drei ???',
		folgeNr: 3,
		titel: 'Die flüsternde Mumie',
		label: 'Europa',
		zustandMc: 'Very Good (VG)',
		zustandHuelle: 'Good Plus (G+)',
		originalhuelle: false,
		kaufpreisCent: 220,
		rating: 8
	},
	{
		serie: 'Die drei ???',
		folgeNr: 100,
		titel: 'Toteninsel',
		label: 'Europa',
		auflageVariante: 'Jubiläumsausgabe',
		zustandMc: 'Mint (M)',
		zustandHuelle: 'Mint (M)',
		kaufpreisCent: 1490,
		rating: 10,
		notiz: 'Jubiläumsausgabe zur 100. Folge.'
	},
	{
		serie: 'TKKG',
		folgeNr: 1,
		titel: 'Die Jagd nach den Millionendieben',
		label: 'Europa',
		zustandMc: 'Very Good Plus (VG+)',
		zustandHuelle: 'Very Good (VG)',
		kaufpreisCent: 450,
		rating: 8
	},
	{
		serie: 'Benjamin Blümchen',
		folgeNr: 1,
		titel: 'Benjamin Blümchen rettet den Zoo',
		label: 'Kiosk',
		zustandMc: 'Very Good (VG)',
		zustandHuelle: 'Very Good (VG)',
		kaufpreisCent: 250,
		rating: 7
	},
	{
		serie: 'Bibi Blocksberg',
		folgeNr: 1,
		titel: 'Hexen gibt es doch',
		label: 'Kiosk',
		zustandMc: 'Near Mint (NM or M-)',
		zustandHuelle: 'Very Good Plus (VG+)',
		kaufpreisCent: 500,
		rating: 9
	},
	{
		serie: 'Hui Buh',
		folgeNr: 1,
		titel: 'Hui Buh, das Schlossgespenst',
		label: 'Europa',
		zustandMc: 'Good (G)',
		zustandHuelle: 'Fair (F)',
		originalhuelle: false,
		kaufpreisCent: 800,
		notiz: 'Sehr alte Pressung — knistert deutlich.',
		rating: 7
	},
	{
		serie: 'Die drei !!!',
		folgeNr: 1,
		titel: 'Tatort Mode-Show',
		label: 'Europa',
		zustandMc: 'Near Mint (NM or M-)',
		zustandHuelle: 'Near Mint (NM or M-)',
		kaufpreisCent: 500
	},
	{
		serie: 'Bibi und Tina',
		folgeNr: 1,
		titel: 'Die Pferdediebe',
		label: 'Kiosk',
		zustandMc: 'Very Good (VG)',
		zustandHuelle: 'Very Good (VG)',
		kaufpreisCent: 300,
		rating: 7
	}
];

console.log(`[seed] Lege ${SEED.length} Beispiel-Kassetten an…`);
const now = new Date().toISOString();
for (const s of SEED) {
	db()
		.insert(cassettes)
		.values({
			id: randomUUID(),
			serie: s.serie,
			folgeNr: s.folgeNr,
			titel: s.titel,
			format: 'cassette',
			label: s.label ?? null,
			jahr: s.jahr ?? null,
			auflageVariante: s.auflageVariante ?? null,
			zustandMc: (s.zustandMc as never) ?? null,
			zustandHuelle: (s.zustandHuelle as never) ?? null,
			originalhuelle: s.originalhuelle ?? true,
			vollstaendig: s.vollstaendig ?? true,
			kaufpreisCent: s.kaufpreisCent ?? null,
			kaufort: s.kaufort ?? null,
			notiz: s.notiz ?? null,
			rating: s.rating ?? null,
			coverSource: 'auto',
			createdAt: now,
			updatedAt: now
		})
		.run();
}

// WAL in die Haupt-DB checkpointen, damit das tar.gz nicht von einer leeren
// .sqlite + großem .sqlite-wal abhängt. TRUNCATE löscht den WAL-File danach.
console.log('[seed] Checkpoint WAL → main…');
rawDb().pragma('wal_checkpoint(TRUNCATE)');
// Auf rollback-journal umschalten und Connection schließen, sonst bleibt
// .sqlite-shm liegen.
rawDb().pragma('journal_mode = DELETE');
rawDb().close();

// Optional: Discogs-Cover für alle 17 Beispiel-Kassetten cachen. Subprocess,
// weil env() in diesem Prozess schon gecached ist. Skippt, wenn kein Token.
const discogsToken = process.env.SEED_DISCOGS_TOKEN ?? process.env.DISCOGS_TOKEN;
const discogsUser = process.env.SEED_DISCOGS_USERNAME ?? process.env.DISCOGS_USERNAME ?? 'mamallow';
if (discogsToken) {
	console.log('[seed] Discogs-Anreicherung (Cover holen)…');
	try {
		execFileSync('pnpm', ['tsx', 'scripts/enrich-demo.ts'], {
			stdio: 'inherit',
			env: {
				...process.env,
				DATA_DIR,
				DISCOGS_TOKEN: discogsToken,
				DISCOGS_USERNAME: discogsUser,
				// DEMO_MODE würde getDiscogsToken() blockieren — für den Build wollen
				// wir den geteilten Discogs-Token verwenden, um die Cover zu holen.
				DEMO_MODE: 'false'
			}
		});
	} catch (err) {
		console.warn('[seed] enrich-demo fehlgeschlagen, Tarball wird ohne Cover gebaut:', err);
	}
} else {
	console.log('[seed] Keine SEED_DISCOGS_TOKEN gesetzt — Tarball wird ohne Cover gebaut.');
}

console.log('[seed] Erzeuge Tarball…');
execFileSync('tar', ['-czf', resolve(OUT_DIR, '..', TARBALL), '-C', OUT_DIR, 'data'], {
	stdio: 'inherit'
});

const stat = execFileSync('du', ['-sh', resolve(OUT_DIR, '..', TARBALL)], { encoding: 'utf8' });
console.log(`[seed] Fertig: ${stat.trim()}`);
console.log(`[seed] Entpacken auf Server mit: tar -xzf ${TARBALL} -C /opt/bandsalat-seed/`);

process.exit(0);

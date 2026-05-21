/**
 * Reichert vorhandene Kassetten ohne discogs_release_id über die Discogs-Suche an.
 * Heuristik: Query = "Serie Folge X Titel", Format=Cassette, erster Treffer gewinnt.
 *
 * Aufruf:
 *   pnpm tsx --env-file-if-exists=.env scripts/enrich-demo.ts
 *
 * Optionen über ENV:
 *   ENRICH_LIMIT=5      max. Anzahl Einträge (Default: alle)
 *   ENRICH_DRY=1        nur ausgeben, nichts schreiben
 *   ENRICH_RESET=1      auch Einträge mit bestehender Release-ID neu suchen
 *   ENRICH_LOGOS=1      Logo pro Serie aus erstem Cover ableiten
 */
import { eq } from 'drizzle-orm';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db, uploadsDir } from '../src/lib/server/db/client';
import { cassettes } from '../src/lib/server/db/schema';
import { env } from '../src/lib/server/env';
import { searchReleases } from '../src/lib/server/discogs';
import { cacheCoverFromUrl } from '../src/lib/server/discogs/cover-cache';
import { setSeriesLogo, getSeriesLogo } from '../src/lib/server/db/series';

function checkEnv() {
	const e = env();
	if (!e.DISCOGS_TOKEN) {
		console.error('✗ DISCOGS_TOKEN ist nicht gesetzt. Trage ihn in .env ein und starte erneut.');
		console.error('  Token holst du dir unter https://www.discogs.com/settings/developers');
		process.exit(1);
	}
}

function buildQuery(c: { serie: string; folgeNr: number | null; titel: string }): string {
	const parts: string[] = [c.serie];
	if (c.folgeNr != null) parts.push(String(c.folgeNr));
	parts.push(c.titel);
	return parts.join(' ');
}

function nowIso() {
	return new Date().toISOString();
}

async function main() {
	checkEnv();
	const limit = process.env.ENRICH_LIMIT ? Number.parseInt(process.env.ENRICH_LIMIT, 10) : Infinity;
	const dry = process.env.ENRICH_DRY === '1';
	const reset = process.env.ENRICH_RESET === '1';
	const doLogos = process.env.ENRICH_LOGOS === '1';

	let targets = db().select().from(cassettes).all();
	if (!reset) targets = targets.filter((c) => !c.discogsReleaseId);
	if (Number.isFinite(limit)) targets = targets.slice(0, limit);

	if (targets.length === 0) {
		console.log('Nichts zu tun — alle Einträge haben bereits eine Discogs-Verknüpfung.');
		return;
	}

	console.log(
		`Suche Discogs-Daten für ${targets.length} Einträge${dry ? ' (DRY RUN)' : ''}${reset ? ', inkl. bereits verknüpfter' : ''}.`
	);

	let ok = 0;
	let missed = 0;
	let failed = 0;
	const seriesFirstCover = new Map<string, string>();

	for (const c of targets) {
		const query = buildQuery(c);
		process.stdout.write(`  ${c.serie}${c.folgeNr ? ` · ${c.folgeNr}` : ''} → "${query}" … `);
		try {
			let results = await searchReleases(query, { format: 'Cassette' });
			if (results.length === 0) {
				results = await searchReleases(query, { format: null });
			}
			if (results.length === 0) {
				console.log('keine Treffer.');
				missed++;
				continue;
			}
			const hit = results[0];
			const coverUrl = hit.cover_image ?? hit.thumb ?? null;
			console.log(`#${hit.id} (${hit.year ?? '?'}) ${hit.label?.[0] ?? ''}`);

			if (dry) {
				ok++;
				continue;
			}

			let cachedPath: string | null = null;
			if (coverUrl) {
				const cached = await cacheCoverFromUrl(coverUrl, hit.id).catch((e) => {
					console.warn(`    Cover-Cache fehlgeschlagen: ${e instanceof Error ? e.message : e}`);
					return null;
				});
				cachedPath = cached?.original ?? null;
				if (cachedPath && !seriesFirstCover.has(c.serie)) {
					seriesFirstCover.set(c.serie, cachedPath);
				}
			}

			db()
				.update(cassettes)
				.set({
					discogsReleaseId: hit.id,
					discogsUrl: `https://www.discogs.com/release/${hit.id}`,
					discogsCoverUrl: coverUrl,
					discogsCoverCachePath: cachedPath,
					label: c.label ?? hit.label?.[0] ?? null,
					jahr:
						c.jahr ??
						(typeof hit.year === 'number'
							? hit.year
							: Number.parseInt(String(hit.year ?? ''), 10) || null),
					updatedAt: nowIso()
				})
				.where(eq(cassettes.id, c.id))
				.run();

			ok++;
		} catch (e) {
			console.log(`Fehler: ${e instanceof Error ? e.message : e}`);
			failed++;
		}
	}

	if (doLogos && !dry) {
		console.log('\nSerien-Logos aus erstem Cover ableiten:');
		for (const [serie, coverFile] of seriesFirstCover) {
			if (getSeriesLogo(serie)) {
				console.log(`  ${serie}: Logo bereits vorhanden, überspringe.`);
				continue;
			}
			const src = join(uploadsDir(), coverFile);
			const ext = coverFile.match(/\.[^.]+$/)?.[0] ?? '.jpg';
			const logoFile = `serie-logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
			try {
				await copyFile(src, join(uploadsDir(), logoFile));
				const stem = logoFile.replace(/\.[^.]+$/, '');
				// Thumb mit demselben Stem existiert noch nicht — wir nutzen das Original für das Logo;
				// SeriesLogo nutzt /uploads/<path>. Das Cover hat aber bereits eine .thumb.jpg-Variante,
				// die wir parallel verlinken könnten. Für das Logo reicht das Original.
				void stem;
				setSeriesLogo(serie, logoFile);
				console.log(`  ${serie} → ${logoFile}`);
			} catch (e) {
				console.warn(
					`  ${serie}: Logo-Kopie fehlgeschlagen: ${e instanceof Error ? e.message : e}`
				);
			}
		}
	}

	console.log(`\nFertig: ${ok} verknüpft, ${missed} ohne Treffer, ${failed} Fehler.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

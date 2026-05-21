/**
 * Importiert die Discogs-Collection des konfigurierten Users in die lokale DB.
 * Erwartet DISCOGS_TOKEN + DISCOGS_USERNAME in .env.
 *
 * Aufruf:
 *   pnpm db:import-discogs
 *
 * Optionen über ENV:
 *   IMPORT_FOLDER=<id|name>  Discogs-Folder (Default: Auto-Erkennung "Hörspiel" / sonst "All")
 *   IMPORT_CLEAR=1           Bestehende Kassetten + Fotos vor Import wischen
 *   IMPORT_NO_COVERS=1       Cover-Download überspringen (deutlich schneller)
 *   IMPORT_LOGOS=1           Erstes Cover je Serie als Logo setzen
 *   IMPORT_LIMIT=N           Nur die ersten N Items (Debug)
 */
import { randomUUID } from 'node:crypto';
import { copyFile, rm } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { db, uploadsDir } from '../src/lib/server/db/client';
import {
	cassettes,
	type MediaGrade,
	type NewCassette,
	type SleeveGrade
} from '../src/lib/server/db/schema';
import { env } from '../src/lib/server/env';
import { discogs } from '../src/lib/server/discogs/client';
import { getFieldDefs, listFolders, setCachedFolder } from '../src/lib/server/discogs/collection';
import {
	findMediaField,
	findNotesField,
	findSleeveField,
	isKnownMediaGrade,
	isKnownSleeveGrade
} from '../src/lib/server/discogs/mapping';
import { cacheCoverFromUrl } from '../src/lib/server/discogs/cover-cache';
import { setSeriesLogo, getSeriesLogo } from '../src/lib/server/db/series';

interface CollectionItem {
	id: number;
	instance_id: number;
	folder_id: number;
	rating?: number;
	date_added: string;
	basic_information: {
		id: number;
		title: string;
		year?: number;
		thumb?: string;
		cover_image?: string;
		formats?: { name: string; text?: string; descriptions?: string[]; qty?: string }[];
		labels?: { name: string; catno?: string }[];
		artists?: { name: string }[];
		genres?: string[];
		styles?: string[];
	};
	notes?: { field_id: number; value: string }[];
}

interface CollectionResponse {
	pagination: { page: number; pages: number; per_page: number; items: number };
	releases: CollectionItem[];
}

function checkEnv() {
	const e = env();
	if (!e.DISCOGS_TOKEN) {
		console.error('✗ DISCOGS_TOKEN fehlt in .env');
		process.exit(1);
	}
	if (!e.DISCOGS_USERNAME) {
		console.error('✗ DISCOGS_USERNAME fehlt in .env');
		process.exit(1);
	}
}

import { parseTitle } from '../src/lib/server/discogs/title-parser';

function variantFromFormat(item: CollectionItem): string | null {
	const f = item.basic_information.formats?.[0];
	if (!f) return null;
	const parts: string[] = [];
	if (f.text) parts.push(f.text);
	if (f.descriptions && f.descriptions.length > 0) parts.push(...f.descriptions);
	const joined = parts
		.join(', ')
		.replace(/\bCassette\b,?\s*/gi, '')
		.trim();
	return joined || null;
}

function gradeFromNotes(item: CollectionItem, fieldId: number | undefined): string | null {
	if (!fieldId || !item.notes) return null;
	return item.notes.find((n) => n.field_id === fieldId)?.value ?? null;
}

async function fetchAllReleases(folderId: number): Promise<CollectionItem[]> {
	const e = env();
	const path = `/users/${encodeURIComponent(e.DISCOGS_USERNAME!)}/collection/folders/${folderId}/releases`;
	const all: CollectionItem[] = [];
	let page = 1;
	while (true) {
		const res = await discogs.get<CollectionResponse>(path, { per_page: 100, page });
		all.push(...res.releases);
		process.stdout.write(
			`  Seite ${page}/${res.pagination.pages} (${all.length}/${res.pagination.items}) …\r`
		);
		if (page >= res.pagination.pages) break;
		page++;
	}
	process.stdout.write('\n');
	return all;
}

async function resolveFolder(): Promise<{ id: number; name: string } | null> {
	const param = process.env.IMPORT_FOLDER;
	const folders = await listFolders();
	const all = [{ id: 0, name: 'All', count: 0, cached: false }, ...folders];

	if (param) {
		const asNum = Number.parseInt(param, 10);
		const byId = Number.isInteger(asNum) ? all.find((f) => f.id === asNum) : null;
		if (byId) return { id: byId.id, name: byId.name };
		const byName = all.find((f) => f.name.toLowerCase().includes(param.toLowerCase()));
		if (byName) return { id: byName.id, name: byName.name };
		return null;
	}

	// Auto-Erkennung
	const hoerspiel = folders.find((f) => /h(ö|oe)rspiel/i.test(f.name));
	if (hoerspiel) return { id: hoerspiel.id, name: hoerspiel.name };
	return { id: 0, name: 'All' };
}

async function wipeExisting() {
	const rows = db().select().from(cassettes).all();
	for (const r of rows) {
		if (r.coverFotoPath) {
			await rm(join(uploadsDir(), r.coverFotoPath), { force: true });
			const stem = r.coverFotoPath.replace(/\.[^.]+$/, '');
			await rm(join(uploadsDir(), `${stem}.thumb.jpg`), { force: true });
		}
		if (r.discogsCoverCachePath) {
			await rm(join(uploadsDir(), r.discogsCoverCachePath), { force: true });
			const stem = r.discogsCoverCachePath.replace(/\.[^.]+$/, '');
			await rm(join(uploadsDir(), `${stem}.thumb.jpg`), { force: true });
		}
	}
	db().delete(cassettes).run();
	console.log(`  ${rows.length} Einträge gelöscht.`);
}

async function main() {
	checkEnv();
	const e = env();
	const clear = process.env.IMPORT_CLEAR === '1';
	const noCovers = process.env.IMPORT_NO_COVERS === '1';
	const doLogos = process.env.IMPORT_LOGOS === '1';
	const limit = process.env.IMPORT_LIMIT ? Number.parseInt(process.env.IMPORT_LIMIT, 10) : Infinity;

	mkdirSync(uploadsDir(), { recursive: true });

	console.log('Discogs-Folder bestimmen …');
	const folder = await resolveFolder();
	if (!folder) {
		console.error(`✗ Folder "${process.env.IMPORT_FOLDER}" nicht gefunden.`);
		process.exit(1);
	}
	console.log(`  → "${folder.name}" (id=${folder.id})`);
	if (folder.id !== 0) setCachedFolder({ id: folder.id, name: folder.name });

	console.log('Field-Defs laden …');
	const fields = await getFieldDefs(true);
	const mediaField = findMediaField(fields);
	const sleeveField = findSleeveField(fields);
	const notesField = findNotesField(fields);
	console.log(
		`  Media-Feld: ${mediaField?.name ?? '—'}, Sleeve: ${sleeveField?.name ?? '—'}, Notes: ${notesField?.name ?? '—'}`
	);

	console.log(`Releases aus Folder ${folder.id} laden …`);
	let releases = await fetchAllReleases(folder.id);
	const beforeFilter = releases.length;
	releases = releases.filter((r) =>
		r.basic_information.formats?.some((f) => /^Cassette/i.test(f.name))
	);
	const filteredOut = beforeFilter - releases.length;
	if (filteredOut > 0) {
		console.log(`  ${filteredOut} Nicht-Kassetten gefiltert.`);
	}
	if (Number.isFinite(limit)) releases = releases.slice(0, limit);
	console.log(`  ${releases.length} Kassetten-Releases insgesamt.`);

	if (clear) {
		console.log('Bestehende Daten wischen …');
		await wipeExisting();
	}

	console.log(`Import ${releases.length} Einträge${noCovers ? ' (ohne Cover)' : ''} …`);

	const existing = db().select().from(cassettes).all();
	const knownInstance = new Set(
		existing.map((c) => c.discogsInstanceId).filter((n): n is number => typeof n === 'number')
	);

	let inserted = 0;
	let skipped = 0;
	let failed = 0;
	const seriesFirstCover = new Map<string, string>();

	for (let i = 0; i < releases.length; i++) {
		const r = releases[i];
		if (knownInstance.has(r.instance_id)) {
			skipped++;
			continue;
		}

		const parsed = parseTitle(r.basic_information.title);
		const label = r.basic_information.labels?.[0];
		const catno = label?.catno || null;
		const variant = variantFromFormat(r);

		const mediaValue = gradeFromNotes(r, mediaField?.id);
		const sleeveValue = gradeFromNotes(r, sleeveField?.id);
		const notesValue = gradeFromNotes(r, notesField?.id);

		const releaseId = r.basic_information.id;
		const coverUrl = r.basic_information.cover_image ?? r.basic_information.thumb ?? null;

		let cachedPath: string | null = null;
		if (!noCovers && coverUrl) {
			try {
				const cached = await cacheCoverFromUrl(coverUrl, releaseId);
				cachedPath = cached?.original ?? null;
				if (cachedPath && !seriesFirstCover.has(parsed.serie)) {
					seriesFirstCover.set(parsed.serie, cachedPath);
				}
			} catch (err) {
				console.warn(
					`  Cover ${releaseId} fehlgeschlagen: ${err instanceof Error ? err.message : err}`
				);
			}
		}

		const now = new Date().toISOString();
		const row: NewCassette = {
			id: randomUUID(),
			serie: parsed.serie,
			folgeNr: parsed.folgeNr,
			folgeNrLabel: parsed.folgeNr == null ? null : null,
			titel: parsed.titel,
			label: label?.name ?? null,
			auflageVariante: variant,
			jahr:
				typeof r.basic_information.year === 'number' && r.basic_information.year > 0
					? r.basic_information.year
					: null,
			discogsReleaseId: releaseId,
			discogsUrl: `https://www.discogs.com/release/${releaseId}`,
			seriennummer: catno,
			zustandMc: isKnownMediaGrade(mediaValue) ? (mediaValue as MediaGrade) : null,
			zustandHuelle: isKnownSleeveGrade(sleeveValue) ? (sleeveValue as SleeveGrade) : null,
			originalhuelle: true,
			vollstaendig: true,
			kaufdatum: r.date_added ? r.date_added.slice(0, 10) : null,
			kaufpreisCent: null,
			kaufort: null,
			notiz: notesValue || null,
			coverFotoPath: null,
			discogsCoverUrl: coverUrl,
			discogsCoverCachePath: cachedPath,
			discogsFolderId: r.folder_id,
			discogsInstanceId: r.instance_id,
			discogsSyncedAt: now,
			createdAt: now,
			updatedAt: now
		};

		try {
			db().insert(cassettes).values(row).run();
			inserted++;
			const folge = parsed.folgeNr != null ? ` · ${parsed.folgeNr}` : '';
			console.log(`  [${i + 1}/${releases.length}] ${parsed.serie}${folge} · ${parsed.titel}`);
		} catch (err) {
			failed++;
			console.warn(
				`  Insert fehlgeschlagen für ${releaseId}: ${err instanceof Error ? err.message : err}`
			);
		}
	}

	if (doLogos) {
		console.log('\nSerien-Logos aus erstem Cover ableiten:');
		for (const [serie, coverFile] of seriesFirstCover) {
			if (getSeriesLogo(serie)) {
				console.log(`  ${serie}: Logo bereits vorhanden, überspringe.`);
				continue;
			}
			const src = join(uploadsDir(), coverFile);
			if (!existsSync(src)) continue;
			const ext = coverFile.match(/\.[^.]+$/)?.[0] ?? '.jpg';
			const logoFile = `serie-logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
			try {
				await copyFile(src, join(uploadsDir(), logoFile));
				setSeriesLogo(serie, logoFile);
				console.log(`  ${serie} → ${logoFile}`);
			} catch (err) {
				console.warn(`  ${serie}: ${err instanceof Error ? err.message : err}`);
			}
		}
	}

	console.log(`\nFertig: ${inserted} importiert, ${skipped} übersprungen, ${failed} Fehler.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

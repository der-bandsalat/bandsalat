/**
 * Datenquelle dreimetadaten.de — strukturiertes JSON pro Drei???-Folge mit
 * Cover-PNG + Beschreibung + Sprecher/Kapitel-Metadaten.
 * Repo: https://github.com/YourMJK/dreimetadaten
 *
 * Aktuell nur für Serie "Die drei ???" (Buch-Reihe, nicht Kids/Dr3i/Spezial).
 */
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { uploadsDir } from '../db/client';

export const DREI_SERIE = 'Die drei ???';
const BASE = 'https://dreimetadaten.de/data/Serie';
const USER_AGENT = 'Bandsalat/1.0 (+https://github.com/der-bandsalat/bandsalat)';

export interface DreimetadatenMetadata {
	nummer: number;
	titel: string;
	autor?: string;
	hörspielskriptautor?: string;
	gesamtbeschreibung?: string;
	beschreibung?: string;
	veröffentlichungsdatum?: string;
	sprechrollen?: { rolle: string; sprecher: string }[];
	kapitel?: { titel: string; start: number; end: number }[];
}

export function isSupported(serie: string): boolean {
	return serie === DREI_SERIE;
}

function pad(n: number): string {
	return n.toString().padStart(3, '0');
}

function metadataUrl(folgeNr: number): string {
	return `${BASE}/${pad(folgeNr)}/metadata.json`;
}

function coverUrl(folgeNr: number): string {
	return `${BASE}/${pad(folgeNr)}/cover.png`;
}

export async function fetchMetadata(folgeNr: number): Promise<DreimetadatenMetadata | null> {
	try {
		const res = await fetch(metadataUrl(folgeNr), {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
		});
		if (!res.ok) return null;
		return (await res.json()) as DreimetadatenMetadata;
	} catch {
		return null;
	}
}

export interface CachedCover {
	original: string; // dm-001.jpg
	thumb: string; // dm-001.thumb.jpg
	sourceUrl: string;
}

/**
 * Lädt das Cover, re-encoded als JPEG + erzeugt 320px-Thumbnail, speichert
 * in /uploads. Liefert die Datei-Namen (relativ).
 */
export async function fetchAndCacheCover(folgeNr: number): Promise<CachedCover | null> {
	try {
		mkdirSync(uploadsDir(), { recursive: true });
		const url = coverUrl(folgeNr);
		const res = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'image/png,image/*' }
		});
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) return null;

		const stem = `dm-${pad(folgeNr)}`;
		const original = `${stem}.jpg`;
		const thumb = `${stem}.thumb.jpg`;

		const pipeline = sharp(buf).rotate();
		const [opt, thumbBuf] = await Promise.all([
			pipeline.clone().jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
			pipeline
				.clone()
				.resize({ width: 320, height: 320, fit: 'cover' })
				.jpeg({ quality: 80, mozjpeg: true })
				.toBuffer()
		]);
		await Promise.all([
			writeFile(join(uploadsDir(), original), opt),
			writeFile(join(uploadsDir(), thumb), thumbBuf)
		]);
		return { original, thumb, sourceUrl: url };
	} catch {
		return null;
	}
}

/**
 * Holt Cover + Metadaten in einem Rutsch. Beide Anfragen parallel, gibt
 * partial-zurück wenn nur eines klappt.
 */
export async function fetchFolge(
	folgeNr: number
): Promise<{ cover: CachedCover | null; metadata: DreimetadatenMetadata | null }> {
	const [cover, metadata] = await Promise.all([
		fetchAndCacheCover(folgeNr),
		fetchMetadata(folgeNr)
	]);
	return { cover, metadata };
}

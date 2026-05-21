import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { getDiscogsToken } from '../settings';
import { uploadsDir } from '../db/client';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
const MAX_DIMENSION = 1024;
const USER_AGENT = 'HoerspielKatalog/1.0 (+https://github.com/der-bandsalat/bandsalat)';

function ensureDir() {
	mkdirSync(uploadsDir(), { recursive: true });
}

function randomBase(prefix = 'logo'): string {
	return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

/**
 * Entfernt Skript-Tags und Event-Handler aus SVG-Strings.
 * Defensiv genug für die Auslieferung via `<img src>` plus CSP-Header.
 */
function sanitizeSvg(text: string): string {
	return text
		.replace(/<\?xml-stylesheet[^>]*>/gi, '')
		.replace(/<!ENTITY[\s\S]*?>/gi, '')
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<\/?(?:script|iframe|object|embed|foreignObject)\b[^>]*>/gi, '')
		.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
		.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
		.replace(/(?:xlink:)?href\s*=\s*"(?:javascript|data:text\/html)[^"]*"/gi, '')
		.replace(/(?:xlink:)?href\s*=\s*'(?:javascript|data:text\/html)[^']*'/gi, '');
}

export interface SavedLogo {
	filename: string;
	dominantColor: string | null;
}

/**
 * Bestimmt eine charakteristische Farbe für ein Logo. Sehr helle und sehr
 * dunkle Pixel werden als wahrscheinlicher Hintergrund/Schatten ignoriert,
 * stattdessen wird der häufigste mittel-bunte Hue als Marken-Farbe gewählt.
 * Fällt auf den sharp-Dominant zurück, wenn nichts Buntes vorhanden ist
 * (z.B. reines Schwarz-auf-Weiß-Logo → liefert dann Schwarz).
 */
export async function extractDominantColor(buf: Buffer): Promise<string | null> {
	try {
		// Auf 48×48 herunterrechnen, Alpha behalten. SVG-Input bekommt density.
		// Wir ignorieren transparente Pixel (das ist bei vielen Logos der
		// Großteil der Fläche), und filtern danach nahe-weiß/nahe-schwarz
		// mit niedriger Sättigung aus (typische Hintergrund- oder
		// Konturpixel).
		const { data, info } = await sharp(buf, { density: 144 })
			.ensureAlpha()
			.resize(48, 48, { fit: 'inside' })
			.raw()
			.toBuffer({ resolveWithObject: true });

		const stride = info.channels; // sollte 4 sein nach ensureAlpha
		const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
		const QUANT = 24;
		let opaqueCount = 0;

		for (let i = 0; i < data.length; i += stride) {
			const a = stride >= 4 ? data[i + 3] : 255;
			if (a < 128) continue; // transparente Pixel ignorieren
			opaqueCount++;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const sat = max === 0 ? 0 : (max - min) / max;
			const brightness = max;
			if (brightness > 235 && sat < 0.12) continue;
			if (brightness < 25 && sat < 0.15) continue;
			const key = `${Math.floor(r / QUANT)}-${Math.floor(g / QUANT)}-${Math.floor(b / QUANT)}`;
			const cur = buckets.get(key);
			if (cur) {
				cur.count++;
				cur.r += r;
				cur.g += g;
				cur.b += b;
			} else {
				buckets.set(key, { count: 1, r, g, b });
			}
		}

		let best: { count: number; r: number; g: number; b: number } | null = null;
		for (const v of buckets.values()) {
			if (!best || v.count > best.count) best = v;
		}

		if (!best) {
			// Reines Schwarz-Weiß-Logo ohne Buntpixel → sharp.stats().
			// Bei JPEG/Schwarzbild ohne Transparenz nehmen wir den Dominant.
			// Bei nur-Transparent-PNG ohne irgendeinen opaken Pixel: null.
			if (opaqueCount === 0) return null;
			const { dominant } = await sharp(buf).flatten({ background: '#ffffff' }).stats();
			return rgbToHex(dominant.r, dominant.g, dominant.b);
		}

		return rgbToHex(
			Math.round(best.r / best.count),
			Math.round(best.g / best.count),
			Math.round(best.b / best.count)
		);
	} catch {
		return null;
	}
}

function rgbToHex(r: number, g: number, b: number): string {
	const h = (n: number) => n.toString(16).padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Speichert ein hochgeladenes Logo unter Beibehaltung der Transparenz:
 * - SVG: textuell weiter, mit defensiver Sanitization
 * - Raster mit Alpha → PNG
 * - Raster ohne Alpha → JPEG
 * Skaliert auf max. 1024px Kante.
 */
export async function saveLogo(file: File): Promise<SavedLogo> {
	if (!file || file.size === 0) throw new Error('Keine Datei.');
	if (file.size > MAX_BYTES) {
		throw new Error(`Logo zu groß (max ${Math.round(MAX_BYTES / 1024 / 1024)} MiB).`);
	}
	ensureDir();

	const looksSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);

	if (looksSvg) {
		const text = await file.text();
		if (!/<svg[\s>]/i.test(text)) {
			throw new Error('Keine gültige SVG-Datei.');
		}
		const safe = sanitizeSvg(text);
		const filename = `${randomBase()}.svg`;
		await writeFile(join(uploadsDir(), filename), safe, 'utf8');
		const dominantColor = await extractDominantColor(Buffer.from(safe));
		return { filename, dominantColor };
	}

	const buf = Buffer.from(await file.arrayBuffer());
	const pipeline = sharp(buf, { failOn: 'truncated' }).rotate();
	const meta = await pipeline.metadata();
	if (!meta.format) {
		throw new Error(`Falscher Datei-Typ: ${file.type || 'unbekannt'}.`);
	}

	const needsResize = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;
	const resized = needsResize
		? pipeline.clone().resize({
				width: MAX_DIMENSION,
				height: MAX_DIMENSION,
				fit: 'inside',
				withoutEnlargement: true
			})
		: pipeline.clone();

	const hasAlpha = Boolean(meta.hasAlpha) || meta.channels === 4;
	let outBuf: Buffer;
	let ext: string;
	if (hasAlpha) {
		outBuf = await resized.png({ compressionLevel: 9 }).toBuffer();
		ext = 'png';
	} else {
		outBuf = await resized.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
		ext = 'jpg';
	}
	const filename = `${randomBase()}.${ext}`;
	await writeFile(join(uploadsDir(), filename), outBuf);
	const dominantColor = await extractDominantColor(outBuf);
	return { filename, dominantColor };
}

/**
 * Lädt ein Bild von einer URL und speichert es Format-erhaltend als Logo.
 * Wird für „Logo aus Discogs-Master" verwendet (Phase 15).
 */
export async function saveLogoFromUrl(url: string): Promise<SavedLogo | null> {
	if (!url) return null;
	ensureDir();

	const headers: HeadersInit = { 'User-Agent': USER_AGENT };
	const token = getDiscogsToken();
	if (token && /discogs\.com$/.test(new URL(url).hostname)) {
		headers['Authorization'] = `Discogs token=${token}`;
	}

	const res = await fetch(url, { headers });
	if (!res.ok) return null;
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

	const pipeline = sharp(buf).rotate();
	const meta = await pipeline.metadata();
	const hasAlpha = Boolean(meta.hasAlpha) || meta.channels === 4;

	const resized = pipeline.resize({
		width: MAX_DIMENSION,
		height: MAX_DIMENSION,
		fit: 'inside',
		withoutEnlargement: true
	});

	let outBuf: Buffer;
	let ext: string;
	if (hasAlpha) {
		outBuf = await resized.png({ compressionLevel: 9 }).toBuffer();
		ext = 'png';
	} else {
		outBuf = await resized.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
		ext = 'jpg';
	}
	const filename = `${randomBase()}.${ext}`;
	await writeFile(join(uploadsDir(), filename), outBuf);
	const dominantColor = await extractDominantColor(outBuf);
	return { filename, dominantColor };
}

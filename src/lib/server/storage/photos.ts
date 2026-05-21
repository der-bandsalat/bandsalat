import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { uploadsDir } from '../db/client';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MiB
const MAX_DIMENSION = 2400;
const THUMB_SIZE = 320;

function ensureDir() {
	mkdirSync(uploadsDir(), { recursive: true });
}

function randomBase(): string {
	return randomBytes(8).toString('hex');
}

export interface SavedPhoto {
	/** Relativer Pfad ab uploadsDir, z.B. "abc123.jpg" */
	original: string;
	/** Relativer Pfad ab uploadsDir, z.B. "abc123.thumb.jpg" */
	thumb: string;
}

export async function savePhoto(file: File): Promise<SavedPhoto> {
	if (!file || file.size === 0) throw new Error('Keine Datei.');
	if (file.size > MAX_BYTES) {
		throw new Error(`Foto zu groß (${Math.round(file.size / 1024 / 1024)} MiB, max 15 MiB).`);
	}
	if (!file.type.startsWith('image/')) {
		throw new Error(`Falscher Datei-Typ: ${file.type || 'unbekannt'}.`);
	}
	ensureDir();

	const buf = Buffer.from(await file.arrayBuffer());
	const base = randomBase();
	const originalName = `${base}.jpg`;
	const thumbName = `${base}.thumb.jpg`;
	const originalPath = join(uploadsDir(), originalName);
	const thumbPath = join(uploadsDir(), thumbName);

	const pipeline = sharp(buf, { failOn: 'truncated' }).rotate();
	const meta = await pipeline.metadata();
	const needsResize = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;

	// Sharp-Pipeline einmal dekodieren, dann clone() für Original + Thumb
	// parallel verarbeiten → spart einen Decode-/Encode-Zyklus.
	const sized = needsResize
		? pipeline.resize({
				width: MAX_DIMENSION,
				height: MAX_DIMENSION,
				fit: 'inside',
				withoutEnlargement: true
			})
		: pipeline;

	const [original, thumb] = await Promise.all([
		sized.clone().jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
		sized
			.clone()
			.resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'cover' })
			.jpeg({ quality: 80, mozjpeg: true })
			.toBuffer()
	]);
	await Promise.all([writeFile(originalPath, original), writeFile(thumbPath, thumb)]);

	return { original: originalName, thumb: thumbName };
}

export async function deletePhoto(relativePath: string | null | undefined): Promise<void> {
	if (!relativePath) return;
	const sanitized = relativePath.replace(/^\/+/, '');
	if (sanitized.includes('..') || sanitized.includes('/')) return;
	const base = uploadsDir();
	const target = resolve(base, sanitized);
	if (!target.startsWith(base + '/')) return;
	const thumbPath = thumbForOriginal(sanitized);
	await Promise.allSettled([
		unlink(target),
		thumbPath ? unlink(resolve(base, thumbPath)) : Promise.resolve()
	]);
}

export function thumbForOriginal(originalName: string): string {
	const ext = extname(originalName);
	const stem = originalName.slice(0, originalName.length - ext.length);
	return `${stem}.thumb.jpg`;
}

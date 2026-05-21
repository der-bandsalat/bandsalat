import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { uploadsDir } from '../db/client';
import { getDiscogsToken } from '../settings';

const USER_AGENT = 'HoerspielKatalog/1.0 (+https://github.com/der-bandsalat/bandsalat)';
const MAX_BYTES = 6 * 1024 * 1024;

export interface CachedCover {
	original: string; // z.B. discogs-12345.jpg
	thumb: string; // z.B. discogs-12345.thumb.jpg
}

export async function cacheCoverFromUrl(
	url: string,
	releaseId: number
): Promise<CachedCover | null> {
	if (!url) return null;
	mkdirSync(uploadsDir(), { recursive: true });

	const headers: HeadersInit = { 'User-Agent': USER_AGENT };
	const token = getDiscogsToken();
	if (token && new URL(url).hostname.endsWith('discogs.com')) {
		headers['Authorization'] = `Discogs token=${token}`;
	}

	const res = await fetch(url, { headers });
	if (!res.ok) return null;
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

	const original = `discogs-${releaseId}.jpg`;
	const thumb = `discogs-${releaseId}.thumb.jpg`;
	const pipeline = sharp(buf).rotate();
	const [optimized, thumbBuf] = await Promise.all([
		pipeline.clone().jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
		pipeline
			.clone()
			.resize({ width: 320, height: 320, fit: 'cover' })
			.jpeg({ quality: 80, mozjpeg: true })
			.toBuffer()
	]);
	await Promise.all([
		writeFile(join(uploadsDir(), original), optimized),
		writeFile(join(uploadsDir(), thumb), thumbBuf)
	]);

	return { original, thumb };
}

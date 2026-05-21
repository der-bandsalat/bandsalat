import { error, type RequestHandler } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { uploadsDir } from '$lib/server/db/client';

const MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const rel = (params.path ?? '').replace(/^\/+/, '');
	if (!rel || rel.includes('..') || rel.includes('\0')) throw error(404);
	const base = uploadsDir();
	const full = resolve(base, rel);
	if (!full.startsWith(base + '/')) throw error(404);

	let s;
	try {
		s = await stat(full);
	} catch {
		throw error(404);
	}
	if (!s.isFile()) throw error(404);

	const mime = MIME[extname(rel).toLowerCase()] ?? 'application/octet-stream';
	const body = await readFile(full);
	const headers: Record<string, string> = {
		'content-type': mime,
		'content-length': String(s.size),
		'cache-control': 'private, max-age=86400',
		'x-content-type-options': 'nosniff'
	};
	if (mime === 'image/svg+xml') {
		// SVG kann Skripte enthalten — strikt sandboxen, falls direkt aufgerufen.
		headers['content-security-policy'] =
			"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; sandbox";
	}
	return new Response(body, { headers });
};

import type { RequestHandler } from '@sveltejs/kit';
import { snapshotSqlite } from '$lib/server/export/sqlite';

export const GET: RequestHandler = async () => {
	const buf = await snapshotSqlite();
	const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const body = new Blob([new Uint8Array(buf)], { type: 'application/vnd.sqlite3' });
	return new Response(body, {
		headers: {
			'content-type': 'application/vnd.sqlite3',
			'content-length': String(buf.byteLength),
			'content-disposition': `attachment; filename="bandsalat-${ts}.sqlite"`,
			'cache-control': 'no-store'
		}
	});
};

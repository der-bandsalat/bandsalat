import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { appMeta, cassettes } from '$lib/server/db/schema';

export const GET: RequestHandler = () => {
	const cassetteRows = db().select().from(cassettes).all();
	const metaRows = db().select().from(appMeta).all();
	const ts = new Date().toISOString();
	const dump = {
		version: 1,
		exportedAt: ts,
		cassettes: cassetteRows,
		appMeta: metaRows
	};
	const body = JSON.stringify(dump, null, 2);
	const tsFile = ts.replace(/[:.]/g, '-').slice(0, 19);
	return new Response(body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="bandsalat-${tsFile}.json"`,
			'cache-control': 'no-store'
		}
	});
};

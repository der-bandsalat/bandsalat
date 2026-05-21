import type { RequestHandler } from '@sveltejs/kit';
import { listCassettes } from '$lib/server/db/cassettes';
import { discogsCsv } from '$lib/server/export/csv';
import { getCachedFolderName } from '$lib/server/discogs/collection';

export const GET: RequestHandler = () => {
	const rows = listCassettes();
	const csv = discogsCsv(rows, getCachedFolderName() ?? 'Hörspielkassetten');
	const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	return new Response('﻿' + csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="bandsalat-discogs-${ts}.csv"`,
			'cache-control': 'no-store'
		}
	});
};

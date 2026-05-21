import { listCassettes } from '$lib/server/db/cassettes';
import { ALL_COLUMNS, toCsv, toXlsx } from '$lib/server/export/full';
import type { RequestHandler } from './$types';

function pickColumns(form: FormData) {
	const picked = ALL_COLUMNS.filter((c) => form.get(`col_${c.key}`) === 'on');
	return picked.length > 0 ? picked : ALL_COLUMNS;
}

function buildFilename(serie: string, format: string, ext: string): string {
	const today = new Date().toISOString().slice(0, 10);
	const parts = ['bandsalat'];
	if (serie) parts.push(serie.replace(/[^\p{L}\p{N}-]+/gu, '_'));
	if (format) parts.push(format);
	parts.push(today);
	return parts.join('-') + '.' + ext;
}

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const serie = String(form.get('serie') ?? '').trim();
	const format = String(form.get('format') ?? '').trim();
	const outFmt = String(form.get('outFormat') ?? 'csv').trim();

	const all = listCassettes();
	const rows = all.filter((c) => {
		if (serie && c.serie !== serie) return false;
		if (format && c.format !== format) return false;
		return true;
	});

	const cols = pickColumns(form);

	if (outFmt === 'xlsx') {
		const buf = toXlsx(rows, cols);
		return new Response(new Blob([new Uint8Array(buf)]), {
			status: 200,
			headers: {
				'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'content-disposition': `attachment; filename="${buildFilename(serie, format, 'xlsx')}"`,
				'cache-control': 'no-store'
			}
		});
	}

	const csv = toCsv(rows, cols);
	return new Response('﻿' + csv, {
		status: 200,
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${buildFilename(serie, format, 'csv')}"`,
			'cache-control': 'no-store'
		}
	});
};

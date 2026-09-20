import { json, type RequestHandler } from '@sveltejs/kit';
import { ensureEditor } from '$lib/server/auth/guard';
import { duplicatePayloads } from '$lib/server/scan-duplicates';
import { parseFolgeNr } from '$lib/util/folge';

/**
 * Dubletten-Re-Check für den Scanner: Nachdem der Nutzer Serie/Folge oder den
 * Discogs-Treffer im Scan-Modal korrigiert hat, muss die „Hast du schon!"-
 * Warnung zu den korrigierten Daten passen — nicht zu dem, was die KI zuerst
 * gelesen hat.
 *
 * GET /api/cassettes/duplicates?serie=…&folgeNr=…&releaseIds=1,2,3
 */
export const GET: RequestHandler = ({ url, locals }) => {
	ensureEditor(locals);
	const serie = url.searchParams.get('serie')?.trim() || null;
	const folgeNr = parseFolgeNr(url.searchParams.get('folgeNr'));
	const releaseIds = (url.searchParams.get('releaseIds') ?? '')
		.split(',')
		.map((s) => Number.parseInt(s.trim(), 10))
		.filter((n) => Number.isInteger(n) && n > 0)
		.slice(0, 20);
	return json({ duplicates: duplicatePayloads({ serie, folgeNr, releaseIds }) });
};

import type { Cassette } from '../db/schema';

const DISCOGS_HEADERS = [
	'Catalog#',
	'Artist',
	'Title',
	'Label',
	'Format',
	'Rating',
	'Released',
	'release_id',
	'CollectionFolder',
	'Date Added',
	'Collection Media Condition',
	'Collection Sleeve Condition',
	'Collection Notes'
] as const;

function csvField(v: string | number | null | undefined): string {
	if (v === null || v === undefined) return '';
	const s = String(v);
	if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function composeNotes(c: Cassette): string {
	const parts: string[] = [];
	if (c.seriennummer) parts.push(`Seriennummer: ${c.seriennummer}`);
	if (c.auflageVariante) parts.push(`Auflage: ${c.auflageVariante}`);
	if (c.notiz) parts.push(c.notiz);
	return parts.join(' · ');
}

/**
 * Erzeugt eine Discogs-Collection-Import-CSV. Nur Einträge mit Release-ID
 * werden exportiert (release_id ist Pflicht für den Import).
 */
export function discogsCsv(rows: Cassette[], folderName = 'Hörspielkassetten'): string {
	const lines: string[] = [DISCOGS_HEADERS.join(',')];
	for (const c of rows) {
		if (!c.discogsReleaseId) continue;
		lines.push(
			[
				'', // Catalog#
				c.serie, // Artist (lokal die Serie)
				c.titel,
				c.label ?? '',
				'Cassette',
				'', // Rating
				c.jahr ?? '',
				c.discogsReleaseId,
				folderName,
				c.kaufdatum ?? '',
				c.zustandMc ?? '',
				c.zustandHuelle ?? '',
				composeNotes(c)
			]
				.map(csvField)
				.join(',')
		);
	}
	return lines.join('\r\n') + '\r\n';
}

/**
 * Sehr einfacher CSV-Parser für die Reimport-Variante des Discogs-Formats.
 * Erwartet eine erste Zeile mit Headern.
 */
export function parseCsv(text: string): Record<string, string>[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				row.push(field);
				field = '';
			} else if (ch === '\r') {
				// ignore — \n folgt
			} else if (ch === '\n') {
				row.push(field);
				rows.push(row);
				row = [];
				field = '';
			} else {
				field += ch;
			}
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	if (rows.length === 0) return [];
	const headers = rows[0];
	return rows.slice(1).map((r) => {
		const obj: Record<string, string> = {};
		headers.forEach((h, idx) => {
			obj[h] = r[idx] ?? '';
		});
		return obj;
	});
}

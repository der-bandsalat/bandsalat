/**
 * Vollständiger Export aller Kassetten-Felder als CSV oder XLSX.
 * Im Gegensatz zu `csv.ts` (Discogs-Format) sind hier alle Spalten
 * inklusive — ideal für Backup, Migration zu anderen Tools, Spreadsheet-
 * Analyse.
 */
import * as XLSX from 'xlsx';
import type { Cassette } from '../db/schema';
import { FORMAT_LABELS, type MediaFormat } from '$lib/format';

export interface ColumnDef {
	key: string;
	label: string;
	get: (c: Cassette) => string | number | null;
}

export const ALL_COLUMNS: ColumnDef[] = [
	{ key: 'id', label: 'ID', get: (c) => c.id },
	{ key: 'serie', label: 'Serie', get: (c) => c.serie },
	{ key: 'folge_nr', label: 'Folge-Nr', get: (c) => c.folgeNr ?? null },
	{ key: 'folge_nr_label', label: 'Folge-Label', get: (c) => c.folgeNrLabel ?? null },
	{ key: 'titel', label: 'Titel', get: (c) => c.titel },
	{
		key: 'format',
		label: 'Format',
		get: (c) => FORMAT_LABELS[c.format as MediaFormat] ?? c.format
	},
	{ key: 'label', label: 'Label', get: (c) => c.label ?? null },
	{ key: 'auflage_variante', label: 'Auflage / Variante', get: (c) => c.auflageVariante ?? null },
	{ key: 'jahr', label: 'Jahr', get: (c) => c.jahr ?? null },
	{ key: 'seriennummer', label: 'Seriennummer', get: (c) => c.seriennummer ?? null },
	{ key: 'zustand_mc', label: 'Zustand MC', get: (c) => c.zustandMc ?? null },
	{ key: 'zustand_huelle', label: 'Zustand Hülle', get: (c) => c.zustandHuelle ?? null },
	{ key: 'originalhuelle', label: 'Originalhülle', get: (c) => (c.originalhuelle ? 'ja' : 'nein') },
	{ key: 'vollstaendig', label: 'Vollständig', get: (c) => (c.vollstaendig ? 'ja' : 'nein') },
	{ key: 'kaufdatum', label: 'Kaufdatum', get: (c) => c.kaufdatum ?? null },
	{
		key: 'kaufpreis_eur',
		label: 'Kaufpreis (€)',
		get: (c) =>
			c.kaufpreisCent != null ? (c.kaufpreisCent / 100).toFixed(2).replace('.', ',') : null
	},
	{ key: 'kaufort', label: 'Kaufort', get: (c) => c.kaufort ?? null },
	{ key: 'folder', label: 'Ordner', get: (c) => c.folder ?? null },
	{ key: 'auflage_id', label: 'Auflage-ID', get: (c) => c.auflageId ?? null },
	{
		key: 'rating',
		label: 'Bewertung (1–5 Sterne)',
		get: (c) => (c.rating != null ? (c.rating / 2).toFixed(1).replace('.', ',') : null)
	},
	{ key: 'review', label: 'Review', get: (c) => c.review ?? null },
	{ key: 'notiz', label: 'Notiz', get: (c) => c.notiz ?? null },
	{
		key: 'discogs_release_id',
		label: 'Discogs Release-ID',
		get: (c) => c.discogsReleaseId ?? null
	},
	{ key: 'discogs_url', label: 'Discogs URL', get: (c) => c.discogsUrl ?? null },
	{ key: 'discogs_cover_url', label: 'Discogs Cover URL', get: (c) => c.discogsCoverUrl ?? null },
	{ key: 'created_at', label: 'Erfasst am', get: (c) => c.createdAt },
	{ key: 'updated_at', label: 'Aktualisiert am', get: (c) => c.updatedAt }
];

function csvField(v: string | number | null): string {
	if (v === null) return '';
	const s = String(v);
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

export function toCsv(rows: Cassette[], columns: ColumnDef[]): string {
	const lines: string[] = [columns.map((c) => csvField(c.label)).join(',')];
	for (const row of rows) {
		lines.push(columns.map((c) => csvField(c.get(row))).join(','));
	}
	return lines.join('\r\n') + '\r\n';
}

export function toXlsx(rows: Cassette[], columns: ColumnDef[]): Buffer {
	const aoa: (string | number | null)[][] = [columns.map((c) => c.label)];
	for (const row of rows) aoa.push(columns.map((c) => c.get(row)));
	const ws = XLSX.utils.aoa_to_sheet(aoa);
	// Autosize-Heuristik: max(len(label), len(longest value)) clamp 8..40
	ws['!cols'] = columns.map((c, i) => {
		let maxLen = c.label.length;
		for (let r = 1; r < aoa.length; r++) {
			const v = aoa[r][i];
			if (v != null) maxLen = Math.max(maxLen, String(v).length);
		}
		return { wch: Math.min(40, Math.max(8, maxLen + 2)) };
	});
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Kassetten');
	const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
	return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}

/** Liest CSV (mit Komma-Trennung + ggf. Quoten) ODER XLSX. */
export function parseSpreadsheet(buf: Buffer, filename: string): string[][] {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
		const wb = XLSX.read(buf, { type: 'buffer' });
		const firstSheet = wb.SheetNames[0];
		if (!firstSheet) return [];
		const ws = wb.Sheets[firstSheet];
		return XLSX.utils
			.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' })
			.map((row) => (row as unknown[]).map((v) => (v == null ? '' : String(v))));
	}
	// CSV
	const text = buf.toString('utf-8').replace(/^﻿/, '');
	return parseCsvText(text);
}

function parseCsvText(text: string): string[][] {
	const rows: string[][] = [];
	let cur: string[] = [];
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
			} else if (ch === ',' || ch === ';' || ch === '\t') {
				cur.push(field);
				field = '';
			} else if (ch === '\n') {
				cur.push(field);
				field = '';
				rows.push(cur);
				cur = [];
			} else if (ch === '\r') {
				// skip; next \n will commit
			} else {
				field += ch;
			}
		}
	}
	if (field.length > 0 || cur.length > 0) {
		cur.push(field);
		rows.push(cur);
	}
	return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

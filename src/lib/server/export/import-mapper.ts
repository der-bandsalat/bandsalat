/**
 * Importiert generische Tabellen-Rows in Kassetten-Datensätze, unter
 * Berücksichtigung eines User-definierten Spalten-Mappings.
 *
 * mapping = { "Discogs Title": "titel", "Year": "jahr", ... }
 *   — Key: Header-Name aus der hochgeladenen Datei
 *   — Value: Ziel-Field-Key (siehe TARGET_FIELDS) oder "" für „ignorieren"
 */
import { MEDIA_FORMATS, MEDIA_GRADES, SLEEVE_GRADES, type MediaFormat } from '../db/schema';

export const TARGET_FIELDS = [
	{ key: 'serie', label: 'Serie (Pflicht)', required: true },
	{ key: 'titel', label: 'Titel (Pflicht)', required: true },
	{ key: 'folgeNr', label: 'Folge-Nummer' },
	{ key: 'folgeNrLabel', label: 'Folge-Label (Text)' },
	{ key: 'format', label: 'Format (cassette/lp/cd)' },
	{ key: 'label', label: 'Label' },
	{ key: 'auflageVariante', label: 'Auflage / Variante' },
	{ key: 'jahr', label: 'Jahr' },
	{ key: 'seriennummer', label: 'Seriennummer' },
	{ key: 'zustandMc', label: 'Zustand MC (Discogs-Grading)' },
	{ key: 'zustandHuelle', label: 'Zustand Hülle (Discogs-Grading)' },
	{ key: 'originalhuelle', label: 'Originalhülle (ja/nein)' },
	{ key: 'vollstaendig', label: 'Vollständig (ja/nein)' },
	{ key: 'kaufdatum', label: 'Kaufdatum (YYYY-MM-DD)' },
	{ key: 'kaufpreisEur', label: 'Kaufpreis (€)' },
	{ key: 'kaufort', label: 'Kaufort' },
	{ key: 'folder', label: 'Ordner' },
	{ key: 'rating', label: 'Bewertung (1–5 Sterne)' },
	{ key: 'review', label: 'Review' },
	{ key: 'notiz', label: 'Notiz' },
	{ key: 'discogsReleaseId', label: 'Discogs Release-ID' },
	{ key: 'discogsUrl', label: 'Discogs URL' },
	{ key: 'discogsCoverUrl', label: 'Discogs Cover URL' }
] as const;

export type TargetFieldKey = (typeof TARGET_FIELDS)[number]['key'];

const FIELD_KEYS = new Set<string>(TARGET_FIELDS.map((f) => f.key));

export function isTargetFieldKey(s: string): s is TargetFieldKey {
	return FIELD_KEYS.has(s);
}

/**
 * Heuristisches Auto-Mapping: aus dem Header-Namen das passende Target-Field
 * raten. Wird beim ersten Anzeigen des Mapping-Schritts als Default angeboten.
 */
const HEADER_HINTS: { regex: RegExp; key: TargetFieldKey }[] = [
	{ regex: /^artist$|^serie/i, key: 'serie' },
	{ regex: /^title$|^titel$/i, key: 'titel' },
	{ regex: /folge.*nr|nummer|^nr\.?$|^folge$/i, key: 'folgeNr' },
	{ regex: /folge.*label/i, key: 'folgeNrLabel' },
	{ regex: /format/i, key: 'format' },
	{ regex: /label/i, key: 'label' },
	{ regex: /auflage|variante|edition/i, key: 'auflageVariante' },
	{ regex: /jahr|year|released/i, key: 'jahr' },
	{ regex: /serien.?nummer|cat.?no|catalog/i, key: 'seriennummer' },
	{ regex: /(media|mc).*condition|zustand.?mc/i, key: 'zustandMc' },
	{ regex: /sleeve.*condition|h(ü|ue)lle.*zustand|zustand.?h(ü|ue)lle/i, key: 'zustandHuelle' },
	{ regex: /original.?h(ü|ue)lle/i, key: 'originalhuelle' },
	{ regex: /vollst(ä|ae)ndig|complete/i, key: 'vollstaendig' },
	{ regex: /kaufdatum|date.?added|purchase.?date/i, key: 'kaufdatum' },
	{ regex: /kaufpreis|preis|price|cost/i, key: 'kaufpreisEur' },
	{ regex: /kaufort|where|location/i, key: 'kaufort' },
	{ regex: /ordner|folder/i, key: 'folder' },
	{ regex: /bewertung|rating|stars?|sterne/i, key: 'rating' },
	{ regex: /review/i, key: 'review' },
	{ regex: /notiz|note|comment/i, key: 'notiz' },
	{ regex: /release.?id/i, key: 'discogsReleaseId' },
	{ regex: /discogs.*url/i, key: 'discogsUrl' },
	{ regex: /cover.?url/i, key: 'discogsCoverUrl' }
];

export function autoMap(headers: string[]): Record<string, TargetFieldKey | ''> {
	const out: Record<string, TargetFieldKey | ''> = {};
	const taken = new Set<TargetFieldKey>();
	for (const h of headers) {
		const trimmed = h.trim();
		if (!trimmed) continue;
		const hit = HEADER_HINTS.find(({ regex }) => regex.test(trimmed));
		if (hit && !taken.has(hit.key)) {
			out[trimmed] = hit.key;
			taken.add(hit.key);
		} else {
			out[trimmed] = '';
		}
	}
	return out;
}

export interface DraftCassette {
	serie: string;
	titel: string;
	folgeNr: number | null;
	folgeNrLabel: string | null;
	format: MediaFormat;
	label: string | null;
	auflageVariante: string | null;
	jahr: number | null;
	seriennummer: string | null;
	zustandMc: (typeof MEDIA_GRADES)[number] | null;
	zustandHuelle: (typeof SLEEVE_GRADES)[number] | null;
	originalhuelle: boolean;
	vollstaendig: boolean;
	kaufdatum: string | null;
	kaufpreisCent: number | null;
	kaufort: string | null;
	folder: string | null;
	rating: number | null;
	review: string | null;
	notiz: string | null;
	discogsReleaseId: number | null;
	discogsUrl: string | null;
	discogsCoverUrl: string | null;
}

export interface RowMapResult {
	draft: DraftCassette | null;
	error: string | null;
}

function parseIntOr(v: string, min: number, max: number): number | null {
	const n = Number.parseInt(v.trim(), 10);
	if (!Number.isInteger(n) || n < min || n > max) return null;
	return n;
}

function parseBoolDefault(v: string, fallback: boolean): boolean {
	const t = v.trim().toLowerCase();
	if (['ja', 'yes', 'true', '1', 'x', 'on'].includes(t)) return true;
	if (['nein', 'no', 'false', '0', '-'].includes(t)) return false;
	return fallback;
}

function parsePriceCent(v: string): number | null {
	const t = v.trim().replace('€', '').trim();
	if (!t) return null;
	const num = Number(t.replace(',', '.'));
	if (!Number.isFinite(num) || num < 0) return null;
	return Math.round(num * 100);
}

function parseDate(v: string): string | null {
	const t = v.trim();
	if (!t) return null;
	const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return m[0];
	const m2 = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
	if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
	return null;
}

function parseRating(v: string): number | null {
	const t = v.trim().replace(',', '.');
	if (!t) return null;
	const n = Number(t);
	if (!Number.isFinite(n)) return null;
	if (n >= 1 && n <= 5) return Math.round(n * 2);
	if (n >= 1 && n <= 10) return Math.round(n);
	return null;
}

function parseFormat(v: string): MediaFormat {
	const t = v.trim().toLowerCase();
	if (t === 'lp' || t === 'vinyl' || t === 'schallplatte') return 'lp';
	if (t === 'cd') return 'cd';
	return 'cassette';
}

function pickGrade<T extends readonly string[]>(grades: T, v: string): T[number] | null {
	const t = v.trim();
	if (!t) return null;
	// Exact match
	const hit = grades.find((g) => g.toLowerCase() === t.toLowerCase());
	if (hit) return hit;
	// Match by short-code: "VG+", "VG", "NM"
	const shortHit = grades.find((g) => {
		const match = g.match(/\(([^)]+)\)$/);
		return match && match[1].toLowerCase() === t.toLowerCase();
	});
	return shortHit ?? null;
}

export function mapRow(
	row: string[],
	headers: string[],
	mapping: Record<string, string>
): RowMapResult {
	const headerToCol = new Map<string, number>();
	headers.forEach((h, i) => headerToCol.set(h.trim(), i));

	function valueFor(targetKey: TargetFieldKey): string {
		for (const [header, target] of Object.entries(mapping)) {
			if (target !== targetKey) continue;
			const col = headerToCol.get(header.trim());
			if (col == null) continue;
			return (row[col] ?? '').toString();
		}
		return '';
	}

	const serie = valueFor('serie').trim();
	const titel = valueFor('titel').trim();
	if (!serie) return { draft: null, error: 'Serie fehlt' };
	if (!titel) return { draft: null, error: 'Titel fehlt' };

	const folgeNrRaw = valueFor('folgeNr');
	const jahrRaw = valueFor('jahr');
	const releaseIdRaw = valueFor('discogsReleaseId');

	const draft: DraftCassette = {
		serie,
		titel,
		folgeNr: folgeNrRaw ? parseIntOr(folgeNrRaw, 0, 9999) : null,
		folgeNrLabel: valueFor('folgeNrLabel').trim() || null,
		format: parseFormat(valueFor('format')),
		label: valueFor('label').trim() || null,
		auflageVariante: valueFor('auflageVariante').trim() || null,
		jahr: jahrRaw ? parseIntOr(jahrRaw, 1900, 2100) : null,
		seriennummer: valueFor('seriennummer').trim() || null,
		zustandMc: pickGrade(MEDIA_GRADES, valueFor('zustandMc')),
		zustandHuelle: pickGrade(SLEEVE_GRADES, valueFor('zustandHuelle')),
		originalhuelle: parseBoolDefault(valueFor('originalhuelle'), true),
		vollstaendig: parseBoolDefault(valueFor('vollstaendig'), true),
		kaufdatum: parseDate(valueFor('kaufdatum')),
		kaufpreisCent: parsePriceCent(valueFor('kaufpreisEur')),
		kaufort: valueFor('kaufort').trim() || null,
		folder: valueFor('folder').trim() || null,
		rating: parseRating(valueFor('rating')),
		review: valueFor('review').trim() || null,
		notiz: valueFor('notiz').trim() || null,
		discogsReleaseId: releaseIdRaw ? parseIntOr(releaseIdRaw, 1, 999_999_999) : null,
		discogsUrl: valueFor('discogsUrl').trim() || null,
		discogsCoverUrl: valueFor('discogsCoverUrl').trim() || null
	};
	return { draft, error: null };
}

// Re-export for use in other contexts
export { MEDIA_FORMATS };
export type { MediaFormat };

import { z } from 'zod';
import { MEDIA_FORMATS, MEDIA_GRADES, SLEEVE_GRADES } from '$lib/server/db/schema';

const emptyAsNull = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), schema.nullable());

const checkboxBool = z.preprocess(
	(v) => v === 'on' || v === 'true' || v === '1' || v === true,
	z.boolean()
);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein.');

const priceEur = z.preprocess((v) => {
	if (v === '' || v === null || v === undefined) return null;
	if (typeof v === 'string') {
		const normalized = v.replace(',', '.').trim();
		if (normalized === '') return null;
		const n = Number(normalized);
		if (!Number.isFinite(n)) return v; // lass zod weiter validieren
		return Math.round(n * 100);
	}
	if (typeof v === 'number') return Math.round(v * 100);
	return v;
}, z.number().int().min(0, 'Preis darf nicht negativ sein.').nullable());

export const CassetteFormSchema = z.object({
	serie: z.string().trim().min(1, 'Serie ist Pflicht.').max(120),
	folgeNr: emptyAsNull(z.coerce.number().int().min(0).max(9999)),
	folgeNrLabel: emptyAsNull(z.string().trim().max(40)),
	titel: z.string().trim().min(1, 'Titel ist Pflicht.').max(200),
	format: z.preprocess(
		(v) => (v === '' || v == null ? 'cassette' : v),
		z.enum(MEDIA_FORMATS).default('cassette')
	),
	label: emptyAsNull(z.string().trim().max(80)),
	auflageVariante: emptyAsNull(z.string().trim().max(200)),
	jahr: emptyAsNull(z.coerce.number().int().min(1900).max(2100)),
	discogsReleaseId: emptyAsNull(z.coerce.number().int().positive()),
	discogsUrl: emptyAsNull(z.string().url('Keine gültige URL.')),
	discogsCoverUrl: emptyAsNull(z.string().url('Keine gültige URL.')),
	seriennummer: emptyAsNull(z.string().trim().max(80)),
	zustandMc: emptyAsNull(z.enum(MEDIA_GRADES)),
	zustandHuelle: emptyAsNull(z.enum(SLEEVE_GRADES)),
	originalhuelle: checkboxBool,
	vollstaendig: checkboxBool,
	kaufdatum: emptyAsNull(dateString),
	kaufpreisCent: priceEur,
	kaufort: emptyAsNull(z.string().trim().max(120)),
	folder: emptyAsNull(z.string().trim().max(80)),
	auflageId: emptyAsNull(z.string().trim().max(120)),
	rating: emptyAsNull(z.coerce.number().int().min(1).max(10)),
	review: emptyAsNull(z.string().trim().max(2000)),
	notiz: emptyAsNull(z.string().trim().max(2000))
});

export type CassetteFormInput = z.input<typeof CassetteFormSchema>;
export type CassetteFormParsed = z.output<typeof CassetteFormSchema>;

export const SearchFilterSchema = z.object({
	q: z.string().trim().max(120).optional(),
	serie: z.string().trim().max(120).optional(),
	label: z.string().trim().max(80).optional(),
	format: z.enum(MEDIA_FORMATS).optional(),
	zustand: emptyAsNull(z.enum(MEDIA_GRADES)).optional(),
	originalhuelle: z.enum(['ja', 'nein', '']).optional(),
	hatDiscogs: z.enum(['ja', 'nein', '']).optional(),
	kaufVon: emptyAsNull(dateString).optional(),
	kaufBis: emptyAsNull(dateString).optional(),
	sort: z
		.enum([
			'created_desc',
			'created_asc',
			'serie',
			'folge_asc',
			'folge_desc',
			'jahr_desc',
			'jahr_asc',
			'preis_desc',
			'preis_asc',
			'last_listened_desc',
			'last_listened_asc',
			'most_listened',
			'rating_desc',
			'rating_asc'
		])
		.optional(),
	view: z.enum(['grid', 'table']).optional()
});

export type SearchFilter = z.output<typeof SearchFilterSchema>;

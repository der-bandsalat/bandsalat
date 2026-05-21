import { z } from 'zod';

const emptyAsNull = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((v) => (v === '' || v === null || v === undefined ? null : v), schema.nullable());

const priceEur = z.preprocess((v) => {
	if (v === '' || v === null || v === undefined) return null;
	if (typeof v === 'string') {
		const normalized = v.replace(',', '.').trim();
		if (normalized === '') return null;
		const n = Number(normalized);
		if (!Number.isFinite(n)) return v;
		return Math.round(n * 100);
	}
	if (typeof v === 'number') return Math.round(v * 100);
	return v;
}, z.number().int().min(0, 'Preis darf nicht negativ sein.').nullable());

export const WantlistFormSchema = z.object({
	serie: emptyAsNull(z.string().trim().max(120)),
	folgeNr: emptyAsNull(z.coerce.number().int().min(0).max(9999)),
	titel: emptyAsNull(z.string().trim().max(200)),
	auflageVariante: emptyAsNull(z.string().trim().max(200)),
	jahr: emptyAsNull(z.coerce.number().int().min(1900).max(2100)),
	label: emptyAsNull(z.string().trim().max(80)),
	discogsReleaseId: emptyAsNull(z.coerce.number().int().positive()),
	discogsUrl: emptyAsNull(z.string().url('Keine gültige URL.')),
	discogsCoverUrl: emptyAsNull(z.string().url('Keine gültige URL.')),
	maxPriceCent: priceEur,
	priority: z.preprocess(
		(v) => (v === '' || v === null || v === undefined ? 1 : v),
		z.coerce.number().int().min(0).max(3)
	),
	notiz: emptyAsNull(z.string().trim().max(2000))
});

export type WantlistFormInput = z.input<typeof WantlistFormSchema>;
export type WantlistFormParsed = z.output<typeof WantlistFormSchema>;

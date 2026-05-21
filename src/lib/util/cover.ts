import type { Cassette } from '$lib/server/db/schema';

function thumbFor(name: string): string {
	const stem = name.replace(/\.[^.]+$/, '');
	return `/uploads/${stem}.thumb.jpg`;
}

/**
 * Externes Cover (z.B. von dreimetadaten.de) wird als `{ original, thumb }`
 * übergeben. Sind beides Pfade relativ zu /uploads/ — wie bei den anderen
 * gecachten Bildern.
 */
export interface ExternalCoverPaths {
	original: string;
	thumb: string;
}

function pickPath(
	source: Cassette['coverSource'] | undefined,
	c: Partial<Cassette>,
	external?: ExternalCoverPaths | null,
	mode: 'thumb' | 'full' = 'thumb'
): string | null {
	const useThumb = mode === 'thumb';
	const photo = c.coverFotoPath
		? useThumb
			? thumbFor(c.coverFotoPath)
			: `/uploads/${c.coverFotoPath}`
		: null;
	const discogs = c.discogsCoverCachePath
		? useThumb
			? thumbFor(c.discogsCoverCachePath)
			: `/uploads/${c.discogsCoverCachePath}`
		: null;
	const ext = external
		? useThumb
			? `/uploads/${external.thumb}`
			: `/uploads/${external.original}`
		: null;
	const remote = c.discogsCoverUrl ?? null;

	switch (source) {
		case 'photo':
			return photo ?? null;
		case 'discogs':
			return discogs ?? remote ?? null;
		case 'external':
			return ext ?? null;
		case 'auto':
		default:
			return photo ?? discogs ?? ext ?? remote ?? null;
	}
}

/** Beste Thumbnail-URL für eine Kassette unter Berücksichtigung der Cover-Quellen-Präferenz. */
export function coverThumbUrl(
	c: Partial<Cassette>,
	external?: ExternalCoverPaths | null
): string | null {
	return pickPath(c.coverSource, c, external ?? null, 'thumb');
}

/** Vollbild-URL (für Detail-Anzeige). */
export function coverFullUrl(
	c: Partial<Cassette>,
	external?: ExternalCoverPaths | null
): string | null {
	return pickPath(c.coverSource, c, external ?? null, 'full');
}

/**
 * Welche Cover-Quellen sind tatsächlich verfügbar — UI nutzt das um die
 * Picker-Buttons zu zeigen.
 */
export function availableCoverSources(
	c: Partial<Cassette>,
	external?: ExternalCoverPaths | null
): { id: 'photo' | 'discogs' | 'external'; label: string }[] {
	const out: { id: 'photo' | 'discogs' | 'external'; label: string }[] = [];
	if (c.coverFotoPath) out.push({ id: 'photo', label: 'Foto' });
	if (c.discogsCoverCachePath || c.discogsCoverUrl) out.push({ id: 'discogs', label: 'Discogs' });
	if (external) out.push({ id: 'external', label: 'dreimetadaten' });
	return out;
}

/**
 * Helper für Listen-Views: nimmt die batch-geladene Folge-Cover-Map und
 * liest das passende Cover für eine Kassette heraus. Map-Key ist
 * "<serie>|<folgeNr>".
 */
export function externalCoverFor(
	c: Partial<Cassette>,
	covers: ReadonlyMap<string, ExternalCoverPaths> | null | undefined
): ExternalCoverPaths | null {
	if (!covers || c.folgeNr == null) return null;
	return covers.get(`${c.serie}|${c.folgeNr}`) ?? null;
}

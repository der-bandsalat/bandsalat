/**
 * Tonträger-Formate. Werte werden direkt in der `cassettes.format`-Spalte
 * gespeichert. Im UI als Auswahl-Optionen und Badges verwendet.
 */
export const MEDIA_FORMATS = ['cassette', 'lp', 'cd'] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

export const FORMAT_LABELS: Record<MediaFormat, string> = {
	cassette: 'Kassette',
	lp: 'Schallplatte',
	cd: 'CD'
};

export const FORMAT_SHORT: Record<MediaFormat, string> = {
	cassette: 'MC',
	lp: 'LP',
	cd: 'CD'
};

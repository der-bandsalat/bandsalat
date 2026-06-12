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

/** Kurzlabel mit Fallback ("MC") — für UI-Beschriftungen wie "Zustand MC". */
export function formatShort(fmt: string | null | undefined): string {
	return FORMAT_SHORT[(fmt || 'cassette') as MediaFormat] ?? 'MC';
}

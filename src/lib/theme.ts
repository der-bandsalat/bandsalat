// Client-sichtbare Theme-Konstanten (keine Cookie-/Server-APIs).
// Server-Helfer liegen in $lib/server/theme.ts.

export const THEME_COOKIE = 'bandsalat_theme';

export const THEMES = ['system', 'light', 'dark', 'hifi'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<
	Theme,
	{ label: string; description: string; swatchBg: string; swatchFg: string; swatchAccent: string }
> = {
	system: {
		label: 'Systemvorgabe',
		description: 'Folgt deinem Betriebssystem (Hell oder Dunkel).',
		swatchBg: 'linear-gradient(135deg, #fafaf9 50%, #18181b 50%)',
		swatchFg: '#27272a',
		swatchAccent: '#f2750c'
	},
	light: {
		label: 'Hell',
		description: 'Klassisch — heller Hintergrund, orange Akzente.',
		swatchBg: '#fafaf9',
		swatchFg: '#27272a',
		swatchAccent: '#f2750c'
	},
	dark: {
		label: 'Dunkel',
		description: 'Dunkelmodus mit orangen Akzenten.',
		swatchBg: '#1c1917',
		swatchFg: '#e7e5e4',
		swatchAccent: '#f59332'
	},
	hifi: {
		label: 'HiFi Schwarz-Gold',
		description: 'Japanische Audiophil-Anmutung — tiefes Schwarz, warmes Gold.',
		swatchBg: '#0a0907',
		swatchFg: '#e8dcc2',
		swatchAccent: '#d4af37'
	}
};

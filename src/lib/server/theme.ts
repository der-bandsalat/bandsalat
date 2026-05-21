import type { Cookies } from '@sveltejs/kit';
import { THEME_COOKIE, THEMES, type Theme } from '$lib/theme';

export { THEME_COOKIE, THEMES, type Theme } from '$lib/theme';

export function readTheme(cookies: Cookies): Theme {
	const raw = cookies.get(THEME_COOKIE);
	if (raw && (THEMES as readonly string[]).includes(raw)) return raw as Theme;
	return 'system';
}

export function writeTheme(cookies: Cookies, theme: Theme) {
	cookies.set(THEME_COOKIE, theme, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});
}

export function htmlAttrsFor(theme: Theme): { className: string; dataTheme: Theme } {
	const className = theme === 'dark' || theme === 'hifi' ? 'dark' : '';
	return { className, dataTheme: theme };
}

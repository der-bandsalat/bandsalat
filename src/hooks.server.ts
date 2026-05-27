import { redirect, type Handle } from '@sveltejs/kit';
import { clearSessionCookie, verifySessionToken, SESSION_COOKIE } from '$lib/server/auth/session';
import { getUserById } from '$lib/server/db/users';
import { initApp } from '$lib/server/init';
import { htmlAttrsFor, readTheme } from '$lib/server/theme';

initApp();

const PUBLIC_PATHS = new Set(['/login', '/healthz', '/robots.txt', '/favicon.ico']);
const PUBLIC_PREFIXES = ['/_app/', '/static/', '/share/', '/api/demo/', '/api/support/'];

function isPublic(pathname: string): boolean {
	if (PUBLIC_PATHS.has(pathname)) return true;
	return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export const handle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(SESSION_COOKIE);
	const session = verifySessionToken(cookie);
	let user = null;
	if (session) {
		const dbUser = getUserById(session.userId);
		if (dbUser && dbUser.active) {
			user = dbUser;
			event.locals.user = {
				id: dbUser.id,
				username: dbUser.username,
				email: dbUser.email,
				role: dbUser.role
			};
		} else {
			// User deaktiviert oder gelöscht — Cookie räumen.
			clearSessionCookie(event.cookies);
		}
	}

	if (!isPublic(event.url.pathname) && !user) {
		const next = event.url.pathname + event.url.search;
		throw redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}

	const theme = readTheme(event.cookies);
	const { className, dataTheme } = htmlAttrsFor(theme);
	const classAttr = className ? ` class="${className}"` : '';

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				'<html lang="de" data-theme="system">',
				`<html lang="de"${classAttr} data-theme="${dataTheme}">`
			)
	});

	// Security-Header: Defense-in-Depth zusätzlich zu Caddy. CSP ist relativ
	// streng — inline-Scripts brauchen wir nur für den Theme-Switcher in
	// app.html (mit nonce wäre sauberer, hier 'unsafe-inline' für Pragmatismus).
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-frame-options', 'DENY');
	// HSTS nur in prod, sonst nervt es lokal mit https-Lock-in.
	if (event.url.protocol === 'https:') {
		response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	}
	// CSP — die App ist self-contained, lädt Cover/Logos nur von eigenem
	// /uploads + Discogs CDN, Anthropic-Calls laufen serverseitig.
	if (
		response.headers.get('content-type')?.startsWith('text/html') &&
		!event.url.pathname.startsWith('/share/')
	) {
		response.headers.set(
			'content-security-policy',
			[
				"default-src 'self'",
				"script-src 'self' 'unsafe-inline'",
				// fonts.googleapis.com für das Font-Lab + ggf. zukünftige Webfonts.
				"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
				"img-src 'self' data: https://i.discogs.com https://*.discogs.com https://dreimetadaten.de",
				"font-src 'self' https://fonts.gstatic.com",
				"connect-src 'self'",
				"frame-ancestors 'none'",
				"base-uri 'self'",
				"form-action 'self'"
			].join('; ')
		);
	}

	return response;
};

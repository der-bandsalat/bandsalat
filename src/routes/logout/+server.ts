import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth/session';

/**
 * Nur POST — GET-Logout wäre über `<img src="/logout">` per CSRF auslösbar.
 * Bestehende Logout-Links müssen ein <form method="POST" action="/logout">
 * sein.
 */
export const POST = ({ cookies }) => {
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
};

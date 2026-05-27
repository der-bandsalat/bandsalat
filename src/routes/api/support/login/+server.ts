import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$lib/server/env';
import { consumeSupportNonce, verifySupportToken } from '$lib/server/auth/support-token';
import { createSessionToken, setSessionCookie } from '$lib/server/auth/session';
import { getUserByLogin } from '$lib/server/db/users';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!env().SUPPORT_HMAC_SECRET) throw error(404, 'Not found');

	const token = url.searchParams.get('token');
	const verified = verifySupportToken(token ?? undefined);
	if (!verified) throw error(401, 'Ungültiger Support-Token');
	if (!consumeSupportNonce(verified.nonce)) throw error(401, 'Token bereits verwendet');

	const user = getUserByLogin(verified.username);
	if (!user || !user.active) throw error(404, 'User nicht gefunden oder deaktiviert');

	// Kurze Session — Support soll nicht lange Cookie haben.
	const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h
	const { token: sessionToken } = createSessionToken(user.id, { expiresAt });
	setSessionCookie(cookies, sessionToken, expiresAt);

	throw redirect(303, '/');
};

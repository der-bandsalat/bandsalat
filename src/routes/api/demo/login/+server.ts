import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$lib/server/env';
import { consumeNonce, verifyDemoToken } from '$lib/server/auth/demo-token';
import { createSessionToken, setSessionCookie } from '$lib/server/auth/session';
import { getUserByLogin } from '$lib/server/db/users';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!env().DEMO_MODE) throw error(404, 'Not found');

	const token = url.searchParams.get('token');
	const verified = verifyDemoToken(token ?? undefined);
	if (!verified || verified.action !== 'login') throw error(401, 'Ungültiger Token');
	if (!consumeNonce(verified.nonce)) throw error(401, 'Token bereits verwendet');

	const expectedUsername = env().DEMO_USERNAME;
	if (verified.username !== expectedUsername) throw error(401, 'Unbekannter Demo-User');

	const user = getUserByLogin(expectedUsername);
	if (!user || !user.active) throw error(500, 'Demo-User fehlt — Seed defekt');

	const expiresAt = new Date(Date.now() + env().DEMO_SESSION_HOURS * 60 * 60 * 1000);
	const { token: sessionToken } = createSessionToken(user.id, { expiresAt });
	setSessionCookie(cookies, sessionToken, expiresAt);

	throw redirect(303, '/');
};

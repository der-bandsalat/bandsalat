import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	createSessionToken,
	setSessionCookie,
	SESSION_COOKIE,
	verifySessionToken
} from '$lib/server/auth/session';
import { consumeRateLimit } from '$lib/server/auth/rate-limit';
import { getUserByLogin, recordLogin, verifyUserPassword } from '$lib/server/db/users';

const LoginSchema = z.object({
	login: z.string().trim().min(1, 'Bitte Username oder E-Mail eingeben.'),
	password: z.string().min(1, 'Passwort darf nicht leer sein.'),
	next: z.string().optional()
});

const SAFE_NEXT = /^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%\-\/?]*$/;

function safeNext(raw: string | undefined): string {
	if (!raw) return '/';
	if (!SAFE_NEXT.test(raw)) return '/';
	return raw;
}

export const load: PageServerLoad = ({ cookies, url }) => {
	const session = verifySessionToken(cookies.get(SESSION_COOKIE));
	if (session) {
		throw redirect(303, safeNext(url.searchParams.get('next') ?? undefined));
	}
	return { next: url.searchParams.get('next') ?? '' };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();
		const rl = consumeRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
		if (!rl.allowed) {
			const wait = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
			return fail(429, {
				error: `Zu viele Versuche. Bitte in ${wait} Sekunden erneut versuchen.`
			});
		}

		const form = await request.formData();
		const parsed = LoginSchema.safeParse({
			login: form.get('login'),
			password: form.get('password'),
			next: form.get('next')
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' });
		}

		const user = getUserByLogin(parsed.data.login);
		if (!user || !user.active) {
			return fail(401, { error: 'Login fehlgeschlagen.' });
		}
		const ok = await verifyUserPassword(user, parsed.data.password);
		if (!ok) {
			return fail(401, { error: 'Login fehlgeschlagen.' });
		}

		recordLogin(user.id);
		const { token, expiresAt } = createSessionToken(user.id);
		setSessionCookie(cookies, token, expiresAt);
		throw redirect(303, safeNext(parsed.data.next));
	}
};

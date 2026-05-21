import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import {
	getUserById,
	isEmailTaken,
	isUsernameTaken,
	setUserPassword,
	updateUser,
	verifyUserPassword
} from '$lib/server/db/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) throw error(401);
	const full = getUserById(locals.user.id);
	if (!full) throw error(404);
	return {
		profile: {
			id: full.id,
			username: full.username,
			email: full.email,
			role: full.role,
			createdAt: full.createdAt,
			lastLoginAt: full.lastLoginAt
		}
	};
};

const usernameSchema = z
	.string()
	.trim()
	.min(2, 'Username muss mindestens 2 Zeichen haben.')
	.max(40)
	.regex(/^[\p{L}\p{N}_.-]+$/u, 'Nur Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich.');
const emailSchema = z.string().trim().toLowerCase().email('Bitte gültige E-Mail angeben.').max(120);

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) throw error(401);
		const form = await request.formData();
		const parsed = z.object({ username: usernameSchema, email: emailSchema }).safeParse({
			username: String(form.get('username') ?? ''),
			email: String(form.get('email') ?? '')
		});
		if (!parsed.success) {
			return fail(400, { profileError: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' });
		}
		if (isUsernameTaken(parsed.data.username, locals.user.id)) {
			return fail(400, { profileError: 'Username bereits vergeben.' });
		}
		if (isEmailTaken(parsed.data.email, locals.user.id)) {
			return fail(400, { profileError: 'E-Mail bereits vergeben.' });
		}
		updateUser(locals.user.id, parsed.data);
		throw redirect(303, '/einstellungen/profil?saved=profile');
	},

	changePassword: async ({ request, locals }) => {
		if (!locals.user) throw error(401);
		const me = getUserById(locals.user.id);
		if (!me) throw error(404);
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		if (next.length < 10) {
			return fail(400, { passwordError: 'Neues Passwort muss mindestens 10 Zeichen haben.' });
		}
		const ok = await verifyUserPassword(me, current);
		if (!ok) {
			return fail(401, { passwordError: 'Aktuelles Passwort stimmt nicht.' });
		}
		await setUserPassword(me.id, next);
		throw redirect(303, '/einstellungen/profil?saved=password');
	}
};

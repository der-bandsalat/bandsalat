import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import {
	countUsers,
	createUser,
	deleteUser,
	getUserById,
	isEmailTaken,
	isUsernameTaken,
	listUsers,
	setUserPassword,
	updateUser
} from '$lib/server/db/users';
import { USER_ROLES } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Nur Admins haben Zugriff auf die Benutzer-Verwaltung.');
	}
	return { users: listUsers(), me: locals.user, roles: USER_ROLES };
};

const usernameSchema = z
	.string()
	.trim()
	.min(2, 'Username muss mindestens 2 Zeichen haben.')
	.max(40)
	.regex(/^[\p{L}\p{N}_.-]+$/u, 'Nur Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich.');
const emailSchema = z.string().trim().toLowerCase().email('Bitte gültige E-Mail angeben.').max(120);
const passwordSchema = z.string().min(10, 'Passwort muss mindestens 10 Zeichen haben.').max(200);
const roleSchema = z.enum(USER_ROLES);

function ensureAdmin(locals: App.Locals) {
	if (!locals.user || locals.user.role !== 'admin') throw error(403);
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const parsed = z
			.object({
				username: usernameSchema,
				email: emailSchema,
				password: passwordSchema,
				role: roleSchema
			})
			.safeParse({
				username: String(form.get('username') ?? ''),
				email: String(form.get('email') ?? ''),
				password: String(form.get('password') ?? ''),
				role: String(form.get('role') ?? 'viewer')
			});
		if (!parsed.success) {
			return fail(400, { createError: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' });
		}
		if (isUsernameTaken(parsed.data.username)) {
			return fail(400, { createError: 'Username bereits vergeben.' });
		}
		if (isEmailTaken(parsed.data.email)) {
			return fail(400, { createError: 'E-Mail bereits vergeben.' });
		}
		await createUser({
			username: parsed.data.username,
			email: parsed.data.email,
			password: parsed.data.password,
			role: parsed.data.role,
			active: true
		});
		throw redirect(303, '/einstellungen/users?created=1');
	},

	update: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const target = id ? getUserById(id) : null;
		if (!target) throw error(404, 'User nicht gefunden.');
		const parsed = z
			.object({
				username: usernameSchema,
				email: emailSchema,
				role: roleSchema,
				active: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean())
			})
			.safeParse({
				username: String(form.get('username') ?? ''),
				email: String(form.get('email') ?? ''),
				role: String(form.get('role') ?? 'viewer'),
				active: form.get('active')
			});
		if (!parsed.success) {
			return fail(400, { editError: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' });
		}
		if (isUsernameTaken(parsed.data.username, id)) {
			return fail(400, { editError: 'Username bereits vergeben.' });
		}
		if (isEmailTaken(parsed.data.email, id)) {
			return fail(400, { editError: 'E-Mail bereits vergeben.' });
		}
		// Schutz: letzten aktiven Admin nicht herabstufen oder deaktivieren.
		if (target.role === 'admin' && (parsed.data.role !== 'admin' || !parsed.data.active)) {
			const adminCount = listUsers().filter((u) => u.role === 'admin' && u.active).length;
			if (adminCount <= 1) {
				return fail(400, {
					editError: 'Mindestens ein aktiver Admin muss erhalten bleiben.'
				});
			}
		}
		updateUser(id, parsed.data);
		throw redirect(303, '/einstellungen/users');
	},

	resetPassword: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const newPassword = String(form.get('password') ?? '');
		const parsed = passwordSchema.safeParse(newPassword);
		if (!parsed.success) {
			return fail(400, { editError: parsed.error.issues[0]?.message ?? 'Passwort ungültig.' });
		}
		if (!getUserById(id)) throw error(404);
		await setUserPassword(id, parsed.data);
		throw redirect(303, '/einstellungen/users?passwordReset=1');
	},

	delete: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const target = getUserById(id);
		if (!target) throw error(404);
		if (target.id === locals.user!.id) {
			return fail(400, { editError: 'Du kannst dich nicht selbst löschen.' });
		}
		if (target.role === 'admin') {
			const adminCount = listUsers().filter((u) => u.role === 'admin').length;
			if (adminCount <= 1) {
				return fail(400, { editError: 'Mindestens ein Admin muss erhalten bleiben.' });
			}
		}
		if (countUsers() <= 1) {
			return fail(400, { editError: 'Mindestens ein User muss erhalten bleiben.' });
		}
		deleteUser(id);
		throw redirect(303, '/einstellungen/users?deleted=1');
	}
};

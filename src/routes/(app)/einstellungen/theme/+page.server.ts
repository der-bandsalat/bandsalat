import { fail, redirect } from '@sveltejs/kit';
import { readTheme, THEMES, writeTheme, type Theme } from '$lib/server/theme';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	return { current: readTheme(cookies) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const raw = String(form.get('theme') ?? '');
		if (!(THEMES as readonly string[]).includes(raw)) {
			return fail(400, { error: 'Unbekanntes Theme.' });
		}
		writeTheme(cookies, raw as Theme);
		throw redirect(303, '/einstellungen/theme');
	}
};

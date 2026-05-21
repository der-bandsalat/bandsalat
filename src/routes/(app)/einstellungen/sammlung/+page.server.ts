import { redirect } from '@sveltejs/kit';
import {
	getEnabledFormats,
	isDreiAuflagenEnabled,
	setDreiAuflagenEnabled,
	setEnabledFormats
} from '$lib/server/settings';
import { MEDIA_FORMATS, type MediaFormat } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		enabledFormats: getEnabledFormats(),
		allFormats: MEDIA_FORMATS,
		dreiAuflagenEnabled: isDreiAuflagenEnabled()
	};
};

export const actions: Actions = {
	saveFormats: async ({ request }) => {
		const form = await request.formData();
		const picked: MediaFormat[] = [];
		for (const f of MEDIA_FORMATS) {
			if (form.get(`format_${f}`) === 'on') picked.push(f);
		}
		if (picked.length === 0) picked.push('cassette');
		setEnabledFormats(picked);
		throw redirect(303, '/einstellungen/sammlung?saved=formate');
	},

	saveFeatures: async ({ request }) => {
		const form = await request.formData();
		setDreiAuflagenEnabled(form.get('drei_auflagen') === 'on');
		throw redirect(303, '/einstellungen/sammlung?saved=features');
	}
};

import { redirect } from '@sveltejs/kit';
import {
	getEnabledFormats,
	getFavoritStarThreshold,
	isDreiAuflagenEnabled,
	isFormatBadgesAlways,
	setDreiAuflagenEnabled,
	setEnabledFormats,
	setFavoritStarThreshold,
	setFormatBadgesAlways
} from '$lib/server/settings';
import { MEDIA_FORMATS, type MediaFormat } from '$lib/server/db/schema';
import { ensureEditor } from '$lib/server/auth/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		enabledFormats: getEnabledFormats(),
		allFormats: MEDIA_FORMATS,
		dreiAuflagenEnabled: isDreiAuflagenEnabled(),
		formatBadgesAlways: isFormatBadgesAlways(),
		favoritStarThreshold: getFavoritStarThreshold()
	};
};

export const actions: Actions = {
	saveFormats: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const picked: MediaFormat[] = [];
		for (const f of MEDIA_FORMATS) {
			if (form.get(`format_${f}`) === 'on') picked.push(f);
		}
		if (picked.length === 0) picked.push('cassette');
		setEnabledFormats(picked);
		throw redirect(303, '/einstellungen/sammlung?saved=formate');
	},

	saveFeatures: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		setDreiAuflagenEnabled(form.get('drei_auflagen') === 'on');
		setFormatBadgesAlways(form.get('format_badges_always') === 'on');
		// Sterne-Schwelle für Auto-Favoriten: nur speichern, wenn aktiviert.
		if (form.get('favorit_by_rating') === 'on') {
			const n = Number.parseInt(String(form.get('favorit_threshold') ?? ''), 10);
			setFavoritStarThreshold(Number.isInteger(n) && n >= 1 && n <= 10 ? n : 9);
		} else {
			setFavoritStarThreshold(null);
		}
		throw redirect(303, '/einstellungen/sammlung?saved=features');
	}
};

import { fail } from '@sveltejs/kit';
import { env } from '$lib/server/env';
import { getStats } from '$lib/server/db/stats';
import {
	getPriceRefreshStatus,
	resetPriceRefreshStatus,
	startPriceRefresh
} from '$lib/server/discogs/prices';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const e = env();
	return {
		stats: getStats(),
		priceStatus: getPriceRefreshStatus(),
		hasDiscogs: Boolean(e.DISCOGS_TOKEN && e.DISCOGS_USERNAME)
	};
};

export const actions: Actions = {
	refreshPrices: async ({ request }) => {
		const e = env();
		if (!e.DISCOGS_TOKEN) {
			return fail(400, { priceError: 'Discogs-Token nicht gesetzt.' });
		}
		const form = await request.formData();
		const force = form.get('force') === 'on';
		try {
			const status = startPriceRefresh({ force });
			return { priceStarted: true, status };
		} catch (err) {
			return fail(409, {
				priceError: err instanceof Error ? err.message : 'Refresh läuft bereits.'
			});
		}
	},
	resetPriceStatus: async () => {
		resetPriceRefreshStatus();
		return { priceReset: true };
	}
};

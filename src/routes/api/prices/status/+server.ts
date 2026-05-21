import { json, type RequestHandler } from '@sveltejs/kit';
import { getPriceRefreshStatus } from '$lib/server/discogs/prices';

export const GET: RequestHandler = () => {
	return json({ status: getPriceRefreshStatus() });
};

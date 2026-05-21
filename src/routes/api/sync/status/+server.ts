import { json, type RequestHandler } from '@sveltejs/kit';
import { getPullStatus, getSyncStats, getSyncStatus } from '$lib/server/discogs/sync';

export const GET: RequestHandler = () => {
	return json({
		status: getSyncStatus(),
		pullStatus: getPullStatus(),
		stats: getSyncStats()
	});
};

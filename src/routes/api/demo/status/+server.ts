import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$lib/server/env';
import { getUserByLogin } from '$lib/server/db/users';

export const GET: RequestHandler = async () => {
	if (!env().DEMO_MODE) return json({ demoMode: false });

	const user = getUserByLogin(env().DEMO_USERNAME);
	return json({
		demoMode: true,
		ready: Boolean(user?.active),
		sessionHours: env().DEMO_SESSION_HOURS,
		scanLimit: env().DEMO_SCAN_LIMIT,
		demoUsername: env().DEMO_USERNAME
	});
};

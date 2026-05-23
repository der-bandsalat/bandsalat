import type { LayoutServerLoad } from './$types';
import { env } from '$lib/server/env';
import { verifySessionToken, SESSION_COOKIE } from '$lib/server/auth/session';

export const load: LayoutServerLoad = ({ cookies }) => {
	const e = env();
	if (!e.DEMO_MODE) return { demo: null };

	const cookie = cookies.get(SESSION_COOKIE);
	const session = verifySessionToken(cookie);

	return {
		demo: {
			expiresAt: session?.expiresAt.toISOString() ?? null,
			sessionHours: e.DEMO_SESSION_HOURS,
			scanLimit: e.DEMO_SCAN_LIMIT,
			orchestratorUrl: e.ORCHESTRATOR_URL ?? null
		}
	};
};

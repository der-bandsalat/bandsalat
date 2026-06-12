import type { LayoutServerLoad } from './$types';
import { env } from '$lib/server/env';
import { isFormatBadgesAlways } from '$lib/server/settings';
import { verifySessionToken, SESSION_COOKIE } from '$lib/server/auth/session';

export const load: LayoutServerLoad = ({ cookies }) => {
	const e = env();
	// Anzeige-Einstellung für alle Listen-/Grid-Seiten (ein Meta-Read, billig).
	const formatBadgesAlways = isFormatBadgesAlways();
	if (!e.DEMO_MODE) return { demo: null, formatBadgesAlways };

	const cookie = cookies.get(SESSION_COOKIE);
	const session = verifySessionToken(cookie);

	return {
		formatBadgesAlways,
		demo: {
			expiresAt: session?.expiresAt.toISOString() ?? null,
			sessionHours: e.DEMO_SESSION_HOURS,
			scanLimit: e.DEMO_SCAN_LIMIT,
			orchestratorUrl: e.ORCHESTRATOR_URL ?? null
		}
	};
};

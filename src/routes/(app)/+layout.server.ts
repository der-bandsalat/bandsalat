import type { LayoutServerLoad } from './$types';
import { env } from '$lib/server/env';
import { getFavoritStarThreshold, isFormatBadgesAlways } from '$lib/server/settings';
import { verifySessionToken, SESSION_COOKIE } from '$lib/server/auth/session';

export const load: LayoutServerLoad = ({ cookies }) => {
	const e = env();
	// Anzeige-Einstellungen für alle Listen-/Grid-Seiten (Meta-Reads, billig).
	const formatBadgesAlways = isFormatBadgesAlways();
	const favoritStarThreshold = getFavoritStarThreshold();
	if (!e.DEMO_MODE) return { demo: null, formatBadgesAlways, favoritStarThreshold };

	const cookie = cookies.get(SESSION_COOKIE);
	const session = verifySessionToken(cookie);

	return {
		formatBadgesAlways,
		favoritStarThreshold,
		demo: {
			expiresAt: session?.expiresAt.toISOString() ?? null,
			sessionHours: e.DEMO_SESSION_HOURS,
			scanLimit: e.DEMO_SCAN_LIMIT,
			orchestratorUrl: e.ORCHESTRATOR_URL ?? null
		}
	};
};

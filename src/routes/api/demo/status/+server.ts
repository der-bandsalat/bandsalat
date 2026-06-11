import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from './$types';
import { env } from '$lib/server/env';
import { getUserByLogin } from '$lib/server/db/users';
import { getLastActivityAt } from '$lib/server/activity';
import { db } from '$lib/server/db/client';
import { cassettes, scanEvents } from '$lib/server/db/schema';

function constEq(a: string | null, b: string | undefined): boolean {
	if (!a || !b) return false;
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
}

export const GET: RequestHandler = async ({ request }) => {
	const e = env();
	const user = getUserByLogin(e.DEMO_USERNAME);

	// Der Endpoint ist öffentlich (Orchestrator-Healthcheck) — der Aktivitäts-
	// Zeitstempel geht aber nur an den Orchestrator (geteilte Secrets), nicht
	// an beliebige Anfragen von außen.
	const orchestratorAuthed =
		constEq(request.headers.get('x-demo-key'), e.DEMO_HMAC_SECRET) ||
		constEq(request.headers.get('x-support-key'), e.SUPPORT_HMAC_SECRET);

	// Aggregate-Stats, von Orchestrator-Admin aggregierbar pro Slot.
	const cassetteCount =
		db()
			.select({ c: sql<number>`count(*)` })
			.from(cassettes)
			.get()?.c ?? 0;
	const scanTotals = db()
		.select({
			total: sql<number>`count(*)`,
			ok: sql<number>`coalesce(sum(case when ${scanEvents.success} then 1 else 0 end), 0)`,
			inTok: sql<number>`coalesce(sum(${scanEvents.inputTokens}), 0)`,
			outTok: sql<number>`coalesce(sum(${scanEvents.outputTokens}), 0)`
		})
		.from(scanEvents)
		.get() ?? { total: 0, ok: 0, inTok: 0, outTok: 0 };
	const last24h =
		db()
			.select({ c: sql<number>`count(*)` })
			.from(scanEvents)
			.where(sql`${scanEvents.createdAt} > datetime('now', '-1 day')`)
			.get()?.c ?? 0;

	return json({
		demoMode: e.DEMO_MODE,
		ready: Boolean(user?.active),
		sessionHours: e.DEMO_SESSION_HOURS,
		scanLimit: e.DEMO_SCAN_LIMIT,
		demoUsername: e.DEMO_USERNAME,
		stats: {
			cassettes: cassetteCount,
			scansTotal: scanTotals.total,
			scansOk: scanTotals.ok,
			tokensIn: scanTotals.inTok,
			tokensOut: scanTotals.outTok,
			scansLast24h: last24h,
			lastActivityAt: orchestratorAuthed ? getLastActivityAt() : null
		}
	});
};

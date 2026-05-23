import { error, json, type RequestHandler } from '@sveltejs/kit';
import { hasAnthropic } from '$lib/server/ai/anthropic';
import { consumeRateLimit } from '$lib/server/auth/rate-limit';
import { ensureEditor } from '$lib/server/auth/guard';
import { scanCassettePhoto } from '$lib/server/ai/scan';
import { searchReleases } from '$lib/server/discogs';
import { DiscogsError } from '$lib/server/discogs/client';
import { env } from '$lib/server/env';
import { findPotentialDuplicates } from '$lib/server/db/cassettes';
import { getCachedPrices, priceForGrade } from '$lib/server/discogs/prices';
import { getUserById, incrementDemoScans } from '$lib/server/db/users';
import { getDiscogsToken, getDiscogsUsername } from '$lib/server/settings';
import { coverThumbUrl } from '$lib/util/cover';
import type { SearchResult } from '$lib/server/discogs/types';
import type { Cassette, MediaGrade } from '$lib/server/db/schema';

const MAX_BYTES = 12 * 1024 * 1024;

interface DuplicatePayload {
	id: string;
	serie: string;
	folgeNr: number | null;
	folgeNrLabel: string | null;
	titel: string;
	label: string | null;
	jahr: number | null;
	auflageVariante: string | null;
	zustandMc: string | null;
	zustandHuelle: string | null;
	originalhuelle: boolean;
	vollstaendig: boolean;
	kaufpreisCent: number | null;
	marktwertCent: number | null;
	marktwertCurrency: string | null;
	thumbUrl: string | null;
	reason: 'exact' | 'release';
}

function toDuplicatePayload(c: Cassette, reason: 'exact' | 'release'): DuplicatePayload {
	const cached = c.discogsReleaseId ? getCachedPrices(c.discogsReleaseId) : null;
	const priced = cached ? priceForGrade(cached.data, c.zustandMc as MediaGrade | null) : null;
	return {
		id: c.id,
		serie: c.serie,
		folgeNr: c.folgeNr,
		folgeNrLabel: c.folgeNrLabel,
		titel: c.titel,
		label: c.label,
		jahr: c.jahr,
		auflageVariante: c.auflageVariante,
		zustandMc: c.zustandMc,
		zustandHuelle: c.zustandHuelle,
		originalhuelle: c.originalhuelle,
		vollstaendig: c.vollstaendig,
		kaufpreisCent: c.kaufpreisCent,
		marktwertCent: priced?.cents ?? null,
		marktwertCurrency: priced?.currency ?? cached?.currency ?? null,
		thumbUrl: coverThumbUrl(c),
		reason
	};
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	ensureEditor(locals);
	// Anthropic kostet Geld — 30 Scans/h pro User reichen für ehrliche Nutzung,
	// blockieren aber Skript-Missbrauch.
	const rl = consumeRateLimit(`scan:${locals.user!.id}`, 30, 60 * 60 * 1000);
	if (!rl.allowed) {
		const wait = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 60_000));
		throw error(429, `Zu viele Scans — bitte in ${wait} Minuten erneut versuchen.`);
	}
	// Zusätzlich IP-Limit gegen Account-Sharing.
	const ipLimit = consumeRateLimit(`scan-ip:${getClientAddress()}`, 60, 60 * 60 * 1000);
	if (!ipLimit.allowed) {
		throw error(429, 'Zu viele Scans von dieser IP.');
	}
	// Demo-Modus: hartes Lifetime-Limit pro Slot (Counter wird beim Nightly-
	// Reset durch Volume-Restore wieder auf 0 gesetzt).
	const envCfg = env();
	if (envCfg.DEMO_MODE) {
		if (envCfg.DEMO_SCAN_LIMIT === 0) {
			return json({ error: 'Vision-Scan ist in dieser Demo deaktiviert.' }, { status: 403 });
		}
		const dbUser = getUserById(locals.user!.id);
		if (dbUser && dbUser.demoScansUsed >= envCfg.DEMO_SCAN_LIMIT) {
			return json(
				{
					error: `Demo-Limit erreicht: maximal ${envCfg.DEMO_SCAN_LIMIT} Vision-Scans pro Session. Beim nächtlichen Reset wieder verfügbar.`
				},
				{ status: 429 }
			);
		}
	}
	if (!hasAnthropic()) {
		return json(
			{ error: 'ANTHROPIC_API_KEY ist nicht gesetzt. Bitte in .env eintragen.' },
			{ status: 503 }
		);
	}

	let file: File;
	try {
		const form = await request.formData();
		const f = form.get('photo');
		if (!(f instanceof File) || f.size === 0) {
			return json({ error: 'Keine Foto-Datei empfangen.' }, { status: 400 });
		}
		if (f.size > MAX_BYTES) {
			return json({ error: 'Foto zu groß (max 12 MiB).' }, { status: 413 });
		}
		if (!f.type.startsWith('image/')) {
			return json({ error: `Falscher Datei-Typ: ${f.type}` }, { status: 400 });
		}
		file = f;
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden.' },
			{ status: 400 }
		);
	}

	let scanResult;
	try {
		const buf = Buffer.from(await file.arrayBuffer());
		scanResult = await scanCassettePhoto(buf);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Vision-API-Fehler.';
		return json({ error: msg }, { status: 502 });
	}

	if (envCfg.DEMO_MODE) {
		incrementDemoScans(locals.user!.id);
	}

	const { extracted, model, tokens } = scanResult;

	// Discogs Auto-Search wenn Token gesetzt und genug Kontext. getDiscogsToken()
	// respektiert DB-Overrides aus Einstellungen → Keys und unterdrückt im
	// DEMO_MODE den geteilten Instanz-Token.
	let discogsHits: SearchResult[] = [];
	let discogsError: string | null = null;
	const hasDiscogs = Boolean(getDiscogsToken() && getDiscogsUsername());
	if (hasDiscogs) {
		const queryParts = [extracted.serie, extracted.folge_nr?.toString(), extracted.titel].filter(
			(s): s is string => Boolean(s && s.trim().length > 0)
		);
		const query = queryParts.join(' ').trim();
		if (query.length >= 3) {
			try {
				let res = await searchReleases(query, { format: 'Cassette' });
				if (res.length === 0) res = await searchReleases(query, { format: null });
				discogsHits = res.slice(0, 5);
			} catch (err) {
				if (err instanceof DiscogsError) {
					discogsError = `${err.message}${err.detail ? ` (${err.detail})` : ''}`;
				} else {
					discogsError = err instanceof Error ? err.message : 'Discogs-Suche fehlgeschlagen.';
				}
			}
		}
	}

	// Duplikat-Check gegen die lokale DB
	const duplicateMatches = findPotentialDuplicates({
		serie: extracted.serie ?? null,
		folgeNr: extracted.folge_nr ?? null,
		releaseIds: discogsHits.map((h) => h.id)
	});
	const duplicates: DuplicatePayload[] = duplicateMatches.map((m) =>
		toDuplicatePayload(m.cassette, m.reason)
	);

	return json({
		extracted,
		discogs: { hits: discogsHits, error: discogsError, enabled: hasDiscogs },
		duplicates,
		model,
		tokens
	});
};

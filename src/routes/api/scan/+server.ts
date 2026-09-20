import { json, type RequestHandler } from '@sveltejs/kit';
import { hasAnthropic } from '$lib/server/ai/anthropic';
import { consumeRateLimit } from '$lib/server/auth/rate-limit';
import { ensureEditor } from '$lib/server/auth/guard';
import { scanCassettePhoto } from '$lib/server/ai/scan';
import { searchReleasesCassetteFirst } from '$lib/server/discogs';
import { distinctSerien } from '$lib/server/db/cassettes';
import { DiscogsError } from '$lib/server/discogs/client';
import { env } from '$lib/server/env';
import { duplicatePayloads } from '$lib/server/scan-duplicates';
import { getUserById, incrementDemoScans } from '$lib/server/db/users';
import { getDiscogsToken, getDiscogsUsername } from '$lib/server/settings';
import { db } from '$lib/server/db/client';
import { scanEvents } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import type { SearchResult } from '$lib/server/discogs/types';

const MAX_BYTES = 12 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	ensureEditor(locals);
	const envCfg = env();
	// Anthropic kostet Geld — das Stunden-Limit (SCAN_RATE_LIMIT_PER_HOUR)
	// bremst Skript-Missbrauch, lässt aber Bulk-Erfassung ganzer Sammlungen
	// durch. Fehler als {error}-JSON, damit der PhotoScanner die Meldung
	// samt Wartezeit anzeigen kann (throw error() liefert {message}).
	const hourlyLimit = envCfg.SCAN_RATE_LIMIT_PER_HOUR;
	const rl = consumeRateLimit(`scan:${locals.user!.id}`, hourlyLimit, 60 * 60 * 1000);
	if (!rl.allowed) {
		const wait = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 60_000));
		return json(
			{ error: `Scan-Limit erreicht (${hourlyLimit}/Stunde) — in ${wait} Min. geht es weiter.` },
			{ status: 429 }
		);
	}
	// Zusätzlich IP-Limit gegen Account-Sharing.
	const ipLimit = consumeRateLimit(
		`scan-ip:${getClientAddress()}`,
		hourlyLimit * 2,
		60 * 60 * 1000
	);
	if (!ipLimit.allowed) {
		return json({ error: 'Zu viele Scans von dieser IP.' }, { status: 429 });
	}
	// Demo-Modus: hartes Lifetime-Limit pro Slot (Counter wird beim Nightly-
	// Reset durch Volume-Restore wieder auf 0 gesetzt).
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
		// Bekannte Serien der Sammlung → KI übernimmt deren Schreibweise und
		// normalisiert Ableger (DiE DR3i) nicht auf die Hauptserie.
		scanResult = await scanCassettePhoto(buf, { knownSeries: distinctSerien() });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Vision-API-Fehler.';
		return json({ error: msg }, { status: 502 });
	}

	if (envCfg.DEMO_MODE) {
		incrementDemoScans(locals.user!.id);
	}

	const { extracted, model, tokens } = scanResult;

	// Event-Log für Statistik (lifetime scan-count + tokens). Schluckt Fehler —
	// das eigentliche Scan-Result ist wichtiger.
	try {
		db()
			.insert(scanEvents)
			.values({
				id: randomUUID(),
				userId: locals.user!.id,
				model,
				inputTokens: tokens.input,
				outputTokens: tokens.output,
				success: true
			})
			.run();
	} catch (err) {
		console.warn('[scan] event log insert failed:', err);
	}

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
				discogsHits = (await searchReleasesCassetteFirst(query)).results.slice(0, 5);
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
	// Die geprüfte Anfrage geht mit zurück: Der Scanner leitet daraus den
	// Cache-Schlüssel ab, statt die Server-Logik zu spiegeln.
	const duplicatesQuery = {
		serie: extracted.serie ?? null,
		folgeNr: extracted.folge_nr ?? null,
		releaseIds: discogsHits.map((h) => h.id)
	};
	const duplicates = duplicatePayloads(duplicatesQuery);

	return json({
		extracted,
		discogs: { hits: discogsHits, error: discogsError, enabled: hasDiscogs },
		duplicates,
		duplicatesQuery,
		model,
		tokens
	});
};

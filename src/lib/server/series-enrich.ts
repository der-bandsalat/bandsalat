/**
 * Hintergrund-Job: Klappentexte und/oder Cover für alle Folgen einer Serie
 * auf einmal holen (Massenaktion auf der Serien-Detailseite).
 *
 * Quellen je Folge:
 *   - dreimetadaten.de — nur für "Die drei ???" (Cover + Klappentext)
 *   - Discogs — Klappentext aus den Release-Notes, Cover aus der Release-URL,
 *     jeweils nur für Kassetten mit verknüpftem Release
 *
 * Bewusst: `coverSource` wird NICht angefasst. Im 'auto'-Modus gewinnt ein
 * eigenes Foto ohnehin — geholte Cover ergänzen nur die Quellen, statt die
 * Anzeige umzustellen (Feedback von Max: eigene Fotos sollen bleiben).
 *
 * Singleton-Job wie der Discogs-Bulk-Push: ein Lauf gleichzeitig, Status wird
 * von der Serien-Seite gepollt.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from './db/client';
import { cassettes, type Cassette } from './db/schema';
import { getFolgeCover, upsertFolgeCover } from './db/folge-cover';
import { getFolgeSynopsis, upsertFolgeSynopsis } from './db/folge-synopsis';
import { updateCassette } from './db/cassettes';
import { fetchAndCacheCover, fetchMetadata, isSupported } from './sources/dreimetadaten';
import { extractSynopsisFromReleaseId } from './sources/discogs-notes';
import { cacheCoverFromUrl } from './discogs/cover-cache';
import { getDiscogsToken, getDiscogsUsername } from './settings';

export interface EnrichError {
	label: string;
	message: string;
	at: number;
}

export interface EnrichJobState {
	running: boolean;
	serie: string | null;
	synopses: boolean;
	covers: boolean;
	total: number;
	done: number;
	succeeded: number;
	skipped: number;
	failed: number;
	errors: EnrichError[];
	current: string | null;
	startedAt: number | null;
	finishedAt: number | null;
}

function initialState(): EnrichJobState {
	return {
		running: false,
		serie: null,
		synopses: false,
		covers: false,
		total: 0,
		done: 0,
		succeeded: 0,
		skipped: 0,
		failed: 0,
		errors: [],
		current: null,
		startedAt: null,
		finishedAt: null
	};
}

let state: EnrichJobState = initialState();

export function getEnrichStatus(): EnrichJobState {
	return { ...state, errors: state.errors.slice(-50) };
}

export function resetEnrichStatus(): EnrichJobState {
	if (state.running) return getEnrichStatus();
	state = initialState();
	return getEnrichStatus();
}

export function startSeriesEnrich(opts: {
	serie: string;
	synopses: boolean;
	covers: boolean;
}): EnrichJobState {
	if (state.running) throw new Error('Massenaktion läuft bereits.');
	if (!opts.synopses && !opts.covers) throw new Error('Nichts ausgewählt.');

	const items = db()
		.select()
		.from(cassettes)
		.where(and(eq(cassettes.serie, opts.serie), isNull(cassettes.folder)))
		.orderBy(sql`${cassettes.folgeNr} IS NULL`, asc(cassettes.folgeNr))
		.all();

	state = {
		...initialState(),
		running: true,
		serie: opts.serie,
		synopses: opts.synopses,
		covers: opts.covers,
		total: items.length,
		startedAt: Date.now()
	};
	void runEnrich(items, opts);
	return getEnrichStatus();
}

/** Kleine Pause zwischen externen Requests — dreimetadaten.de nicht fluten. */
const THROTTLE_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runEnrich(items: Cassette[], opts: { synopses: boolean; covers: boolean }) {
	const dreiSupported = isSupported(items[0]?.serie ?? '');
	const hasDiscogs = Boolean(getDiscogsToken() && getDiscogsUsername());
	// Synopsis/Folge-Cover sind pro (serie, folgeNr) geteilt — jede Folgennummer
	// nur einmal anfassen, auch wenn mehrere Auflagen existieren.
	const folgeDone = new Set<number>();

	try {
		for (const c of items) {
			state.current = c.folgeNr != null ? `Folge ${c.folgeNr}` : c.titel;
			try {
				let didWork = false;

				if (c.folgeNr != null && !folgeDone.has(c.folgeNr)) {
					folgeDone.add(c.folgeNr);

					if (opts.synopses && !getFolgeSynopsis(c.serie, c.folgeNr)) {
						if (dreiSupported) {
							const meta = await fetchMetadata(c.folgeNr);
							if (meta?.beschreibung) {
								upsertFolgeSynopsis({
									serie: c.serie,
									folgeNr: c.folgeNr,
									text: meta.beschreibung,
									source: 'dreimetadaten',
									sourceUrl: `https://dreimetadaten.de/data/Serie/${String(c.folgeNr).padStart(3, '0')}/metadata.json`
								});
								didWork = true;
							}
							await sleep(THROTTLE_MS);
						} else if (hasDiscogs && c.discogsReleaseId) {
							const result = await extractSynopsisFromReleaseId(c.discogsReleaseId);
							if (result) {
								upsertFolgeSynopsis({
									serie: c.serie,
									folgeNr: c.folgeNr,
									text: result.text,
									source: 'discogs',
									sourceUrl: result.sourceUrl
								});
								didWork = true;
							}
						}
					}

					if (opts.covers && dreiSupported && !getFolgeCover(c.serie, c.folgeNr)) {
						const cover = await fetchAndCacheCover(c.folgeNr);
						if (cover) {
							upsertFolgeCover({
								serie: c.serie,
								folgeNr: c.folgeNr,
								source: 'dreimetadaten',
								sourceUrl: cover.sourceUrl,
								cachePath: cover.original,
								thumbPath: cover.thumb,
								titel: null
							});
							didWork = true;
						}
						await sleep(THROTTLE_MS);
					}
				}

				// Discogs-Cover hängt am einzelnen Release, nicht an der Folge.
				if (opts.covers && c.discogsReleaseId && c.discogsCoverUrl && !c.discogsCoverCachePath) {
					const cached = await cacheCoverFromUrl(c.discogsCoverUrl, c.discogsReleaseId);
					if (cached) {
						updateCassette(c.id, { discogsCoverCachePath: cached.original });
						didWork = true;
					}
				}

				if (didWork) state.succeeded++;
				else state.skipped++;
			} catch (e) {
				state.failed++;
				state.errors.push({
					label: c.folgeNr != null ? `Folge ${c.folgeNr}` : c.titel,
					message: e instanceof Error ? e.message : String(e),
					at: Date.now()
				});
			}
			state.done++;
		}
	} finally {
		state.current = null;
		state.running = false;
		state.finishedAt = Date.now();
	}
}

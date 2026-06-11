/**
 * Datenschutzfreundlicher Aktivitäts-Marker: speichert NUR den Zeitpunkt der
 * letzten authentifizierten Interaktion (kein wer, kein was). Gedrosselt auf
 * einen Schreibvorgang pro Minute, damit nicht jeder Request die DB anfasst.
 * Wird vom Orchestrator-Admin über /api/demo/status abgefragt ("zuletzt
 * aktiv vor X Minuten").
 */
import { getMeta, setMeta } from './db/meta';

const KEY = 'last_activity_at';
const WRITE_INTERVAL_MS = 60_000;
let lastWrite = 0;

export function touchActivity(): void {
	const now = Date.now();
	if (now - lastWrite < WRITE_INTERVAL_MS) return;
	lastWrite = now;
	try {
		setMeta(KEY, new Date(now).toISOString());
	} catch {
		/* best effort — Aktivitäts-Marker darf nie einen Request brechen */
	}
}

export function getLastActivityAt(): string | null {
	return getMeta(KEY);
}

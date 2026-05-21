import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { cassettes, type Cassette } from '../db/schema';
import {
	addReleaseToFolder,
	ensureFolder,
	getFieldDefs,
	removeInstance,
	setInstanceField
} from './collection';
import { DiscogsError } from './client';
import { getRelease, releaseUrl } from './index';
import { cacheCoverFromUrl } from './cover-cache';
import { parseTitle } from './title-parser';
import {
	composeNotes,
	findMediaField,
	findNotesField,
	findSleeveField,
	validateGradeOption
} from './mapping';

export interface SyncError {
	cassetteId: string;
	serie: string;
	titel: string;
	message: string;
	at: number;
}

export interface SyncJobState {
	running: boolean;
	total: number;
	done: number;
	succeeded: number;
	failed: number;
	skipped: number;
	errors: SyncError[];
	folderName: string | null;
	startedAt: number | null;
	finishedAt: number | null;
	current: { serie: string; titel: string } | null;
}

const initialState = (): SyncJobState => ({
	running: false,
	total: 0,
	done: 0,
	succeeded: 0,
	failed: 0,
	skipped: 0,
	errors: [],
	folderName: null,
	startedAt: null,
	finishedAt: null,
	current: null
});

let state: SyncJobState = initialState();

export function getSyncStatus(): SyncJobState {
	return {
		...state,
		errors: state.errors.slice(-50),
		current: state.current ? { ...state.current } : null
	};
}

function nowIso() {
	return new Date().toISOString();
}

/**
 * Pusht eine einzelne Kassette nach Discogs:
 * 1. (optional) Folder sicherstellen
 * 2. Release in Folder hinzufügen → instance_id
 * 3. Felder setzen (Media, Sleeve, Notes) — defensive
 * 4. instance_id + folder_id + synced_at lokal speichern
 */
export async function pushOne(c: Cassette): Promise<{ instanceId: number; folderId: number }> {
	if (!c.discogsReleaseId) throw new DiscogsError(0, 'Keine Discogs-Release-ID.');

	const folder = await ensureFolder();
	const fields = await getFieldDefs();
	const mediaField = findMediaField(fields);
	const sleeveField = findSleeveField(fields);
	const notesField = findNotesField(fields);

	let instanceId: number;
	let folderId: number;

	if (c.discogsInstanceId && c.discogsFolderId) {
		instanceId = c.discogsInstanceId;
		folderId = c.discogsFolderId;
	} else {
		const added = await addReleaseToFolder(folder.id, c.discogsReleaseId);
		instanceId = added.instance_id;
		folderId = added.folder_id;
	}

	const setIfValid = async (
		field: ReturnType<typeof findMediaField>,
		value: string | null | undefined
	) => {
		if (!field) return;
		if (!value) return;
		const check = validateGradeOption(field, value);
		if (!check.ok) {
			console.warn(`[discogs/sync] ${c.id} ${field.name} überspringt: ${check.reason}`);
			return;
		}
		try {
			await setInstanceField(folderId, c.discogsReleaseId!, instanceId, field.id, value);
		} catch (e) {
			console.warn(`[discogs/sync] Feld ${field.name} fehlgeschlagen:`, e);
		}
	};

	await setIfValid(mediaField, c.zustandMc);
	await setIfValid(sleeveField, c.zustandHuelle);

	if (notesField) {
		const notes = composeNotes(c);
		if (notes) {
			try {
				await setInstanceField(folderId, c.discogsReleaseId, instanceId, notesField.id, notes);
			} catch (e) {
				console.warn(`[discogs/sync] Notes fehlgeschlagen:`, e);
			}
		}
	}

	db()
		.update(cassettes)
		.set({
			discogsFolderId: folderId,
			discogsInstanceId: instanceId,
			discogsSyncedAt: nowIso(),
			updatedAt: nowIso()
		})
		.where(eq(cassettes.id, c.id))
		.run();

	return { instanceId, folderId };
}

/** Entfernt die Instanz aus der Discogs-Collection und löscht die lokalen Sync-Felder. */
export async function removeOne(c: Cassette): Promise<void> {
	if (!c.discogsReleaseId || !c.discogsInstanceId || !c.discogsFolderId) {
		throw new DiscogsError(0, 'Kein Discogs-Eintrag verknüpft.');
	}
	await removeInstance(c.discogsFolderId, c.discogsReleaseId, c.discogsInstanceId);
	db()
		.update(cassettes)
		.set({
			discogsInstanceId: null,
			discogsFolderId: null,
			discogsSyncedAt: null,
			updatedAt: nowIso()
		})
		.where(eq(cassettes.id, c.id))
		.run();
}

function pushable(): Cassette[] {
	return db()
		.select()
		.from(cassettes)
		.where(and(isNotNull(cassettes.discogsReleaseId), isNull(cassettes.discogsInstanceId)))
		.all();
}

/**
 * Holt Daten von Discogs und aktualisiert die lokale Kassette.
 *
 * - overrideAll=false: konservativ, füllt nur leere lokale Felder
 * - overrideAll=true: überschreibt Titel/Folge-Nr/Label/Jahr aus dem geparsten Discogs-Titel
 *
 * Serie wird **nie** überschrieben (Partitionierungs-Sicherheit) — wenn sie sich ändern soll,
 * muss der Nutzer das manuell tun, sonst wandern Folgen in eine andere Serie.
 */
export async function pullOne(c: Cassette, opts: { overrideAll?: boolean } = {}): Promise<void> {
	if (!c.discogsReleaseId) throw new DiscogsError(0, 'Keine Discogs-Release-ID.');

	const release = await getRelease(c.discogsReleaseId);
	const primaryCover =
		release.images?.find((i) => i.type === 'primary')?.uri ?? release.images?.[0]?.uri ?? null;

	const fillIfEmpty = <T>(current: T, candidate: T | null | undefined): T => {
		if (opts.overrideAll) return candidate ?? current;
		if (current === null || current === undefined || (current as unknown as string) === '') {
			return candidate ?? current;
		}
		return current;
	};

	let titel = c.titel;
	let folgeNr = c.folgeNr;
	if (opts.overrideAll && release.title) {
		const parsed = parseTitle(release.title);
		if (parsed.titel) titel = parsed.titel;
		if (parsed.folgeNr != null) folgeNr = parsed.folgeNr;
	}

	let discogsCoverCachePath = c.discogsCoverCachePath;
	if (primaryCover && (opts.overrideAll || !discogsCoverCachePath)) {
		try {
			const cached = await cacheCoverFromUrl(primaryCover, c.discogsReleaseId);
			if (cached) discogsCoverCachePath = cached.original;
		} catch (e) {
			console.warn('[pullOne/cover]', e);
		}
	}

	db()
		.update(cassettes)
		.set({
			titel,
			folgeNr,
			label: fillIfEmpty(c.label, release.labels?.[0]?.name ?? null),
			jahr: fillIfEmpty(c.jahr, release.year ?? null),
			discogsUrl: fillIfEmpty(c.discogsUrl, release.uri ?? releaseUrl(c.discogsReleaseId)),
			discogsCoverUrl: fillIfEmpty(c.discogsCoverUrl, primaryCover),
			discogsCoverCachePath,
			discogsSyncedAt: nowIso(),
			updatedAt: nowIso()
		})
		.where(eq(cassettes.id, c.id))
		.run();
}

function withRelease(): Cassette[] {
	return db().select().from(cassettes).where(isNotNull(cassettes.discogsReleaseId)).all();
}

// ─── Bulk-Pull-Job (parallel zum Bulk-Push) ───────────────────────────────

export interface PullJobState {
	running: boolean;
	total: number;
	done: number;
	succeeded: number;
	failed: number;
	errors: SyncError[];
	current: { serie: string; titel: string } | null;
	startedAt: number | null;
	finishedAt: number | null;
	overrideAll: boolean;
}

function initialPullState(): PullJobState {
	return {
		running: false,
		total: 0,
		done: 0,
		succeeded: 0,
		failed: 0,
		errors: [],
		current: null,
		startedAt: null,
		finishedAt: null,
		overrideAll: false
	};
}

let pullState: PullJobState = initialPullState();

export function getPullStatus(): PullJobState {
	return {
		...pullState,
		errors: pullState.errors.slice(-50),
		current: pullState.current ? { ...pullState.current } : null
	};
}

export function startBulkPull(opts: { overrideAll?: boolean } = {}): PullJobState {
	if (pullState.running) throw new Error('Pull läuft bereits.');
	const queue = withRelease();
	pullState = {
		...initialPullState(),
		running: true,
		total: queue.length,
		startedAt: Date.now(),
		overrideAll: Boolean(opts.overrideAll)
	};
	void runBulkPull(queue, Boolean(opts.overrideAll));
	return getPullStatus();
}

async function runBulkPull(queue: Cassette[], overrideAll: boolean) {
	try {
		for (const c of queue) {
			pullState.current = { serie: c.serie, titel: c.titel };
			try {
				await pullOne(c, { overrideAll });
				pullState.succeeded++;
			} catch (e) {
				pullState.failed++;
				pullState.errors.push({
					cassetteId: c.id,
					serie: c.serie,
					titel: c.titel,
					message: e instanceof Error ? e.message : String(e),
					at: Date.now()
				});
			}
			pullState.done++;
		}
	} finally {
		pullState.current = null;
		pullState.running = false;
		pullState.finishedAt = Date.now();
	}
}

export function resetPullStatus(): PullJobState {
	if (pullState.running) return getPullStatus();
	pullState = initialPullState();
	return getPullStatus();
}

export interface SyncStats {
	total: number;
	withRelease: number;
	pushed: number;
	pushable: number;
	localOnly: number;
}

export function getSyncStats(): SyncStats {
	const all = db().select().from(cassettes).all();
	let withRelease = 0;
	let pushed = 0;
	let localOnly = 0;
	for (const c of all) {
		if (c.discogsReleaseId) {
			withRelease++;
			if (c.discogsInstanceId) pushed++;
		} else {
			localOnly++;
		}
	}
	return { total: all.length, withRelease, pushed, pushable: withRelease - pushed, localOnly };
}

export function startBulkPush(): SyncJobState {
	if (state.running) throw new Error('Sync läuft bereits.');
	const queue = pushable();
	state = {
		...initialState(),
		running: true,
		total: queue.length,
		startedAt: Date.now()
	};
	void runBulk(queue);
	return getSyncStatus();
}

async function runBulk(queue: Cassette[]) {
	try {
		try {
			const folder = await ensureFolder();
			state.folderName = folder.name;
		} catch (e) {
			pushError(null, e);
			state.running = false;
			state.finishedAt = Date.now();
			return;
		}

		for (const c of queue) {
			state.current = { serie: c.serie, titel: c.titel };
			try {
				await pushOne(c);
				state.succeeded++;
			} catch (e) {
				state.failed++;
				pushError(c, e);
			}
			state.done++;
		}
	} finally {
		state.current = null;
		state.running = false;
		state.finishedAt = Date.now();
	}
}

function pushError(c: Cassette | null, e: unknown) {
	const message = e instanceof Error ? e.message : String(e);
	state.errors.push({
		cassetteId: c?.id ?? '',
		serie: c?.serie ?? '(Setup)',
		titel: c?.titel ?? '',
		message,
		at: Date.now()
	});
}

export function resetSyncStatus(): SyncJobState {
	if (state.running) return state;
	state = initialState();
	return getSyncStatus();
}

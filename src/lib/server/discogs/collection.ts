import { getDiscogsUsername } from '../settings';
import { getMeta, getMetaJSON, setMeta, setMetaJSON } from '../db/meta';
import { discogs, DiscogsError } from './client';
import type { CollectionField, CollectionFolder } from './types';
import type { CollectionFieldDef } from './mapping';

const META_FOLDER_ID = 'discogs_folder_id';
const META_FOLDER_NAME = 'discogs_folder_name';
const META_FIELDS = 'discogs_fields_cache';
const META_FIELDS_AT = 'discogs_fields_cached_at';
const FIELD_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function username(): string {
	const u = getDiscogsUsername();
	if (!u) throw new DiscogsError(0, 'DISCOGS_USERNAME nicht gesetzt.');
	return u;
}

export interface FolderChoice {
	id: number;
	name: string;
	count: number;
	cached: boolean;
}

export async function listFolders(): Promise<FolderChoice[]> {
	const res = await discogs.get<{ folders: CollectionFolder[] }>(
		`/users/${encodeURIComponent(username())}/collection/folders`
	);
	const cachedId = getCachedFolderId();
	return (res.folders ?? [])
		.filter((f) => f.id !== 0) // Folder 0 = "All", nicht beschreibbar
		.map((f) => ({ id: f.id, name: f.name, count: f.count, cached: f.id === cachedId }));
}

export async function createFolder(name: string): Promise<CollectionFolder> {
	const res = await discogs.post<CollectionFolder>(
		`/users/${encodeURIComponent(username())}/collection/folders`,
		{ name }
	);
	return res;
}

export function getCachedFolderId(): number | null {
	const v = getMeta(META_FOLDER_ID);
	if (!v) return null;
	const n = Number.parseInt(v, 10);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export function getCachedFolderName(): string | null {
	return getMeta(META_FOLDER_NAME);
}

export function setCachedFolder(folder: { id: number; name: string }): void {
	setMeta(META_FOLDER_ID, String(folder.id));
	setMeta(META_FOLDER_NAME, folder.name);
}

export async function ensureFolder(
	preferredName = 'Hörspielkassetten'
): Promise<{ id: number; name: string }> {
	const cached = getCachedFolderId();
	if (cached) {
		const name = getCachedFolderName() ?? preferredName;
		return { id: cached, name };
	}
	const folders = await listFolders();
	const match = folders.find((f) => f.name.toLowerCase() === preferredName.toLowerCase());
	if (match) {
		setCachedFolder({ id: match.id, name: match.name });
		return { id: match.id, name: match.name };
	}
	const created = await createFolder(preferredName);
	setCachedFolder({ id: created.id, name: created.name });
	return { id: created.id, name: created.name };
}

interface FieldsCacheRecord {
	fields: CollectionFieldDef[];
	cachedAt: number;
}

export async function getFieldDefs(forceRefresh = false): Promise<CollectionFieldDef[]> {
	if (!forceRefresh) {
		const cached = getMetaJSON<FieldsCacheRecord>(META_FIELDS);
		if (cached && Date.now() - cached.cachedAt < FIELD_CACHE_TTL_MS) {
			return cached.fields;
		}
	}
	const res = await discogs.get<{ fields: CollectionField[] }>(
		`/users/${encodeURIComponent(username())}/collection/fields`
	);
	const fields: CollectionFieldDef[] = (res.fields ?? []).map((f) => ({
		id: f.id,
		name: f.name,
		type: f.type,
		position: f.position,
		public: f.public,
		options: f.options
	}));
	setMetaJSON(META_FIELDS, { fields, cachedAt: Date.now() } satisfies FieldsCacheRecord);
	setMeta(META_FIELDS_AT, new Date().toISOString());
	return fields;
}

export interface AddedInstance {
	instance_id: number;
	folder_id: number;
}

export async function addReleaseToFolder(
	folderId: number,
	releaseId: number
): Promise<AddedInstance> {
	const res = await discogs.post<AddedInstance>(
		`/users/${encodeURIComponent(username())}/collection/folders/${folderId}/releases/${releaseId}`
	);
	return res;
}

export async function removeInstance(
	folderId: number,
	releaseId: number,
	instanceId: number
): Promise<void> {
	await discogs.delete(
		`/users/${encodeURIComponent(username())}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}`
	);
}

export async function setInstanceField(
	folderId: number,
	releaseId: number,
	instanceId: number,
	fieldId: number,
	value: string
): Promise<void> {
	await discogs.post(
		`/users/${encodeURIComponent(username())}/collection/folders/${folderId}/releases/${releaseId}/instances/${instanceId}/fields/${fieldId}`,
		undefined,
		{ value }
	);
}

export interface IdentityResponse {
	username?: string;
	consumer_name?: string;
	id?: number;
}

export async function testToken(): Promise<IdentityResponse> {
	return discogs.get<IdentityResponse>('/oauth/identity');
}

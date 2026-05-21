import { fail } from '@sveltejs/kit';
import { env } from '$lib/server/env';
import { DiscogsError } from '$lib/server/discogs/client';
import {
	createFolder,
	getCachedFolderId,
	getCachedFolderName,
	listFolders,
	setCachedFolder,
	testToken
} from '$lib/server/discogs/collection';
import {
	getPullStatus,
	getSyncStats,
	getSyncStatus,
	resetPullStatus,
	resetSyncStatus,
	startBulkPull,
	startBulkPush
} from '$lib/server/discogs/sync';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const e = env();
	const hasToken = Boolean(e.DISCOGS_TOKEN && e.DISCOGS_USERNAME);
	let folders: Awaited<ReturnType<typeof listFolders>> = [];
	let foldersError: string | null = null;
	if (hasToken) {
		try {
			folders = await listFolders();
		} catch (err) {
			foldersError = err instanceof Error ? err.message : 'Folder-Liste fehlgeschlagen.';
		}
	}
	return {
		hasToken,
		username: e.DISCOGS_USERNAME ?? null,
		stats: getSyncStats(),
		status: getSyncStatus(),
		pullStatus: getPullStatus(),
		folder: {
			id: getCachedFolderId(),
			name: getCachedFolderName(),
			error: foldersError
		},
		folders
	};
};

export const actions: Actions = {
	testToken: async () => {
		try {
			const id = await testToken();
			return { tokenOk: true, identity: id };
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					tokenError: `${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, { tokenError: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
		}
	},
	pickFolder: async ({ request }) => {
		const form = await request.formData();
		const id = Number.parseInt(String(form.get('id') ?? ''), 10);
		const name = String(form.get('name') ?? '').trim();
		if (!Number.isInteger(id) || id <= 0 || !name) {
			return fail(400, { folderError: 'Folder-Auswahl ungültig.' });
		}
		setCachedFolder({ id, name });
		return { folderPicked: { id, name } };
	},
	createFolder: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { folderError: 'Bitte einen Folder-Namen angeben.' });
		try {
			const folder = await createFolder(name);
			setCachedFolder({ id: folder.id, name: folder.name });
			return { folderCreated: { id: folder.id, name: folder.name } };
		} catch (e) {
			if (e instanceof DiscogsError) {
				return fail(e.status === 0 ? 503 : e.status || 500, {
					folderError: `${e.message}${e.detail ? ` (${e.detail})` : ''}`
				});
			}
			return fail(500, { folderError: e instanceof Error ? e.message : 'Unbekannter Fehler.' });
		}
	},
	startBulkPush: async () => {
		try {
			const status = startBulkPush();
			return { started: true, status };
		} catch (e) {
			return fail(409, { bulkError: e instanceof Error ? e.message : 'Sync läuft bereits.' });
		}
	},
	resetStatus: async () => {
		const status = resetSyncStatus();
		return { reset: true, status };
	},
	startBulkPull: async ({ request }) => {
		const form = await request.formData();
		const overrideAll = form.get('override') === 'on';
		try {
			const status = startBulkPull({ overrideAll });
			return { pullStarted: true, pullStatus: status };
		} catch (e) {
			return fail(409, { pullError: e instanceof Error ? e.message : 'Pull läuft bereits.' });
		}
	},
	resetPullStatus: async () => {
		const status = resetPullStatus();
		return { pullReset: true, pullStatus: status };
	}
};

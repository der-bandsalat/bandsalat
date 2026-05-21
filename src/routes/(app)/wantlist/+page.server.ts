import { error, fail, redirect } from '@sveltejs/kit';
import {
	createWantlistEntry,
	deleteWantlistEntry,
	findWantlistByRelease,
	getWantlistEntry,
	listWantlist,
	updateWantlistEntry
} from '$lib/server/db/wantlist';
import { createCassette } from '$lib/server/db/cassettes';
import { cacheCoverFromUrl } from '$lib/server/discogs/cover-cache';
import { WantlistFormSchema } from '$lib/validation/wantlist';
import type { Actions, PageServerLoad } from './$types';
import { ensureEditor } from '$lib/server/auth/guard';

export const load: PageServerLoad = () => {
	return { entries: listWantlist() };
};

function formObject(form: FormData): Record<string, FormDataEntryValue> {
	const obj: Record<string, FormDataEntryValue> = {};
	for (const [k, v] of form.entries()) {
		if (v instanceof File) continue;
		obj[k] = v;
	}
	return obj;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const parsed = WantlistFormSchema.safeParse(formObject(form));
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const path = issue.path.join('.');
				if (!fieldErrors[path]) fieldErrors[path] = issue.message;
			}
			return fail(400, {
				error: 'Bitte korrigiere die markierten Felder.',
				fieldErrors,
				values: Object.fromEntries(Object.entries(formObject(form)).map(([k, v]) => [k, String(v)]))
			});
		}

		const data = parsed.data;

		if (data.discogsReleaseId) {
			const dup = findWantlistByRelease(data.discogsReleaseId);
			if (dup) {
				return fail(400, {
					error:
						`Steht schon auf der Wantlist: ${dup.serie ?? ''}${dup.folgeNr != null ? ` · ${dup.folgeNr}` : ''}${dup.titel ? ` – ${dup.titel}` : ''}`.trim()
				});
			}
		}

		let discogsCoverCachePath: string | null = null;
		if (data.discogsReleaseId && data.discogsCoverUrl) {
			try {
				const cached = await cacheCoverFromUrl(data.discogsCoverUrl, data.discogsReleaseId);
				discogsCoverCachePath = cached?.original ?? null;
			} catch (e) {
				console.warn('[discogs/cover]', e);
			}
		}

		createWantlistEntry({ ...data, discogsCoverCachePath });
		throw redirect(303, '/wantlist');
	},

	update: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'ID fehlt.' });
		const existing = getWantlistEntry(id);
		if (!existing) throw error(404);

		const parsed = WantlistFormSchema.safeParse(formObject(form));
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const path = issue.path.join('.');
				if (!fieldErrors[path]) fieldErrors[path] = issue.message;
			}
			return fail(400, {
				error: 'Bitte korrigiere die markierten Felder.',
				fieldErrors,
				editId: id,
				values: Object.fromEntries(Object.entries(formObject(form)).map(([k, v]) => [k, String(v)]))
			});
		}

		let discogsCoverCachePath = existing.discogsCoverCachePath;
		const releaseChanged = parsed.data.discogsReleaseId !== existing.discogsReleaseId;
		if (releaseChanged) discogsCoverCachePath = null;
		if (parsed.data.discogsReleaseId && parsed.data.discogsCoverUrl && !discogsCoverCachePath) {
			try {
				const cached = await cacheCoverFromUrl(
					parsed.data.discogsCoverUrl,
					parsed.data.discogsReleaseId
				);
				discogsCoverCachePath = cached?.original ?? null;
			} catch (e) {
				console.warn('[discogs/cover]', e);
			}
		}

		updateWantlistEntry(id, { ...parsed.data, discogsCoverCachePath });
		throw redirect(303, '/wantlist');
	},

	delete: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'ID fehlt.' });
		deleteWantlistEntry(id);
		throw redirect(303, '/wantlist');
	},

	found: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'ID fehlt.' });
		const entry = getWantlistEntry(id);
		if (!entry) throw error(404);

		const cassette = createCassette({
			serie: entry.serie ?? 'Unbekannt',
			folgeNr: entry.folgeNr,
			folgeNrLabel: null,
			titel: entry.titel ?? entry.serie ?? 'Unbekannt',
			label: entry.label,
			auflageVariante: entry.auflageVariante,
			jahr: entry.jahr,
			discogsReleaseId: entry.discogsReleaseId,
			discogsUrl: entry.discogsUrl,
			discogsCoverUrl: entry.discogsCoverUrl,
			discogsCoverCachePath: entry.discogsCoverCachePath,
			seriennummer: null,
			zustandMc: null,
			zustandHuelle: null,
			originalhuelle: true,
			vollstaendig: true,
			kaufdatum: null,
			kaufpreisCent: null,
			kaufort: null,
			folder: null,
			rating: null,
			review: null,
			notiz: entry.notiz
		});
		deleteWantlistEntry(id);
		throw redirect(303, `/kassetten/${cassette.id}?from=wantlist`);
	}
};

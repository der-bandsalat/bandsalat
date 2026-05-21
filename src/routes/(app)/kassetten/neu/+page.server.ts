import { fail, redirect } from '@sveltejs/kit';
import {
	createCassette,
	distinctFolders,
	distinctLabels,
	distinctSerien
} from '$lib/server/db/cassettes';
import { savePhoto } from '$lib/server/storage/photos';
import { cacheCoverFromUrl } from '$lib/server/discogs/cover-cache';
import { CassetteFormSchema } from '$lib/validation/cassette';
import { MEDIA_GRADES, SLEEVE_GRADES } from '$lib/server/db/schema';
import { getEnabledFormats } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';
import { ensureEditor } from '$lib/server/auth/guard';

export const load: PageServerLoad = () => {
	return {
		serien: distinctSerien(),
		labels: distinctLabels(),
		folders: distinctFolders(),
		mediaGrades: MEDIA_GRADES,
		sleeveGrades: SLEEVE_GRADES,
		enabledFormats: getEnabledFormats()
	};
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
	default: async ({ request, locals }) => {
		ensureEditor(locals);
		const form = await request.formData();
		const parsed = CassetteFormSchema.safeParse(formObject(form));
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

		const photo = form.get('photo');
		let coverFotoPath: string | null = null;
		if (photo instanceof File && photo.size > 0) {
			try {
				const saved = await savePhoto(photo);
				coverFotoPath = saved.original;
			} catch (e) {
				return fail(400, {
					error: e instanceof Error ? e.message : 'Foto konnte nicht gespeichert werden.',
					fieldErrors: { photo: 'Fehler beim Foto-Upload.' },
					values: Object.fromEntries(
						Object.entries(formObject(form)).map(([k, v]) => [k, String(v)])
					)
				});
			}
		}

		let discogsCoverCachePath: string | null = null;
		if (parsed.data.discogsReleaseId && parsed.data.discogsCoverUrl) {
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

		const cassette = createCassette({
			...parsed.data,
			coverFotoPath,
			discogsCoverCachePath
		});

		const goNext = form.get('action') === 'save_and_next';
		if (goNext) {
			throw redirect(303, `/kassetten/neu?serie=${encodeURIComponent(cassette.serie)}`);
		}
		throw redirect(303, `/kassetten/${cassette.id}`);
	}
};

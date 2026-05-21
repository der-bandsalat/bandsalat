import { fail, redirect } from '@sveltejs/kit';
import {
	BRAND_LOGO_VARIANTS,
	getBrandLogoCustomPath,
	getBrandLogoVariant,
	setBrandLogoCustomPath,
	setBrandLogoVariant,
	type BrandLogoVariant
} from '$lib/server/settings';
import { saveLogo } from '$lib/server/storage/logos';
import { deletePhoto } from '$lib/server/storage/photos';
import { ensureAdmin } from '$lib/server/auth/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		// Nur Admin darf das App-Brand ändern — andere User sehen die
		// Seite trotzdem (read-only)
	}
	return {
		variant: getBrandLogoVariant(),
		customPath: getBrandLogoCustomPath(),
		availableVariants: BRAND_LOGO_VARIANTS,
		me: locals.user
	};
};

export const actions: Actions = {
	setVariant: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const v = String(form.get('variant') ?? '').trim();
		const allowed: BrandLogoVariant[] = [...BRAND_LOGO_VARIANTS, 'custom'];
		if (!allowed.includes(v as BrandLogoVariant)) {
			return fail(400, { error: 'Unbekannte Variante.' });
		}
		// Wenn 'custom' gewählt aber kein customPath gesetzt: ablehnen
		if (v === 'custom' && !getBrandLogoCustomPath()) {
			return fail(400, {
				error: 'Lade erst ein eigenes Logo hoch, bevor du auf Custom wechselst.'
			});
		}
		setBrandLogoVariant(v as BrandLogoVariant);
		throw redirect(303, '/einstellungen/brand-logo?saved=variant');
	},

	uploadCustom: async ({ request, locals }) => {
		ensureAdmin(locals);
		const form = await request.formData();
		const file = form.get('logo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Keine Datei ausgewählt.' });
		}
		try {
			const saved = await saveLogo(file);
			const oldPath = getBrandLogoCustomPath();
			if (oldPath && oldPath !== saved.filename) {
				await deletePhoto(oldPath);
			}
			setBrandLogoCustomPath(saved.filename);
			setBrandLogoVariant('custom');
		} catch (e) {
			return fail(400, {
				error: e instanceof Error ? e.message : 'Logo konnte nicht gespeichert werden.'
			});
		}
		throw redirect(303, '/einstellungen/brand-logo?saved=upload');
	},

	clearCustom: async ({ locals }) => {
		ensureAdmin(locals);
		const oldPath = getBrandLogoCustomPath();
		if (oldPath) await deletePhoto(oldPath);
		setBrandLogoCustomPath(null);
		// Wenn aktive Variante 'custom' war, auf Default zurück
		if (getBrandLogoVariant() === 'custom') {
			setBrandLogoVariant('salat');
		}
		throw redirect(303, '/einstellungen/brand-logo?saved=cleared');
	}
};

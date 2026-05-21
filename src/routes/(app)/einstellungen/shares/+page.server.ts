import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import {
	createShare,
	deleteShare,
	getShareById,
	listAllShares,
	listSharesByUser,
	revokeShare
} from '$lib/server/db/shares';
import { distinctSerien } from '$lib/server/db/cassettes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) throw error(401);
	const own = locals.user.role === 'admin' ? listAllShares() : listSharesByUser(locals.user.id);
	return {
		shares: own,
		serien: distinctSerien(),
		me: locals.user
	};
};

const createSchema = z
	.object({
		scope: z.enum(['collection', 'serie']),
		scopeRef: z.string().trim().max(200).optional(),
		title: z.string().trim().max(120).optional(),
		expiresAt: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional()
	})
	.refine((d) => d.scope === 'collection' || (d.scopeRef && d.scopeRef.length > 0), {
		message: 'Bei Scope "Serie" musst du eine Serie wählen.',
		path: ['scopeRef']
	});

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) throw error(401);
		if (locals.user.role === 'viewer') {
			throw error(403, 'Viewer können keine Share-Links erstellen.');
		}
		const form = await request.formData();
		const parsed = createSchema.safeParse({
			scope: String(form.get('scope') ?? 'collection'),
			scopeRef: String(form.get('scopeRef') ?? '').trim() || undefined,
			title: String(form.get('title') ?? '').trim() || undefined,
			expiresAt: String(form.get('expiresAt') ?? '').trim() || undefined
		});
		if (!parsed.success) {
			return fail(400, { createError: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' });
		}
		createShare({
			scope: parsed.data.scope,
			scopeRef: parsed.data.scope === 'serie' ? (parsed.data.scopeRef ?? null) : null,
			title: parsed.data.title ?? null,
			createdByUserId: locals.user.id,
			expiresAt: parsed.data.expiresAt
				? new Date(`${parsed.data.expiresAt}T23:59:59Z`).toISOString()
				: null
		});
		throw redirect(303, '/einstellungen/shares?created=1');
	},

	revoke: async ({ request, locals }) => {
		if (!locals.user) throw error(401);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const target = getShareById(id);
		if (!target) throw error(404);
		if (locals.user.role !== 'admin' && target.createdByUserId !== locals.user.id) {
			throw error(403, 'Du kannst nur eigene Shares widerrufen.');
		}
		revokeShare(id);
		throw redirect(303, '/einstellungen/shares?revoked=1');
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) throw error(401);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const target = getShareById(id);
		if (!target) throw error(404);
		if (locals.user.role !== 'admin' && target.createdByUserId !== locals.user.id) {
			throw error(403, 'Du kannst nur eigene Shares löschen.');
		}
		deleteShare(id);
		throw redirect(303, '/einstellungen/shares?deleted=1');
	}
};

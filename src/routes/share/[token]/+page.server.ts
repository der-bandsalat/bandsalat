import { error } from '@sveltejs/kit';
import { findActiveShareByToken } from '$lib/server/db/shares';
import { listCassettes } from '$lib/server/db/cassettes';
import { getSeriesColor, getSeriesLogo } from '$lib/server/db/series';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, setHeaders }) => {
	const share = findActiveShareByToken(params.token);
	if (!share) {
		throw error(404, 'Share-Link nicht gefunden oder abgelaufen.');
	}

	// Verhindere Indexierung durch Suchmaschinen.
	setHeaders({ 'x-robots-tag': 'noindex, nofollow' });

	const all = listCassettes();
	const filtered =
		share.scope === 'serie' && share.scopeRef ? all.filter((c) => c.serie === share.scopeRef) : all;

	// Serien-Metadaten für die im Share enthaltenen Serien einsammeln.
	const serienNames = [...new Set(filtered.map((c) => c.serie))];
	const serienMeta = serienNames.map((name) => ({
		name,
		logoPath: getSeriesLogo(name),
		color: getSeriesColor(name)
	}));

	return {
		share: {
			id: share.id,
			scope: share.scope,
			scopeRef: share.scopeRef,
			title: share.title,
			createdAt: share.createdAt,
			expiresAt: share.expiresAt
		},
		items: filtered,
		serien: serienMeta
	};
};

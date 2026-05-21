import { listCassettes } from '$lib/server/db/cassettes';
import { findGaps } from '$lib/server/gaps';
import { getAllSeriesTargets } from '$lib/server/db/series';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const items = listCassettes();
	const gaps = findGaps(
		items.map((it) => ({ serie: it.serie, folgeNr: it.folgeNr })),
		getAllSeriesTargets()
	);
	const totalMissing = gaps.reduce((acc, g) => acc + g.missing.length, 0);
	return { gaps, totalMissing };
};

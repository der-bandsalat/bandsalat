import { distinctLabels, distinctSerien, listCassettes } from '$lib/server/db/cassettes';
import { getAllFolgeCoversMap } from '$lib/server/db/folge-cover';
import { findGaps } from '$lib/server/gaps';
import { getAllSeriesTargets } from '$lib/server/db/series';
import { SearchFilterSchema } from '$lib/validation/cassette';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const parsed = SearchFilterSchema.safeParse(Object.fromEntries(url.searchParams));
	const filter = parsed.success ? parsed.data : {};
	const items = listCassettes(filter);
	const all = filter && Object.values(filter).some(Boolean) ? listCassettes() : items;
	const serien = distinctSerien();
	const labels = distinctLabels();
	const folgeCoverMap = Object.fromEntries(getAllFolgeCoversMap());

	const totalKaufpreisCent = items.reduce((acc, it) => acc + (it.kaufpreisCent ?? 0), 0);
	const perSerie = new Map<string, number>();
	for (const it of items) perSerie.set(it.serie, (perSerie.get(it.serie) ?? 0) + 1);

	const gaps = findGaps(
		all.map((it) => ({ serie: it.serie, folgeNr: it.folgeNr })),
		getAllSeriesTargets()
	);
	const totalMissing = gaps.reduce((acc, g) => acc + g.missing.length, 0);

	return {
		items,
		serien,
		labels,
		folgeCovers: folgeCoverMap,
		filter: parsed.success ? parsed.data : {},
		stats: {
			total: items.length,
			totalKaufpreisCent,
			perSerie: [...perSerie.entries()].sort((a, b) => b[1] - a[1]),
			totalMissing,
			seriesWithGaps: gaps.length
		}
	};
};

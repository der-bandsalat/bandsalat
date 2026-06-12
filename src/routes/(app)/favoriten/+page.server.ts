import { asc, eq, gte, or } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { cassettes } from '$lib/server/db/schema';
import { folgeNrNullsLast } from '$lib/server/db/cassettes';
import { getAllFolgeCoversMap } from '$lib/server/db/folge-cover';
import { getFavoritStarThreshold } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	// Manuell geherzt ODER (wenn eingestellt) Bewertung erreicht die
	// Sterne-Schwelle — NULL-Ratings fallen bei gte automatisch raus.
	const threshold = getFavoritStarThreshold();
	const where =
		threshold == null
			? eq(cassettes.favorit, true)
			: or(eq(cassettes.favorit, true), gte(cassettes.rating, threshold));
	const items = db()
		.select()
		.from(cassettes)
		.where(where)
		.orderBy(asc(cassettes.serie), folgeNrNullsLast, asc(cassettes.folgeNr))
		.all();
	return {
		items,
		folgeCovers: Object.fromEntries(getAllFolgeCoversMap())
	};
};

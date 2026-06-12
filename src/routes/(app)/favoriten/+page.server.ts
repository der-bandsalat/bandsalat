import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { cassettes } from '$lib/server/db/schema';
import { folgeNrNullsLast } from '$lib/server/db/cassettes';
import { getAllFolgeCoversMap } from '$lib/server/db/folge-cover';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const items = db()
		.select()
		.from(cassettes)
		.where(eq(cassettes.favorit, true))
		.orderBy(asc(cassettes.serie), folgeNrNullsLast, asc(cassettes.folgeNr))
		.all();
	return {
		items,
		folgeCovers: Object.fromEntries(getAllFolgeCoversMap())
	};
};

import { listSeries } from '$lib/server/db/series';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { series: listSeries() };
};

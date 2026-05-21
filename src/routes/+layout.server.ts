import { getBrandLogoCustomPath, getBrandLogoVariant } from '$lib/server/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	return {
		brandLogo: {
			variant: getBrandLogoVariant(),
			customPath: getBrandLogoCustomPath()
		}
	};
};

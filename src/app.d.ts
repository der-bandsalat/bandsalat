// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { UserRole } from '$lib/server/db/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: { id: string; username: string; email: string; role: UserRole };
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	const __APP_VERSION__: string;
}

export {};

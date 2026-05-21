<script lang="ts">
	import { page } from '$app/state';
	import CassetteTape from '@lucide/svelte/icons/cassette-tape';
</script>

<main
	class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center"
>
	<div
		class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
	>
		<CassetteTape size={32} />
	</div>
	<div class="text-4xl font-semibold tracking-tight">{page.status}</div>
	<p class="mt-2 text-sm text-stone-600 dark:text-stone-400">
		{page.error?.message ?? 'Da ist was schiefgegangen.'}
	</p>
	<a
		href="/kassetten"
		class="mt-6 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
	>
		Zur Übersicht
	</a>
</main>

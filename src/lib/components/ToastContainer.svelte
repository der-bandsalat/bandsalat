<script lang="ts">
	import { toast, type ToastTone } from '$lib/util/toast.svelte';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';

	const toneClass: Record<ToastTone, string> = {
		success:
			'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
		error:
			'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100',
		info: 'border-stone-300 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
	style="bottom: calc(5rem + env(safe-area-inset-bottom))"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toast.items as t (t.id)}
		<div
			class="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md {toneClass[
				t.tone
			]}"
			role="status"
		>
			{#if t.tone === 'success'}
				<Check size={16} />
			{:else if t.tone === 'error'}
				<AlertCircle size={16} />
			{:else}
				<Info size={16} />
			{/if}
			<span>{t.message}</span>
		</div>
	{/each}
</div>

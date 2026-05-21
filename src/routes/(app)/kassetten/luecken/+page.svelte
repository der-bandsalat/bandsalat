<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PuzzleIcon from '@lucide/svelte/icons/puzzle';

	let { data } = $props();
</script>

<AppHeader title="Lückenanalyse" back="/kassetten" />

<main class="mx-auto max-w-2xl px-4 py-4">
	{#if data.gaps.length === 0}
		<div
			class="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			Keine Lücken — alle bekannten Serien sind lückenlos erfasst.
		</div>
	{:else}
		<div class="mb-3 flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
			<PuzzleIcon size={16} />
			<span>
				{data.totalMissing} fehlende Folge{data.totalMissing === 1 ? '' : 'n'} über
				{data.gaps.length} Serie{data.gaps.length === 1 ? '' : 'n'}.
			</span>
		</div>

		<ul class="space-y-3">
			{#each data.gaps as g (g.serie)}
				<li
					class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
				>
					<div class="mb-2 flex items-baseline justify-between gap-2">
						<a
							href={`/kassetten?serie=${encodeURIComponent(g.serie)}`}
							class="text-base font-semibold hover:text-brand-600 dark:hover:text-brand-400"
						>
							{g.serie}
						</a>
						<span class="text-xs text-stone-500 dark:text-stone-400">
							{g.have} von {g.max - g.min + 1} Folgen (Bereich {g.min}–{g.max})
						</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each g.missing as nr (nr)}
							<a
								href={`/kassetten/neu?serie=${encodeURIComponent(g.serie)}&folgeNr=${nr}`}
								class="inline-flex items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
							>
								{nr}
							</a>
						{/each}
					</div>
				</li>
			{/each}
		</ul>

		<p class="mt-4 flex items-start gap-2 text-xs text-stone-500 dark:text-stone-400">
			<SearchIcon size={14} class="mt-0.5 shrink-0" />
			Tipp: Tippe eine Folgennummer, um direkt zum Quick-Add mit vorausgewählter Serie zu springen.
		</p>
	{/if}
</main>

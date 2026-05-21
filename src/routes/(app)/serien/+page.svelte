<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import SeriesCard from '$lib/components/SeriesCard.svelte';
	import { reveal } from '$lib/actions/reveal';
	import List from '@lucide/svelte/icons/list';
	import Search from '@lucide/svelte/icons/search';
	import BarChart3 from '@lucide/svelte/icons/chart-column';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import BrandTitle from '$lib/components/BrandTitle.svelte';

	let { data } = $props();
	let query = $state('');
	let sortBy = $state<'count' | 'percent' | 'name'>('count');

	function percentOf(s: (typeof data.series)[number]): number {
		if (s.min == null || s.max == null) return -1;
		const range = s.max - s.min + 1;
		if (range <= 0) return -1;
		return ((range - s.missing.length) / range) * 100;
	}

	const filtered = $derived(
		query.trim()
			? data.series.filter((s) => s.serie.toLowerCase().includes(query.trim().toLowerCase()))
			: data.series
	);

	const sorted = $derived.by(() => {
		const list = filtered.slice();
		if (sortBy === 'name') {
			return list.sort((a, b) => a.serie.localeCompare(b.serie, 'de'));
		}
		if (sortBy === 'percent') {
			return list.sort((a, b) => percentOf(b) - percentOf(a) || b.count - a.count);
		}
		return list.sort((a, b) => b.count - a.count || a.serie.localeCompare(b.serie, 'de'));
	});

	const totalEntries = $derived(data.series.reduce((acc, s) => acc + s.count, 0));
	const totalMissing = $derived(data.series.reduce((acc, s) => acc + s.missing.length, 0));
</script>

<AppHeader>
	{#snippet children()}
		<BrandTitle />
	{/snippet}
	{#snippet actions()}
		<a
			href="/wantlist"
			class="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			title="Wantlist"
			aria-label="Wantlist"
		>
			<Sparkles size={18} />
		</a>
		<a
			href="/statistik"
			class="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			title="Statistik"
			aria-label="Statistik"
		>
			<BarChart3 size={18} />
		</a>
		<a
			href="/kassetten"
			class="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			title="Alle Folgen als flache Liste anzeigen"
		>
			<List size={16} />
			Alle
		</a>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl px-4 py-4">
	{#if data.series.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			Noch keine Kassetten erfasst.
			<a
				href="/kassetten/neu"
				class="mt-2 inline-block font-medium text-brand-600 dark:text-brand-400"
			>
				Jetzt erste anlegen →
			</a>
		</div>
	{:else}
		<form class="mb-3 flex gap-2" onsubmit={(e) => e.preventDefault()}>
			<div class="relative flex-1">
				<span
					class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
				>
					<Search size={18} />
				</span>
				<input
					type="search"
					bind:value={query}
					placeholder="Serien filtern…"
					class="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-3 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-brand-900"
				/>
			</div>
			<select
				bind:value={sortBy}
				class="rounded-xl border border-stone-300 bg-white px-2 py-3 text-sm dark:border-stone-700 dark:bg-stone-900"
				aria-label="Sortierung"
			>
				<option value="count">Anzahl</option>
				<option value="percent">Vollständigkeit</option>
				<option value="name">Name</option>
			</select>
		</form>

		<div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
			<span
				class="rounded-full bg-stone-200 px-2 py-0.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-200"
			>
				{data.series.length}
				{data.series.length === 1 ? 'Serie' : 'Serien'}
			</span>
			<span class="rounded-full bg-stone-200 px-2 py-0.5 dark:bg-stone-800">
				{totalEntries}
				{totalEntries === 1 ? 'Eintrag' : 'Einträge'}
			</span>
			{#if totalMissing > 0}
				<a
					href="/kassetten/luecken"
					class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
				>
					{totalMissing} Lücken →
				</a>
			{/if}
		</div>

		<ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each sorted as entry, i (entry.serie)}
				<li class="reveal" use:reveal={{ delay: Math.min(i * 60, 360) }}>
					<SeriesCard {entry} />
				</li>
			{/each}
		</ul>

		{#if sorted.length === 0}
			<div
				class="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
			>
				Keine Serien passen zu „{query}".
			</div>
		{/if}
	{/if}
</main>

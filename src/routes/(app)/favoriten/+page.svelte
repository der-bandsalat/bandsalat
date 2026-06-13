<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CassetteTable from '$lib/components/CassetteTable.svelte';
	import InlineRating from '$lib/components/InlineRating.svelte';
	import { coverThumbUrl, type ExternalCoverPaths } from '$lib/util/cover';
	import { reveal } from '$lib/actions/reveal';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Heart from '@lucide/svelte/icons/heart';
	import ImageIcon from '@lucide/svelte/icons/image';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Rows3 from '@lucide/svelte/icons/rows-3';

	let { data } = $props();

	const view = $derived((page.url.searchParams.get('view') ?? 'grid') as 'grid' | 'list');
	function setView(v: 'grid' | 'list') {
		const url = new URL(page.url);
		if (v === 'grid') url.searchParams.delete('view');
		else url.searchParams.set('view', v);
		goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function externalFor(c: { serie: string; folgeNr: number | null }): ExternalCoverPaths | null {
		if (c.folgeNr == null) return null;
		return data.folgeCovers[`${c.serie}|${c.folgeNr}`] ?? null;
	}
</script>

<AppHeader back="/serien">
	{#snippet children()}
		<span class="inline-flex items-center gap-1.5">
			<Heart size={16} class="text-rose-500" fill="currentColor" />
			Favoriten
		</span>
	{/snippet}
	{#snippet actions()}
		<button
			type="button"
			onclick={() => setView(view === 'grid' ? 'list' : 'grid')}
			class="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			aria-label="Ansicht wechseln"
		>
			{#if view === 'grid'}
				<Rows3 size={18} />
			{:else}
				<LayoutGrid size={18} />
			{/if}
		</button>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl px-4 py-4">
	{#if data.items.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			Noch keine Favoriten — tippe in einer Folgenansicht auf das
			<Heart size={14} class="inline text-rose-500" /> Herz, dann taucht die Folge hier auf.
		</div>
	{:else if view === 'grid'}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each data.items as c, i (c.id)}
				{@const cover = coverThumbUrl(c, externalFor(c))}
				<li
					class="reveal overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
					use:reveal={{ delay: Math.min(i * 40, 320) }}
				>
					<a href={`/kassetten/${c.id}`} class="block transition active:scale-[0.98]">
						<div class="relative aspect-square bg-stone-100 dark:bg-stone-800">
							{#if cover}
								<img src={cover} alt="" loading="lazy" class="h-full w-full object-cover" />
							{:else}
								<div
									class="flex h-full items-center justify-center text-stone-400 dark:text-stone-600"
								>
									<ImageIcon size={32} />
								</div>
							{/if}
							{#if c.folgeNr != null}
								<span
									class="absolute left-1.5 top-1.5 rounded-full bg-stone-900/75 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white"
								>
									{c.folgeNr}
								</span>
							{:else if c.folgeNrLabel}
								<span
									class="absolute left-1.5 top-1.5 rounded-full bg-stone-900/75 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white"
								>
									{c.folgeNrLabel}
								</span>
							{/if}
							<span
								class="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/90 text-white"
								title="Favorit"
							>
								<Heart size={11} fill="currentColor" />
							</span>
						</div>
						<div class="px-2 pt-2">
							<div class="truncate text-xs font-medium text-stone-500 dark:text-stone-400">
								{c.serie}
							</div>
							<div class="line-clamp-2 text-sm font-semibold leading-snug">{c.titel}</div>
						</div>
					</a>
					<div class="px-2 pb-2 pt-1">
						<InlineRating cassetteId={c.id} value={c.rating} size={13} />
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<CassetteTable
			items={data.items}
			folgeCovers={data.folgeCovers}
			alwaysFormatBadges={data.formatBadgesAlways}
			favoritThreshold={data.favoritStarThreshold}
		/>
	{/if}
</main>

<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandTitle from '$lib/components/BrandTitle.svelte';
	import { formatEur } from '$lib/util/format';
	import { coverThumbUrl, type ExternalCoverPaths } from '$lib/util/cover';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Rows3 from '@lucide/svelte/icons/rows-3';
	import Search from '@lucide/svelte/icons/search';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ImagesIcon from '@lucide/svelte/icons/images';
	import Medal from '@lucide/svelte/icons/medal';
	import { FORMAT_SHORT } from '$lib/format';
	import InlineRating from '$lib/components/InlineRating.svelte';
	import CassetteTable from '$lib/components/CassetteTable.svelte';
	import CassetteEditTable from '$lib/components/edit/CassetteEditTable.svelte';
	import { reveal } from '$lib/actions/reveal';

	let { data } = $props();
	let showFilters = $state(false);
	let editMode = $state(false);

	const view = $derived((page.url.searchParams.get('view') ?? 'grid') as 'grid' | 'table');

	function toggleEdit() {
		editMode = !editMode;
		// Beim Verlassen frische Daten laden (Statistiken etc. resyncen).
		if (!editMode) invalidateAll();
	}

	function updateParam(key: string, value: string) {
		const url = new URL(page.url);
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		goto(url.pathname + url.search, { replaceState: false, keepFocus: true, noScroll: true });
	}

	function clearFilter() {
		goto('/kassetten');
	}

	function externalFor(it: (typeof data.items)[number]): ExternalCoverPaths | null {
		if (it.folgeNr == null) return null;
		const v = data.folgeCovers[`${it.serie}|${it.folgeNr}`];
		return v ?? null;
	}

	function coverUrl(it: (typeof data.items)[number]): string | null {
		return coverThumbUrl(it, externalFor(it));
	}

	const hasFilters = $derived(
		Object.entries(data.filter ?? {}).some(([k, v]) => v && k !== 'view')
	);
</script>

<AppHeader>
	{#snippet children()}
		<BrandTitle />
	{/snippet}
	{#snippet actions()}
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			class:bg-brand-100={hasFilters}
			class:dark:bg-brand-900={hasFilters}
			aria-label="Filter"
			onclick={() => (showFilters = !showFilters)}
		>
			<SlidersHorizontal size={20} />
		</button>
		{#if view === 'table'}
			<button
				type="button"
				class="hidden h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 sm:flex dark:text-stone-300 dark:hover:bg-stone-800"
				class:bg-brand-100={editMode}
				class:dark:bg-brand-900={editMode}
				aria-label="Bearbeiten"
				aria-pressed={editMode}
				onclick={toggleEdit}
			>
				<Pencil size={18} />
			</button>
		{/if}
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			aria-label="Ansicht wechseln"
			onclick={() => updateParam('view', view === 'grid' ? 'table' : 'grid')}
		>
			{#if view === 'grid'}
				<Rows3 size={20} />
			{:else}
				<LayoutGrid size={20} />
			{/if}
		</button>
	{/snippet}
</AppHeader>

<main
	class="mx-auto px-4 py-4"
	class:max-w-2xl={!(editMode && view === 'table')}
	class:max-w-6xl={editMode && view === 'table'}
>
	<form method="GET" class="mb-3">
		<div class="relative">
			<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
				<Search size={18} />
			</span>
			<input
				type="search"
				name="q"
				value={data.filter?.q ?? ''}
				placeholder="Suche in Serie, Titel, Seriennummer, Notiz…"
				class="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-3 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-brand-900"
			/>
			{#each Object.entries(data.filter ?? {}) as [k, v]}
				{#if v && k !== 'q'}
					<input type="hidden" name={k} value={String(v)} />
				{/if}
			{/each}
		</div>
	</form>

	{#if showFilters}
		<form
			method="GET"
			class="mb-3 space-y-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<input type="hidden" name="q" value={data.filter?.q ?? ''} />
			<input type="hidden" name="view" value={view} />
			<div class="grid grid-cols-2 gap-2">
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Serie</span>
					<select
						name="serie"
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					>
						<option value="">Alle</option>
						{#each data.serien as s (s)}
							<option value={s} selected={data.filter?.serie === s}>{s}</option>
						{/each}
					</select>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Label</span>
					<select
						name="label"
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					>
						<option value="">Alle</option>
						{#each data.labels as l (l)}
							<option value={l} selected={data.filter?.label === l}>{l}</option>
						{/each}
					</select>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400"
						>Originalhülle</span
					>
					<select
						name="originalhuelle"
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					>
						<option value="">egal</option>
						<option value="ja" selected={data.filter?.originalhuelle === 'ja'}>ja</option>
						<option value="nein" selected={data.filter?.originalhuelle === 'nein'}>nein</option>
					</select>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Discogs-Link</span
					>
					<select
						name="hatDiscogs"
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					>
						<option value="">egal</option>
						<option value="ja" selected={data.filter?.hatDiscogs === 'ja'}>verknüpft</option>
						<option value="nein" selected={data.filter?.hatDiscogs === 'nein'}>local-only</option>
					</select>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Kauf von</span>
					<input
						type="date"
						name="kaufVon"
						value={data.filter?.kaufVon ?? ''}
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					/>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Kauf bis</span>
					<input
						type="date"
						name="kaufBis"
						value={data.filter?.kaufBis ?? ''}
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					/>
				</label>
				<label class="col-span-2 block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Sortierung</span>
					<select
						name="sort"
						class="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 dark:border-stone-700 dark:bg-stone-900"
					>
						<option
							value="created_desc"
							selected={!data.filter?.sort || data.filter?.sort === 'created_desc'}
							>Zuletzt hinzugefügt</option
						>
						<option value="created_asc" selected={data.filter?.sort === 'created_asc'}
							>Zuerst hinzugefügt</option
						>
						<option value="serie" selected={data.filter?.sort === 'serie'}>Serie + Folge</option>
						<option value="folge_asc" selected={data.filter?.sort === 'folge_asc'}>Folge ↑</option>
						<option value="folge_desc" selected={data.filter?.sort === 'folge_desc'}>Folge ↓</option
						>
						<option value="jahr_desc" selected={data.filter?.sort === 'jahr_desc'}
							>Jahr (neu zuerst)</option
						>
						<option value="jahr_asc" selected={data.filter?.sort === 'jahr_asc'}
							>Jahr (alt zuerst)</option
						>
						<option value="preis_desc" selected={data.filter?.sort === 'preis_desc'}
							>Kaufpreis (teuer zuerst)</option
						>
						<option value="preis_asc" selected={data.filter?.sort === 'preis_asc'}
							>Kaufpreis (günstig zuerst)</option
						>
						<option value="last_listened_desc" selected={data.filter?.sort === 'last_listened_desc'}
							>Zuletzt gehört (neu zuerst)</option
						>
						<option value="last_listened_asc" selected={data.filter?.sort === 'last_listened_asc'}
							>Lang nicht gehört</option
						>
						<option value="most_listened" selected={data.filter?.sort === 'most_listened'}
							>Häufigsten gehört</option
						>
						<option value="rating_desc" selected={data.filter?.sort === 'rating_desc'}
							>Bewertung (hoch zuerst)</option
						>
						<option value="rating_asc" selected={data.filter?.sort === 'rating_asc'}
							>Bewertung (niedrig zuerst)</option
						>
					</select>
				</label>
			</div>
			<div class="flex gap-2 pt-2">
				<button
					type="submit"
					class="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
					>Anwenden</button
				>
				<button
					type="button"
					onclick={clearFilter}
					class="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					<X size={16} />
				</button>
			</div>
		</form>
	{/if}

	<div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
		<span
			class="rounded-full bg-stone-200 px-2 py-0.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-200"
		>
			{data.stats.total}
			{data.stats.total === 1 ? 'Eintrag' : 'Einträge'}
		</span>
		{#if data.stats.totalKaufpreisCent > 0}
			<span class="rounded-full bg-stone-200 px-2 py-0.5 dark:bg-stone-800">
				Kaufwert ≈ {formatEur(data.stats.totalKaufpreisCent)}
			</span>
		{/if}
		{#if data.stats.totalMissing > 0}
			<a
				href="/kassetten/luecken"
				class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
			>
				{data.stats.totalMissing} Lücken in {data.stats.seriesWithGaps} Serien →
			</a>
		{/if}
		{#each data.stats.perSerie.slice(0, 4) as [serie, count] (serie)}
			<span
				class="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600 dark:bg-stone-900 dark:text-stone-400"
			>
				{serie}: {count}
			</span>
		{/each}
	</div>

	{#if data.items.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			Noch keine Kassetten erfasst.
			<a
				href="/kassetten/neu"
				class="mt-2 inline-block font-medium text-brand-600 dark:text-brand-400"
				>Jetzt erste anlegen →</a
			>
		</div>
	{:else if view === 'grid'}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each data.items as it, i (it.id)}
				{@const cover = coverUrl(it)}
				<li
					class="reveal overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
					use:reveal={{ delay: Math.min(i * 40, 320) }}
				>
					<a href={`/kassetten/${it.id}`} class="block transition active:scale-[0.98]">
						<div class="relative aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800">
							{#if cover}
								<img src={cover} alt="" loading="lazy" class="h-full w-full object-cover" />
							{:else}
								<div
									class="flex h-full items-center justify-center text-stone-400 dark:text-stone-600"
								>
									<ImageIcon size={32} />
								</div>
							{/if}
							{#if it.discogsReleaseId}
								<span
									class="absolute right-1 top-1 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
									>Discogs</span
								>
							{/if}
							{#if (data.photoCounts?.[it.id] ?? 0) > 1}
								<span
									class="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
									title="{data.photoCounts[it.id]} Fotos hinterlegt"
								>
									<ImagesIcon size={10} />
									{data.photoCounts[it.id]}
								</span>
							{/if}
							{#if it.format && it.format !== 'cassette'}
								<span
									class="absolute right-1 bottom-1 rounded bg-sky-500/90 px-1 py-0.5 text-[10px] font-semibold text-white"
								>
									{FORMAT_SHORT[it.format]}
								</span>
							{/if}
							{#if it.erstauflage}
								<span
									class="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90 text-white"
									title="Erstauflage"
								>
									<Medal size={11} />
								</span>
							{/if}
						</div>
						<div class="px-2 pt-2">
							<div class="truncate text-xs font-medium text-stone-500 dark:text-stone-400">
								{it.serie}{it.folgeNr != null ? ` · ${it.folgeNr}` : ''}
							</div>
							<div class="line-clamp-2 text-sm font-semibold leading-snug">{it.titel}</div>
						</div>
					</a>
					<div class="px-2 pb-2 pt-1">
						<InlineRating cassetteId={it.id} value={it.rating} size={14} />
					</div>
				</li>
			{/each}
		</ul>
	{:else if editMode}
		<CassetteEditTable
			items={data.items}
			folgeCovers={data.folgeCovers}
			mediaGrades={data.mediaGrades}
			sleeveGrades={data.sleeveGrades}
		/>
	{:else}
		<CassetteTable
			items={data.items}
			folgeCovers={data.folgeCovers}
			photoCounts={data.photoCounts}
		/>
	{/if}
</main>

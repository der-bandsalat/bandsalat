<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import SeriesLogo from '$lib/components/SeriesLogo.svelte';
	import { coverThumbUrl, type ExternalCoverPaths } from '$lib/util/cover';
	import { reveal } from '$lib/actions/reveal';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Plus from '@lucide/svelte/icons/plus';
	import Upload from '@lucide/svelte/icons/upload';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Pencil from '@lucide/svelte/icons/pencil';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import Cloud from '@lucide/svelte/icons/cloud';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Rows3 from '@lucide/svelte/icons/rows-3';
	import Search from '@lucide/svelte/icons/search';
	import Medal from '@lucide/svelte/icons/medal';
	import InlineRating from '$lib/components/InlineRating.svelte';
	import CassetteTable from '$lib/components/CassetteTable.svelte';
	import CassetteEditTable from '$lib/components/edit/CassetteEditTable.svelte';

	let { data, form } = $props();
	let editMode = $state(false);

	function toggleEdit() {
		editMode = !editMode;
		if (!editMode) invalidateAll();
	}
	let logoSubmitting = $state(false);
	let logoFromDiscogsSubmitting = $state(false);
	let targetSubmitting = $state(false);
	let showLogoMenu = $state(false);
	let showTargetMenu = $state(false);

	function externalFor(c: { serie: string; folgeNr: number | null }): ExternalCoverPaths | null {
		if (c.folgeNr == null) return null;
		const v = data.folgeCovers[`${c.serie}|${c.folgeNr}`];
		return v ?? null;
	}

	const view = $derived((page.url.searchParams.get('view') ?? 'grid') as 'grid' | 'list');

	function setView(v: 'grid' | 'list') {
		const url = new URL(page.url);
		if (v === 'grid') url.searchParams.delete('view');
		else url.searchParams.set('view', v);
		goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
	}

	const d = $derived(data.detail);
	const range = $derived(
		d.min != null && d.max != null && d.min !== d.max ? `${d.min}–${d.max}` : null
	);
	const rangeSize = $derived(d.min != null && d.max != null ? d.max - d.min + 1 : null);
	const percent = $derived(
		rangeSize && rangeSize > 0
			? Math.round(((rangeSize - d.missing.length) / rangeSize) * 100)
			: null
	);
	const progressTone = $derived(
		percent == null
			? 'bg-stone-300 dark:bg-stone-700'
			: percent === 100
				? 'bg-emerald-500'
				: percent >= 50
					? 'bg-brand-500'
					: 'bg-amber-500'
	);

	// Folgen-Suche innerhalb der Serie (Nummer, Label oder Titel) — rein
	// clientseitig, Sammlungen sind klein genug.
	let search = $state('');
	const filteredItems = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return d.items;
		return d.items.filter(
			(c) =>
				c.titel.toLowerCase().includes(q) ||
				(c.folgeNr != null && String(c.folgeNr).includes(q)) ||
				(c.folgeNrLabel?.toLowerCase().includes(q) ?? false)
		);
	});
</script>

<AppHeader back="/serien">
	{#snippet children()}
		<span class="truncate">{d.serie}</span>
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
		{#if view === 'list'}
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
		{#if d.serie === 'Die drei ???' && data.dreiAuflagenEnabled}
			<a
				href={`/serien/${encodeURIComponent(d.serie)}/auflagen`}
				class="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
				title="Auflagen pro Folge verwalten"
			>
				Auflagen
			</a>
		{/if}
		<a
			href={`/kassetten/neu?serie=${encodeURIComponent(d.serie)}`}
			class="flex h-9 items-center gap-1 rounded-full bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
		>
			<Plus size={16} />
			Folge
		</a>
	{/snippet}
</AppHeader>

<main
	class="mx-auto px-4 py-4"
	class:max-w-2xl={!(editMode && view === 'list')}
	class:max-w-6xl={editMode && view === 'list'}
>
	<section
		class="mb-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<button
			type="button"
			onclick={() => (showLogoMenu = !showLogoMenu)}
			class="relative shrink-0 rounded-2xl ring-2 transition active:scale-95"
			class:ring-brand-500={showLogoMenu}
			class:ring-transparent={!showLogoMenu}
			aria-label="Logo verwalten"
			title="Logo verwalten"
		>
			<SeriesLogo serie={d.serie} logoPath={d.logoPath} size={72} rounded="2xl" />
			<span
				class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
			>
				<Pencil size={12} />
			</span>
		</button>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-xl font-semibold leading-tight">{d.serie}</h1>
			<div class="mt-1 text-sm text-stone-500 dark:text-stone-400">
				{d.count}
				{d.count === 1 ? 'Folge' : 'Folgen'}{range ? ` · Bereich ${range}` : ''}
			</div>
			{#if percent != null}
				<div class="mt-2 flex items-center gap-2">
					<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
						<div class="h-full {progressTone} transition-[width]" style:width={`${percent}%`}></div>
					</div>
					<span
						class="shrink-0 text-xs font-medium tabular-nums text-stone-600 dark:text-stone-300"
					>
						{percent}%
					</span>
				</div>
			{/if}
			<div class="mt-2 flex flex-wrap gap-1 text-xs">
				{#if d.kind === 'serie'}
					<button
						type="button"
						onclick={() => (showTargetMenu = !showTargetMenu)}
						class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium transition active:scale-95"
						class:border-brand-300={d.target}
						class:bg-brand-50={d.target}
						class:text-brand-700={d.target}
						class:dark:border-brand-800={d.target}
						class:dark:bg-brand-950={d.target}
						class:dark:text-brand-300={d.target}
						class:border-stone-300={!d.target}
						class:bg-white={!d.target}
						class:text-stone-600={!d.target}
						class:dark:border-stone-700={!d.target}
						class:dark:bg-stone-900={!d.target}
						class:dark:text-stone-300={!d.target}
					>
						{#if d.target}
							Ziel: {d.target.min}–{d.target.max}
						{:else}
							Sammelziel setzen
						{/if}
					</button>
				{:else}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
					>
						Ordner
					</span>
				{/if}
				{#if d.withRelease > 0}
					<span
						class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
					>
						{d.withRelease} mit Discogs
					</span>
				{/if}
				{#if d.pushed > 0}
					<span class="rounded-full bg-emerald-600 px-2 py-0.5 text-white">
						{d.pushed} gepusht
					</span>
				{/if}
				{#if d.missing.length > 0}
					<span
						class="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
					>
						<Puzzle size={10} class="inline" />
						{d.missing.length} Lücken
					</span>
				{/if}
				{#if d.outsideTarget > 0}
					<span
						class="rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
						title="Folgen außerhalb des Sammelziels"
					>
						+{d.outsideTarget} außerhalb
					</span>
				{/if}
			</div>
		</div>
	</section>

	{#if showTargetMenu && d.kind === 'serie'}
		<section
			class="mb-4 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="mb-1 text-sm font-semibold">Sammelziel</h2>
			<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
				Bestimmt Bereich für Lückenanalyse und Fortschritt. Folgen außerhalb bleiben erhalten und
				werden separat als „außerhalb" markiert.
			</p>
			<form
				method="POST"
				action="?/setTarget"
				use:enhance={() => {
					targetSubmitting = true;
					return ({ update }) => update().finally(() => (targetSubmitting = false));
				}}
				class="flex flex-wrap items-end gap-2"
			>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Von Folge</span>
					<input
						type="number"
						name="target_min"
						min="0"
						max="9999"
						value={d.target?.min ?? d.min ?? 1}
						required
						inputmode="numeric"
						class="w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base dark:border-stone-700 dark:bg-stone-900"
					/>
				</label>
				<label class="block text-xs">
					<span class="mb-1 block font-medium text-stone-600 dark:text-stone-400">Bis Folge</span>
					<input
						type="number"
						name="target_max"
						min="0"
						max="9999"
						value={d.target?.max ?? d.max ?? 50}
						required
						inputmode="numeric"
						class="w-24 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base dark:border-stone-700 dark:bg-stone-900"
					/>
				</label>
				<button
					type="submit"
					disabled={targetSubmitting}
					class="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					Speichern
				</button>
				{#if d.target}
					<button
						type="submit"
						formaction="?/clearTarget"
						class="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
					>
						Ziel löschen
					</button>
				{/if}
			</form>
			{#if form?.targetError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.targetError}
				</p>
			{/if}
		</section>
	{/if}

	{#if showLogoMenu}
		<section
			class="mb-4 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="mb-2 text-sm font-semibold">Serien-Logo</h2>
			<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
				PNG mit Transparenz oder SVG bleibt erhalten. Maximal 5 MiB, max. 1024 px Kante.
			</p>
			<form
				method="POST"
				action="?/uploadLogo"
				enctype="multipart/form-data"
				use:enhance={() => {
					logoSubmitting = true;
					return ({ update }) => update().finally(() => (logoSubmitting = false));
				}}
				class="space-y-2"
			>
				<label
					class="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-3 text-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
				>
					<Upload size={16} />
					<input
						type="file"
						name="logo"
						accept="image/png,image/svg+xml,image/jpeg,image/webp"
						required
						class="flex-1 text-xs"
					/>
				</label>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={logoSubmitting}
						class="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
					>
						{logoSubmitting ? 'Lade hoch…' : 'Logo hochladen'}
					</button>
					{#if d.logoPath}
						<button
							type="submit"
							formaction="?/removeLogo"
							class="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
						>
							<Trash2 size={14} />
						</button>
					{/if}
				</div>
			</form>

			<form
				method="POST"
				action="?/logoFromDiscogs"
				use:enhance={() => {
					logoFromDiscogsSubmitting = true;
					return ({ update }) => update().finally(() => (logoFromDiscogsSubmitting = false));
				}}
				class="mt-3 border-t border-stone-200 pt-3 dark:border-stone-800"
			>
				<p class="mb-2 text-xs text-stone-500 dark:text-stone-400">
					Oder: Cover des Discogs-Master-Releases der ersten Folge holen.
				</p>
				<button
					type="submit"
					disabled={logoFromDiscogsSubmitting}
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
				>
					<Sparkles size={14} />
					{logoFromDiscogsSubmitting ? 'Hole Cover…' : 'Logo aus Discogs-Master'}
				</button>
			</form>

			{#if form?.logoError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.logoError}
				</p>
			{/if}

			<div class="mt-3 border-t border-stone-200 pt-3 dark:border-stone-800">
				<p class="mb-2 text-xs text-stone-500 dark:text-stone-400">
					Karten-Hintergrundfarbe. Wird beim Hochladen automatisch aus dem Logo abgeleitet.
				</p>
				<form
					method="POST"
					action="?/setColor"
					use:enhance={() => {
						return ({ update }) => update();
					}}
					class="flex items-center gap-2"
				>
					<input
						type="color"
						name="color"
						value={d.color ?? '#f2750c'}
						class="h-9 w-12 cursor-pointer rounded-lg border border-stone-300 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900"
					/>
					<code class="flex-1 truncate font-mono text-xs text-stone-500 dark:text-stone-400">
						{d.color ?? '—'}
					</code>
					<button
						type="submit"
						class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
					>
						Setzen
					</button>
				</form>
				<div class="mt-2 flex gap-2">
					{#if d.logoPath}
						<form method="POST" action="?/autoColor" use:enhance class="flex-1">
							<button
								type="submit"
								class="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
							>
								Aus Logo neu ableiten
							</button>
						</form>
					{/if}
					{#if d.color}
						<form method="POST" action="?/clearColor" use:enhance class="flex-1">
							<button
								type="submit"
								class="w-full rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
							>
								Zurücksetzen
							</button>
						</form>
					{/if}
				</div>
				{#if form?.colorError}
					<p
						class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
					>
						{form.colorError}
					</p>
				{/if}
			</div>
		</section>
	{/if}

	{#if d.missing.length > 0}
		<section
			class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40"
		>
			<h2
				class="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300"
			>
				<Puzzle size={14} />
				Fehlende Folgen
			</h2>
			<div class="flex flex-wrap gap-1">
				{#each d.missing as nr (nr)}
					<a
						href={`/kassetten/neu?serie=${encodeURIComponent(d.serie)}&folgeNr=${nr}`}
						class="rounded-full border border-rose-300 bg-white px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-stone-900 dark:text-rose-300"
					>
						{nr}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if d.items.length > 8}
		<div class="relative mb-3">
			<Search
				size={16}
				class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
			/>
			<input
				type="search"
				bind:value={search}
				placeholder="Folge suchen (Nummer oder Titel) …"
				aria-label="Folge innerhalb der Serie suchen"
				class="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-base shadow-sm dark:border-stone-700 dark:bg-stone-900"
			/>
		</div>
	{/if}

	{#if filteredItems.length === 0 && search.trim()}
		<p
			class="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
		>
			Keine Folge passt zu „{search.trim()}".
		</p>
	{:else if view === 'grid'}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each filteredItems as c, i (c.id)}
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
							{#if c.erstauflage}
								<span
									class="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90 text-white"
									title="Erstauflage"
								>
									<Medal size={11} />
								</span>
							{/if}
							{#if c.discogsInstanceId}
								<span
									class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
									title="Mit Discogs-Collection synchronisiert"
								>
									<CloudCheck size={11} />
								</span>
							{:else if c.discogsReleaseId}
								<span
									class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
									title="Discogs-Release verknüpft"
								>
									<Cloud size={11} />
								</span>
							{/if}
						</div>
						<div class="px-2 pt-2">
							<div class="line-clamp-2 text-xs font-medium leading-snug">{c.titel}</div>
						</div>
					</a>
					<div class="px-2 pb-2 pt-1">
						<InlineRating cassetteId={c.id} value={c.rating} size={13} />
					</div>
				</li>
			{/each}
		</ul>
	{:else if editMode}
		<CassetteEditTable
			items={filteredItems}
			folgeCovers={data.folgeCovers}
			mediaGrades={data.mediaGrades}
			sleeveGrades={data.sleeveGrades}
		/>
	{:else}
		<CassetteTable items={filteredItems} folgeCovers={data.folgeCovers} />
	{/if}
</main>

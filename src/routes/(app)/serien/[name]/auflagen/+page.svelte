<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import DiscogsSearch from '$lib/components/DiscogsSearch.svelte';
	import { enhance } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import Circle from '@lucide/svelte/icons/circle';
	import Search from '@lucide/svelte/icons/search';
	import ImageIcon from '@lucide/svelte/icons/image';
	import type { SearchResult } from '$lib/server/discogs/types';
	import { reveal } from '$lib/actions/reveal';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	const dreiHref = `/serien/${encodeURIComponent(data.serie)}`;

	type Filter = 'all' | 'missing' | 'owned-partial';
	let filter = $state<Filter>('all');

	const totals = $derived.by(() => {
		let totalFolgen = data.folgen.length;
		let folgenWithCassette = 0;
		let folgenComplete = 0;
		let totalAuflagen = 0;
		let ownedAuflagen = 0;
		for (const f of data.folgen) {
			if (f.owned.length > 0) folgenWithCassette++;
			totalAuflagen += f.auflagen.length;
			const owned = Object.keys(f.ownedBy).length;
			ownedAuflagen += owned;
			if (f.auflagen.length > 0 && owned === f.auflagen.length) folgenComplete++;
		}
		return { totalFolgen, folgenWithCassette, folgenComplete, totalAuflagen, ownedAuflagen };
	});

	const filteredFolgen = $derived.by(() => {
		if (filter === 'all') return data.folgen;
		if (filter === 'missing') return data.folgen.filter((f) => f.owned.length === 0);
		// owned-partial: hat min. 1 Kassette aber nicht alle Auflagen
		return data.folgen.filter(
			(f) =>
				f.owned.length > 0 &&
				(f.auflagen.length === 0 || Object.keys(f.ownedBy).length < f.auflagen.length)
		);
	});

	let openFormFor = $state<number | null>(null);
	let manualName = $state('');
	let manualYear = $state('');
	let manualNotes = $state('');
	let showDiscogsFor = $state<number | null>(null);

	function applyDiscogs(folgeNr: number, r: SearchResult) {
		// Wir POSTen direkt — kein Zwischen-Edit nötig.
		const fd = new FormData();
		fd.set('folgeNr', String(folgeNr));
		fd.set('discogsReleaseId', String(r.id));
		fd.set(
			'name',
			r.title ?? `Discogs ${r.id}` // Fallback
		);
		fd.set('year', r.year ? String(r.year) : '');
		fd.set('coverUrl', r.cover_image ?? r.thumb ?? '');
		fd.set(
			'discogsUrl',
			r.uri
				? new URL(r.uri, 'https://www.discogs.com').toString()
				: `https://www.discogs.com/release/${r.id}`
		);
		fetch(`?/addDiscogs`, { method: 'POST', body: fd }).then(() => {
			showDiscogsFor = null;
			window.location.reload();
		});
	}

	function coverThumb(coverCachePath: string | null, fallback: string | null): string | null {
		if (coverCachePath) {
			const stem = coverCachePath.replace(/\.[^.]+$/, '');
			return `/uploads/${stem}.thumb.jpg`;
		}
		return fallback;
	}

	function ownLinkFor(
		folgeNr: number,
		auflage: { id: string; name: string; discogsReleaseId: number | null; coverUrl: string | null }
	) {
		const params = new URLSearchParams({
			serie: data.serie,
			folgeNr: String(folgeNr),
			auflageId: auflage.id,
			auflageVariante: auflage.name
		});
		if (auflage.discogsReleaseId) {
			params.set('discogsReleaseId', String(auflage.discogsReleaseId));
			params.set('discogsUrl', `https://www.discogs.com/release/${auflage.discogsReleaseId}`);
			if (auflage.coverUrl) params.set('discogsCoverUrl', auflage.coverUrl);
		}
		return `/kassetten/neu?${params.toString()}`;
	}
</script>

<AppHeader back={dreiHref}>
	{#snippet children()}
		<span class="truncate">{data.serie} · Auflagen</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	{#if form?.auflagenError}
		<div
			class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
		>
			{form.auflagenError}
		</div>
	{/if}

	<section
		class="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<div class="grid grid-cols-3 gap-2 text-center sm:grid-cols-4">
			<div>
				<div class="text-lg font-semibold tabular-nums">
					{totals.folgenWithCassette}/{totals.totalFolgen}
				</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Folgen besessen
				</div>
			</div>
			<div>
				<div class="text-lg font-semibold tabular-nums">
					{totals.ownedAuflagen}/{totals.totalAuflagen}
				</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Auflagen besessen
				</div>
			</div>
			<div>
				<div class="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
					{totals.folgenComplete}
				</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					komplett
				</div>
			</div>
			<div class="hidden sm:block">
				<div class="text-lg font-semibold tabular-nums">
					{data.target ? `${data.target.min}–${data.target.max}` : '—'}
				</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Target-Range
				</div>
			</div>
		</div>
		{#if !data.target}
			<p
				class="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950 dark:text-amber-300"
			>
				Tipp: Setze auf der Serien-Detailseite ein Sammelziel (z.B. 1–100), damit auch noch nicht
				besessene Folgen hier auftauchen.
			</p>
		{/if}
	</section>

	<div class="flex gap-1 overflow-x-auto rounded-full bg-stone-100 p-1 text-xs dark:bg-stone-800">
		{#each [{ id: 'all' as Filter, label: 'Alle' }, { id: 'owned-partial' as Filter, label: 'Lückenhaft' }, { id: 'missing' as Filter, label: 'Fehlt komplett' }] as opt (opt.id)}
			<button
				type="button"
				onclick={() => (filter = opt.id)}
				class="flex-1 rounded-full px-3 py-1.5 font-medium transition"
				class:bg-white={filter === opt.id}
				class:dark:bg-stone-900={filter === opt.id}
				class:text-stone-700={filter !== opt.id}
				class:dark:text-stone-300={filter !== opt.id}
			>
				{opt.label}
			</button>
		{/each}
	</div>

	<p class="text-xs text-stone-500 dark:text-stone-400">
		Pro Folge bekannte Kassetten-Auflagen verwalten. „Habe ich" legt eine neue Kassette an, die mit
		dieser Auflage verknüpft wird.
	</p>

	{#if filteredFolgen.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			Kein Treffer im aktuellen Filter.
		</div>
	{:else}
		{#each filteredFolgen as f, i (f.folgeNr)}
			{@const isMissing = f.owned.length === 0}
			{@const isComplete =
				f.auflagen.length > 0 && Object.keys(f.ownedBy).length === f.auflagen.length}
			<section
				id={`folge-${f.folgeNr}`}
				class="reveal rounded-2xl border p-3 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
				use:reveal={{ delay: Math.min(i * 30, 240) }}
				class:border-rose-200={isMissing}
				class:bg-rose-50={isMissing}
				class:dark:border-rose-900={isMissing}
				class:dark:bg-rose-950={isMissing}
				class:border-emerald-200={isComplete}
				class:bg-emerald-50={isComplete}
				class:dark:border-emerald-900={isComplete}
				class:dark:bg-emerald-950={isComplete}
				class:border-stone-200={!isMissing && !isComplete}
				class:bg-white={!isMissing && !isComplete}
				class:dark:border-stone-800={!isMissing && !isComplete}
				class:dark:bg-stone-900={!isMissing && !isComplete}
			>
				<header class="mb-2 flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<span
							class="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-sm font-medium dark:bg-stone-800"
						>
							{f.folgeNr}
						</span>
						<span class="text-sm font-semibold">
							{f.owned[0]?.titel ??
								data.folgeTitel[`${data.serie}|${f.folgeNr}`] ??
								f.auflagen[0]?.name ??
								`Folge ${f.folgeNr}`}
						</span>
						{#if isMissing}
							<span
								class="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-800 dark:bg-rose-900 dark:text-rose-200"
							>
								fehlt
							</span>
						{:else if isComplete}
							<span
								class="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
							>
								komplett
							</span>
						{/if}
					</div>
					<span class="text-xs text-stone-500 dark:text-stone-400">
						{Object.keys(f.ownedBy).length} / {f.auflagen.length || '?'} besessen
					</span>
				</header>

				{#if f.auflagen.length > 0}
					<ul class="space-y-1.5">
						{#each f.auflagen as a (a.id)}
							{@const owned = f.ownedBy[a.id]}
							<li
								class="flex items-center gap-3 rounded-lg border border-stone-100 px-2 py-2 dark:border-stone-800"
							>
								<div
									class="h-12 w-12 shrink-0 overflow-hidden rounded bg-stone-100 dark:bg-stone-800"
								>
									{#if coverThumb(a.coverCachePath, a.coverUrl)}
										<img
											src={coverThumb(a.coverCachePath, a.coverUrl)}
											alt=""
											class="h-full w-full object-cover"
											loading="lazy"
										/>
									{:else}
										<div class="flex h-full items-center justify-center text-stone-400">
											<ImageIcon size={16} />
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-1.5">
										{#if owned}
											<CheckCircle2 size={14} class="shrink-0 text-emerald-600" />
										{:else}
											<Circle size={14} class="shrink-0 text-stone-400" />
										{/if}
										<span class="truncate text-sm font-medium">{a.name}</span>
									</div>
									<div
										class="flex flex-wrap gap-x-2 text-[11px] text-stone-500 dark:text-stone-400"
									>
										<span>{a.source === 'discogs' ? 'Discogs' : 'manuell'}</span>
										{#if a.year}<span>· {a.year}</span>{/if}
										{#if a.discogsReleaseId}
											<a
												href={`https://www.discogs.com/release/${a.discogsReleaseId}`}
												target="_blank"
												rel="noopener"
												class="text-emerald-700 hover:underline dark:text-emerald-300"
											>
												#{a.discogsReleaseId}
											</a>
										{/if}
										{#if owned}<a
												href={`/kassetten/${owned.id}`}
												class="text-brand-600 hover:underline dark:text-brand-400"
												>Kassette ansehen</a
											>{/if}
									</div>
								</div>
								{#if !owned}
									<a
										href={ownLinkFor(f.folgeNr, a)}
										class="rounded-lg bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-brand-600"
										title="Kassette für diese Auflage anlegen"
									>
										Habe ich
									</a>
								{/if}
								<form method="POST" action="?/delete" use:enhance class="flex">
									<input type="hidden" name="folgeNr" value={f.folgeNr} />
									<input type="hidden" name="id" value={a.id} />
									<button
										type="submit"
										class="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
										aria-label="Auflage löschen"
									>
										<Trash2 size={14} />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p
						class="rounded-lg border border-dashed border-stone-200 px-3 py-3 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400"
					>
						Keine Auflagen erfasst. Füge die erste über Discogs oder manuell hinzu.
					</p>
				{/if}

				{#if openFormFor === f.folgeNr}
					<form
						method="POST"
						action="?/addManual"
						use:enhance={() => {
							return ({ update }) =>
								update().finally(() => {
									openFormFor = null;
									manualName = '';
									manualYear = '';
									manualNotes = '';
								});
						}}
						class="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
					>
						<input type="hidden" name="folgeNr" value={f.folgeNr} />
						<label class="block">
							<span class="text-xs text-stone-500 dark:text-stone-400">Name</span>
							<input
								type="text"
								name="name"
								bind:value={manualName}
								required
								placeholder="z.B. Picture-Cover (1985)"
								class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							/>
						</label>
						<div class="grid grid-cols-2 gap-2">
							<label class="block">
								<span class="text-xs text-stone-500 dark:text-stone-400">Jahr</span>
								<input
									type="number"
									name="year"
									bind:value={manualYear}
									inputmode="numeric"
									placeholder="z.B. 1985"
									class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
								/>
							</label>
							<label class="block">
								<span class="text-xs text-stone-500 dark:text-stone-400">Notiz (optional)</span>
								<input
									type="text"
									name="notes"
									bind:value={manualNotes}
									class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
								/>
							</label>
						</div>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={() => (openFormFor = null)}
								class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
							>
								Abbrechen
							</button>
							<button
								type="submit"
								class="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
							>
								Speichern
							</button>
						</div>
					</form>
				{:else}
					<div class="mt-2 flex flex-wrap gap-2">
						<form
							method="POST"
							action="?/fetchDreimetadaten"
							use:enhance={() => {
								return ({ update }) => update();
							}}
						>
							<input type="hidden" name="folgeNr" value={f.folgeNr} />
							<button
								type="submit"
								title="Cover + Klappentext + Titel von dreimetadaten.de holen"
								class="flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
							>
								🌐 Folge-Daten holen
							</button>
						</form>
						<button
							type="button"
							onclick={() => (showDiscogsFor = f.folgeNr)}
							class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
						>
							<Search size={14} />
							Auflage aus Discogs
						</button>
						<button
							type="button"
							onclick={() => {
								openFormFor = f.folgeNr;
								manualName = '';
								manualYear = '';
								manualNotes = '';
							}}
							class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
						>
							<Plus size={14} />
							Manuelle Auflage
						</button>
					</div>
				{/if}
			</section>
		{/each}
	{/if}
</main>

{#if showDiscogsFor !== null}
	{@const folgeNr = showDiscogsFor}
	<DiscogsSearch
		defaultQuery={`${data.serie} ${folgeNr}`}
		onpick={(r) => applyDiscogs(folgeNr, r)}
		onclose={() => (showDiscogsFor = null)}
	/>
{/if}

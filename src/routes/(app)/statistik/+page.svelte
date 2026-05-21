<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandTitle from '$lib/components/BrandTitle.svelte';
	import BarChart, { type BarItem } from '$lib/components/charts/BarChart.svelte';
	import VBarChart from '$lib/components/charts/VBarChart.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import DonutChart from '$lib/components/charts/DonutChart.svelte';
	import { formatEur, formatRelative } from '$lib/util/format';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Library from '@lucide/svelte/icons/library';
	import Coins from '@lucide/svelte/icons/coins';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Loader2 from '@lucide/svelte/icons/loader-circle';
	import Tag from '@lucide/svelte/icons/tag';

	let { data, form } = $props();
	const s = $derived(data.stats);

	const EMPTY_PRICE_STATUS = {
		running: false,
		total: 0,
		done: 0,
		succeeded: 0,
		failed: 0,
		skipped: 0,
		errors: [] as { releaseId: number; message: string; at: number }[],
		current: null as number | null,
		startedAt: null as number | null,
		finishedAt: null as number | null
	};

	// svelte-ignore state_referenced_locally
	let livePriceStatus = $state(data.priceStatus ?? EMPTY_PRICE_STATUS);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function pollPrices() {
		try {
			const res = await fetch('/api/prices/status');
			const body = await res.json();
			livePriceStatus = body.status ?? EMPTY_PRICE_STATUS;
			if (!livePriceStatus.running) {
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = null;
				invalidate('/statistik');
			}
		} catch {
			// Ignorieren, nächster Tick kommt gleich.
		}
	}

	$effect(() => {
		if (livePriceStatus?.running && !pollTimer) {
			pollTimer = setInterval(pollPrices, 1500);
		}
		return () => {
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	const pricePct = $derived(
		!livePriceStatus || livePriceStatus.total === 0
			? 0
			: Math.round((livePriceStatus.done / livePriceStatus.total) * 100)
	);

	function fmt(cents: number, currency: string | null): string {
		if (!currency || currency === 'EUR') return formatEur(cents);
		return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
	}

	const mvDelta = $derived(s.marketValue.totalCent - s.kpis.totalKaufpreisCent);
	const mvDeltaPct = $derived(
		s.kpis.totalKaufpreisCent > 0 ? Math.round((mvDelta / s.kpis.totalKaufpreisCent) * 100) : null
	);

	function monthLabel(key: string): string {
		const [y, m] = key.split('-');
		return `${m}/${y.slice(2)}`;
	}

	const seriesBars: BarItem[] = $derived(
		s.seriesCompleteness.map((c) => ({
			label: c.serie,
			value: c.percent,
			subtitle: `${c.owned}/${c.range}`,
			tone: c.percent === 100 ? 'emerald' : c.percent >= 50 ? 'brand' : 'amber'
		}))
	);

	const mediaBars: BarItem[] = $derived(
		s.mediaCondition.map((c) => ({ label: c.label, value: c.count, tone: 'sky' as const }))
	);
	const sleeveBars: BarItem[] = $derived(
		s.sleeveCondition.map((c) => ({ label: c.label, value: c.count, tone: 'amber' as const }))
	);

	const yearBars = $derived(s.yearHist.map((y) => ({ label: String(y.year), value: y.count })));

	const labelSlices = $derived(s.labels.map((l) => ({ label: l.label, value: l.count })));

	const growthPoints = $derived(
		s.growth.map((g) => ({ label: monthLabel(g.monthKey), value: g.cumulative }))
	);
</script>

<AppHeader>
	{#snippet children()}
		<BrandTitle />
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4">
	<!-- KPI-Header -->
	<section class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		<div
			class="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
				<Library size={12} /> Folgen
			</div>
			<div class="mt-1 text-2xl font-semibold">{s.kpis.total}</div>
		</div>
		<div
			class="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="text-xs text-stone-500 dark:text-stone-400">Serien</div>
			<div class="mt-1 text-2xl font-semibold">{s.kpis.seriesCount}</div>
		</div>
		<div
			class="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
				<Coins size={12} /> Kaufwert
			</div>
			<div class="mt-1 text-2xl font-semibold">{formatEur(s.kpis.totalKaufpreisCent)}</div>
			{#if s.kpis.averageKaufpreisCent != null}
				<div class="text-xs text-stone-400">
					Ø {formatEur(s.kpis.averageKaufpreisCent)}
				</div>
			{/if}
		</div>
		<div
			class="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
				<CloudCheck size={12} /> Discogs
			</div>
			<div class="mt-1 text-2xl font-semibold">
				{s.kpis.pushed}<span class="text-base text-stone-400">/{s.kpis.withRelease}</span>
			</div>
			<div class="text-xs text-stone-400">gepusht / verknüpft</div>
		</div>
	</section>

	<!-- Marktwert (Discogs-Preisvorschläge) -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<div class="mb-3 flex items-baseline justify-between gap-2">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<Tag size={16} class="text-brand-500" />
				Marktwert (ungefähr)
			</h2>
			{#if s.marketValue.lastFetchedAt}
				<span class="text-[11px] text-stone-400">
					Stand: {formatRelative(s.marketValue.lastFetchedAt)}
				</span>
			{/if}
		</div>

		{#if !data.hasDiscogs}
			<div
				class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
			>
				Setze <code>DISCOGS_TOKEN</code> + <code>DISCOGS_USERNAME</code> in der <code>.env</code>,
				damit Preise gezogen werden können.
			</div>
		{:else if s.marketValue.cachedReleases === 0}
			<div
				class="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
			>
				Noch keine Preisdaten gecached. Klick „Preise holen" — kann je nach Sammlungsgröße ein paar
				Minuten dauern (1.1s pro Release wegen Discogs-Rate-Limit).
			</div>
		{:else}
			<div class="flex items-baseline gap-3">
				<div class="text-3xl font-semibold tabular-nums">
					{fmt(s.marketValue.totalCent, s.marketValue.currency)}
				</div>
				{#if mvDeltaPct != null && s.marketValue.pricedCount > 0}
					<div
						class="flex items-center gap-0.5 text-sm font-medium"
						class:text-emerald-600={mvDelta >= 0}
						class:text-rose-600={mvDelta < 0}
					>
						{#if mvDelta >= 0}
							<TrendingUp size={14} />
						{:else}
							<TrendingDown size={14} />
						{/if}
						{mvDelta >= 0 ? '+' : ''}{mvDeltaPct}%
						<span class="ml-1 text-xs font-normal text-stone-500 dark:text-stone-400">
							ggü. Kaufwert
						</span>
					</div>
				{/if}
			</div>
			<dl class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
				<div>
					<dt class="text-stone-500 dark:text-stone-400">Gepreist</dt>
					<dd class="font-medium tabular-nums">
						{s.marketValue.pricedCount} / {s.kpis.total}
					</dd>
				</div>
				<div>
					<dt class="text-stone-500 dark:text-stone-400">Ohne Discogs</dt>
					<dd class="font-medium tabular-nums">{s.kpis.total - s.marketValue.totalReleases}</dd>
				</div>
				<div>
					<dt class="text-stone-500 dark:text-stone-400">Ohne Preisdaten</dt>
					<dd class="font-medium tabular-nums">{s.marketValue.missingPriceCount}</dd>
				</div>
				<div>
					<dt class="text-stone-500 dark:text-stone-400">Zustand fehlt</dt>
					<dd class="font-medium tabular-nums">
						{s.marketValue.withoutCondition}
						{#if s.marketValue.withoutCondition > 0}
							<span class="text-stone-400">(VG+ angenommen)</span>
						{/if}
					</dd>
				</div>
			</dl>
		{/if}

		{#if data.hasDiscogs}
			{#if livePriceStatus.running}
				<div class="mt-3 space-y-1.5">
					<div class="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
						<span class="inline-flex items-center gap-1">
							<Loader2 size={12} class="animate-spin" />
							{livePriceStatus.done} / {livePriceStatus.total} · {pricePct}%
						</span>
						{#if livePriceStatus.current}
							<span class="font-mono text-stone-500">#{livePriceStatus.current}</span>
						{/if}
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
						<div
							class="h-full bg-brand-500 transition-[width] duration-300"
							style:width={`${pricePct}%`}
						></div>
					</div>
				</div>
			{:else}
				<form
					method="POST"
					action="?/refreshPrices"
					use:enhance={() => {
						return ({ result, update }) => {
							update().then(() => {
								if (result.type === 'success' && result.data?.status) {
									livePriceStatus = result.data.status as typeof livePriceStatus;
								}
							});
						};
					}}
					class="mt-3 flex items-center gap-2"
				>
					<label class="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
						<input
							type="checkbox"
							name="force"
							class="h-3.5 w-3.5 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
						/>
						auch aktuelle (≤14 Tage) neu laden
					</label>
					<button
						type="submit"
						class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
					>
						<RefreshCw size={12} />
						Preise holen
					</button>
				</form>
			{/if}

			{#if form?.priceError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.priceError}
				</p>
			{/if}
			{#if livePriceStatus.errors.length > 0 && !livePriceStatus.running}
				<details class="mt-2">
					<summary class="cursor-pointer text-[11px] text-stone-500 dark:text-stone-400">
						{livePriceStatus.errors.length} Release(s) ohne Preisvorschläge
					</summary>
					<ul
						class="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-stone-600 dark:text-stone-400"
					>
						{#each livePriceStatus.errors as err (err.releaseId + err.at)}
							<li class="border-l-2 border-amber-300 pl-2 dark:border-amber-700">
								{#if err.cassette}
									<a
										href={`/kassetten/${err.cassette.cassetteId}`}
										class="block font-medium text-stone-700 hover:text-brand-600 dark:text-stone-200 dark:hover:text-brand-400"
									>
										{err.cassette.serie}{err.cassette.folgeNr != null
											? ` · ${err.cassette.folgeNr}`
											: ''} · {err.cassette.titel}
									</a>
								{:else}
									<span class="block font-medium">unbekannte Kassette</span>
								{/if}
								<span class="text-[11px] opacity-70">
									<span class="font-mono">#{err.releaseId}</span> · {err.message}
								</span>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		{/if}
	</section>

	<!-- Sammlungs-Wachstum -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold">
			<TrendingUp size={16} class="text-brand-500" />
			Sammlungs-Wachstum
		</h2>
		{#if s.growth.length === 0}
			<p class="text-xs text-stone-500 dark:text-stone-400">Noch keine datierten Einträge.</p>
		{:else if s.growth.length < 3}
			<div
				class="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
			>
				Nur {s.growth.length}
				{s.growth.length === 1 ? 'Monat' : 'Monate'} Daten — die Linie wird aussagekräftiger, sobald die
				Sammlung über mehrere Monate gewachsen ist.
			</div>
		{:else}
			<LineChart data={growthPoints} />
			<div class="mt-1 text-xs text-stone-500 dark:text-stone-400">
				{s.kpis.rangeMonths
					? `${s.kpis.rangeMonths} ${s.kpis.rangeMonths === 1 ? 'Monat' : 'Monate'} Sammeldauer`
					: ''}
			</div>
		{/if}
	</section>

	<!-- Vollständigkeit pro Serie -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-sm font-semibold">Vollständigkeit pro Serie</h2>
		<BarChart data={seriesBars} max={100} format={(v) => `${v}%`} />
	</section>

	<!-- Folgen pro Jahr -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-sm font-semibold">Folgen nach Erscheinungsjahr</h2>
		<VBarChart data={yearBars} height={120} />
	</section>

	<!-- Zustand -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-sm font-semibold">Zustand</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<h3
					class="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
				>
					MC
				</h3>
				<BarChart data={mediaBars} empty="Noch keine MC-Bewertungen." />
			</div>
			<div>
				<h3
					class="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
				>
					Hülle
				</h3>
				<BarChart data={sleeveBars} empty="Noch keine Hüllen-Bewertungen." />
			</div>
		</div>
	</section>

	<!-- Labels -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-sm font-semibold">Label-Verteilung</h2>
		<DonutChart data={labelSlices} />
	</section>
</main>

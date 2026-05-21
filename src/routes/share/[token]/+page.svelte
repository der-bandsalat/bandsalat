<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { coverThumbUrl } from '$lib/util/cover';
	import { formatEur, formatDate } from '$lib/util/format';
	import { FORMAT_LABELS, type MediaFormat } from '$lib/format';
	import Eye from '@lucide/svelte/icons/eye';
	import ImageIcon from '@lucide/svelte/icons/image';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';

	let { data } = $props();

	const grouped = $derived.by(() => {
		const map = new Map<string, typeof data.items>();
		for (const c of data.items) {
			const existing = map.get(c.serie) ?? [];
			existing.push(c);
			map.set(c.serie, existing);
		}
		// Folgen pro Serie sortieren
		for (const arr of map.values()) {
			arr.sort(
				(a, b) => (a.folgeNr ?? 9999) - (b.folgeNr ?? 9999) || a.titel.localeCompare(b.titel)
			);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	const totalKaufpreis = $derived(data.items.reduce((acc, c) => acc + (c.kaufpreisCent ?? 0), 0));

	function colorFor(serie: string): string | null {
		return data.serien.find((s) => s.name === serie)?.color ?? null;
	}
	function logoFor(serie: string): string | null {
		return data.serien.find((s) => s.name === serie)?.logoPath ?? null;
	}
</script>

<svelte:head>
	<title>{data.share.title ?? 'Geteilte Sammlung'} · Bandsalat</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<header
	class="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80"
>
	<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
		<a
			href="/"
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm"
			aria-label="Bandsalat"
		>
			<BrandLogo size={22} />
		</a>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-base font-semibold">
				{data.share.title ??
					(data.share.scope === 'serie' ? data.share.scopeRef : 'Geteilte Sammlung')}
			</h1>
			<div class="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
				<Eye size={12} />
				<span
					>Read-only · {data.items.length} {data.items.length === 1 ? 'Eintrag' : 'Einträge'}</span
				>
				{#if data.share.expiresAt}
					<span>· läuft {formatDate(data.share.expiresAt.slice(0, 10))}</span>
				{/if}
			</div>
		</div>
	</div>
</header>

<main class="mx-auto max-w-3xl space-y-4 px-4 py-4 pb-12">
	{#if data.items.length === 0}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			Diese Sammlung ist (noch) leer.
		</div>
	{:else}
		<div
			class="grid grid-cols-3 gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-4"
		>
			<div>
				<div class="text-lg font-semibold tabular-nums">{data.items.length}</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Einträge
				</div>
			</div>
			<div>
				<div class="text-lg font-semibold tabular-nums">{grouped.length}</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Serien
				</div>
			</div>
			<div>
				<div class="text-lg font-semibold tabular-nums">{formatEur(totalKaufpreis)}</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Kaufwert
				</div>
			</div>
			<div class="hidden sm:block">
				<div class="text-lg font-semibold tabular-nums">
					{data.items.filter((c) => c.discogsReleaseId != null).length}
				</div>
				<div class="text-[10px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
					via Discogs
				</div>
			</div>
		</div>

		{#each grouped as [serie, items] (serie)}
			{@const color = colorFor(serie)}
			{@const logo = logoFor(serie)}
			<section
				class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
			>
				<header
					class="flex items-center gap-3 px-4 py-3"
					style:background-color={color ?? undefined}
				>
					{#if logo}
						<img
							src={`/uploads/${logo}`}
							alt=""
							class="h-10 w-10 rounded-lg bg-white/40 object-contain p-1"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<h2
							class="truncate text-base font-semibold"
							style:color={color ? '#fafaf9' : undefined}
						>
							{serie}
						</h2>
						<div class="text-[11px]" style:color={color ? 'rgba(255,255,255,0.7)' : undefined}>
							{items.length}
							{items.length === 1 ? 'Folge' : 'Folgen'}
						</div>
					</div>
				</header>
				<ul class="divide-y divide-stone-100 dark:divide-stone-800">
					{#each items as c (c.id)}
						{@const cover = coverThumbUrl(c)}
						<li class="flex items-center gap-3 px-3 py-2">
							<div
								class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
							>
								{#if cover}
									<img src={cover} alt="" loading="lazy" class="h-full w-full object-cover" />
								{:else}
									<div class="flex h-full items-center justify-center text-stone-400">
										<ImageIcon size={18} />
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline gap-2 text-xs text-stone-500 dark:text-stone-400">
									{#if c.folgeNr != null}
										<span
											class="rounded-full bg-stone-100 px-1.5 py-0.5 font-mono dark:bg-stone-800"
											>{c.folgeNr}</span
										>
									{/if}
									{#if c.format !== 'cassette'}
										<span class="rounded-full bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">
											{FORMAT_LABELS[c.format as MediaFormat]}
										</span>
									{/if}
									{#if c.jahr}<span>{c.jahr}</span>{/if}
									{#if c.label}<span>· {c.label}</span>{/if}
								</div>
								<div class="truncate font-medium">{c.titel}</div>
								{#if c.auflageVariante}
									<div class="truncate text-[11px] text-stone-500 dark:text-stone-400">
										{c.auflageVariante}
									</div>
								{/if}
							</div>
							{#if c.discogsInstanceId || c.discogsReleaseId}
								<CloudCheck size={14} class="shrink-0 text-emerald-600" />
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}

	<footer class="pt-4 text-center text-[11px] text-stone-400 dark:text-stone-600">
		<a
			href="https://github.com/der-bandsalat/bandsalat"
			target="_blank"
			rel="noopener"
			class="hover:underline"
		>
			Bandsalat
		</a>
		— Hörspielkassetten-Katalog (read-only Share)
	</footer>
</main>

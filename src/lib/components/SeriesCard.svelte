<script lang="ts" module>
	export function textOn(hex: string): string {
		// WCAG-Luminanz, vereinfacht. Schwellenwert experimentell — über 0.55
		// ist das Stein-Schwarz lesbar, darunter knapp halten wir das Off-White.
		const m = /^#?([0-9a-f]{6})$/i.exec(hex);
		if (!m) return '#fafaf9';
		const v = m[1];
		const r = parseInt(v.slice(0, 2), 16) / 255;
		const g = parseInt(v.slice(2, 4), 16) / 255;
		const b = parseInt(v.slice(4, 6), 16) / 255;
		const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
		const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
		return lum > 0.55 ? '#1c1917' : '#fafaf9';
	}
</script>

<script lang="ts">
	import SeriesLogo, { paletteFor } from './SeriesLogo.svelte';
	import type { SeriesEntry } from '$lib/server/db/series';
	import FolderIcon from '@lucide/svelte/icons/folder';

	type Props = { entry: SeriesEntry };
	let { entry }: Props = $props();

	const href = $derived(
		entry.kind === 'folder'
			? `/serien/${encodeURIComponent(entry.serie)}?kind=folder`
			: `/serien/${encodeURIComponent(entry.serie)}`
	);
	const isFolder = $derived(entry.kind === 'folder');
	const rangeLabel = $derived(
		entry.min != null && entry.max != null
			? entry.min === entry.max
				? `Folge ${entry.min}`
				: `Folgen ${entry.min}–${entry.max}`
			: null
	);
	const range = $derived(entry.min != null && entry.max != null ? entry.max - entry.min + 1 : null);
	const percent = $derived(
		range && range > 0 ? Math.round(((range - entry.missing.length) / range) * 100) : null
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

	// Priorität: manuelle/auto Farbe aus app_meta → Hash-Palette als Fallback.
	const palette = $derived(paletteFor(entry.serie));
	const bgColor = $derived(entry.color ?? palette.bg);
	const fgColor = $derived(entry.color ? textOn(entry.color) : palette.fg);

	const initials = $derived(
		entry.serie
			.replace(/[^\p{L}\p{N} ]/gu, '')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

<a
	{href}
	class="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800"
>
	<div class="flex aspect-[5/3] items-center justify-center p-2" style:background-color={bgColor}>
		{#if entry.logoPath}
			<img
				src={`/uploads/${entry.logoPath}`}
				alt={entry.serie}
				loading="lazy"
				class="h-full w-full object-contain"
			/>
		{:else}
			<span
				class="text-4xl font-semibold tracking-tight sm:text-5xl"
				style:color={fgColor}
				aria-hidden="true"
			>
				{initials}
			</span>
		{/if}
	</div>
	<div class="flex items-center gap-3 bg-white p-3 dark:bg-stone-900">
		<SeriesLogo serie={entry.serie} logoPath={entry.logoPath} size={36} />
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-1 truncate font-semibold leading-tight">
				{#if isFolder}
					<FolderIcon size={14} class="shrink-0 text-stone-400" />
				{/if}
				<span class="truncate">{entry.serie}</span>
			</div>
			<div class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
				{entry.count}
				{#if isFolder}
					{entry.count === 1 ? 'Kassette' : 'Kassetten'} · Ordner
				{:else}
					{entry.count === 1 ? 'Folge' : 'Folgen'}{rangeLabel ? ` · ${rangeLabel}` : ''}
				{/if}
			</div>
		</div>
		{#if percent != null}
			<span class="shrink-0 text-xs font-medium tabular-nums text-stone-600 dark:text-stone-300">
				{percent}%
			</span>
		{:else if entry.missing.length > 0}
			<span
				class="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
				title={entry.missing.join(', ')}
			>
				{entry.missing.length}
			</span>
		{/if}
	</div>
	{#if percent != null}
		<div class="h-1.5 bg-stone-100 dark:bg-stone-800">
			<div
				class="h-full {progressTone} transition-[width]"
				style:width={`${percent}%`}
				title={`${percent}% (${entry.missing.length} fehlen)`}
			></div>
		</div>
	{/if}
</a>

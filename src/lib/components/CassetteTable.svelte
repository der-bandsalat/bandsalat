<script lang="ts">
	import type { Cassette } from '$lib/server/db/schema';
	import { coverThumbUrl, type ExternalCoverPaths } from '$lib/util/cover';
	import InlineRating from '$lib/components/InlineRating.svelte';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ImagesIcon from '@lucide/svelte/icons/images';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Medal from '@lucide/svelte/icons/medal';
	import Heart from '@lucide/svelte/icons/heart';
	import { FORMAT_LABELS, FORMAT_SHORT } from '$lib/format';

	type Props = {
		items: Cassette[];
		/** Map "serie|folgeNr" -> externe Cover-Pfade (dreimetadaten.de o.ä.). */
		folgeCovers?: Record<string, ExternalCoverPaths>;
		/** Map cassetteId -> Anzahl Fotos (für Mehrfach-Foto-Badge). */
		photoCounts?: Record<string, number>;
	};

	let { items, folgeCovers = {}, photoCounts = {} }: Props = $props();

	function externalFor(c: Cassette): ExternalCoverPaths | null {
		if (c.folgeNr == null) return null;
		return folgeCovers[`${c.serie}|${c.folgeNr}`] ?? null;
	}

	// Format-Badges: bei gemischten Listen trägt JEDE Folge ihr Badge (auch MC),
	// reine MC-Listen bleiben unmarkiert — Abweichler (CD/LP) immer.
	const mixedFormats = $derived(new Set(items.map((i) => i.format ?? 'cassette')).size > 1);
	const showFormatBadge = (c: Cassette) =>
		Boolean(c.format) && (mixedFormats || c.format !== 'cassette');
</script>

<div
	class="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
>
	<table class="w-full table-fixed text-sm">
		<thead
			class="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
		>
			<tr>
				<th class="w-[68px] px-2 py-2 text-left"></th>
				<th class="px-2 py-2 text-left">Folge · Titel</th>
				<th class="hidden w-32 px-2 py-2 text-left sm:table-cell">Label</th>
				<th class="hidden w-16 px-2 py-2 text-left sm:table-cell">Jahr</th>
				<th class="w-28 px-2 py-2 text-left">Bewertung</th>
				<th class="w-10 px-2 py-2"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-stone-100 dark:divide-stone-800">
			{#each items as c (c.id)}
				{@const cover = coverThumbUrl(c, externalFor(c))}
				{@const photos = photoCounts[c.id] ?? 0}
				<tr class="hover:bg-stone-50 dark:hover:bg-stone-800">
					<td class="py-2 pl-2 pr-1">
						<a href={`/kassetten/${c.id}`} class="block">
							<div
								class="relative h-14 w-14 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
							>
								{#if cover}
									<img src={cover} alt="" loading="lazy" class="h-full w-full object-cover" />
								{:else}
									<div
										class="flex h-full items-center justify-center text-stone-400 dark:text-stone-600"
									>
										<ImageIcon size={20} />
									</div>
								{/if}
								{#if photos > 1}
									<span
										class="absolute left-0.5 top-0.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
										title="{photos} Fotos hinterlegt"
									>
										<ImagesIcon size={9} />
										{photos}
									</span>
								{/if}
							</div>
						</a>
					</td>
					<td class="min-w-0 px-2 py-2">
						<a href={`/kassetten/${c.id}`} class="block">
							<div class="flex items-center gap-2">
								{#if c.folgeNr != null}
									<span
										class="shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
									>
										{c.folgeNr}
									</span>
								{:else if c.folgeNrLabel}
									<span
										class="shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600 dark:bg-stone-800 dark:text-stone-300"
									>
										{c.folgeNrLabel}
									</span>
								{/if}
								<span class="truncate font-medium leading-snug">{c.titel}</span>
								{#if showFormatBadge(c)}
									<span
										class="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold {c.format ===
										'cassette'
											? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
											: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'}"
										title={FORMAT_LABELS[c.format]}
									>
										{FORMAT_SHORT[c.format]}
									</span>
								{/if}
								{#if c.erstauflage}
									<span
										class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
										title="Erstauflage"
									>
										<Medal size={12} />
									</span>
								{/if}
								{#if c.favorit}
									<span
										class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
										title="Favorit"
									>
										<Heart size={12} fill="currentColor" />
									</span>
								{/if}
							</div>
							<div class="truncate text-xs text-stone-500 dark:text-stone-400">
								{c.serie}<span class="sm:hidden"
									>{#if c.label}{' · '}{c.label}{/if}{#if c.jahr}{' · '}{c.jahr}{/if}</span
								>
							</div>
						</a>
					</td>
					<td class="hidden truncate px-2 py-2 text-stone-500 sm:table-cell">{c.label ?? '—'}</td>
					<td class="hidden truncate px-2 py-2 text-stone-500 sm:table-cell">{c.jahr ?? '—'}</td>
					<td class="whitespace-nowrap px-2 py-2">
						<InlineRating cassetteId={c.id} value={c.rating} size={14} />
					</td>
					<td class="px-2 py-2 text-right">
						{#if c.discogsInstanceId}
							<span
								class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"
								title="Mit Discogs-Collection synchronisiert"
							>
								<CloudCheck size={14} />
							</span>
						{:else if c.discogsReleaseId}
							<span
								class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
								title="Discogs-Release verknüpft, aber nicht gepusht"
							>
								<Cloud size={14} />
							</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

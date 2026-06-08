<script lang="ts">
	import type { Cassette } from '$lib/server/db/schema';
	import { MEDIA_FORMATS, FORMAT_LABELS } from '$lib/format';
	import { coverThumbUrl, type ExternalCoverPaths } from '$lib/util/cover';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import EditableCell from './EditableCell.svelte';
	import ColumnPicker from './ColumnPicker.svelte';
	import {
		EDITABLE_COLUMN_MAP,
		DEFAULT_VISIBLE_COLUMNS,
		COLUMN_STORAGE_KEY,
		PANEL_COLUMNS,
		type EditableColumn
	} from './columns';

	type Props = {
		items: Cassette[];
		folgeCovers?: Record<string, ExternalCoverPaths>;
		mediaGrades: readonly string[];
		sleeveGrades: readonly string[];
	};

	let { items, folgeCovers = {}, mediaGrades, sleeveGrades }: Props = $props();

	// Lokale, editierbare Kopie – wird bei echtem Reload (items-Identität ändert
	// sich) resynct, hält ansonsten die per-Zelle gespeicherten Werte konsistent.
	let rows = $state<Cassette[]>([]);
	$effect(() => {
		rows = items.map((it) => ({ ...it }));
	});

	let visibleKeys = $state<string[]>([...DEFAULT_VISIBLE_COLUMNS]);

	// localStorage laden (nur Browser).
	$effect(() => {
		const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					const valid = parsed.filter((k) => typeof k === 'string' && EDITABLE_COLUMN_MAP[k]);
					if (valid.length) visibleKeys = valid;
				}
			} catch {
				/* ignore */
			}
		}
	});

	function persist(keys: string[]) {
		localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(keys));
	}
	$effect(() => {
		persist(visibleKeys);
	});

	const visibleCols = $derived(
		visibleKeys.map((k) => EDITABLE_COLUMN_MAP[k]).filter(Boolean) as EditableColumn[]
	);

	function optionsFor(col: EditableColumn): { value: string; label: string }[] {
		if (col.optionSource === 'format')
			return MEDIA_FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] }));
		if (col.optionSource === 'media') return mediaGrades.map((g) => ({ value: g, label: g }));
		if (col.optionSource === 'sleeve') return sleeveGrades.map((g) => ({ value: g, label: g }));
		return [];
	}

	function externalFor(c: Cassette): ExternalCoverPaths | null {
		if (c.folgeNr == null) return null;
		return folgeCovers[`${c.serie}|${c.folgeNr}`] ?? null;
	}

	function onsaved(rowIndex: number, key: string, canonical: unknown) {
		// @ts-expect-error – key ist ein gültiger Cassette-Spaltenname.
		rows[rowIndex][key] = canonical;
	}

	let expandedId = $state<string | null>(null);
	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	const totalCols = $derived(visibleCols.length === 0 ? 2 : 1 + visibleCols.length);
</script>

<div class="mb-2 flex items-center justify-between gap-2">
	<p class="text-xs text-stone-500 dark:text-stone-400">
		Änderungen werden automatisch gespeichert.
	</p>
	<ColumnPicker bind:visible={visibleKeys} />
</div>

<div
	class="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
>
	<table class="w-full text-sm">
		<thead
			class="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
		>
			<tr>
				<th class="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left dark:bg-stone-800">
					Kassette
				</th>
				{#each visibleCols as col (col.key)}
					<th class="whitespace-nowrap px-3 py-2 text-left {col.width}">{col.label}</th>
				{/each}
				{#if visibleCols.length === 0}
					<th class="px-3 py-2 text-left font-normal normal-case text-stone-400">
						Keine Spalten gewählt – über „Spalten“ aktivieren.
					</th>
				{/if}
			</tr>
		</thead>
		<tbody class="divide-y divide-stone-100 dark:divide-stone-800">
			{#each rows as c, i (c.id)}
				{@const cover = coverThumbUrl(c, externalFor(c))}
				<tr class="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
					<td class="sticky left-0 z-10 bg-white px-3 py-2 dark:bg-stone-900">
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => toggleExpand(c.id)}
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
								aria-label="Alle Felder bearbeiten"
								aria-expanded={expandedId === c.id}
							>
								{#if expandedId === c.id}
									<ChevronDown size={16} />
								{:else}
									<ChevronRight size={16} />
								{/if}
							</button>
							<div
								class="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-stone-100 dark:bg-stone-800"
							>
								{#if cover}
									<img src={cover} alt="" loading="lazy" class="h-full w-full object-cover" />
								{:else}
									<div
										class="flex h-full items-center justify-center text-stone-400 dark:text-stone-600"
									>
										<ImageIcon size={16} />
									</div>
								{/if}
							</div>
							<div class="min-w-0">
								<div class="flex items-center gap-1.5">
									{#if c.folgeNr != null}
										<span class="font-mono text-xs text-stone-400">{c.folgeNr}</span>
									{/if}
									<a
										href={`/kassetten/${c.id}`}
										class="max-w-[12rem] truncate font-medium hover:text-brand-600 dark:hover:text-brand-400"
										title={c.titel}
									>
										{c.titel}
									</a>
								</div>
								<div class="truncate text-xs text-stone-400">{c.serie}</div>
							</div>
						</div>
					</td>
					{#each visibleCols as col (col.key)}
						<td class="px-3 py-1.5 {col.width}">
							<EditableCell
								cassetteId={c.id}
								column={col}
								value={c[col.key]}
								options={optionsFor(col)}
								onsaved={(key, canonical) => onsaved(i, key, canonical)}
							/>
						</td>
					{/each}
					{#if visibleCols.length === 0}
						<td></td>
					{/if}
				</tr>
				{#if expandedId === c.id}
					<tr class="bg-stone-50/70 dark:bg-stone-800/30">
						<td colspan={totalCols} class="px-3 py-3">
							<div class="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
								{#each PANEL_COLUMNS as col (col.key)}
									<div class={col.widget === 'textarea' ? 'col-span-full' : ''}>
										<span class="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
											{col.label}
										</span>
										<EditableCell
											cassetteId={c.id}
											column={col}
											value={c[col.key]}
											options={optionsFor(col)}
											onsaved={(key, canonical) => onsaved(i, key, canonical)}
										/>
									</div>
								{/each}
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

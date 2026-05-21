<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandTitle from '$lib/components/BrandTitle.svelte';
	import DiscogsSearch from '$lib/components/DiscogsSearch.svelte';
	import { enhance } from '$app/forms';
	import { formatEur } from '$lib/util/format';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Check from '@lucide/svelte/icons/check';
	import Search from '@lucide/svelte/icons/search';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { SearchResult } from '$lib/server/discogs/types';
	import { parseDiscogsTitle } from '$lib/util/discogs-title';
	import { reveal } from '$lib/actions/reveal';

	let { data, form } = $props();

	type FormDraft = {
		id: string;
		serie: string;
		folgeNr: string;
		titel: string;
		auflageVariante: string;
		jahr: string;
		label: string;
		discogsReleaseId: string;
		discogsUrl: string;
		discogsCoverUrl: string;
		maxPrice: string;
		priority: string;
		notiz: string;
	};

	function emptyDraft(): FormDraft {
		return {
			id: '',
			serie: '',
			folgeNr: '',
			titel: '',
			auflageVariante: '',
			jahr: '',
			label: '',
			discogsReleaseId: '',
			discogsUrl: '',
			discogsCoverUrl: '',
			maxPrice: '',
			priority: '1',
			notiz: ''
		};
	}

	function draftFromEntry(e: (typeof data.entries)[number]): FormDraft {
		return {
			id: e.id,
			serie: e.serie ?? '',
			folgeNr: e.folgeNr != null ? String(e.folgeNr) : '',
			titel: e.titel ?? '',
			auflageVariante: e.auflageVariante ?? '',
			jahr: e.jahr != null ? String(e.jahr) : '',
			label: e.label ?? '',
			discogsReleaseId: e.discogsReleaseId != null ? String(e.discogsReleaseId) : '',
			discogsUrl: e.discogsUrl ?? '',
			discogsCoverUrl: e.discogsCoverUrl ?? '',
			maxPrice: e.maxPriceCent != null ? (e.maxPriceCent / 100).toFixed(2).replace('.', ',') : '',
			priority: String(e.priority ?? 1),
			notiz: e.notiz ?? ''
		};
	}

	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let draft = $state(emptyDraft());
	let submitting = $state(false);
	let showSearch = $state(false);

	function openAdd() {
		editingId = null;
		draft = emptyDraft();
		showForm = true;
	}

	function openEdit(entry: (typeof data.entries)[number]) {
		editingId = entry.id;
		draft = draftFromEntry(entry);
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editingId = null;
		draft = emptyDraft();
	}

	function applyDiscogs(r: SearchResult) {
		draft.discogsReleaseId = String(r.id);
		draft.discogsUrl = r.uri
			? new URL(r.uri, 'https://www.discogs.com').toString()
			: `https://www.discogs.com/release/${r.id}`;
		draft.discogsCoverUrl = r.cover_image ?? r.thumb ?? '';

		// Discogs-Titel in Serie/Folge/Titel zerlegen. Wir überschreiben
		// die User-Eingabe bewusst — wer aus der Suche pickt, will autofill.
		const parsed = parseDiscogsTitle(r.title ?? '');
		if (parsed.serie) draft.serie = parsed.serie;
		if (parsed.folgeNr != null) draft.folgeNr = String(parsed.folgeNr);
		if (parsed.titel) draft.titel = parsed.titel;

		if (r.label?.[0]) draft.label = r.label[0];
		if (r.year) draft.jahr = String(r.year);
		showSearch = false;
	}

	const searchQuery = $derived([draft.serie, draft.folgeNr, draft.titel].filter(Boolean).join(' '));

	function coverThumb(e: (typeof data.entries)[number]): string | null {
		if (e.discogsCoverCachePath) {
			const stem = e.discogsCoverCachePath.replace(/\.[^.]+$/, '');
			return `/uploads/${stem}.thumb.jpg`;
		}
		if (e.discogsCoverUrl) return e.discogsCoverUrl;
		return null;
	}

	function priorityLabel(p: number): string {
		if (p >= 3) return 'Top';
		if (p === 2) return 'Hoch';
		if (p === 1) return 'Normal';
		return 'Niedrig';
	}

	function priorityClass(p: number): string {
		if (p >= 3) return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
		if (p === 2) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
		if (p === 1) return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
		return 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400';
	}
</script>

<AppHeader back="/serien">
	{#snippet children()}
		<span class="flex items-baseline gap-2">
			<BrandTitle />
			<span class="text-stone-400 dark:text-stone-500">·</span>
			<span class="text-stone-700 dark:text-stone-200">Wantlist</span>
		</span>
	{/snippet}
	{#snippet actions()}
		{#if !showForm}
			<button
				type="button"
				onclick={openAdd}
				class="flex h-9 items-center gap-1 rounded-full bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
			>
				<Plus size={16} />
				Neu
			</button>
		{/if}
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl px-4 py-4 pb-32">
	{#if form?.error}
		<p
			class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
		>
			{form.error}
		</p>
	{/if}

	{#if showForm}
		<form
			method="POST"
			action={editingId ? '?/update' : '?/add'}
			use:enhance={() => {
				submitting = true;
				return ({ update }) =>
					update().finally(() => {
						submitting = false;
					});
			}}
			class="mb-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold">
					{editingId ? 'Eintrag bearbeiten' : 'Suche eintragen'}
				</h2>
				<button
					type="button"
					onclick={() => (showSearch = true)}
					class="flex h-8 items-center gap-1 rounded-full border border-emerald-300 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
				>
					<Search size={14} />
					Discogs-Suche
				</button>
			</div>

			{#if editingId}
				<input type="hidden" name="id" value={editingId} />
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Serie</span>
					<input
						type="text"
						name="serie"
						bind:value={draft.serie}
						list="serien-suggest"
						placeholder="z.B. Die drei ???"
						class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Folge</span>
					<input
						type="number"
						name="folgeNr"
						bind:value={draft.folgeNr}
						inputmode="numeric"
						class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
			</div>

			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Titel</span>
				<input
					type="text"
					name="titel"
					bind:value={draft.titel}
					class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>

			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Auflage / Variante</span>
				<input
					type="text"
					name="auflageVariante"
					bind:value={draft.auflageVariante}
					placeholder="z.B. Erstauflage, Picture-Cover, Promo"
					class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>

			<div class="grid gap-3 sm:grid-cols-3">
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Label</span>
					<input
						type="text"
						name="label"
						bind:value={draft.label}
						class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Jahr</span>
					<input
						type="number"
						name="jahr"
						bind:value={draft.jahr}
						inputmode="numeric"
						class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Max. Preis (€)</span>
					<input
						type="text"
						name="maxPriceCent"
						bind:value={draft.maxPrice}
						inputmode="decimal"
						placeholder="z.B. 25,00"
						class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
			</div>

			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Priorität</span>
				<select
					name="priority"
					bind:value={draft.priority}
					class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				>
					<option value="0">Niedrig</option>
					<option value="1">Normal</option>
					<option value="2">Hoch</option>
					<option value="3">Top</option>
				</select>
			</label>

			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Notiz</span>
				<textarea
					name="notiz"
					bind:value={draft.notiz}
					rows="2"
					class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				></textarea>
			</label>

			{#if draft.discogsReleaseId}
				<div
					class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950"
				>
					<div class="flex items-center justify-between gap-2">
						<div class="text-emerald-700 dark:text-emerald-300">
							Discogs Release-ID: <span class="font-mono">{draft.discogsReleaseId}</span>
						</div>
						<button
							type="button"
							onclick={() => {
								draft.discogsReleaseId = '';
								draft.discogsUrl = '';
								draft.discogsCoverUrl = '';
							}}
							class="text-emerald-700 hover:underline dark:text-emerald-300"
						>
							entfernen
						</button>
					</div>
				</div>
				<input type="hidden" name="discogsReleaseId" value={draft.discogsReleaseId} />
				<input type="hidden" name="discogsUrl" value={draft.discogsUrl} />
				<input type="hidden" name="discogsCoverUrl" value={draft.discogsCoverUrl} />
			{/if}

			<div class="flex gap-2 pt-1">
				<button
					type="button"
					onclick={closeForm}
					class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					Abbrechen
				</button>
				<button
					type="submit"
					disabled={submitting}
					class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					{submitting ? 'Speichere…' : editingId ? 'Aktualisieren' : 'Hinzufügen'}
				</button>
			</div>
		</form>
	{/if}

	{#if data.entries.length === 0 && !showForm}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			<Sparkles size={28} class="mx-auto mb-2 text-brand-500" />
			<div class="font-medium text-stone-700 dark:text-stone-200">Noch nichts auf der Suche.</div>
			<p class="mt-1">
				Trage Folgen ein, die du akut suchst — mit optionalem Maximalpreis und Discogs-Link.
			</p>
			<button
				type="button"
				onclick={openAdd}
				class="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
			>
				<Plus size={14} />
				Ersten Eintrag anlegen
			</button>
		</div>
	{:else if data.entries.length > 0}
		<ul class="space-y-2">
			{#each data.entries as entry, i (entry.id)}
				<li
					class="reveal overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
					use:reveal={{ delay: Math.min(i * 50, 320) }}
				>
					<div class="flex gap-3 p-3">
						<div
							class="h-20 w-20 flex-none overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
						>
							{#if coverThumb(entry)}
								<img src={coverThumb(entry)} alt="" class="h-full w-full object-cover" />
							{:else}
								<div class="flex h-full items-center justify-center text-stone-400">
									<ImageIcon size={24} />
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<div class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
										{entry.serie ?? 'Unbekannt'}{entry.folgeNr != null
											? ` · Folge ${entry.folgeNr}`
											: ''}
									</div>
									<div class="truncate font-medium">{entry.titel ?? '—'}</div>
								</div>
								<span
									class={'flex-none rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ' +
										priorityClass(entry.priority)}
								>
									{priorityLabel(entry.priority)}
								</span>
							</div>
							{#if entry.auflageVariante}
								<div class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
									{entry.auflageVariante}
								</div>
							{/if}
							<div
								class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400"
							>
								{#if entry.label}<span>{entry.label}</span>{/if}
								{#if entry.jahr}<span>{entry.jahr}</span>{/if}
								{#if entry.maxPriceCent != null}
									<span class="font-medium text-stone-700 dark:text-stone-300">
										bis {formatEur(entry.maxPriceCent)}
									</span>
								{/if}
								{#if entry.discogsUrl}
									<a
										href={entry.discogsUrl}
										target="_blank"
										rel="noopener"
										class="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300"
									>
										Discogs <ExternalLink size={11} />
									</a>
								{/if}
							</div>
							{#if entry.notiz}
								<div class="mt-1 whitespace-pre-wrap text-xs text-stone-600 dark:text-stone-300">
									{entry.notiz}
								</div>
							{/if}
						</div>
					</div>
					<div class="flex gap-1 border-t border-stone-100 px-2 py-1.5 dark:border-stone-800">
						<form
							method="POST"
							action="?/found"
							use:enhance={() => {
								return ({ update }) => update();
							}}
							class="flex-1"
						>
							<input type="hidden" name="id" value={entry.id} />
							<button
								type="submit"
								class="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
								title="In Sammlung übernehmen"
							>
								<Check size={14} />
								Gefunden!
							</button>
						</form>
						<button
							type="button"
							onclick={() => openEdit(entry)}
							class="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
							aria-label="Bearbeiten"
						>
							<Pencil size={14} />
						</button>
						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								return ({ update }) => update();
							}}
						>
							<input type="hidden" name="id" value={entry.id} />
							<button
								type="submit"
								class="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
								aria-label="Löschen"
							>
								<Trash2 size={14} />
							</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

{#if showSearch}
	<DiscogsSearch
		defaultQuery={searchQuery}
		onpick={applyDiscogs}
		onclose={() => (showSearch = false)}
	/>
{/if}

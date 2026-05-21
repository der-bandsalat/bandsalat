<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CassetteForm, {
		formStateFromCassette,
		formStateFromValues
	} from '$lib/components/CassetteForm.svelte';
	import DiscogsSearch from '$lib/components/DiscogsSearch.svelte';
	import { enhance } from '$app/forms';
	import { formatDate, formatEur, formatRelative } from '$lib/util/format';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import ImageIcon from '@lucide/svelte/icons/image';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import DownloadCloud from '@lucide/svelte/icons/download-cloud';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import StarRating from '$lib/components/StarRating.svelte';
	import { invalidateAll } from '$app/navigation';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import type { SearchResult } from '$lib/server/discogs/types';

	let { data, form } = $props();
	let editing = $state(false);
	let submitting = $state(false);
	let confirmDelete = $state(false);
	let showSearch = $state(false);
	let pullSubmitting = $state(false);
	let pushSubmitting = $state(false);
	let showListenForm = $state(false);
	let listenSubmitting = $state(false);

	const todayIso = new Date().toISOString().slice(0, 10);

	// Inline-Rating: per fetch-Action speichern + invalidieren.
	let ratingSaving = $state(false);
	async function saveRating(next: number | null) {
		ratingSaving = true;
		try {
			const fd = new FormData();
			fd.set('rating', next == null ? '0' : String(next));
			await fetch(`?/setRating`, { method: 'POST', body: fd });
			await invalidateAll();
		} finally {
			ratingSaving = false;
		}
	}

	const c = $derived(data.cassette);

	// svelte-ignore state_referenced_locally
	let formState = $state(
		form?.values ? formStateFromValues(form.values) : formStateFromCassette(c)
	);

	$effect(() => {
		// Wenn server.load nach erfolgreichem update neue Daten liefert, FormState zurücksetzen.
		if (!editing) formState = formStateFromCassette(c);
	});

	const searchQuery = $derived(
		[formState.serie, formState.folgeNr, formState.titel].filter(Boolean).join(' ')
	);

	function applyDiscogs(r: SearchResult) {
		formState.discogsReleaseId = String(r.id);
		formState.discogsUrl = r.uri
			? new URL(r.uri, 'https://www.discogs.com').toString()
			: `https://www.discogs.com/release/${r.id}`;
		formState.discogsCoverUrl = r.cover_image ?? r.thumb ?? '';
		if (!formState.label && r.label?.[0]) formState.label = r.label[0];
		if (!formState.jahr && r.year) formState.jahr = String(r.year);
		showSearch = false;
	}

	import {
		coverThumbUrl as coverThumb,
		coverFullUrl as coverFull,
		availableCoverSources,
		type ExternalCoverPaths
	} from '$lib/util/cover';

	const externalCover = $derived<ExternalCoverPaths | null>(
		data.folgeCover
			? { original: data.folgeCover.cachePath, thumb: data.folgeCover.thumbPath }
			: null
	);
	const coverThumbStr = $derived(coverThumb(c, externalCover));
	const coverFullStr = $derived(coverFull(c, externalCover));
	const coverSources = $derived(availableCoverSources(c, externalCover));

	// Lightbox-Modal anstelle von target="_blank" (das schmiss dich aus
	// der PWA auf Mobile).
	let lightboxOpen = $state(false);
	function openLightbox() {
		if (!coverFullStr) return;
		lightboxOpen = true;
	}
	function closeLightbox() {
		lightboxOpen = false;
	}

	// Klappentext-Editor State
	let synopsisEditOpen = $state(false);
	let synopsisDraft = $state('');
	let fetchingSynopsis = $state(false);
	let fetchingCover = $state(false);
</script>

<AppHeader back="/kassetten">
	{#snippet children()}
		<span class="truncate">{c.serie}{c.folgeNr != null ? ` · ${c.folgeNr}` : ''}</span>
	{/snippet}
	{#snippet actions()}
		{#if !editing}
			<button
				type="button"
				onclick={() => (editing = true)}
				class="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
			>
				<Pencil size={16} />
				Bearbeiten
			</button>
		{:else}
			<button
				type="button"
				onclick={() => (editing = false)}
				class="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			>
				<Eye size={16} />
				Ansehen
			</button>
		{/if}
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl px-4 py-4 pb-32">
	{#if editing}
		<form
			method="POST"
			action="?/save"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return ({ update }) => update().finally(() => (submitting = false));
			}}
		>
			<CassetteForm
				serien={data.serien}
				labels={data.labels}
				folders={data.folders}
				mediaGrades={data.mediaGrades}
				sleeveGrades={data.sleeveGrades}
				enabledFormats={data.enabledFormats}
				bind:formState
				fieldErrors={form?.fieldErrors}
				onSearchDiscogs={() => (showSearch = true)}
			/>

			{#if c.coverFotoPath}
				<label
					class="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
				>
					<input
						type="checkbox"
						name="removePhoto"
						class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
					/>
					Foto entfernen
				</label>
			{/if}

			{#if form?.error}
				<p
					class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
				>
					{form.error}
				</p>
			{/if}

			<div
				class="fixed inset-x-0 z-10 mx-auto max-w-2xl px-4 pb-2 pt-2 backdrop-blur-md"
				style="bottom: calc(4.5rem + env(safe-area-inset-bottom))"
			>
				<div
					class="flex gap-2 rounded-xl border border-stone-200 bg-white/90 p-2 shadow-lg dark:border-stone-800 dark:bg-stone-950/90"
				>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="flex-1 rounded-lg border border-stone-300 px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
					>
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
					>
						<Save size={16} />
						Speichern
					</button>
				</div>
			</div>
		</form>
	{:else}
		<article class="space-y-4">
			<div
				class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
			>
				<div class="aspect-square bg-stone-100 dark:bg-stone-800">
					{#if coverFullStr}
						<button
							type="button"
							onclick={openLightbox}
							class="block h-full w-full"
							aria-label="Cover vergrößern"
						>
							<img src={coverThumbStr} alt={c.titel} class="h-full w-full object-cover" />
						</button>
					{:else}
						<div class="flex h-full items-center justify-center text-stone-400 dark:text-stone-600">
							<ImageIcon size={48} />
						</div>
					{/if}
				</div>

				{#if coverSources.length > 0 || data.dreiSupported}
					<div class="border-t border-stone-100 px-3 py-2 dark:border-stone-800">
						<div
							class="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
						>
							Cover-Quelle
						</div>
						<div class="flex flex-wrap gap-1">
							<form
								method="POST"
								action="?/setCoverSource"
								use:enhance={() => {
									return ({ update }) => update();
								}}
							>
								<input type="hidden" name="source" value="auto" />
								<button
									type="submit"
									class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
									class:border-brand-500={c.coverSource === 'auto'}
									class:bg-brand-50={c.coverSource === 'auto'}
									class:text-brand-700={c.coverSource === 'auto'}
									class:dark:bg-brand-950={c.coverSource === 'auto'}
									class:dark:text-brand-300={c.coverSource === 'auto'}
									class:border-stone-300={c.coverSource !== 'auto'}
									class:text-stone-600={c.coverSource !== 'auto'}
									class:dark:border-stone-700={c.coverSource !== 'auto'}
									class:dark:text-stone-300={c.coverSource !== 'auto'}
								>
									Auto
								</button>
							</form>
							{#each coverSources as src (src.id)}
								<form
									method="POST"
									action="?/setCoverSource"
									use:enhance={() => {
										return ({ update }) => update();
									}}
								>
									<input type="hidden" name="source" value={src.id} />
									<button
										type="submit"
										class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
										class:border-brand-500={c.coverSource === src.id}
										class:bg-brand-50={c.coverSource === src.id}
										class:text-brand-700={c.coverSource === src.id}
										class:dark:bg-brand-950={c.coverSource === src.id}
										class:dark:text-brand-300={c.coverSource === src.id}
										class:border-stone-300={c.coverSource !== src.id}
										class:text-stone-600={c.coverSource !== src.id}
										class:dark:border-stone-700={c.coverSource !== src.id}
										class:dark:text-stone-300={c.coverSource !== src.id}
									>
										{src.label}
									</button>
								</form>
							{/each}
							<form
								method="POST"
								action="?/uploadCoverPhoto"
								enctype="multipart/form-data"
								use:enhance={() => {
									return ({ update }) => update();
								}}
							>
								<label
									class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
								>
									+ Foto hochladen
									<input
										type="file"
										name="photo"
										accept="image/*"
										capture="environment"
										onchange={(e) => {
											const t = e.currentTarget as HTMLInputElement;
											if (t.files && t.files.length > 0) t.form?.requestSubmit();
										}}
										class="hidden"
									/>
								</label>
							</form>
							{#if c.coverFotoPath}
								<form
									method="POST"
									action="?/removeCoverPhoto"
									use:enhance={() => {
										return ({ update }) => update();
									}}
								>
									<button
										type="submit"
										class="rounded-full px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
										title="Eigenes Foto entfernen"
									>
										Foto entfernen
									</button>
								</form>
							{/if}
							{#if data.dreiSupported && !data.folgeCover}
								<form
									method="POST"
									action="?/fetchFolgeCoverFromDreimetadaten"
									use:enhance={() => {
										fetchingCover = true;
										return ({ update }) => update().finally(() => (fetchingCover = false));
									}}
								>
									<button
										type="submit"
										disabled={fetchingCover}
										class="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
									>
										{fetchingCover ? '…' : '+ dreimetadaten holen'}
									</button>
								</form>
							{/if}
							{#if data.folgeCover}
								<form
									method="POST"
									action="?/clearFolgeCover"
									use:enhance={() => {
										return ({ update }) => update();
									}}
									class="ml-auto"
								>
									<button
										type="submit"
										class="rounded-full px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
										title="Folge-Cover entfernen"
									>
										Folge-Cover entfernen
									</button>
								</form>
							{/if}
						</div>
						{#if form?.coverError}
							<p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{form.coverError}</p>
						{/if}
					</div>
				{/if}
				<div class="space-y-1 p-4">
					<div
						class="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400"
					>
						{c.serie}{c.folgeNr != null ? ` · Folge ${c.folgeNr}` : ''}{c.folgeNrLabel
							? ` (${c.folgeNrLabel})`
							: ''}
					</div>
					<h1 class="text-xl font-semibold leading-tight">{c.titel}</h1>
					{#if c.label || c.jahr}
						<div class="text-sm text-stone-500 dark:text-stone-400">
							{c.label ?? ''}{c.label && c.jahr ? ' · ' : ''}{c.jahr ?? ''}
						</div>
					{/if}
				</div>
			</div>

			<dl class="grid grid-cols-2 gap-2 text-sm">
				<div
					class="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
				>
					<dt class="text-xs text-stone-500 dark:text-stone-400">Zustand MC</dt>
					<dd>{c.zustandMc ?? '—'}</dd>
				</div>
				<div
					class="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
				>
					<dt class="text-xs text-stone-500 dark:text-stone-400">Zustand Hülle</dt>
					<dd>{c.zustandHuelle ?? '—'}</dd>
				</div>
				<div
					class="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
				>
					<dt class="text-xs text-stone-500 dark:text-stone-400">Originalhülle</dt>
					<dd>{c.originalhuelle ? 'ja' : 'nein'}</dd>
				</div>
				<div
					class="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
				>
					<dt class="text-xs text-stone-500 dark:text-stone-400">Vollständig</dt>
					<dd>{c.vollstaendig ? 'ja' : 'nein'}</dd>
				</div>
				{#if c.auflageVariante}
					<div
						class="col-span-2 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
					>
						<dt class="text-xs text-stone-500 dark:text-stone-400">Auflage / Variante</dt>
						<dd>{c.auflageVariante}</dd>
					</div>
				{/if}
				{#if c.seriennummer}
					<div
						class="col-span-2 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
					>
						<dt class="text-xs text-stone-500 dark:text-stone-400">Seriennummer</dt>
						<dd class="font-mono">{c.seriennummer}</dd>
					</div>
				{/if}
				{#if c.kaufdatum || c.kaufpreisCent || c.kaufort}
					<div
						class="col-span-2 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
					>
						<dt class="text-xs text-stone-500 dark:text-stone-400">Kauf</dt>
						<dd>
							{formatDate(c.kaufdatum)}
							{#if c.kaufpreisCent != null}
								· {formatEur(c.kaufpreisCent)}{/if}
							{#if c.kaufort}
								· {c.kaufort}{/if}
						</dd>
					</div>
				{/if}
				{#if c.discogsReleaseId}
					<div
						class="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950"
					>
						<dt class="text-xs text-emerald-700 dark:text-emerald-300">Discogs</dt>
						<dd class="flex items-center justify-between gap-2">
							<span>Release-ID: <span class="font-mono">{c.discogsReleaseId}</span></span>
							{#if c.discogsUrl}
								<a
									href={c.discogsUrl}
									target="_blank"
									rel="noopener"
									class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
								>
									Öffnen <ExternalLink size={14} />
								</a>
							{/if}
						</dd>
						{#if c.discogsSyncedAt}
							<div class="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
								Zuletzt synchronisiert: {formatRelative(c.discogsSyncedAt)}
							</div>
						{/if}
					</div>
				{/if}
			</dl>

			<div
				class="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
			>
				<div class="mb-2 flex items-center justify-between gap-2">
					<span class="text-xs text-stone-500 dark:text-stone-400">
						Bewertung{ratingSaving ? ' · speichere…' : ''}
					</span>
					{#if c.rating != null}
						<button
							type="button"
							onclick={() => saveRating(null)}
							class="text-xs text-stone-400 hover:text-rose-500"
							title="Bewertung zurücksetzen"
						>
							zurücksetzen
						</button>
					{/if}
				</div>
				<StarRating value={c.rating} size={28} onchange={saveRating} />
				{#if c.review}
					<div class="mt-3 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{c.review}</div>
				{/if}
				{#if form?.ratingError}
					<p class="mt-2 text-xs text-rose-600 dark:text-rose-400">{form.ratingError}</p>
				{/if}
			</div>

			{#if c.notiz}
				<div
					class="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
				>
					<div class="mb-1 text-xs text-stone-500 dark:text-stone-400">Notiz</div>
					<div class="whitespace-pre-wrap">{c.notiz}</div>
				</div>
			{/if}

			{#if c.folgeNr != null}
				<section
					class="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
				>
					<div class="mb-2 flex items-center justify-between gap-2">
						<span class="text-xs font-medium text-stone-500 dark:text-stone-400">Klappentext</span>
						{#if data.folgeSynopsis}
							<div class="flex items-center gap-1.5 text-[10px]">
								<span
									class="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
								>
									{data.folgeSynopsis.source}
								</span>
								{#if data.folgeSynopsis.sourceUrl}
									<a
										href={data.folgeSynopsis.sourceUrl}
										target="_blank"
										rel="noopener"
										class="text-emerald-700 hover:underline dark:text-emerald-300">Quelle</a
									>
								{/if}
								<form
									method="POST"
									action="?/clearSynopsis"
									use:enhance={() => {
										return ({ update }) => update();
									}}
								>
									<button
										type="submit"
										class="text-stone-400 hover:text-rose-500"
										title="Klappentext entfernen"
									>
										entfernen
									</button>
								</form>
							</div>
						{/if}
					</div>

					{#if data.folgeSynopsis && !synopsisEditOpen}
						<div class="whitespace-pre-wrap text-stone-700 dark:text-stone-300">
							{data.folgeSynopsis.text}
						</div>
						<button
							type="button"
							onclick={() => {
								synopsisDraft = data.folgeSynopsis?.text ?? '';
								synopsisEditOpen = true;
							}}
							class="mt-2 text-[11px] text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
						>
							Bearbeiten
						</button>
					{:else if synopsisEditOpen}
						<form
							method="POST"
							action="?/setSynopsisManual"
							use:enhance={() => {
								return ({ update }) =>
									update().finally(() => {
										synopsisEditOpen = false;
									});
							}}
							class="space-y-2"
						>
							<textarea
								name="text"
								bind:value={synopsisDraft}
								rows="6"
								required
								minlength="5"
								maxlength="5000"
								class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
							></textarea>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={() => (synopsisEditOpen = false)}
									class="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 dark:border-stone-700 dark:text-stone-200"
								>
									Abbrechen
								</button>
								<button
									type="submit"
									class="flex-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
								>
									Speichern
								</button>
							</div>
						</form>
					{:else}
						<div class="flex flex-wrap gap-1">
							{#if data.dreiSupported}
								<form
									method="POST"
									action="?/fetchSynopsisFromDreimetadaten"
									use:enhance={() => {
										fetchingSynopsis = true;
										return ({ update }) => update().finally(() => (fetchingSynopsis = false));
									}}
								>
									<button
										type="submit"
										disabled={fetchingSynopsis}
										class="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
									>
										{fetchingSynopsis ? '…' : 'dreimetadaten.de'}
									</button>
								</form>
							{/if}
							{#if c.discogsReleaseId}
								<form
									method="POST"
									action="?/fetchSynopsisFromDiscogs"
									use:enhance={() => {
										fetchingSynopsis = true;
										return ({ update }) => update().finally(() => (fetchingSynopsis = false));
									}}
								>
									<button
										type="submit"
										disabled={fetchingSynopsis}
										class="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
									>
										Discogs-Notes
									</button>
								</form>
							{/if}
							<button
								type="button"
								onclick={() => {
									synopsisDraft = '';
									synopsisEditOpen = true;
								}}
								class="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
							>
								Manuell eintragen
							</button>
						</div>
					{/if}

					{#if form?.synopsisError}
						<p class="mt-2 text-xs text-rose-600 dark:text-rose-400">{form.synopsisError}</p>
					{/if}
				</section>
			{/if}

			<section
				class="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-900"
			>
				<div class="mb-2 flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<Headphones size={16} class="text-brand-500" />
						<span class="font-medium">Hör-Protokoll</span>
						{#if data.listenStats.count > 0}
							<span
								class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
							>
								{data.listenStats.count}× gehört
							</span>
						{/if}
					</div>
					{#if !showListenForm}
						<button
							type="button"
							onclick={() => (showListenForm = true)}
							class="flex h-8 items-center gap-1 rounded-full bg-brand-500 px-3 text-xs font-medium text-white hover:bg-brand-600"
						>
							<Plus size={14} />
							Anhören eintragen
						</button>
					{/if}
				</div>

				{#if data.listenStats.lastListenedAt && !showListenForm}
					<div class="mb-2 text-xs text-stone-500 dark:text-stone-400">
						Zuletzt gehört: {formatRelative(data.listenStats.lastListenedAt)}
					</div>
				{/if}

				{#if showListenForm}
					<form
						method="POST"
						action="?/addListen"
						use:enhance={() => {
							listenSubmitting = true;
							return ({ update }) =>
								update().finally(() => {
									listenSubmitting = false;
									showListenForm = false;
								});
						}}
						class="mb-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
					>
						<label class="block">
							<span class="text-xs text-stone-500 dark:text-stone-400">Datum</span>
							<input
								type="date"
								name="listened_at"
								value={todayIso}
								max={todayIso}
								class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							/>
						</label>
						<label class="block">
							<span class="text-xs text-stone-500 dark:text-stone-400">Notiz (optional)</span>
							<textarea
								name="note"
								rows="2"
								maxlength="500"
								placeholder="z.B. Mit Kindern gehört, alte Erinnerungen…"
								class="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							></textarea>
						</label>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={() => (showListenForm = false)}
								class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
							>
								Abbrechen
							</button>
							<button
								type="submit"
								disabled={listenSubmitting}
								class="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
							>
								{listenSubmitting ? 'Speichere…' : 'Eintragen'}
							</button>
						</div>
					</form>
				{/if}

				{#if form?.listenError}
					<p
						class="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
					>
						{form.listenError}
					</p>
				{/if}

				{#if data.listens.length > 0}
					<ul class="space-y-1">
						{#each data.listens as listen (listen.id)}
							<li
								class="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
							>
								<div class="min-w-0 flex-1">
									<div class="text-sm">
										{formatDate(listen.listenedAt)}
										<span class="text-xs text-stone-400 dark:text-stone-500">
											· {formatRelative(listen.listenedAt)}
										</span>
									</div>
									{#if listen.note}
										<div
											class="mt-0.5 whitespace-pre-wrap text-xs text-stone-600 dark:text-stone-300"
										>
											{listen.note}
										</div>
									{/if}
								</div>
								<form
									method="POST"
									action="?/deleteListen"
									use:enhance={() => {
										return ({ update }) => update();
									}}
								>
									<input type="hidden" name="id" value={listen.id} />
									<button
										type="submit"
										aria-label="Eintrag löschen"
										class="rounded-full p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
									>
										<X size={14} />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else if !showListenForm}
					<div
						class="rounded-lg border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400"
					>
						Noch nicht angehört.
					</div>
				{/if}
			</section>

			{#if c.discogsReleaseId}
				<div class="space-y-2">
					<form
						method="POST"
						action="?/pullFromDiscogs"
						use:enhance={() => {
							pullSubmitting = true;
							return ({ update }) => update().finally(() => (pullSubmitting = false));
						}}
						class="grid gap-2 sm:grid-cols-2"
					>
						<button
							type="submit"
							disabled={pullSubmitting}
							class="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
							title="Füllt nur leere Felder, lässt manuell gesetzte Werte unverändert"
						>
							<DownloadCloud size={16} />
							{pullSubmitting ? 'Lade…' : 'Fehlende Felder füllen'}
						</button>
						<button
							type="submit"
							name="override"
							value="on"
							disabled={pullSubmitting}
							class="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
							title="Überschreibt alle Felder mit den aktuellen Daten von Discogs"
						>
							<RefreshCw size={16} />
							{pullSubmitting ? 'Synce…' : 'Komplett neu laden'}
						</button>
					</form>

					{#if c.discogsInstanceId}
						<form
							method="POST"
							action="?/removeFromDiscogs"
							use:enhance={() => {
								pushSubmitting = true;
								return ({ update }) => update().finally(() => (pushSubmitting = false));
							}}
						>
							<button
								type="submit"
								disabled={pushSubmitting}
								class="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
							>
								<CloudOff size={16} />
								{pushSubmitting ? 'Entferne…' : 'Aus Discogs-Sammlung entfernen'}
							</button>
						</form>
					{:else}
						<form
							method="POST"
							action="?/pushToDiscogs"
							use:enhance={() => {
								pushSubmitting = true;
								return ({ update }) => update().finally(() => (pushSubmitting = false));
							}}
						>
							<button
								type="submit"
								disabled={pushSubmitting}
								class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
							>
								<UploadCloud size={16} />
								{pushSubmitting ? 'Pushe…' : 'Zu Discogs-Sammlung pushen'}
							</button>
						</form>
					{/if}
				</div>

				{#if form?.discogsError}
					<p
						class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
					>
						{form.discogsError}
					</p>
				{/if}
			{/if}

			<div class="rounded-xl px-3 py-2 text-xs text-stone-500 dark:text-stone-400">
				Erfasst {formatRelative(c.createdAt)}, zuletzt aktualisiert {formatRelative(c.updatedAt)}.
			</div>

			<div class="pt-2">
				{#if !confirmDelete}
					<button
						type="button"
						onclick={() => (confirmDelete = true)}
						class="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-400 dark:hover:bg-rose-950"
					>
						<Trash2 size={16} />
						Eintrag löschen
					</button>
				{:else}
					<form method="POST" action="?/delete" class="flex gap-2">
						<button
							type="button"
							onclick={() => (confirmDelete = false)}
							class="flex-1 rounded-xl border border-stone-300 px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
						>
							Abbrechen
						</button>
						<button
							type="submit"
							class="flex-1 rounded-xl bg-rose-600 px-3 py-3 text-sm font-medium text-white hover:bg-rose-700"
						>
							Wirklich löschen
						</button>
					</form>
				{/if}
			</div>
		</article>
	{/if}
</main>

{#if showSearch}
	<DiscogsSearch
		defaultQuery={searchQuery}
		onpick={applyDiscogs}
		onclose={() => (showSearch = false)}
	/>
{/if}

{#if lightboxOpen && coverFullStr}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-4"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
		tabindex="-1"
		role="dialog"
		aria-label="Cover-Vorschau"
	>
		<button
			type="button"
			onclick={closeLightbox}
			class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
			aria-label="Schließen"
		>
			<X size={20} />
		</button>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<img
			src={coverFullStr}
			alt={c.titel}
			class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		/>
	</div>
{/if}

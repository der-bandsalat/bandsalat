<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CassetteForm, {
		emptyFormState,
		formStateFromValues
	} from '$lib/components/CassetteForm.svelte';
	import DiscogsSearch from '$lib/components/DiscogsSearch.svelte';
	import PhotoScanner, { type ScanPayload } from '$lib/components/PhotoScanner.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from '$lib/util/toast.svelte';
	import type { SearchResult } from '$lib/server/discogs/types';
	import Save from '@lucide/svelte/icons/save';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Camera from '@lucide/svelte/icons/camera';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let { data, form } = $props();
	let submitting = $state(false);
	let showSearch = $state(false);
	let showScanner = $state(false);
	let scannedPhotoFile = $state<File | null>(null);
	let scanInfo = $state<string | null>(null);

	const preselectSerie = page.url.searchParams.get('serie') ?? '';
	const preselectFolgeNr = page.url.searchParams.get('folgeNr') ?? '';
	const preselectAuflageId = page.url.searchParams.get('auflageId') ?? '';
	const preselectDiscogsId = page.url.searchParams.get('discogsReleaseId') ?? '';
	const preselectDiscogsUrl = page.url.searchParams.get('discogsUrl') ?? '';
	const preselectDiscogsCover = page.url.searchParams.get('discogsCoverUrl') ?? '';
	const preselectAuflageName = page.url.searchParams.get('auflageVariante') ?? '';

	function buildInitialState() {
		if (form?.values) return formStateFromValues(form.values);
		const fs = emptyFormState();
		if (preselectSerie) fs.serie = preselectSerie;
		if (preselectFolgeNr) fs.folgeNr = preselectFolgeNr;
		if (preselectAuflageId) fs.auflageId = preselectAuflageId;
		if (preselectDiscogsId) fs.discogsReleaseId = preselectDiscogsId;
		if (preselectDiscogsUrl) fs.discogsUrl = preselectDiscogsUrl;
		if (preselectDiscogsCover) fs.discogsCoverUrl = preselectDiscogsCover;
		if (preselectAuflageName) fs.auflageVariante = preselectAuflageName;
		return fs;
	}

	let formState = $state(buildInitialState());

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

	function applyScan(payload: ScanPayload) {
		const e = payload.extracted;
		if (e.serie) formState.serie = e.serie;
		if (e.folge_nr != null) formState.folgeNr = String(e.folge_nr);
		if (e.folge_label) formState.folgeNrLabel = e.folge_label;
		if (e.titel) formState.titel = e.titel;
		if (e.label) formState.label = e.label;
		if (e.jahr != null) formState.jahr = String(e.jahr);
		if (e.seriennummer) formState.seriennummer = e.seriennummer;
		if (e.huellen_zustand) formState.zustandHuelle = e.huellen_zustand;
		if (e.auflage_variante) formState.auflageVariante = e.auflage_variante;
		if (e.notiz) formState.notiz = e.notiz;

		if (payload.discogsPick) applyDiscogs(payload.discogsPick);

		if (payload.photoBlob instanceof File) {
			scannedPhotoFile = payload.photoBlob;
			scanInfo = `Foto aufgenommen (${(payload.photoBlob.size / 1024).toFixed(0)} KiB) — wird beim Speichern mitgesendet.`;
		} else if (payload.photoBlob) {
			scannedPhotoFile = new File([payload.photoBlob], 'scan.jpg', { type: 'image/jpeg' });
			scanInfo = 'Foto wird beim Speichern mitgesendet.';
		}

		showScanner = false;
	}
</script>

<AppHeader title="Neue Kassette" back="/kassetten" />

<main class="mx-auto max-w-2xl px-4 py-4 pb-32">
	<button
		type="button"
		onclick={() => (showScanner = true)}
		class="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-gradient-to-br from-brand-50 to-white px-4 py-3 text-sm font-semibold text-brand-700 transition active:scale-[0.99] hover:border-brand-400 hover:bg-brand-50 dark:border-brand-800 dark:from-brand-950/40 dark:to-stone-900 dark:text-brand-300 dark:hover:border-brand-600"
	>
		<Camera size={18} />
		Cover scannen
		<span
			class="ml-1 inline-flex items-center gap-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-medium text-white"
		>
			<Sparkles size={10} />
			KI
		</span>
	</button>

	{#if scanInfo}
		<p
			class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
		>
			{scanInfo}
		</p>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			if (scannedPhotoFile) {
				const existing = formData.get('photo');
				if (!(existing instanceof File) || existing.size === 0) {
					formData.set('photo', scannedPhotoFile);
				}
			}
			const action = formData.get('action');
			const submittedSerie = formData.get('serie');
			const submittedTitel = formData.get('titel');
			submitting = true;
			return ({ result, update }) => {
				return update().then(() => {
					submitting = false;
					if (result.type === 'redirect') {
						if (action === 'save_and_next') {
							// Form hart zurücksetzen — sonst gleicher Eintrag bei Re-Klick → Duplikat.
							const fs = emptyFormState();
							if (typeof submittedSerie === 'string') fs.serie = submittedSerie;
							formState = fs;
							scannedPhotoFile = null;
							scanInfo = null;
							const label =
								typeof submittedTitel === 'string' && submittedTitel.trim()
									? submittedTitel.trim()
									: 'Eintrag';
							toast.push(`„${label}" gespeichert`, { tone: 'success' });
						}
					}
				});
			};
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
					type="submit"
					name="action"
					value="save"
					disabled={submitting}
					class="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-stone-300 px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
					title="Speichern und zum Detail springen"
				>
					<Save size={16} />
				</button>
				<button
					type="submit"
					name="action"
					value="save_and_next"
					disabled={submitting}
					class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					Speichern & nächste
					<ArrowRight size={16} />
				</button>
			</div>
		</div>
	</form>
</main>

{#if showSearch}
	<DiscogsSearch
		defaultQuery={searchQuery}
		onpick={applyDiscogs}
		onclose={() => (showSearch = false)}
	/>
{/if}

{#if showScanner}
	<PhotoScanner onpick={applyScan} onclose={() => (showScanner = false)} />
{/if}

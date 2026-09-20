<script lang="ts" module>
	import type { SearchResult } from '$lib/server/discogs/types';
	import type { DuplicatePayload } from '$lib/server/scan-duplicates';

	export interface ScannedMetadata {
		serie?: string;
		folge_nr?: number;
		folge_label?: string;
		titel?: string;
		label?: string;
		jahr?: number;
		seriennummer?: string;
		huellen_zustand?: string;
		auflage_variante?: string;
		notiz?: string;
		format?: string;
	}

	/** Dubletten-Kandidat — identisch zum Server-Payload. */
	export type ScannedDuplicate = DuplicatePayload;

	export interface ScanPayload {
		extracted: ScannedMetadata;
		discogsPick: SearchResult | null;
		photoBlob: Blob | null;
	}
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import X from '@lucide/svelte/icons/x';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Loader2 from '@lucide/svelte/icons/loader-circle';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Check from '@lucide/svelte/icons/check';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Crop from '@lucide/svelte/icons/crop';
	import Search from '@lucide/svelte/icons/search';
	import PhotoCropModal from './PhotoCropModal.svelte';
	import { formatFromDiscogs } from './CassetteForm.svelte';
	import { formatEur } from '$lib/util/format';
	import { downscaleImage } from '$lib/util/image';
	import { parseDiscogsTitle } from '$lib/util/discogs-title';
	import { parseFolgeNr } from '$lib/util/folge';
	import {
		fmtSearchHit,
		searchDiscogsReleases,
		type DiscogsFormatChoice
	} from '$lib/util/discogs-search';
	import { FORMAT_SHORT } from '$lib/format';

	type Props = {
		onpick: (payload: ScanPayload) => void;
		onclose: () => void;
		/** Bekannte Serien für die Autovervollständigung im Serie-Feld. */
		serien?: string[];
	};

	let { onpick, onclose, serien = [] }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let previewUrl = $state<string | null>(null);
	let photoFile = $state<File | null>(null);
	let scanning = $state(false);
	let error = $state<string | null>(null);
	let extracted = $state<ScannedMetadata | null>(null);
	let model = $state<string | null>(null);
	let tokens = $state<{ input: number; output: number } | null>(null);

	// Editierbare Kopie der KI-Felder. Die KI liest z.B. „DiE DR3i" gern als
	// „Die drei ???" — der Nutzer muss das HIER korrigieren können, bevor die
	// Discogs-Suche und der Dubletten-Check mit dem falschen Namen laufen.
	const emptyFields = () => ({
		serie: '',
		folge: '',
		titel: '',
		label: '',
		jahr: '',
		seriennummer: ''
	});
	let fields = $state(emptyFields());
	const jahrInvalid = $derived(fields.jahr.trim() !== '' && !/^\d{4}$/.test(fields.jahr.trim()));

	// ---- Discogs-Suche im Scanner --------------------------------------------
	// Suchbegriff = abgeleitet aus Serie/Folge/Titel, bis der Nutzer ihn selbst
	// anfasst (manualQuery); „aus Feldern übernehmen" setzt ihn wieder zurück.
	let discogsEnabled = $state(false);
	let discogsHits = $state<SearchResult[]>([]);
	let pickedDiscogs = $state<SearchResult | null>(null);
	let manualQuery = $state<string | null>(null);
	let discogsFormat = $state<DiscogsFormatChoice>('Cassette');
	let discogsLoading = $state(false);
	let discogsError = $state<string | null>(null);
	let discogsNote = $state<string | null>(null);
	let discogsAbort: AbortController | null = null;
	/** Suchbegriff, zu dem die aktuellen Treffer gehören (Server-Match oder letzte Suche). */
	let hitsQuery = $state('');

	const fieldQuery = $derived(
		[fields.serie, fields.folge, fields.titel]
			.map((v) => v.trim())
			.filter(Boolean)
			.join(' ')
	);
	const discogsQuery = $derived(manualQuery ?? fieldQuery);
	const queryDiverged = $derived(manualQuery !== null && manualQuery !== fieldQuery);
	/** Treffer passen nicht mehr zum aktuellen Suchbegriff → Hinweis „neu suchen". */
	const hitsStale = $derived(discogsHits.length > 0 && discogsQuery.trim() !== hitsQuery);

	const pickedPreview = $derived(pickedDiscogs ? parseDiscogsTitle(pickedDiscogs.title) : null);
	const pickedFormat = $derived(pickedDiscogs ? formatFromDiscogs(pickedDiscogs.format) : null);

	// Serie/Folge/Titel korrigiert → ein (auto-)gewählter Discogs-Treffer stammt
	// noch von den FALSCHEN KI-Werten und würde die Korrektur beim Übernehmen
	// wieder überschreiben. Deshalb Auswahl aufheben; der Nutzer sucht neu
	// oder tippt einen Treffer bewusst wieder an.
	function onKeyFieldEdit() {
		pickedDiscogs = null;
	}

	function reset() {
		photoFile = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		extracted = null;
		fields = emptyFields();
		discogsHits = [];
		pickedDiscogs = null;
		manualQuery = null;
		hitsQuery = '';
		discogsError = null;
		discogsNote = null;
		discogsAbort?.abort();
		discogsLoading = false;
		dupAbort?.abort();
		dupCache.clear();
		dupPending = false;
		dupError = null;
		duplicates = [];
		duplicateAcknowledged = false;
		error = null;
		model = null;
		tokens = null;
	}

	function fmtPrice(cents: number | null, currency: string | null): string {
		if (cents == null) return '—';
		if (!currency || currency === 'EUR') return formatEur(cents);
		return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
	}

	// Schutz gegen schnelle Doppel-Auswahl: nur die jüngste Auswahl gewinnt,
	// sonst überschreibt ein noch laufendes Downscale der ersten Datei den
	// State der zweiten.
	let pickEpoch = 0;
	async function onFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		const myPick = ++pickEpoch;
		reset();
		// Downscale vor allem Weiteren: kleinerer Scan-Upload, flüssigeres
		// Croppen, und das gespeicherte Foto bleibt unterm 12-MiB-Limit.
		const small = await downscaleImage(file);
		if (myPick !== pickEpoch) return;
		photoFile = small;
		previewUrl = URL.createObjectURL(photoFile);
		void scan();
	}

	/** Läuft nur direkt nach reset() (onFileChange) — State ist dann schon leer. */
	async function scan() {
		if (!photoFile) return;
		scanning = true;
		try {
			const form = new FormData();
			form.append('photo', photoFile);
			// Timeout gegen "lädt endlos" bei hängender Vision-API / Funkloch.
			const res = await fetch('/api/scan', {
				method: 'POST',
				body: form,
				signal: AbortSignal.timeout(90_000)
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				error = body?.error ?? body?.message ?? `Scan fehlgeschlagen (${res.status}).`;
				return;
			}
			const ex: ScannedMetadata = body.extracted ?? {};
			// Server hat Dubletten für genau diese Anfrage geprüft → Cache füllen,
			// bevor Felder/Treffer gesetzt werden und der Effekt läuft.
			const dups: ScannedDuplicate[] = body.duplicates ?? [];
			if (body.duplicatesQuery) dupCache.set(dupKeyOf(body.duplicatesQuery), dups);
			extracted = ex;
			fields = {
				serie: ex.serie ?? '',
				folge: ex.folge_nr != null ? String(ex.folge_nr) : (ex.folge_label ?? ''),
				titel: ex.titel ?? '',
				label: ex.label ?? '',
				jahr: ex.jahr != null ? String(ex.jahr) : '',
				seriennummer: ex.seriennummer ?? ''
			};
			discogsEnabled = Boolean(body.discogs?.enabled);
			discogsHits = body.discogs?.hits ?? [];
			discogsError = body.discogs?.error ?? null;
			// Server sucht mit serie + folge_nr + titel der KI — entspricht fieldQuery
			// direkt nach dem Scan.
			hitsQuery = [ex.serie, ex.folge_nr?.toString(), ex.titel]
				.filter((v): v is string => Boolean(v && v.trim()))
				.join(' ');
			pickedDiscogs = discogsHits.length === 1 ? discogsHits[0] : null;
			duplicates = dups;
			model = body.model;
			tokens = body.tokens;
		} catch (e) {
			if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
				error = 'Scan hat zu lange gedauert — bitte erneut versuchen.';
			} else {
				error = e instanceof Error ? e.message : 'Netzwerk-Fehler.';
			}
		} finally {
			scanning = false;
		}
	}

	/** Manuelle Discogs-Suche mit dem (ggf. korrigierten) Suchbegriff. */
	async function searchDiscogs() {
		const q = discogsQuery.trim();
		if (q.length < 2) return;
		discogsAbort?.abort();
		const ctrl = new AbortController();
		discogsAbort = ctrl;
		discogsLoading = true;
		discogsError = null;
		discogsNote = null;
		try {
			// Wie beim Server-Auto-Match: ohne Kassetten-Treffer auf alle Formate
			// ausweichen — serverseitig, ein Roundtrip.
			const { results, fellBack } = await searchDiscogsReleases(q, discogsFormat, {
				fallback: discogsFormat === 'Cassette',
				signal: ctrl.signal
			});
			discogsHits = results.slice(0, 10);
			hitsQuery = q;
			if (fellBack) discogsNote = 'Keine Kassetten-Treffer — alle Formate angezeigt.';
			// Bisherige Auswahl nur behalten, wenn sie noch in der Liste ist.
			const pickedId = pickedDiscogs?.id;
			pickedDiscogs = discogsHits.find((r) => r.id === pickedId) ?? null;
			if (discogsHits.length === 0) discogsError = 'Keine Treffer — Suchbegriff anpassen.';
		} catch (e) {
			if (ctrl.signal.aborted) return;
			discogsError = e instanceof Error ? e.message : 'Discogs-Suche fehlgeschlagen.';
		} finally {
			if (!ctrl.signal.aborted) discogsLoading = false;
		}
	}

	function togglePick(r: SearchResult) {
		pickedDiscogs = pickedDiscogs?.id === r.id ? null : r;
	}

	// ---- Dubletten-Check ------------------------------------------------------
	// Sobald Serie/Folge oder der Discogs-Treffer vom geprüften Stand abweichen,
	// nachfragen — sonst blockiert eine „Hast du schon!"-Warnung zur FALSCHEN
	// Serie den Übernehmen-Knopf. Ergebnisse werden pro Anfrage gecacht, damit
	// Tippfehler-Korrekturen und Pick/Unpick keine neuen Requests kosten.
	interface DupQuery {
		serie: string | null;
		folgeNr: number | null;
		releaseIds: number[];
	}
	let duplicates = $state<ScannedDuplicate[]>([]);
	let duplicateAcknowledged = $state(false);
	let dupPending = $state(false);
	let dupError = $state<string | null>(null);
	const dupCache = new Map<string, ScannedDuplicate[]>();
	let dupAbort: AbortController | null = null;

	function currentDupQuery(): DupQuery {
		return {
			serie: fields.serie.trim() || null,
			folgeNr: parseFolgeNr(fields.folge),
			releaseIds: pickedDiscogs ? [pickedDiscogs.id] : discogsHits.map((h) => h.id)
		};
	}
	/** Schlüssel nur aus dem, was der Server tatsächlich prüft (exact-Paar + IDs). */
	function dupKeyOf(q: DupQuery): string {
		const exact =
			q.serie && q.folgeNr != null ? `${q.serie.trim().toLowerCase()}|${q.folgeNr}` : '';
		return `${exact}#${[...q.releaseIds].sort((a, b) => a - b).join(',')}`;
	}
	function applyDuplicates(next: ScannedDuplicate[]) {
		const changed =
			next.length !== duplicates.length || next.some((d, i) => d.id !== duplicates[i]?.id);
		if (changed) {
			duplicates = next;
			duplicateAcknowledged = false;
		}
	}
	$effect(() => {
		const q = currentDupQuery();
		if (!extracted) return;
		const key = dupKeyOf(q);
		const cached = dupCache.get(key);
		if (cached) {
			untrack(() => {
				applyDuplicates(cached);
				dupPending = false;
			});
			return;
		}
		if (!(q.serie && q.folgeNr != null) && q.releaseIds.length === 0) {
			// Nichts prüfbar → sicher keine Dubletten, ohne Roundtrip.
			untrack(() => {
				applyDuplicates([]);
				dupPending = false;
			});
			return;
		}
		dupPending = true;
		const t = setTimeout(() => void recheckDuplicates(q, key), 400);
		return () => clearTimeout(t);
	});
	async function recheckDuplicates(q: DupQuery, key: string) {
		dupAbort?.abort();
		const ctrl = new AbortController();
		dupAbort = ctrl;
		try {
			const url = new URL('/api/cassettes/duplicates', location.origin);
			if (q.serie) url.searchParams.set('serie', q.serie);
			if (q.folgeNr != null) url.searchParams.set('folgeNr', String(q.folgeNr));
			url.searchParams.set('releaseIds', q.releaseIds.join(','));
			const res = await fetch(url, { signal: ctrl.signal });
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const body = await res.json();
			if (ctrl.signal.aborted) return;
			const next: ScannedDuplicate[] = body.duplicates ?? [];
			dupCache.set(key, next);
			// Inzwischen weitergetippt? Dann gehört das Ergebnis nicht mehr zum Stand.
			if (key !== dupKeyOf(currentDupQuery())) return;
			applyDuplicates(next);
			dupError = null;
		} catch {
			if (ctrl.signal.aborted) return;
			// Nicht blockieren — der Nutzer prüft dann selbst.
			dupError = 'Dubletten-Check gerade nicht möglich — bitte selbst prüfen.';
		} finally {
			if (!ctrl.signal.aborted) dupPending = false;
		}
	}
	onDestroy(() => {
		discogsAbort?.abort();
		dupAbort?.abort();
	});

	// Crop direkt nach dem Scan: ersetzt nur das Foto, das beim Speichern
	// mitgeschickt wird — die erkannten Daten bleiben, kein zweiter API-Call.
	let cropping = $state(false);
	function applyCrop(cropped: File) {
		photoFile = cropped;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = URL.createObjectURL(cropped);
		cropping = false;
	}

	/** KI-Daten + manuelle Korrekturen zusammenführen. */
	function mergedMetadata(): ScannedMetadata {
		const base = extracted ?? {};
		const folge = fields.folge.trim();
		const folgeNum = parseFolgeNr(folge) ?? undefined;
		// KI kann folge_nr UND folge_label liefern ("100" + "100 A/B/C"); das
		// Label bleibt erhalten, solange die Nummer nicht geändert wurde.
		const folgeLabel =
			folgeNum == null
				? folge || undefined
				: folgeNum === base.folge_nr
					? base.folge_label
					: undefined;
		const jahr = jahrInvalid || !fields.jahr.trim() ? undefined : Number(fields.jahr.trim());
		return {
			...base,
			serie: fields.serie.trim() || undefined,
			folge_nr: folgeNum,
			folge_label: folgeLabel,
			titel: fields.titel.trim() || undefined,
			label: fields.label.trim() || undefined,
			jahr,
			seriennummer: fields.seriennummer.trim() || undefined
		};
	}

	const confirmBlocked = $derived(dupPending || (duplicates.length > 0 && !duplicateAcknowledged));

	function confirm() {
		if (!extracted || confirmBlocked) return;
		onpick({
			extracted: mergedMetadata(),
			discogsPick: pickedDiscogs,
			photoBlob: photoFile
		});
	}

	const inputClass =
		'w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-950 dark:focus:ring-brand-900';
	const labelClass = 'mb-0.5 block text-[10px] uppercase tracking-wide text-stone-500';
</script>

<div
	role="dialog"
	aria-modal="true"
	aria-label="Kassette scannen"
	class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center"
>
	<div
		class="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-2xl"
	>
		<header class="flex items-center gap-2 border-b border-stone-200 p-3 dark:border-stone-800">
			<span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white">
				<Camera size={18} />
			</span>
			<div class="flex-1">
				<div class="text-base font-semibold">Kassette scannen</div>
				<div class="text-xs text-stone-500 dark:text-stone-400">
					Foto vom Cover → KI extrahiert Daten → optionaler Discogs-Match
				</div>
			</div>
			<button
				type="button"
				aria-label="Schließen"
				onclick={onclose}
				class="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			>
				<X size={20} />
			</button>
		</header>

		<div class="flex-1 overflow-y-auto p-4">
			{#if !previewUrl}
				<button
					type="button"
					onclick={() => fileInput?.click()}
					class="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-brand-600 dark:hover:bg-brand-950/40"
				>
					<span
						class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg"
					>
						<Camera size={28} />
					</span>
					<span class="text-base font-medium">Foto aufnehmen oder auswählen</span>
					<span class="text-xs text-stone-500 dark:text-stone-400">
						Möglichst gerade aufs Cover, ohne starke Spiegelung
					</span>
				</button>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*"
					capture="environment"
					class="hidden"
					onchange={onFileChange}
				/>
			{:else}
				<div class="space-y-4">
					<div class="relative overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
						<img src={previewUrl} alt="Aufnahme" class="max-h-64 w-full object-contain" />
						{#if !scanning && photoFile}
							<button
								type="button"
								onclick={() => (cropping = true)}
								class="absolute bottom-2 right-2 flex h-9 items-center gap-1.5 rounded-full bg-stone-900/70 px-3 text-xs font-medium text-white backdrop-blur-sm transition active:scale-95 hover:bg-stone-900/90"
							>
								<Crop size={14} />
								Zuschneiden
							</button>
						{/if}
					</div>

					{#if scanning}
						<div
							class="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-950/40 dark:text-brand-200"
						>
							<Loader2 size={14} class="animate-spin" />
							Erkenne Cover…
						</div>
					{:else if error}
						<div
							class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
						>
							{error}
						</div>
					{:else if extracted}
						<section>
							<div class="mb-2 flex items-center justify-between">
								<h3 class="flex items-center gap-1.5 text-sm font-semibold">
									<Sparkles size={14} class="text-brand-500" />
									Erkannte Daten
								</h3>
								{#if tokens}
									<span class="text-[10px] font-mono text-stone-400">
										{tokens.input}+{tokens.output} tok
									</span>
								{/if}
							</div>
							<p class="mb-2 text-xs text-stone-500 dark:text-stone-400">
								Stimmt etwas nicht (z.B. Serie verwechselt)? Hier direkt korrigieren — Discogs-Suche
								und Dubletten-Check nutzen die korrigierten Werte.
							</p>
							<div class="grid grid-cols-3 gap-2">
								<div class="col-span-2">
									<label class={labelClass} for="scan-serie">Serie</label>
									<input
										id="scan-serie"
										type="text"
										bind:value={fields.serie}
										oninput={onKeyFieldEdit}
										list="scan-serien-list"
										autocomplete="off"
										class={inputClass}
									/>
								</div>
								<div>
									<label class={labelClass} for="scan-folge">Folge</label>
									<input
										id="scan-folge"
										type="text"
										inputmode="numeric"
										bind:value={fields.folge}
										oninput={onKeyFieldEdit}
										placeholder="Nr."
										class="{inputClass} font-mono"
									/>
								</div>
								<div class="col-span-3">
									<label class={labelClass} for="scan-titel">Titel</label>
									<input
										id="scan-titel"
										type="text"
										bind:value={fields.titel}
										oninput={onKeyFieldEdit}
										class={inputClass}
									/>
								</div>
								<div>
									<label class={labelClass} for="scan-label">Label</label>
									<input id="scan-label" type="text" bind:value={fields.label} class={inputClass} />
								</div>
								<div>
									<label class={labelClass} for="scan-jahr">Jahr</label>
									<input
										id="scan-jahr"
										type="text"
										inputmode="numeric"
										bind:value={fields.jahr}
										aria-invalid={jahrInvalid}
										class="{inputClass} font-mono"
										class:border-rose-400={jahrInvalid}
									/>
									{#if jahrInvalid}
										<div class="mt-0.5 text-[10px] text-rose-600 dark:text-rose-400">
											4-stellig, sonst wird es verworfen
										</div>
									{/if}
								</div>
								<div>
									<label class={labelClass} for="scan-seriennr">Seriennr.</label>
									<input
										id="scan-seriennr"
										type="text"
										bind:value={fields.seriennummer}
										class="{inputClass} font-mono"
									/>
								</div>
								{#if extracted.huellen_zustand}
									<div
										class="col-span-3 rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800"
									>
										<div class="text-[10px] uppercase tracking-wide text-stone-500">
											Hülle (Schätzung)
										</div>
										<div class="text-xs">{extracted.huellen_zustand}</div>
									</div>
								{/if}
								{#if extracted.auflage_variante}
									<div
										class="col-span-3 rounded-lg bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800"
									>
										<div class="text-[10px] uppercase tracking-wide text-stone-500">Auflage</div>
										<div class="text-xs">{extracted.auflage_variante}</div>
									</div>
								{/if}
							</div>
							<datalist id="scan-serien-list">
								{#each serien as s (s)}
									<option value={s}></option>
								{/each}
							</datalist>
						</section>

						{#if dupError}
							<div class="text-xs text-amber-700 dark:text-amber-300">{dupError}</div>
						{/if}

						{#if duplicates.length > 0}
							<section
								class="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40"
							>
								<div class="mb-2 flex items-start gap-2">
									<AlertTriangle
										size={16}
										class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
									/>
									<div class="flex-1 text-sm">
										<div class="font-semibold text-amber-900 dark:text-amber-200">
											{duplicates.length === 1
												? 'Hast du schon!'
												: `${duplicates.length} Treffer in deiner Sammlung`}
										</div>
										<div class="text-xs text-amber-700 dark:text-amber-300">
											Vergleiche unten — eventuell ist es eine andere Auflage/Zustand.
										</div>
									</div>
								</div>
								<ul class="space-y-2">
									{#each duplicates as d (d.id)}
										<li class="flex items-start gap-3 rounded-lg bg-white p-2 dark:bg-stone-900">
											<div
												class="h-14 w-14 shrink-0 overflow-hidden rounded bg-stone-100 dark:bg-stone-800"
											>
												{#if d.thumbUrl}
													<img
														src={d.thumbUrl}
														alt=""
														loading="lazy"
														class="h-full w-full object-cover"
													/>
												{:else}
													<div class="flex h-full items-center justify-center text-stone-400">
														<ImageIcon size={20} />
													</div>
												{/if}
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-baseline gap-2">
													<a
														href={`/kassetten/${d.id}`}
														class="truncate text-sm font-semibold text-stone-900 hover:underline dark:text-stone-100"
														target="_blank"
														rel="noopener"
													>
														{d.serie}{d.folgeNr != null
															? ` · ${d.folgeNr}`
															: d.folgeNrLabel
																? ` · ${d.folgeNrLabel}`
																: ''} · {d.titel}
													</a>
													<ExternalLink size={11} class="shrink-0 text-stone-400" />
												</div>
												<div
													class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-stone-600 dark:text-stone-400"
												>
													{#if d.auflageVariante}
														<span
															><span class="text-stone-400">Auflage:</span>
															{d.auflageVariante}</span
														>
													{/if}
													{#if d.zustandMc}
														<span><span class="text-stone-400">MC:</span> {d.zustandMc}</span>
													{/if}
													{#if d.zustandHuelle}
														<span><span class="text-stone-400">Hülle:</span> {d.zustandHuelle}</span
														>
													{/if}
													{#if !d.originalhuelle}
														<span class="text-amber-700 dark:text-amber-400"
															>keine Original-Hülle</span
														>
													{/if}
													{#if !d.vollstaendig}
														<span class="text-amber-700 dark:text-amber-400">unvollständig</span>
													{/if}
												</div>
												<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
													<span>
														<span class="text-stone-400">Kauf:</span>
														<span class="font-medium">{fmtPrice(d.kaufpreisCent, 'EUR')}</span>
													</span>
													<span>
														<span class="text-stone-400">Markt:</span>
														<span class="font-medium"
															>{fmtPrice(d.marktwertCent, d.marktwertCurrency)}</span
														>
													</span>
												</div>
											</div>
											<span
												class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
												class:bg-rose-200={d.reason === 'exact'}
												class:text-rose-800={d.reason === 'exact'}
												class:dark:bg-rose-900={d.reason === 'exact'}
												class:dark:text-rose-200={d.reason === 'exact'}
												class:bg-amber-200={d.reason === 'release'}
												class:text-amber-800={d.reason === 'release'}
												class:dark:bg-amber-900={d.reason === 'release'}
												class:dark:text-amber-200={d.reason === 'release'}
												title={d.reason === 'exact'
													? 'Gleiche Serie + Folge-Nr'
													: 'Gleiche Discogs-Release-ID'}
											>
												{d.reason === 'exact' ? 'exakt' : 'Release'}
											</span>
										</li>
									{/each}
								</ul>
								<label
									class="mt-3 flex cursor-pointer items-center gap-2 text-xs text-amber-800 dark:text-amber-300"
								>
									<input
										type="checkbox"
										bind:checked={duplicateAcknowledged}
										class="h-3.5 w-3.5 rounded border-amber-400 text-brand-500 focus:ring-brand-500"
									/>
									Trotzdem hinzufügen (z.B. andere Auflage oder zweite Kopie)
								</label>
							</section>
						{/if}

						{#if discogsEnabled}
							<section>
								<h3 class="mb-2 text-sm font-semibold">
									Discogs-Zuordnung
									{#if discogsHits.length > 0}
										<span class="font-normal text-stone-400">({discogsHits.length})</span>
									{/if}
								</h3>
								<div class="flex gap-2">
									<div class="relative flex-1">
										<span
											class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-stone-400"
										>
											<Search size={14} />
										</span>
										<input
											type="search"
											bind:value={() => discogsQuery, (v) => (manualQuery = v)}
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													void searchDiscogs();
												}
											}}
											placeholder="Suchbegriff für Discogs…"
											class="{inputClass} pl-8"
										/>
									</div>
									<button
										type="button"
										onclick={searchDiscogs}
										disabled={discogsLoading || discogsQuery.trim().length < 2}
										class="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
									>
										{#if discogsLoading}
											<Loader2 size={14} class="animate-spin" />
										{:else}
											<RotateCw size={14} />
										{/if}
										Suchen
									</button>
								</div>
								<div
									class="mt-1.5 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400"
								>
									<label class="flex items-center gap-1">
										<input
											type="radio"
											bind:group={discogsFormat}
											value="Cassette"
											onchange={() => void searchDiscogs()}
										/>
										Nur Kassetten
									</label>
									<label class="flex items-center gap-1">
										<input
											type="radio"
											bind:group={discogsFormat}
											value="all"
											onchange={() => void searchDiscogs()}
										/>
										Alle Formate
									</label>
									{#if queryDiverged}
										<button
											type="button"
											class="ml-auto hover:underline"
											onclick={() => (manualQuery = null)}
										>
											aus Feldern übernehmen
										</button>
									{/if}
								</div>

								{#if discogsError}
									<div
										class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
									>
										{discogsError}
									</div>
								{:else if discogsNote}
									<div class="mt-2 text-xs text-stone-500 dark:text-stone-400">{discogsNote}</div>
								{:else if hitsStale}
									<div class="mt-2 text-xs text-amber-700 dark:text-amber-300">
										Treffer gehören zu „{hitsQuery}" — auf „Suchen" tippen für den neuen Begriff.
									</div>
								{/if}

								{#if discogsHits.length > 0}
									<ul class="mt-2 space-y-1">
										{#each discogsHits as r (r.id)}
											<li>
												<button
													type="button"
													onclick={() => togglePick(r)}
													class="flex w-full items-center gap-3 rounded-lg border-2 p-2 text-left transition"
													class:border-emerald-500={pickedDiscogs?.id === r.id}
													class:bg-emerald-50={pickedDiscogs?.id === r.id}
													class:dark:bg-emerald-950={pickedDiscogs?.id === r.id}
													class:border-stone-200={pickedDiscogs?.id !== r.id}
													class:dark:border-stone-800={pickedDiscogs?.id !== r.id}
												>
													<div
														class="h-12 w-12 shrink-0 overflow-hidden rounded bg-stone-100 dark:bg-stone-800"
													>
														{#if r.thumb}
															<img src={r.thumb} alt="" class="h-full w-full object-cover" />
														{:else}
															<div class="flex h-full items-center justify-center text-stone-400">
																<ImageIcon size={16} />
															</div>
														{/if}
													</div>
													<div class="min-w-0 flex-1">
														<div class="truncate text-xs font-medium">{r.title}</div>
														<div class="truncate text-[11px] text-stone-500 dark:text-stone-400">
															{fmtSearchHit(r)}
														</div>
													</div>
													{#if pickedDiscogs?.id === r.id}
														<span
															class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
														>
															<Check size={12} />
														</span>
													{/if}
												</button>
											</li>
										{/each}
									</ul>
								{/if}

								{#if pickedDiscogs && pickedPreview}
									<div
										class="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
									>
										<div class="font-medium">Discogs überschreibt beim Übernehmen:</div>
										<div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
											{#if pickedPreview.serie}<span>Serie: <b>{pickedPreview.serie}</b></span>{/if}
											{#if pickedPreview.folgeNr != null}<span
													>Folge: <b>{pickedPreview.folgeNr}</b></span
												>{/if}
											{#if pickedPreview.titel}<span>Titel: <b>{pickedPreview.titel}</b></span>{/if}
											{#if pickedDiscogs.label?.[0]}<span
													>Label: <b>{pickedDiscogs.label[0]}</b></span
												>{/if}
											{#if pickedDiscogs.year}<span>Jahr: <b>{pickedDiscogs.year}</b></span>{/if}
											{#if pickedFormat}<span>Format: <b>{FORMAT_SHORT[pickedFormat]}</b></span
												>{/if}
										</div>
										<button
											type="button"
											class="mt-1 hover:underline"
											onclick={() => (pickedDiscogs = null)}
										>
											Passt nicht — ohne Discogs übernehmen
										</button>
									</div>
								{:else if discogsHits.length > 0}
									<div class="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
										Treffer antippen zum Verknüpfen — oder ohne Discogs übernehmen.
									</div>
								{/if}
							</section>
						{/if}
					{/if}

					<button
						type="button"
						onclick={() => {
							reset();
							fileInput?.click();
						}}
						class="flex items-center gap-1 text-xs text-stone-500 hover:underline dark:text-stone-400"
					>
						<RotateCw size={12} />
						Anderes Foto wählen
					</button>
					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						capture="environment"
						class="hidden"
						onchange={onFileChange}
					/>
				</div>
			{/if}
		</div>

		{#if extracted && !scanning && !error}
			<footer class="flex gap-2 border-t border-stone-200 p-3 dark:border-stone-800">
				<button
					type="button"
					onclick={onclose}
					class="flex-1 rounded-xl border border-stone-300 px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					Abbrechen
				</button>
				<button
					type="button"
					onclick={confirm}
					disabled={confirmBlocked}
					class="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					{#if dupPending}
						<Loader2 size={16} class="animate-spin" />
					{:else}
						<Check size={16} />
					{/if}
					{duplicates.length > 0 && duplicateAcknowledged
						? 'Trotzdem übernehmen'
						: pickedDiscogs
							? 'Mit Discogs übernehmen'
							: 'Übernehmen'}
				</button>
			</footer>
		{/if}
	</div>
</div>

{#if cropping && photoFile}
	<PhotoCropModal file={photoFile} onCancel={() => (cropping = false)} onConfirm={applyCrop} />
{/if}

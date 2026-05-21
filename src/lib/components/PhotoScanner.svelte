<script lang="ts" module>
	import type { SearchResult } from '$lib/server/discogs/types';

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
	}

	export interface ScannedDuplicate {
		id: string;
		serie: string;
		folgeNr: number | null;
		folgeNrLabel: string | null;
		titel: string;
		label: string | null;
		jahr: number | null;
		auflageVariante: string | null;
		zustandMc: string | null;
		zustandHuelle: string | null;
		originalhuelle: boolean;
		vollstaendig: boolean;
		kaufpreisCent: number | null;
		marktwertCent: number | null;
		marktwertCurrency: string | null;
		thumbUrl: string | null;
		reason: 'exact' | 'release';
	}

	export interface ScanPayload {
		extracted: ScannedMetadata;
		discogsPick: SearchResult | null;
		photoBlob: Blob | null;
	}
</script>

<script lang="ts">
	import Camera from '@lucide/svelte/icons/camera';
	import X from '@lucide/svelte/icons/x';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Loader2 from '@lucide/svelte/icons/loader-circle';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Check from '@lucide/svelte/icons/check';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { formatEur } from '$lib/util/format';

	type Props = {
		onpick: (payload: ScanPayload) => void;
		onclose: () => void;
	};

	let { onpick, onclose }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let previewUrl = $state<string | null>(null);
	let photoFile = $state<File | null>(null);
	let scanning = $state(false);
	let error = $state<string | null>(null);
	let extracted = $state<ScannedMetadata | null>(null);
	let discogsHits = $state<SearchResult[]>([]);
	let pickedDiscogs = $state<SearchResult | null>(null);
	let duplicates = $state<ScannedDuplicate[]>([]);
	let duplicateAcknowledged = $state(false);
	let model = $state<string | null>(null);
	let tokens = $state<{ input: number; output: number } | null>(null);

	function reset() {
		photoFile = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		extracted = null;
		discogsHits = [];
		pickedDiscogs = null;
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

	function onFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		reset();
		photoFile = file;
		previewUrl = URL.createObjectURL(file);
		void scan();
	}

	async function scan() {
		if (!photoFile) return;
		scanning = true;
		error = null;
		extracted = null;
		discogsHits = [];
		pickedDiscogs = null;
		duplicates = [];
		duplicateAcknowledged = false;
		try {
			const form = new FormData();
			form.append('photo', photoFile);
			const res = await fetch('/api/scan', { method: 'POST', body: form });
			const body = await res.json();
			if (!res.ok) {
				error = body?.error ?? `Scan fehlgeschlagen (${res.status}).`;
				return;
			}
			extracted = body.extracted;
			discogsHits = body.discogs?.hits ?? [];
			pickedDiscogs = discogsHits.length === 1 ? discogsHits[0] : null;
			duplicates = body.duplicates ?? [];
			model = body.model;
			tokens = body.tokens;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Netzwerk-Fehler.';
		} finally {
			scanning = false;
		}
	}

	function confirm() {
		if (!extracted) return;
		onpick({
			extracted,
			discogsPick: pickedDiscogs,
			photoBlob: photoFile
		});
	}

	function fmtSearchHit(r: SearchResult): string {
		return [r.year, r.label?.[0], r.country, r.catno].filter(Boolean).join(' · ');
	}
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
					<div class="overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
						<img src={previewUrl} alt="Aufnahme" class="max-h-64 w-full object-contain" />
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
							<dl class="grid grid-cols-3 gap-2 text-sm">
								{#if extracted.serie}
									<div class="col-span-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Serie</dt>
										<dd class="font-medium">{extracted.serie}</dd>
									</div>
								{/if}
								{#if extracted.folge_nr != null}
									<div class="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Folge</dt>
										<dd class="font-mono font-semibold">{extracted.folge_nr}</dd>
									</div>
								{:else if extracted.folge_label}
									<div class="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Folge</dt>
										<dd class="font-mono text-xs">{extracted.folge_label}</dd>
									</div>
								{/if}
								{#if extracted.titel}
									<div class="col-span-3 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Titel</dt>
										<dd class="font-medium">{extracted.titel}</dd>
									</div>
								{/if}
								{#if extracted.label}
									<div class="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Label</dt>
										<dd>{extracted.label}</dd>
									</div>
								{/if}
								{#if extracted.jahr}
									<div class="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Jahr</dt>
										<dd>{extracted.jahr}</dd>
									</div>
								{/if}
								{#if extracted.seriennummer}
									<div class="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Seriennr.</dt>
										<dd class="font-mono text-xs">{extracted.seriennummer}</dd>
									</div>
								{/if}
								{#if extracted.huellen_zustand}
									<div class="col-span-3 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">
											Hülle (Schätzung)
										</dt>
										<dd class="text-xs">{extracted.huellen_zustand}</dd>
									</div>
								{/if}
								{#if extracted.auflage_variante}
									<div class="col-span-3 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800">
										<dt class="text-[10px] uppercase tracking-wide text-stone-500">Auflage</dt>
										<dd class="text-xs">{extracted.auflage_variante}</dd>
									</div>
								{/if}
							</dl>
						</section>

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

						{#if discogsHits.length > 0}
							<section>
								<h3 class="mb-2 text-sm font-semibold">
									Discogs-Vorschlag{discogsHits.length > 1 ? 'e' : ''} ({discogsHits.length})
								</h3>
								<ul class="space-y-1">
									{#each discogsHits as r (r.id)}
										<li>
											<button
												type="button"
												onclick={() => (pickedDiscogs = pickedDiscogs?.id === r.id ? null : r)}
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
					disabled={duplicates.length > 0 && !duplicateAcknowledged}
					class="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					<Check size={16} />
					{duplicates.length > 0 && duplicateAcknowledged ? 'Trotzdem übernehmen' : 'Übernehmen'}
				</button>
			</footer>
		{/if}
	</div>
</div>

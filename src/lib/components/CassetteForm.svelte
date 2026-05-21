<script lang="ts" module>
	export type FormState = {
		serie: string;
		folgeNr: string;
		folgeNrLabel: string;
		titel: string;
		format: string;
		label: string;
		auflageVariante: string;
		jahr: string;
		discogsReleaseId: string;
		discogsUrl: string;
		discogsCoverUrl: string;
		seriennummer: string;
		zustandMc: string;
		zustandHuelle: string;
		originalhuelle: boolean;
		vollstaendig: boolean;
		kaufdatum: string;
		kaufpreisCent: string;
		kaufort: string;
		folder: string;
		auflageId: string;
		rating: number | null;
		review: string;
		notiz: string;
	};

	import type { Cassette } from '$lib/server/db/schema';

	export function emptyFormState(): FormState {
		return {
			serie: '',
			folgeNr: '',
			folgeNrLabel: '',
			titel: '',
			format: 'cassette',
			label: '',
			auflageVariante: '',
			jahr: '',
			discogsReleaseId: '',
			discogsUrl: '',
			discogsCoverUrl: '',
			seriennummer: '',
			zustandMc: '',
			zustandHuelle: '',
			originalhuelle: true,
			vollstaendig: true,
			kaufdatum: '',
			kaufpreisCent: '',
			kaufort: '',
			folder: '',
			auflageId: '',
			rating: null,
			review: '',
			notiz: ''
		};
	}

	function priceCentToInput(cents: number | null | undefined): string {
		if (cents === null || cents === undefined) return '';
		return (cents / 100).toFixed(2).replace('.', ',');
	}

	export function formStateFromCassette(c: Partial<Cassette>): FormState {
		return {
			serie: c.serie ?? '',
			folgeNr: c.folgeNr != null ? String(c.folgeNr) : '',
			folgeNrLabel: c.folgeNrLabel ?? '',
			titel: c.titel ?? '',
			format: c.format ?? 'cassette',
			label: c.label ?? '',
			auflageVariante: c.auflageVariante ?? '',
			jahr: c.jahr != null ? String(c.jahr) : '',
			discogsReleaseId: c.discogsReleaseId != null ? String(c.discogsReleaseId) : '',
			discogsUrl: c.discogsUrl ?? '',
			discogsCoverUrl: c.discogsCoverUrl ?? '',
			seriennummer: c.seriennummer ?? '',
			zustandMc: c.zustandMc ?? '',
			zustandHuelle: c.zustandHuelle ?? '',
			originalhuelle: c.originalhuelle ?? true,
			vollstaendig: c.vollstaendig ?? true,
			kaufdatum: c.kaufdatum ?? '',
			kaufpreisCent: priceCentToInput(c.kaufpreisCent),
			kaufort: c.kaufort ?? '',
			folder: c.folder ?? '',
			auflageId: c.auflageId ?? '',
			rating: c.rating ?? null,
			review: c.review ?? '',
			notiz: c.notiz ?? ''
		};
	}

	/** Übernimmt Werte aus einer fehlerhaften Submission (Strings aus FormData). */
	export function formStateFromValues(v: Record<string, string>): FormState {
		const fs = emptyFormState();
		for (const key of Object.keys(fs) as (keyof FormState)[]) {
			if (v[key] === undefined) continue;
			if (key === 'originalhuelle' || key === 'vollstaendig') {
				(fs[key] as boolean) = v[key] === 'on' || v[key] === 'true';
			} else if (key === 'rating') {
				const n = Number(v[key]);
				(fs[key] as number | null) = Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
			} else {
				(fs[key] as string) = v[key];
			}
		}
		return fs;
	}
</script>

<script lang="ts">
	import Field from './Field.svelte';
	import Toggle from './Toggle.svelte';
	import StarRating from './StarRating.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Search from '@lucide/svelte/icons/search';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { FORMAT_LABELS, type MediaFormat } from '$lib/format';

	type Props = {
		serien: string[];
		labels: string[];
		folders?: string[];
		mediaGrades: readonly string[];
		sleeveGrades: readonly string[];
		enabledFormats?: MediaFormat[];
		formState: FormState;
		fieldErrors?: Record<string, string> | null;
		showPhoto?: boolean;
		onSearchDiscogs?: () => void;
	};

	let {
		serien,
		labels,
		folders = [],
		mediaGrades,
		sleeveGrades,
		enabledFormats = ['cassette'],
		formState = $bindable(),
		fieldErrors = null,
		showPhoto = true,
		onSearchDiscogs
	}: Props = $props();

	const inputCls =
		'w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-brand-900';

	const selectCls =
		'w-full appearance-none rounded-xl border border-stone-300 bg-white px-3 py-3 pr-9 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-brand-900';

	const PRICE_PATTERN = '[0-9]+([.,][0-9]{0,2})?';

	function clearDiscogsLink() {
		formState.discogsReleaseId = '';
		formState.discogsUrl = '';
		formState.discogsCoverUrl = '';
	}
</script>

<datalist id="serien-list">
	{#each serien as s (s)}
		<option value={s}></option>
	{/each}
</datalist>
<datalist id="labels-list">
	{#each labels as l (l)}
		<option value={l}></option>
	{/each}
</datalist>
<datalist id="folders-list">
	{#each folders as f (f)}
		<option value={f}></option>
	{/each}
</datalist>

<div class="space-y-3">
	<Field label="Serie" name="serie" error={fieldErrors?.serie}>
		<input
			name="serie"
			bind:value={formState.serie}
			required
			list="serien-list"
			placeholder="z.B. Die drei ???"
			class={inputCls}
			autocomplete="off"
		/>
	</Field>

	<div class="grid grid-cols-3 gap-2">
		<div class="col-span-1">
			<Field label="Folge" name="folgeNr" error={fieldErrors?.folgeNr}>
				<input
					name="folgeNr"
					type="number"
					inputmode="numeric"
					min="0"
					bind:value={formState.folgeNr}
					class={inputCls}
				/>
			</Field>
		</div>
		<div class="col-span-2">
			<Field
				label="Folge-Label"
				name="folgeNrLabel"
				hint="optional"
				error={fieldErrors?.folgeNrLabel}
			>
				<input
					name="folgeNrLabel"
					bind:value={formState.folgeNrLabel}
					placeholder="z.B. 100 A/B/C"
					class={inputCls}
				/>
			</Field>
		</div>
	</div>

	<Field label="Titel" name="titel" error={fieldErrors?.titel}>
		<input name="titel" bind:value={formState.titel} required class={inputCls} />
	</Field>

	{#if enabledFormats.length > 1}
		<Field label="Format" name="format" error={fieldErrors?.format}>
			<div class="relative">
				<select name="format" bind:value={formState.format} class={selectCls}>
					{#each enabledFormats as f (f)}
						<option value={f}>{FORMAT_LABELS[f]}</option>
					{/each}
				</select>
				<span
					class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-stone-400"
				>
					<ChevronDown size={16} />
				</span>
			</div>
		</Field>
	{:else}
		<input type="hidden" name="format" value={formState.format || 'cassette'} />
	{/if}

	<input type="hidden" name="auflageId" value={formState.auflageId} />

	{#if onSearchDiscogs}
		<div
			class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/60"
		>
			{#if formState.discogsReleaseId}
				<div class="flex items-center justify-between gap-2 text-sm">
					<div class="min-w-0">
						<div
							class="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300"
						>
							Discogs verknüpft
						</div>
						<div class="truncate font-mono text-sm">Release {formState.discogsReleaseId}</div>
					</div>
					<div class="flex shrink-0 items-center gap-1">
						{#if formState.discogsUrl}
							<a
								href={formState.discogsUrl}
								target="_blank"
								rel="noopener"
								class="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
							>
								<ExternalLink size={14} />
								Öffnen
							</a>
						{/if}
						<button
							type="button"
							onclick={onSearchDiscogs}
							class="flex h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
						>
							<RefreshCw size={14} />
							Ändern
						</button>
						<button
							type="button"
							onclick={clearDiscogsLink}
							class="rounded-full px-2 text-xs text-stone-500 hover:underline dark:text-stone-400"
						>
							Entfernen
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={onSearchDiscogs}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
				>
					<Search size={16} />
					Discogs suchen & verknüpfen
				</button>
			{/if}
			<input type="hidden" name="discogsReleaseId" bind:value={formState.discogsReleaseId} />
			<input type="hidden" name="discogsUrl" bind:value={formState.discogsUrl} />
			<input type="hidden" name="discogsCoverUrl" bind:value={formState.discogsCoverUrl} />
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-2">
		<Field label="Label" name="label" error={fieldErrors?.label}>
			<input
				name="label"
				bind:value={formState.label}
				list="labels-list"
				placeholder="Europa…"
				class={inputCls}
				autocomplete="off"
			/>
		</Field>
		<Field label="Jahr" name="jahr" error={fieldErrors?.jahr}>
			<input
				name="jahr"
				type="number"
				inputmode="numeric"
				min="1900"
				max="2100"
				bind:value={formState.jahr}
				class={inputCls}
			/>
		</Field>
	</div>

	<Field
		label="Auflage / Variante"
		name="auflageVariante"
		hint="optional"
		error={fieldErrors?.auflageVariante}
	>
		<input
			name="auflageVariante"
			bind:value={formState.auflageVariante}
			placeholder="schwarz-gelb Logo, weißes Cover…"
			class={inputCls}
		/>
	</Field>

	<div class="grid grid-cols-2 gap-2">
		<Field label="Zustand MC" name="zustandMc" error={fieldErrors?.zustandMc}>
			<div class="relative">
				<select name="zustandMc" bind:value={formState.zustandMc} class={selectCls}>
					<option value="">—</option>
					{#each mediaGrades as g (g)}
						<option value={g}>{g}</option>
					{/each}
				</select>
				<ChevronDown
					size={18}
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
				/>
			</div>
		</Field>
		<Field label="Zustand Hülle" name="zustandHuelle" error={fieldErrors?.zustandHuelle}>
			<div class="relative">
				<select name="zustandHuelle" bind:value={formState.zustandHuelle} class={selectCls}>
					<option value="">—</option>
					{#each sleeveGrades as g (g)}
						<option value={g}>{g}</option>
					{/each}
				</select>
				<ChevronDown
					size={18}
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
				/>
			</div>
		</Field>
	</div>

	<div class="grid gap-2">
		<Toggle
			name="originalhuelle"
			label="Originalhülle"
			description="Die Hülle stammt zur MC."
			bind:checked={formState.originalhuelle}
		/>
		<Toggle
			name="vollstaendig"
			label="Vollständig"
			description="Inlay / Beilage vorhanden."
			bind:checked={formState.vollstaendig}
		/>
	</div>

	<Field label="Seriennummer" name="seriennummer" hint="optional" error={fieldErrors?.seriennummer}>
		<input
			name="seriennummer"
			bind:value={formState.seriennummer}
			placeholder="z.B. 115311"
			class={inputCls}
			autocomplete="off"
		/>
	</Field>

	<Field
		label="Ordner"
		name="folder"
		hint="optional — gruppiert statt Serie"
		error={fieldErrors?.folder}
	>
		<input
			name="folder"
			bind:value={formState.folder}
			list="folders-list"
			placeholder="z.B. Grabbelkiste, Sammelkartons 2024"
			class={inputCls}
			autocomplete="off"
		/>
	</Field>

	<details
		class="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
		open={Boolean(formState.kaufdatum || formState.kaufpreisCent || formState.kaufort)}
	>
		<summary class="cursor-pointer px-3 py-3 text-sm font-medium"
			>Kauf-Infos (Datum, Preis, Ort)</summary
		>
		<div class="grid gap-2 px-3 pb-3">
			<Field label="Kaufdatum" name="kaufdatum" error={fieldErrors?.kaufdatum}>
				<input name="kaufdatum" type="date" bind:value={formState.kaufdatum} class={inputCls} />
			</Field>
			<Field
				label="Kaufpreis (€)"
				name="kaufpreisCent"
				hint="z.B. 3,50"
				error={fieldErrors?.kaufpreisCent}
			>
				<input
					name="kaufpreisCent"
					inputmode="decimal"
					pattern={PRICE_PATTERN}
					bind:value={formState.kaufpreisCent}
					placeholder="3,50"
					class={inputCls}
				/>
			</Field>
			<Field label="Kaufort" name="kaufort" error={fieldErrors?.kaufort}>
				<input
					name="kaufort"
					bind:value={formState.kaufort}
					placeholder="Flohmarkt Schanze"
					class={inputCls}
				/>
			</Field>
		</div>
	</details>

	{#if showPhoto}
		<Field label="Foto" name="photo" hint="Kamera oder Galerie" error={fieldErrors?.photo}>
			<label
				class="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-4 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
			>
				<Camera size={20} />
				<span>Foto aufnehmen oder auswählen</span>
				<input type="file" name="photo" accept="image/*" capture="environment" class="hidden" />
			</label>
		</Field>
	{/if}

	<Field label="Bewertung" name="rating" hint="optional" error={fieldErrors?.rating}>
		<div class="flex items-center">
			<StarRating bind:value={formState.rating} name="rating" size={28} />
		</div>
	</Field>

	<Field label="Review" name="review" hint="optional" error={fieldErrors?.review}>
		<textarea
			name="review"
			rows="3"
			bind:value={formState.review}
			placeholder="Was hältst du davon?"
			class={inputCls}
		></textarea>
	</Field>

	<Field label="Notiz" name="notiz" hint="optional" error={fieldErrors?.notiz}>
		<textarea name="notiz" rows="2" bind:value={formState.notiz} class={inputCls}></textarea>
	</Field>
</div>

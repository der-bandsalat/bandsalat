<script lang="ts">
	import { formatEurInput } from '$lib/util/format';
	import StarRating from '$lib/components/StarRating.svelte';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { EditableColumn } from './columns';

	type Saved = (key: string, canonical: unknown) => void;

	type Option = { value: string; label: string };
	type Props = {
		cassetteId: string;
		column: EditableColumn;
		value: unknown;
		/** Optionen für widget 'select'. */
		options?: readonly Option[];
		onsaved?: Saved;
	};

	let { cassetteId, column, value, options = [], onsaved }: Props = $props();

	type Status = 'idle' | 'saving' | 'saved' | 'error';
	let status = $state<Status>('idle');
	let errorMsg = $state('');

	// Lokaler Bearbeitungswert für text-artige Widgets.
	function toDraft(v: unknown): string {
		if (column.widget === 'euro') return formatEurInput(v as number | null);
		if (v == null) return '';
		return String(v);
	}

	// svelte-ignore state_referenced_locally
	let draft = $state(toDraft(value));
	let focused = $state(false);
	// svelte-ignore state_referenced_locally
	let lastValue = $state(value);

	// Nur bei *echter* externer Wertänderung (Reload, Nachbar-Speichern) den
	// Entwurf übernehmen – nicht beim Fokus-Wechsel. Sonst würde der gerade
	// getippte Wert beim Blur (Parent aktualisiert erst nach dem await) kurz auf
	// den alten Wert zurückspringen bzw. bei Fehler verloren gehen.
	$effect(() => {
		if (value !== lastValue) {
			lastValue = value;
			if (!focused) draft = toDraft(value);
		}
	});

	let savedTimer: ReturnType<typeof setTimeout> | undefined;

	async function save(payloadValue: unknown) {
		status = 'saving';
		errorMsg = '';
		try {
			const res = await fetch(`/api/cassettes/${cassetteId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ [column.key]: payloadValue })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				errorMsg = body?.message ?? `Fehler ${res.status}`;
				status = 'error';
				return;
			}
			const body = await res.json().catch(() => null);
			const canonical = body?.cassette ? body.cassette[column.key] : payloadValue;
			if (column.widget !== 'rating' && column.widget !== 'checkbox') {
				draft = toDraft(canonical);
			}
			status = 'saved';
			onsaved?.(column.key, canonical);
			clearTimeout(savedTimer);
			savedTimer = setTimeout(() => {
				if (status === 'saved') status = 'idle';
			}, 1200);
		} catch {
			errorMsg = 'Netzwerkfehler';
			status = 'error';
		}
	}

	function commitText() {
		focused = false;
		const raw = draft.trim();
		if (raw === toDraft(value).trim()) return; // unverändert
		// Leerstring löscht das Feld (emptyAsNull / priceEur → null).
		save(raw);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			(e.currentTarget as HTMLElement).blur();
		} else if (e.key === 'Escape') {
			draft = toDraft(value);
			(e.currentTarget as HTMLElement).blur();
		}
	}

	function onSelectChange(e: Event) {
		save((e.currentTarget as HTMLSelectElement).value);
	}

	function onCheckboxChange(e: Event) {
		save((e.currentTarget as HTMLInputElement).checked);
	}

	const inputClass =
		'w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-brand-900';
	const errorRing = 'border-rose-400 dark:border-rose-600';
</script>

<div class="relative flex items-center gap-1">
	<div class="min-w-0 flex-1">
		{#if column.widget === 'select'}
			<select
				class="{inputClass} {status === 'error' ? errorRing : ''}"
				value={(value as string) ?? ''}
				onchange={onSelectChange}
			>
				{#if column.optionSource !== 'format'}
					<option value="">—</option>
				{/if}
				{#each options as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		{:else if column.widget === 'checkbox'}
			<input
				type="checkbox"
				class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-400 dark:border-stone-600"
				checked={Boolean(value)}
				onchange={onCheckboxChange}
			/>
		{:else if column.widget === 'rating'}
			<StarRating
				value={value as number | null}
				size={14}
				showValue={false}
				onchange={(next) => save(next)}
			/>
		{:else if column.widget === 'textarea'}
			<textarea
				rows="3"
				class="{inputClass} resize-y {status === 'error' ? errorRing : ''}"
				bind:value={draft}
				onfocus={() => (focused = true)}
				onblur={commitText}
			></textarea>
		{:else if column.widget === 'date'}
			<input
				type="date"
				class="{inputClass} {status === 'error' ? errorRing : ''}"
				bind:value={draft}
				onfocus={() => (focused = true)}
				onblur={commitText}
			/>
		{:else}
			<input
				type="text"
				inputmode={column.widget === 'number' || column.widget === 'euro' ? 'decimal' : undefined}
				class="{inputClass} {status === 'error' ? errorRing : ''}"
				bind:value={draft}
				onfocus={() => (focused = true)}
				onblur={commitText}
				onkeydown={onKeydown}
			/>
		{/if}
	</div>

	<span class="flex w-4 shrink-0 justify-center" aria-live="polite">
		{#if status === 'saving'}
			<span
				class="h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-brand-500"
				title="Speichert…"
			></span>
		{:else if status === 'saved'}
			<span class="text-emerald-500" title="Gespeichert"><Check size={14} /></span>
		{:else if status === 'error'}
			<span class="text-rose-500" title={errorMsg}><TriangleAlert size={14} /></span>
		{/if}
	</span>
</div>

<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Save from '@lucide/svelte/icons/save';
	import Disc3 from '@lucide/svelte/icons/disc-3';
	import CassetteTape from '@lucide/svelte/icons/cassette-tape';
	import Disc from '@lucide/svelte/icons/disc';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import Layers from '@lucide/svelte/icons/layers';
	import { FORMAT_LABELS, type MediaFormat } from '$lib/format';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const enabled = $state(new Set<MediaFormat>(data.enabledFormats));
	// svelte-ignore state_referenced_locally
	let dreiAuflagen = $state(data.dreiAuflagenEnabled);
	// svelte-ignore state_referenced_locally
	let formatBadgesAlways = $state(data.formatBadgesAlways);

	let submittingFormats = $state(false);
	let submittingFeatures = $state(false);

	const saved = $derived(page.url.searchParams.get('saved'));

	const formatMeta: Record<MediaFormat, { Icon: typeof CassetteTape; description: string }> = {
		cassette: {
			Icon: CassetteTape,
			description: 'Hörspielkassetten (Musikkassetten, MC). Standard.'
		},
		lp: {
			Icon: Disc3,
			description: 'Schallplatten — alle Vinylgrößen.'
		},
		cd: {
			Icon: Disc,
			description: 'CD-Audio (auch Box-Sets, Single-CDs).'
		}
	};

	function toggle(f: MediaFormat) {
		if (enabled.has(f)) {
			if (enabled.size === 1) return;
			enabled.delete(f);
		} else {
			enabled.add(f);
		}
	}
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Sammlung</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	{#if saved === 'formate'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Formate gespeichert.
		</div>
	{:else if saved === 'features'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Funktionen gespeichert.
		</div>
	{/if}

	<section
		class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<header>
			<h2 class="text-base font-semibold">Tonträger-Formate</h2>
			<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
				Welche Formate sammelst du? Mehrfach-Auswahl möglich. Bei mehr als einem Format erscheint im
				Anlege-/Edit-Formular ein Format-Picker. „Kassette" ist der unveränderliche Default.
			</p>
		</header>

		<form
			method="POST"
			action="?/saveFormats"
			use:enhance={() => {
				submittingFormats = true;
				return ({ update }) => update().finally(() => (submittingFormats = false));
			}}
			class="space-y-2"
		>
			{#each data.allFormats as f (f)}
				{@const meta = formatMeta[f]}
				{@const isOn = enabled.has(f)}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition"
					class:border-brand-300={isOn}
					class:bg-brand-50={isOn}
					class:dark:border-brand-700={isOn}
					class:dark:bg-brand-950={isOn}
					class:border-stone-200={!isOn}
					class:dark:border-stone-800={!isOn}
				>
					<input
						type="checkbox"
						name={`format_${f}`}
						checked={isOn}
						onchange={() => toggle(f)}
						class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
					/>
					<meta.Icon
						size={20}
						class={isOn ? 'text-brand-600 dark:text-brand-300' : 'text-stone-400'}
					/>
					<div class="min-w-0 flex-1">
						<div class="text-sm font-medium">{FORMAT_LABELS[f]}</div>
						<div class="text-xs text-stone-500 dark:text-stone-400">{meta.description}</div>
					</div>
				</label>
			{/each}

			<button
				type="submit"
				disabled={submittingFormats}
				class="mt-2 flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
			>
				<Save size={14} />
				{submittingFormats ? 'Speichere…' : 'Formate speichern'}
			</button>
		</form>
	</section>

	<section
		class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<header>
			<h2 class="text-base font-semibold">Zusatz-Funktionen</h2>
			<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
				Spezielle Tracking-Features pro Serie. Aus, wenn nicht benötigt.
			</p>
		</header>

		<form
			method="POST"
			action="?/saveFeatures"
			use:enhance={() => {
				submittingFeatures = true;
				return ({ update }) => update().finally(() => (submittingFeatures = false));
			}}
			class="space-y-2"
		>
			<label
				class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition"
				class:border-brand-300={dreiAuflagen}
				class:bg-brand-50={dreiAuflagen}
				class:dark:border-brand-700={dreiAuflagen}
				class:dark:bg-brand-950={dreiAuflagen}
				class:border-stone-200={!dreiAuflagen}
				class:dark:border-stone-800={!dreiAuflagen}
			>
				<input
					type="checkbox"
					name="drei_auflagen"
					bind:checked={dreiAuflagen}
					class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
				/>
				<Layers
					size={20}
					class={dreiAuflagen ? 'text-brand-600 dark:text-brand-300' : 'text-stone-400'}
				/>
				<div class="min-w-0 flex-1">
					<div class="text-sm font-medium">Drei ??? – Auflagen / Editionen tracken</div>
					<div class="text-xs text-stone-500 dark:text-stone-400">
						Pro Folge bekannte Kassetten-Pressungen (Discogs + manuell) verwalten und
						besessen-Status markieren. Aktiviert den „Auflagen"-Link in der Serien-Detail-Ansicht
						und die Route
						<code>/serien/Die drei ???/auflagen</code>.
					</div>
				</div>
			</label>

			<label
				class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition"
				class:border-brand-300={formatBadgesAlways}
				class:bg-brand-50={formatBadgesAlways}
				class:dark:border-brand-700={formatBadgesAlways}
				class:dark:bg-brand-950={formatBadgesAlways}
				class:border-stone-200={!formatBadgesAlways}
				class:dark:border-stone-800={!formatBadgesAlways}
			>
				<input
					type="checkbox"
					name="format_badges_always"
					bind:checked={formatBadgesAlways}
					class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
				/>
				<CassetteTape
					size={20}
					class={formatBadgesAlways ? 'text-brand-600 dark:text-brand-300' : 'text-stone-400'}
				/>
				<div class="min-w-0 flex-1">
					<div class="text-sm font-medium">Format immer anzeigen (MC/CD/LP)</div>
					<div class="text-xs text-stone-500 dark:text-stone-400">
						Jede Folge trägt ihr Format-Badge in Listen- und Cover-Ansichten. Ausgeschaltet
						erscheinen Badges automatisch nur bei gemischten Listen und bei CD/LP.
					</div>
				</div>
			</label>

			<button
				type="submit"
				disabled={submittingFeatures}
				class="mt-2 flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
			>
				<Save size={14} />
				{submittingFeatures ? 'Speichere…' : 'Funktionen speichern'}
			</button>
		</form>
	</section>
</main>

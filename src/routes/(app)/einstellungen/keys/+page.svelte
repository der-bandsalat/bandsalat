<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Save from '@lucide/svelte/icons/save';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Plug from '@lucide/svelte/icons/plug-zap';

	let { data, form } = $props();

	let showDiscogsToken = $state(false);
	let showAnthropicKey = $state(false);
	let submittingDiscogs = $state(false);
	let submittingAnthropic = $state(false);
	let testingDiscogs = $state(false);
	let testingAnthropic = $state(false);

	const saved = $derived(page.url.searchParams.get('saved'));

	type ModelOption = { id: string; label: string; note: string };
	const PRESET_MODELS: readonly ModelOption[] = [
		{
			id: 'claude-haiku-4-5-20251001',
			label: 'Haiku 4.5',
			note: 'Schnell + günstig (~$0,001/Scan) · Empfohlen'
		},
		{
			id: 'claude-sonnet-4-6',
			label: 'Sonnet 4.6',
			note: 'Robuster bei schwierigen Covern (~$0,01/Scan)'
		},
		{
			id: 'claude-opus-4-7',
			label: 'Opus 4.7',
			note: 'Höchste Genauigkeit, deutlich teurer (~$0,05/Scan)'
		}
	];

	// Wenn aktuelles Modell aus DB/env keiner Preset-ID entspricht, wechseln
	// wir initial in den Custom-Modus.
	// svelte-ignore state_referenced_locally
	const initialHint = data.states.scanModel.hint;
	const isCustomInitial = (() => {
		if (!initialHint) return false;
		return !PRESET_MODELS.some((m) => m.id.endsWith(initialHint.replace(/^…/, '')));
	})();
	let modelChoice = $state<string>(isCustomInitial ? 'custom' : PRESET_MODELS[0].id);
	let customModel = $state('');

	function sourceLabel(state: { source: 'env' | 'db' | 'missing'; hint: string | null }): string {
		if (state.source === 'db') return `Datenbank · ${state.hint}`;
		if (state.source === 'env') return `Umgebungsvariable · ${state.hint}`;
		return 'nicht gesetzt';
	}
	function sourcePill(state: { source: 'env' | 'db' | 'missing' }): string {
		if (state.source === 'db')
			return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
		if (state.source === 'env')
			return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300';
		return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
	}
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">API-Keys & Tokens</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	<p class="text-xs text-stone-500 dark:text-stone-400">
		Werte, die du hier setzt, werden in der App-Datenbank gespeichert und haben Vorrang vor
		gleichnamigen Umgebungsvariablen. Damit lassen sich Tokens rotieren ohne Container-Restart.
	</p>

	{#if saved === 'discogs'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Discogs-Daten gespeichert.
		</div>
	{:else if saved === 'anthropic'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Anthropic-Daten gespeichert.
		</div>
	{:else if saved === 'cleared'}
		<div
			class="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
		>
			<Trash2 size={16} />
			Override gelöscht. Fällt jetzt zurück auf Umgebungsvariablen (sofern gesetzt).
		</div>
	{/if}

	{#if form?.testResult}
		<div
			class="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm {form.testResult.ok
				? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
				: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300'}"
		>
			{#if form.testResult.ok}
				<CheckCircle2 size={16} class="mt-0.5 shrink-0" />
			{:else}
				<AlertTriangle size={16} class="mt-0.5 shrink-0" />
			{/if}
			<div class="min-w-0 flex-1 whitespace-pre-wrap">{form.testResult.message}</div>
		</div>
	{/if}

	<section
		class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<header class="flex items-baseline justify-between gap-2">
			<h2 class="text-base font-semibold">Discogs</h2>
			<div class="flex flex-col items-end gap-1 text-[10px]">
				<span class="rounded-full px-2 py-0.5 font-medium {sourcePill(data.states.discogsToken)}">
					Token: {sourceLabel(data.states.discogsToken)}
				</span>
				<span
					class="rounded-full px-2 py-0.5 font-medium {sourcePill(data.states.discogsUsername)}"
				>
					User: {sourceLabel(data.states.discogsUsername)}
				</span>
			</div>
		</header>
		<p class="text-xs text-stone-500 dark:text-stone-400">
			Personal Access Token aus
			<a
				href="https://www.discogs.com/settings/developers"
				target="_blank"
				rel="noopener"
				class="underline">discogs.com/settings/developers</a
			>. Der Username ist dein Login-Name bei Discogs (für Collection-Sync).
		</p>
		<form
			method="POST"
			action="?/saveDiscogs"
			use:enhance={({ formData, submitter }) => {
				const action =
					(submitter instanceof HTMLButtonElement && submitter.formAction) || 'saveDiscogs';
				const isTest = /testDiscogs/.test(action);
				if (isTest) testingDiscogs = true;
				else submittingDiscogs = true;
				return ({ update }) =>
					update().finally(() => {
						testingDiscogs = false;
						submittingDiscogs = false;
					});
			}}
			class="space-y-2"
		>
			<label class="block">
				<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Token</span>
				<div class="relative">
					<input
						type={showDiscogsToken ? 'text' : 'password'}
						name="discogs_token"
						autocomplete="off"
						spellcheck="false"
						placeholder={data.states.discogsToken.source !== 'missing'
							? `aktuell gesetzt (${data.states.discogsToken.hint ?? '…'}) — leer lassen zum behalten`
							: 'ESBZoFibfb…'}
						class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 pr-10 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
					/>
					<button
						type="button"
						onclick={() => (showDiscogsToken = !showDiscogsToken)}
						class="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
						aria-label={showDiscogsToken ? 'Verbergen' : 'Anzeigen'}
					>
						{#if showDiscogsToken}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
					</button>
				</div>
			</label>
			<label class="block">
				<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400"
					>Username</span
				>
				<input
					type="text"
					name="discogs_username"
					autocomplete="off"
					spellcheck="false"
					placeholder="dein-discogs-username"
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			<div class="flex flex-wrap gap-2 pt-1">
				<button
					type="submit"
					disabled={submittingDiscogs}
					class="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					<Save size={14} />
					{submittingDiscogs ? 'Speichere…' : 'Speichern'}
				</button>
				<button
					type="submit"
					formaction="?/testDiscogs"
					disabled={testingDiscogs}
					class="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
				>
					<Plug size={14} />
					{testingDiscogs ? 'Teste…' : 'Verbindung testen'}
				</button>
				<button
					type="submit"
					formaction="?/clearDiscogs"
					class="ml-auto flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
				>
					<Trash2 size={14} />
					Override löschen
				</button>
			</div>
		</form>
	</section>

	<section
		class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<header class="flex items-baseline justify-between gap-2">
			<h2 class="text-base font-semibold">Anthropic (Foto-Scan)</h2>
			<div class="flex flex-col items-end gap-1 text-[10px]">
				<span class="rounded-full px-2 py-0.5 font-medium {sourcePill(data.states.anthropicKey)}">
					Key: {sourceLabel(data.states.anthropicKey)}
				</span>
				<span class="rounded-full px-2 py-0.5 font-medium {sourcePill(data.states.scanModel)}">
					Modell: {sourceLabel(data.states.scanModel)}
				</span>
			</div>
		</header>
		<p class="text-xs text-stone-500 dark:text-stone-400">
			API-Key aus der
			<a
				href="https://console.anthropic.com/settings/keys"
				target="_blank"
				rel="noopener"
				class="underline">Anthropic Console</a
			>. Ohne Key bleibt der Kamera-Scan in /kassetten/neu ausgeblendet.
		</p>
		<form
			method="POST"
			action="?/saveAnthropic"
			use:enhance={({ submitter }) => {
				const action =
					(submitter instanceof HTMLButtonElement && submitter.formAction) || 'saveAnthropic';
				const isTest = /testAnthropic/.test(action);
				if (isTest) testingAnthropic = true;
				else submittingAnthropic = true;
				return ({ update }) =>
					update().finally(() => {
						testingAnthropic = false;
						submittingAnthropic = false;
					});
			}}
			class="space-y-2"
		>
			<label class="block">
				<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400"
					>API-Key</span
				>
				<div class="relative">
					<input
						type={showAnthropicKey ? 'text' : 'password'}
						name="anthropic_key"
						autocomplete="off"
						spellcheck="false"
						placeholder={data.states.anthropicKey.source !== 'missing'
							? `aktuell gesetzt (${data.states.anthropicKey.hint ?? '…'}) — leer lassen zum behalten`
							: 'sk-ant-api03-…'}
						class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 pr-10 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
					/>
					<button
						type="button"
						onclick={() => (showAnthropicKey = !showAnthropicKey)}
						class="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
						aria-label={showAnthropicKey ? 'Verbergen' : 'Anzeigen'}
					>
						{#if showAnthropicKey}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
					</button>
				</div>
			</label>
			<div>
				<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
					Scan-Modell
				</span>
				<select
					bind:value={modelChoice}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				>
					{#each PRESET_MODELS as m (m.id)}
						<option value={m.id}>{m.label} — {m.note}</option>
					{/each}
					<option value="custom">Eigenes Modell-ID eingeben…</option>
				</select>
				{#if modelChoice === 'custom'}
					<input
						type="text"
						name="scan_model"
						bind:value={customModel}
						autocomplete="off"
						spellcheck="false"
						placeholder="z.B. claude-sonnet-4-5-20250929"
						class="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
					/>
				{:else}
					<input type="hidden" name="scan_model" value={modelChoice} />
				{/if}
				<span class="mt-1 block text-[11px] text-stone-500 dark:text-stone-400">
					Aktuell: <code>{initialHint ?? 'env-Default'}</code>. Speichern überschreibt die
					Umgebungsvariable.
				</span>
			</div>
			<div class="flex flex-wrap gap-2 pt-1">
				<button
					type="submit"
					disabled={submittingAnthropic}
					class="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					<Save size={14} />
					{submittingAnthropic ? 'Speichere…' : 'Speichern'}
				</button>
				<button
					type="submit"
					formaction="?/testAnthropic"
					disabled={testingAnthropic}
					class="flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
				>
					<Plug size={14} />
					{testingAnthropic ? 'Teste…' : 'Verbindung testen'}
				</button>
				<button
					type="submit"
					formaction="?/clearAnthropic"
					class="ml-auto flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
				>
					<Trash2 size={14} />
					Override löschen
				</button>
			</div>
		</form>
	</section>
</main>

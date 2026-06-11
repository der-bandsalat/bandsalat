<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandTitle from '$lib/components/BrandTitle.svelte';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { formatRelative } from '$lib/util/format';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Loader2 from '@lucide/svelte/icons/loader-circle';
	import Play from '@lucide/svelte/icons/play';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import DownloadCloud from '@lucide/svelte/icons/download-cloud';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let livestatus = $state(data.status);
	// svelte-ignore state_referenced_locally
	let livestats = $state(data.stats);
	// svelte-ignore state_referenced_locally
	let livePullStatus = $state(data.pullStatus);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function poll() {
		try {
			const res = await fetch('/api/sync/status');
			const body = await res.json();
			livestatus = body.status;
			livestats = body.stats;
			livePullStatus = body.pullStatus;
			if (!livestatus.running && !livePullStatus.running && pollTimer) {
				clearInterval(pollTimer);
				pollTimer = null;
				invalidate('/sync');
			}
		} catch {
			// ignore — kommt im nächsten Tick wieder
		}
	}

	$effect(() => {
		if ((livestatus.running || livePullStatus.running) && !pollTimer) {
			pollTimer = setInterval(poll, 1500);
		}
		return () => {
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	const progressPct = $derived(
		livestatus.total === 0 ? 0 : Math.round((livestatus.done / livestatus.total) * 100)
	);

	const pullProgressPct = $derived(
		livePullStatus.total === 0 ? 0 : Math.round((livePullStatus.done / livePullStatus.total) * 100)
	);
</script>

<AppHeader>
	{#snippet children()}
		<BrandTitle />
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4">
	{#if !data.hasToken}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
		>
			<strong>Discogs nicht konfiguriert.</strong>
			Hinterlege Token und Username unter
			<a href="/einstellungen/keys" class="underline">Einstellungen → Keys</a>
			(alternativ <code>DISCOGS_TOKEN</code>/<code>DISCOGS_USERNAME</code> in der
			<code>.env</code>). Token erstellen unter
			<a
				href="https://www.discogs.com/settings/developers"
				target="_blank"
				rel="noopener"
				class="underline">discogs.com → Settings → Developers</a
			>.
		</div>
	{:else}
		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-sm font-semibold">Verbindung</h2>
				<form method="POST" action="?/testToken" use:enhance>
					<button
						class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
					>
						<KeyRound size={14} />
						Token testen
					</button>
				</form>
			</div>
			<dl class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<dt class="text-xs text-stone-500">Username</dt>
					<dd class="font-mono">{data.username}</dd>
				</div>
				<div>
					<dt class="text-xs text-stone-500">Folder</dt>
					<dd>{data.folder.name ?? '—'} {data.folder.id ? `(#${data.folder.id})` : ''}</dd>
				</div>
			</dl>
			{#if form?.tokenOk}
				<p class="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
					Token OK · eingeloggt als {form?.identity?.username ?? '?'}
				</p>
			{/if}
			{#if form?.tokenError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.tokenError}
				</p>
			{/if}
		</section>

		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="mb-2 text-sm font-semibold">Folder wählen / anlegen</h2>
			{#if data.folder.error}
				<p
					class="mb-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{data.folder.error}
				</p>
			{:else if data.folders.length > 0}
				<ul class="mb-3 space-y-1 text-sm">
					{#each data.folders as f (f.id)}
						<li
							class="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-800"
						>
							<span class="flex items-center gap-2 truncate">
								{#if f.cached}<CheckCircle2 size={14} class="text-emerald-600" />{/if}
								{f.name}
								<span class="text-xs text-stone-500">({f.count})</span>
							</span>
							{#if !f.cached}
								<form method="POST" action="?/pickFolder" use:enhance>
									<input type="hidden" name="id" value={f.id} />
									<input type="hidden" name="name" value={f.name} />
									<button
										class="rounded-md px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
										>Auswählen</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<form method="POST" action="?/createFolder" use:enhance class="flex items-center gap-2">
				<input
					type="text"
					name="name"
					placeholder="Hörspielkassetten"
					required
					class="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
				/>
				<button
					class="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					<FolderPlus size={14} />
					Anlegen
				</button>
			</form>
			{#if form?.folderError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.folderError}
				</p>
			{/if}
		</section>

		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="mb-3 text-sm font-semibold">Status</h2>
			<div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
				<div class="rounded-lg border border-stone-200 px-2 py-2 text-center dark:border-stone-800">
					<div class="text-xs text-stone-500">Gesamt</div>
					<div class="text-lg font-semibold">{livestats.total}</div>
				</div>
				<div class="rounded-lg border border-stone-200 px-2 py-2 text-center dark:border-stone-800">
					<div class="text-xs text-stone-500">Mit Discogs</div>
					<div class="text-lg font-semibold">{livestats.withRelease}</div>
				</div>
				<div
					class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950"
				>
					<div class="text-xs text-emerald-700 dark:text-emerald-300">Gepusht</div>
					<div class="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
						{livestats.pushed}
					</div>
				</div>
				<div
					class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-center dark:border-amber-900 dark:bg-amber-950"
				>
					<div class="text-xs text-amber-700 dark:text-amber-300">Offen</div>
					<div class="text-lg font-semibold text-amber-700 dark:text-amber-300">
						{livestats.pushable}
					</div>
				</div>
			</div>

			{#if livestatus.running}
				<div class="mt-4 space-y-2">
					<div class="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
						<span class="inline-flex items-center gap-1">
							<Loader2 size={14} class="animate-spin" />
							{livestatus.done} / {livestatus.total} · {progressPct}%
						</span>
						{#if livestatus.current}
							<span class="truncate">{livestatus.current.serie} · {livestatus.current.titel}</span>
						{/if}
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
						<div
							class="h-full bg-emerald-500 transition-[width] duration-300"
							style:width={`${progressPct}%`}
						></div>
					</div>
				</div>
			{:else if livestatus.finishedAt}
				<div class="mt-4 text-xs text-stone-500 dark:text-stone-400">
					Letzter Lauf {formatRelative(new Date(livestatus.finishedAt).toISOString())} ·
					<span class="text-emerald-700 dark:text-emerald-400">{livestatus.succeeded} ok</span>
					{#if livestatus.failed > 0}
						·
						<span class="text-rose-700 dark:text-rose-400">{livestatus.failed} fehlerhaft</span>
					{/if}
				</div>
			{/if}

			<div class="mt-4 flex gap-2">
				<form method="POST" action="?/startBulkPush" use:enhance class="flex-1">
					<button
						class="flex w-full items-center justify-center gap-1 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
						disabled={livestatus.running || livestats.pushable === 0}
					>
						<Play size={16} />
						{livestatus.running ? 'Läuft…' : `${livestats.pushable} ungesyncte pushen`}
					</button>
				</form>
				{#if !livestatus.running && livestatus.finishedAt}
					<form method="POST" action="?/resetStatus" use:enhance>
						<button
							class="flex h-full items-center gap-1 rounded-xl border border-stone-300 px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
						>
							<RotateCcw size={14} />
							Reset
						</button>
					</form>
				{/if}
			</div>

			{#if form?.bulkError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.bulkError}
				</p>
			{/if}
		</section>

		<!-- Bulk-Pull: aus Discogs zurückholen -->
		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold">
				<DownloadCloud size={16} class="text-brand-500" />
				Aus Discogs zurückholen
			</h2>
			<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
				Holt für alle verknüpften Folgen die aktuellen Daten von Discogs. Nützlich um Titel, Label,
				Jahr und Cover auf einheitliche Schreibweise zu bringen.
			</p>

			{#if livePullStatus.running}
				<div class="space-y-2">
					<div class="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
						<span class="inline-flex items-center gap-1">
							<Loader2 size={14} class="animate-spin" />
							{livePullStatus.done} / {livePullStatus.total} · {pullProgressPct}%
						</span>
						{#if livePullStatus.current}
							<span class="truncate"
								>{livePullStatus.current.serie} · {livePullStatus.current.titel}</span
							>
						{/if}
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
						<div
							class="h-full bg-brand-500 transition-[width] duration-300"
							style:width={`${pullProgressPct}%`}
						></div>
					</div>
				</div>
			{:else if livePullStatus.finishedAt}
				<div class="mb-3 text-xs text-stone-500 dark:text-stone-400">
					Letzter Lauf {formatRelative(new Date(livePullStatus.finishedAt).toISOString())} ·
					<span class="text-emerald-700 dark:text-emerald-400">{livePullStatus.succeeded} ok</span>
					{#if livePullStatus.failed > 0}
						·
						<span class="text-rose-700 dark:text-rose-400">{livePullStatus.failed} fehlerhaft</span>
					{/if}
					{#if livePullStatus.overrideAll}
						<span
							class="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
							>Override</span
						>
					{/if}
				</div>
			{/if}

			<form method="POST" action="?/startBulkPull" use:enhance class="grid gap-2 sm:grid-cols-2">
				<button
					type="submit"
					disabled={livePullStatus.running || livestats.withRelease === 0}
					class="flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
					title="Füllt nur fehlende Felder, lässt manuell gesetzte Werte unverändert"
				>
					<DownloadCloud size={16} />
					{livePullStatus.running ? 'Läuft…' : `${livestats.withRelease} Folgen ergänzen`}
				</button>
				<button
					type="submit"
					name="override"
					value="on"
					disabled={livePullStatus.running || livestats.withRelease === 0}
					onclick={(e) => {
						const msg = `Titel, Folge-Nr, Label, Jahr und Cover von ${livestats.withRelease} Folgen mit den aktuellen Discogs-Daten überschreiben?\n\nManuelle Änderungen an diesen Feldern gehen verloren. Serie bleibt unverändert.`;
						if (!window.confirm(msg)) e.preventDefault();
					}}
					class="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
					title="Überschreibt Titel/Label/Jahr/Cover/Folge-Nr mit aktuellen Discogs-Daten — sinnvoll zum Normalisieren"
				>
					<RefreshCw size={16} />
					{livePullStatus.running ? 'Synce…' : 'Alle aus Discogs neu laden'}
				</button>
			</form>

			{#if !livePullStatus.running && livePullStatus.finishedAt}
				<form method="POST" action="?/resetPullStatus" use:enhance class="mt-2 text-right">
					<button class="text-[11px] text-stone-500 hover:underline dark:text-stone-400">
						Status zurücksetzen
					</button>
				</form>
			{/if}

			{#if form?.pullError}
				<p
					class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.pullError}
				</p>
			{/if}
		</section>

		{#if livePullStatus.errors.length > 0 && !livePullStatus.running}
			<section
				class="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
			>
				<h2
					class="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"
				>
					<AlertCircle size={16} />
					Pull-Fehler ({livePullStatus.errors.length})
				</h2>
				<ul class="space-y-1 text-xs text-amber-700 dark:text-amber-300">
					{#each livePullStatus.errors as err (err.at + err.cassetteId)}
						<li class="rounded-md bg-white/50 px-2 py-1 dark:bg-stone-900/30">
							<a href={`/kassetten/${err.cassetteId}`} class="font-medium hover:underline">
								{err.serie}{err.titel ? ` · ${err.titel}` : ''}
							</a>
							<div class="opacity-80">{err.message}</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if livestatus.errors.length > 0}
			<section
				class="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40"
			>
				<h2
					class="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300"
				>
					<AlertCircle size={16} />
					Fehler ({livestatus.errors.length})
				</h2>
				<ul class="space-y-1 text-xs text-rose-700 dark:text-rose-300">
					{#each livestatus.errors as err (err.at + err.cassetteId)}
						<li class="rounded-md bg-white/50 px-2 py-1 dark:bg-stone-900/30">
							<a
								href={err.cassetteId ? `/kassetten/${err.cassetteId}` : '#'}
								class="font-medium hover:underline"
							>
								{err.serie}{err.titel ? ` · ${err.titel}` : ''}
							</a>
							<div class="opacity-80">{err.message}</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</main>

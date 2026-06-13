<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import Download from '@lucide/svelte/icons/download';
	import Database from '@lucide/svelte/icons/database';
	import FileJson from '@lucide/svelte/icons/file-json';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Upload from '@lucide/svelte/icons/upload';
	import LogOut from '@lucide/svelte/icons/log-out';
	import BarChart3 from '@lucide/svelte/icons/chart-column';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Palette from '@lucide/svelte/icons/palette';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Library from '@lucide/svelte/icons/library';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import UserCircle from '@lucide/svelte/icons/circle-user';
	import Users from '@lucide/svelte/icons/users';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Type from '@lucide/svelte/icons/type';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Image from '@lucide/svelte/icons/image';
	import BrandTitle from '$lib/components/BrandTitle.svelte';

	let { data, form } = $props();
	let importing = $state(false);
</script>

<AppHeader>
	{#snippet children()}
		<BrandTitle />
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4">
	{#if data.me}
		<div
			class="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="flex items-center gap-3">
				<UserCircle size={28} class="shrink-0 text-stone-400" />
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline gap-2">
						<span class="font-semibold">{data.me.username}</span>
						<span
							class="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300"
						>
							{data.me.role}
						</span>
					</div>
					<div class="truncate text-xs text-stone-500 dark:text-stone-400">{data.me.email}</div>
				</div>
				<a
					href="/einstellungen/profil"
					class="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					Profil
				</a>
			</div>
		</div>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		{#if data.me?.role === 'admin'}
			<a
				href="/einstellungen/users"
				class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
			>
				<span class="flex min-w-0 items-center gap-3">
					<span
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
					>
						<Users size={20} />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">Benutzer-Verwaltung</span>
						<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
							Accounts, Rollen, Passwörter
						</span>
					</span>
				</span>
				<ArrowRight size={18} class="shrink-0 text-stone-400" />
			</a>
		{/if}
		<a
			href="/statistik"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
				>
					<BarChart3 size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Statistik</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Wachstum, Zustand, Labels
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/sync"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
				>
					<RefreshCw size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Discogs-Sync</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Token, Folder, Bulk-Push
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/wantlist"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
				>
					<Sparkles size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Wantlist</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Folgen, die du aktuell suchst
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/shares"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300"
				>
					<Share2 size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Share-Links</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Public Read-Only-Links für Serien
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/transfer"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
				>
					<ArrowLeftRight size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Export & Import</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						CSV/Excel mit Spalten-Mapping
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/sammlung"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
				>
					<Library size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Sammlung</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Formate (MC/LP/CD) · Drei???-Auflagen
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/keys"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
				>
					<KeyRound size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">API-Keys & Tokens</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Discogs · Anthropic · Scan-Modell
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/brand-logo"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
				>
					<Image size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">App-Brand-Logo</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Variante wählen · eigenes Logo hochladen
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/font-lab"
			class="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-amber-900 dark:bg-amber-950"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
				>
					<Type size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Font-Lab (Experiment)</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Schriftarten ausprobieren — nicht persistent
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/theme"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
				>
					<Palette size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Erscheinungsbild</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Theme: Hell · Dunkel · HiFi Schwarz-Gold · System
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
		<a
			href="/einstellungen/hilfe"
			class="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-[transform,box-shadow] duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
				>
					<BookOpen size={20} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-semibold">Hilfe & Handbuch</span>
					<span class="block truncate text-xs text-stone-500 dark:text-stone-400">
						Alle Funktionen & Optionen erklärt
					</span>
				</span>
			</span>
			<ArrowRight size={18} class="shrink-0 text-stone-400" />
		</a>
	</div>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-2 text-sm font-semibold">Sammlung</h2>
		<dl class="grid grid-cols-2 gap-2 text-sm">
			<div>
				<dt class="text-xs text-stone-500">Einträge gesamt</dt>
				<dd class="text-lg font-semibold">{data.total}</dd>
			</div>
			<div>
				<dt class="text-xs text-stone-500">Daten-Verzeichnis</dt>
				<dd class="break-all font-mono text-xs">{data.dataDir}</dd>
			</div>
			<div>
				<dt class="text-xs text-stone-500">Discogs-Folder</dt>
				<dd>{data.folderName ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-xs text-stone-500">Discogs konfiguriert</dt>
				<dd>{data.hasDiscogs ? 'ja' : 'nein'}</dd>
			</div>
		</dl>
	</section>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			<Download size={16} />
			Export
		</h2>
		<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
			Vollständiges Backup = SQLite-Datei + <code>uploads/</code>-Ordner (im Volume).
		</p>
		<div class="grid gap-2">
			<a
				href="/einstellungen/export/sqlite"
				class="flex items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
			>
				<span class="inline-flex items-center gap-2"><Database size={16} />SQLite-Snapshot</span>
				<span class="text-xs text-stone-500">.sqlite</span>
			</a>
			<a
				href="/einstellungen/export/json"
				class="flex items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
			>
				<span class="inline-flex items-center gap-2"><FileJson size={16} />JSON-Dump</span>
				<span class="text-xs text-stone-500">.json</span>
			</a>
			<a
				href="/einstellungen/export/discogs-csv"
				class="flex items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
			>
				<span class="inline-flex items-center gap-2"
					><FileSpreadsheet size={16} />Discogs-Collection-CSV</span
				>
				<span class="text-xs text-stone-500">.csv</span>
			</a>
		</div>
	</section>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			<Upload size={16} />
			Import (Discogs-CSV)
		</h2>
		<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
			Importiert Einträge aus einer Discogs-Collection-CSV. Existierende Einträge (gleiche
			<code>release_id</code>) werden übersprungen. Maximal 10 MiB.
		</p>
		<form
			method="POST"
			action="?/importCsv"
			enctype="multipart/form-data"
			use:enhance={() => {
				importing = true;
				return ({ update }) => update().finally(() => (importing = false));
			}}
		>
			<label
				class="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-3 text-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
			>
				<input type="file" name="file" accept="text/csv,.csv" required class="flex-1" />
			</label>
			<button
				disabled={importing}
				class="mt-2 w-full rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
			>
				{importing ? 'Importiere…' : 'Importieren'}
			</button>
		</form>
		{#if form?.importError}
			<p
				class="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
			>
				{form.importError}
			</p>
		{/if}
		{#if form?.importSummary}
			<div
				class="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
			>
				{form.importSummary.imported} importiert · {form.importSummary.skipped} übersprungen · {form
					.importSummary.errors} Fehler ({form.importSummary.total} Zeilen)
				{#if form.importSummary.errorLines.length > 0}
					<ul class="mt-1 list-disc pl-4">
						{#each form.importSummary.errorLines as l (l.line)}
							<li>Zeile {l.line}: {l.msg}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-2 text-sm font-semibold">Backup / Restore</h2>
		<details>
			<summary class="cursor-pointer text-sm text-stone-600 dark:text-stone-400">Anleitung</summary>
			<div class="mt-2 space-y-2 text-xs text-stone-600 dark:text-stone-400">
				<p>
					<strong>Backup</strong>: Sichere den Inhalt des Docker-Volumes <code>bandsalat-data</code>
					(intern <code>/data</code>). Das enthält <code>bandsalat.sqlite</code> und
					<code>uploads/</code>.
				</p>
				<p>Nächtliches Skript Beispiel (cron auf Host):</p>
				<pre class="overflow-x-auto rounded-md bg-stone-100 px-2 py-1 dark:bg-stone-800"><code
						>./scripts/backup.sh /pfad/zu/backups</code
					></pre>
				<p>
					<strong>Restore</strong>: App stoppen, SQLite-Datei + uploads/ ins Volume zurückspielen,
					App starten.
				</p>
			</div>
		</details>
	</section>

	<form method="POST" action="/logout" class="pt-4 text-center">
		<button
			class="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
		>
			<LogOut size={14} />
			Abmelden
		</button>
	</form>

	<footer
		class="pt-2 text-center font-display text-[11px] tracking-wider text-stone-400 dark:text-stone-600"
	>
		Bandsalat
		<span class="font-semibold">v{__APP_VERSION__}</span>
		·
		<a
			href="https://github.com/der-bandsalat/bandsalat"
			target="_blank"
			rel="noopener"
			class="underline decoration-dotted underline-offset-2 hover:text-brand-600 dark:hover:text-brand-400"
		>
			GitHub
		</a>
	</footer>
</main>

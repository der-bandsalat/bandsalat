<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import { FORMAT_LABELS, type MediaFormat } from '$lib/format';

	let { data, form } = $props();

	let tab = $state<'export' | 'import'>('export');

	// Export-State
	let exportSerie = $state('');
	let exportFormat = $state('');
	let exportOutFmt = $state<'csv' | 'xlsx'>('xlsx');
	// svelte-ignore state_referenced_locally
	const colChecked = $state<Record<string, boolean>>(
		Object.fromEntries(data.columns.map((c) => [c.key, true]))
	);

	let importing = $state(false);
	let parsing = $state(false);

	// Map-Stage als $derived (mit Typ-Narrowing) — die Sub-Felder sind
	// nur in dieser Stage definiert.
	const mapStage = $derived.by(() => {
		if (form?.stage !== 'map') return null;
		return {
			filename: form.filename ?? '',
			headers: form.headers ?? [],
			previewRows: form.previewRows ?? [],
			allRows: form.allRows ?? [],
			mapping: form.mapping ?? {},
			importError: form.importError ?? null
		};
	});
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Export & Import</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	<div class="flex gap-1 rounded-full bg-stone-100 p-1 text-sm dark:bg-stone-800">
		<button
			type="button"
			onclick={() => (tab = 'export')}
			class="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 font-medium"
			class:bg-white={tab === 'export'}
			class:dark:bg-stone-900={tab === 'export'}
			class:text-stone-500={tab !== 'export'}
		>
			<Download size={14} /> Export
		</button>
		<button
			type="button"
			onclick={() => (tab = 'import')}
			class="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 font-medium"
			class:bg-white={tab === 'import'}
			class:dark:bg-stone-900={tab === 'import'}
			class:text-stone-500={tab !== 'import'}
		>
			<Upload size={14} /> Import
		</button>
	</div>

	{#if tab === 'export'}
		<section
			class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="text-base font-semibold">Export als CSV oder Excel</h2>
			<p class="text-xs text-stone-500 dark:text-stone-400">
				Wähle Umfang, Format und Spalten. Eine UTF-8-BOM ist im CSV-Export enthalten, damit Umlaute
				in Excel korrekt ankommen.
			</p>

			<form method="POST" action="/einstellungen/transfer/export" target="_blank" class="space-y-3">
				<div class="grid gap-2 sm:grid-cols-2">
					<label class="block">
						<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
							Serie filtern
						</span>
						<select
							name="serie"
							bind:value={exportSerie}
							class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
						>
							<option value="">Alle Serien</option>
							{#each data.serien as s (s)}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
							Format filtern
						</span>
						<select
							name="format"
							bind:value={exportFormat}
							class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
						>
							<option value="">Alle Formate</option>
							{#each data.formats as f (f)}
								<option value={f}>{FORMAT_LABELS[f as MediaFormat]}</option>
							{/each}
						</select>
					</label>
				</div>

				<fieldset>
					<legend class="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
						Spalten
					</legend>
					<div
						class="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 p-2 text-xs dark:border-stone-800 sm:grid-cols-3"
					>
						{#each data.columns as c (c.key)}
							<label class="flex items-center gap-2 truncate">
								<input
									type="checkbox"
									name={`col_${c.key}`}
									bind:checked={colChecked[c.key]}
									class="h-3.5 w-3.5 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
								/>
								<span class="truncate">{c.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="flex items-center gap-3 text-sm">
					<span class="font-medium">Datei-Format:</span>
					<label class="flex items-center gap-1.5">
						<input type="radio" name="outFormat" value="xlsx" bind:group={exportOutFmt} />
						<FileSpreadsheet size={14} class="text-emerald-600" />
						<span>Excel (.xlsx)</span>
					</label>
					<label class="flex items-center gap-1.5">
						<input type="radio" name="outFormat" value="csv" bind:group={exportOutFmt} />
						<span>CSV</span>
					</label>
				</div>

				<button
					type="submit"
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600"
				>
					<Download size={16} />
					Herunterladen
				</button>
			</form>
		</section>
	{:else}
		<section
			class="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="text-base font-semibold">Import aus CSV oder Excel</h2>
			<p class="text-xs text-stone-500 dark:text-stone-400">
				Datei hochladen, dann pro Spalte zuordnen welches Bandsalat-Feld gemeint ist. Pflicht:
				„Serie" und „Titel" müssen gemappt sein.
			</p>

			{#if form?.stage === 'done' && form.summary}
				<div
					class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950"
				>
					<div
						class="mb-1 flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300"
					>
						<CheckCircle2 size={16} />
						Import abgeschlossen
					</div>
					<dl class="grid grid-cols-3 gap-2 text-xs">
						<div>
							<dt class="text-stone-500">Importiert</dt>
							<dd class="text-lg font-semibold tabular-nums">{form.summary.imported}</dd>
						</div>
						<div>
							<dt class="text-stone-500">Übersprungen</dt>
							<dd class="text-lg font-semibold tabular-nums">{form.summary.skipped}</dd>
						</div>
						<div>
							<dt class="text-stone-500">Fehler</dt>
							<dd class="text-lg font-semibold tabular-nums text-rose-600">
								{form.summary.errors}
							</dd>
						</div>
					</dl>
					{#if form.summary.errorLines.length > 0}
						<details class="mt-2">
							<summary class="cursor-pointer text-xs text-stone-500">Fehler-Liste</summary>
							<ul class="mt-1 max-h-40 overflow-y-auto text-xs">
								{#each form.summary.errorLines as e (e.line)}
									<li>Zeile {e.line}: {e.msg}</li>
								{/each}
							</ul>
						</details>
					{/if}
				</div>
			{/if}

			{#if !form || form.stage === 'upload' || form.stage === 'done'}
				<form
					method="POST"
					action="?/parseUpload"
					enctype="multipart/form-data"
					use:enhance={() => {
						parsing = true;
						return ({ update }) => update().finally(() => (parsing = false));
					}}
					class="space-y-2"
				>
					<label
						class="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm dark:border-stone-700 dark:bg-stone-950"
					>
						<Upload size={16} />
						<input
							type="file"
							name="file"
							accept=".csv,.xlsx,.xls,text/csv"
							required
							class="flex-1 text-xs"
						/>
					</label>
					{#if form?.importError}
						<p
							class="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
						>
							{form.importError}
						</p>
					{/if}
					<button
						type="submit"
						disabled={parsing}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
					>
						{parsing ? 'Lese Datei…' : 'Datei einlesen'}
						<ArrowRight size={14} />
					</button>
				</form>
			{:else if mapStage}
				<form
					method="POST"
					action="?/import"
					use:enhance={() => {
						importing = true;
						return ({ update }) => update().finally(() => (importing = false));
					}}
					class="space-y-3"
				>
					<input type="hidden" name="allRows" value={JSON.stringify(mapStage.allRows)} />
					<input type="hidden" name="headers" value={JSON.stringify(mapStage.headers)} />
					<input type="hidden" name="filename" value={mapStage.filename} />

					<div
						class="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-950"
					>
						<div class="font-medium">{mapStage.filename}</div>
						<div class="text-stone-500 dark:text-stone-400">
							{mapStage.headers.length} Spalten · {mapStage.allRows.length} Zeilen
						</div>
					</div>

					{#if mapStage.importError}
						<div
							class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
						>
							<AlertTriangle size={14} class="mt-0.5 shrink-0" />
							<span>{mapStage.importError}</span>
						</div>
					{/if}

					<div class="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
						<table class="w-full text-xs">
							<thead class="bg-stone-50 dark:bg-stone-800">
								<tr>
									<th class="px-2 py-2 text-left font-medium">Spalte aus Datei</th>
									<th class="px-2 py-2 text-left font-medium">Bandsalat-Feld</th>
									<th class="px-2 py-2 text-left font-medium">Vorschau</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-stone-100 dark:divide-stone-800">
								{#each mapStage.headers as h, i (h + i)}
									<tr>
										<td class="px-2 py-1.5 align-top font-mono text-[11px]">
											<div class="font-medium">{h || `Spalte ${i + 1}`}</div>
										</td>
										<td class="w-44 px-2 py-1.5 align-top">
											<select
												name={`map_${h}`}
												value={mapStage.mapping[h] ?? ''}
												class="w-full rounded border border-stone-300 bg-white px-1.5 py-1 text-[11px] dark:border-stone-700 dark:bg-stone-900"
											>
												<option value="">— ignorieren —</option>
												{#each data.targetFields as f (f.key)}
													<option value={f.key}>{f.label}</option>
												{/each}
											</select>
										</td>
										<td
											class="px-2 py-1.5 align-top text-[11px] text-stone-500 dark:text-stone-400"
										>
											{#each mapStage.previewRows.slice(0, 3) as r (r)}
												<div class="truncate">{r[i] ?? ''}</div>
											{/each}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="skipDuplicates"
							class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
							checked
						/>
						Duplikate überspringen (gleiche Discogs-Release-ID oder gleiche Serie+Folge)
					</label>

					<button
						type="submit"
						disabled={importing}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
					>
						{importing ? 'Importiere…' : `${mapStage.allRows.length} Zeilen importieren`}
					</button>
				</form>
			{/if}
		</section>
	{/if}
</main>

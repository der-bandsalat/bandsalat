<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LogoDraft, { type DraftKind, DRAFT_META } from '$lib/components/LogoDraft.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Upload from '@lucide/svelte/icons/upload';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';

	let { data, form } = $props();

	const isAdmin = $derived(data.me?.role === 'admin');
	const saved = $derived(page.url.searchParams.get('saved'));
	let uploading = $state(false);
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">App-Brand-Logo</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	{#if saved}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Brand-Logo aktualisiert. Die neue Variante ist sofort im Header sichtbar (ggf. neu laden).
		</div>
	{/if}

	<p class="text-xs text-stone-500 dark:text-stone-400">
		Wähle eine der Varianten oder lade dein eigenes Logo (SVG empfohlen, PNG/JPG auch ok). Wird
		global im Header oben links, in Share-Pages und auf dem Login-Screen angezeigt. Das Favicon
		bleibt unabhängig (statisch unter <code>static/icon.svg</code>).
	</p>

	{#if !isAdmin}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
		>
			Nur Admins können das Brand-Logo ändern. Du kannst die Varianten unten ansehen.
		</div>
	{/if}

	{#if form?.error}
		<div
			class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
		>
			{form.error}
		</div>
	{/if}

	<!-- Draft-Varianten Grid -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-base font-semibold">Vorhandene Varianten</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each data.availableVariants as v (v)}
				{@const meta = DRAFT_META[v as DraftKind]}
				{@const isActive = data.variant === v}
				<form
					method="POST"
					action="?/setVariant"
					use:enhance={() => {
						return ({ update }) => update();
					}}
				>
					<input type="hidden" name="variant" value={v} />
					<button
						type="submit"
						disabled={!isAdmin}
						class="flex w-full flex-col items-center gap-2 rounded-xl border p-3 text-left transition disabled:opacity-60"
						class:border-brand-500={isActive}
						class:bg-brand-50={isActive}
						class:dark:border-brand-400={isActive}
						class:dark:bg-brand-950={isActive}
						class:border-stone-200={!isActive}
						class:dark:border-stone-700={!isActive}
						class:hover:shadow-md={isAdmin && !isActive}
					>
						<div
							class="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-500 text-white"
						>
							<LogoDraft kind={v as DraftKind} size={36} />
						</div>
						<div class="w-full">
							<div class="truncate text-sm font-medium">{meta?.name ?? v}</div>
							<div class="line-clamp-2 text-[10px] text-stone-500 dark:text-stone-400">
								{meta?.description ?? ''}
							</div>
						</div>
						{#if isActive}
							<span
								class="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-white"
							>
								aktiv
							</span>
						{/if}
					</button>
				</form>
			{/each}
		</div>
	</section>

	<!-- Custom Upload -->
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-2 text-base font-semibold">Eigenes Logo</h2>
		<p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
			SVG ideal (vektor, skaliert sauber). PNG mit Transparenz auch ok. Max 5 MiB, max 1024 px
			Kante. Wird auf die Header-Höhe runterskaliert.
		</p>

		{#if data.customPath}
			<div
				class="mb-3 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
			>
				<div class="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-500 p-2">
					<img
						src={`/uploads/${data.customPath}`}
						alt="Aktuelles Custom-Logo"
						class="max-h-full max-w-full object-contain"
					/>
				</div>
				<div class="min-w-0 flex-1">
					<div class="truncate font-mono text-xs">{data.customPath}</div>
					{#if data.variant === 'custom'}
						<span class="text-[11px] font-medium text-brand-600 dark:text-brand-400">
							• aktiv
						</span>
					{:else}
						<span class="text-[11px] text-stone-500 dark:text-stone-400">
							• hochgeladen, aber nicht aktiv
						</span>
					{/if}
				</div>
				{#if isAdmin}
					<form
						method="POST"
						action="?/clearCustom"
						use:enhance={() => {
							return ({ update }) => update();
						}}
					>
						<button
							type="submit"
							title="Custom-Logo entfernen"
							class="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
						>
							<Trash2 size={16} />
						</button>
					</form>
				{/if}
			</div>

			{#if isAdmin && data.variant !== 'custom'}
				<form
					method="POST"
					action="?/setVariant"
					use:enhance={() => {
						return ({ update }) => update();
					}}
					class="mb-3"
				>
					<input type="hidden" name="variant" value="custom" />
					<button
						type="submit"
						class="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
					>
						Custom-Logo aktivieren
					</button>
				</form>
			{/if}
		{/if}

		{#if isAdmin}
			<form
				method="POST"
				action="?/uploadCustom"
				enctype="multipart/form-data"
				use:enhance={() => {
					uploading = true;
					return ({ update }) =>
						update().finally(() => {
							uploading = false;
						});
				}}
				class="space-y-2"
			>
				<label
					class="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-3 text-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
				>
					<Upload size={16} />
					<input
						type="file"
						name="logo"
						accept="image/png,image/svg+xml,image/jpeg,image/webp"
						required
						class="flex-1 text-xs"
					/>
				</label>
				<button
					type="submit"
					disabled={uploading}
					class="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
				>
					{uploading ? 'Lade hoch…' : data.customPath ? 'Ersetzen' : 'Hochladen + aktivieren'}
				</button>
			</form>
		{/if}
	</section>
</main>

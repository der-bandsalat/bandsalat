<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Ban from '@lucide/svelte/icons/ban';
	import Copy from '@lucide/svelte/icons/copy';
	import Share2 from '@lucide/svelte/icons/share-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import { formatRelative } from '$lib/util/format';

	let { data, form } = $props();

	let showCreate = $state(false);
	let scope = $state<'collection' | 'serie'>('collection');
	let copied = $state<string | null>(null);

	const flash = $derived(
		page.url.searchParams.get('created') ||
			page.url.searchParams.get('revoked') ||
			page.url.searchParams.get('deleted')
	);

	function shareUrl(token: string): string {
		if (typeof window === 'undefined') return `/share/${token}`;
		return `${window.location.origin}/share/${token}`;
	}

	async function copyToClipboard(token: string) {
		try {
			await navigator.clipboard.writeText(shareUrl(token));
			copied = token;
			setTimeout(() => {
				if (copied === token) copied = null;
			}, 2000);
		} catch {
			/* clipboard nicht verfügbar */
		}
	}

	function scopeLabel(s: { scope: string; scopeRef: string | null }): string {
		if (s.scope === 'collection') return 'Ganze Sammlung';
		return `Serie: ${s.scopeRef ?? '?'}`;
	}

	function statusOf(s: { revokedAt: string | null; expiresAt: string | null }): {
		label: string;
		cls: string;
	} {
		if (s.revokedAt)
			return {
				label: 'widerrufen',
				cls: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
			};
		if (s.expiresAt && new Date(s.expiresAt) < new Date())
			return {
				label: 'abgelaufen',
				cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
			};
		return {
			label: 'aktiv',
			cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
		};
	}
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Share-Links</span>
	{/snippet}
	{#snippet actions()}
		{#if !showCreate && data.me.role !== 'viewer'}
			<button
				type="button"
				onclick={() => (showCreate = true)}
				class="flex h-9 items-center gap-1 rounded-full bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
			>
				<Plus size={16} />
				Neu
			</button>
		{/if}
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-3 px-4 py-4 pb-24">
	{#if flash}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Aktion ausgeführt.
		</div>
	{/if}

	<p class="text-xs text-stone-500 dark:text-stone-400">
		Öffentliche Read-Only-Links für deine Sammlung oder einzelne Serien. Jeder mit dem Link kann
		ohne Login lesen. Du kannst Links jederzeit widerrufen.
	</p>

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return ({ update }) =>
					update().finally(() => {
						showCreate = false;
					});
			}}
			class="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="text-base font-semibold">Neuen Share anlegen</h2>
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Was wird geteilt?</span>
				<select
					name="scope"
					bind:value={scope}
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				>
					<option value="collection">Ganze Sammlung</option>
					<option value="serie">Eine Serie</option>
				</select>
			</label>
			{#if scope === 'serie'}
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Serie</span>
					<select
						name="scopeRef"
						required
						class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					>
						<option value="">— wählen —</option>
						{#each data.serien as s (s)}
							<option value={s}>{s}</option>
						{/each}
					</select>
				</label>
			{/if}
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Titel (optional)</span>
				<input
					type="text"
					name="title"
					placeholder="z.B. Meine Drei???-Sammlung für Anna"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Ablaufdatum (optional)</span>
				<input
					type="date"
					name="expiresAt"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			{#if form?.createError}
				<p
					class="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.createError}
				</p>
			{/if}
			<div class="flex gap-2">
				<button
					type="button"
					onclick={() => (showCreate = false)}
					class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
				>
					Abbrechen
				</button>
				<button
					type="submit"
					class="flex-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
				>
					Share-Link erstellen
				</button>
			</div>
		</form>
	{/if}

	{#if data.shares.length === 0 && !showCreate}
		<div
			class="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
		>
			<Share2 size={28} class="mx-auto mb-2 text-brand-500" />
			Noch keine Share-Links erstellt.
		</div>
	{/if}

	{#each data.shares as s (s.id)}
		{@const status = statusOf(s)}
		<section
			class="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<header class="mb-2 flex items-start justify-between gap-2">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span class="font-semibold">{s.title ?? scopeLabel(s)}</span>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide {status.cls}"
						>
							{status.label}
						</span>
					</div>
					<div class="text-xs text-stone-500 dark:text-stone-400">
						{scopeLabel(s)} · erstellt {formatRelative(s.createdAt)}
						{#if s.expiresAt && !s.revokedAt}
							· läuft ab {formatRelative(s.expiresAt)}
						{/if}
					</div>
				</div>
				<div class="flex shrink-0 gap-1">
					{#if !s.revokedAt}
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<button
								type="submit"
								title="Widerrufen"
								class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
							>
								<Ban size={14} />
							</button>
						</form>
					{/if}
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={s.id} />
						<button
							type="submit"
							title="Löschen"
							class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
						>
							<Trash2 size={14} />
						</button>
					</form>
				</div>
			</header>
			<div
				class="flex items-center gap-2 rounded-lg bg-stone-50 px-2 py-1.5 text-xs dark:bg-stone-950"
			>
				<code class="flex-1 truncate font-mono">{shareUrl(s.token)}</code>
				<button
					type="button"
					onclick={() => copyToClipboard(s.token)}
					class="rounded p-1 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
					title="In Zwischenablage kopieren"
				>
					<Copy size={12} />
				</button>
				<a
					href={`/share/${s.token}`}
					target="_blank"
					rel="noopener"
					class="rounded p-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
					title="Öffnen"
				>
					<ExternalLink size={12} />
				</a>
			</div>
			{#if copied === s.token}
				<div class="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
					In Zwischenablage kopiert
				</div>
			{/if}
		</section>
	{/each}
</main>

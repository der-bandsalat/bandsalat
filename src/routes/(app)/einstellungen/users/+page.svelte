<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { formatRelative } from '$lib/util/format';

	let { data, form } = $props();

	let showCreate = $state(false);
	let editingId = $state<string | null>(null);
	let resettingId = $state<string | null>(null);
	let confirmDelete = $state<string | null>(null);

	const flash = $derived(
		page.url.searchParams.get('created') ||
			page.url.searchParams.get('passwordReset') ||
			page.url.searchParams.get('deleted')
	);

	function roleColor(r: string): string {
		if (r === 'admin') return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
		if (r === 'editor') return 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300';
		return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400';
	}
	function roleLabel(r: string): string {
		return r === 'admin' ? 'Admin' : r === 'editor' ? 'Editor' : 'Viewer';
	}
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Benutzer-Verwaltung</span>
	{/snippet}
	{#snippet actions()}
		{#if !showCreate}
			<button
				type="button"
				onclick={() => (showCreate = true)}
				class="flex h-9 items-center gap-1 rounded-full bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
			>
				<UserPlus size={16} />
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
		Rollen: <strong>Admin</strong> verwaltet User + alles Editor-Rechte; <strong>Editor</strong>
		kann Kassetten/Wantlist/Auflagen anlegen + ändern; <strong>Viewer</strong> nur lesen.
	</p>

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return ({ update }) => update().finally(() => (showCreate = false));
			}}
			class="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h2 class="text-base font-semibold">Neuer Benutzer</h2>
			<div class="grid gap-2 sm:grid-cols-2">
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">Username</span>
					<input
						type="text"
						name="username"
						required
						autocapitalize="off"
						spellcheck="false"
						class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
				<label class="block">
					<span class="text-xs text-stone-500 dark:text-stone-400">E-Mail</span>
					<input
						type="email"
						name="email"
						required
						autocapitalize="off"
						spellcheck="false"
						class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
					/>
				</label>
			</div>
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400"
					>Initial-Passwort (≥10 Zeichen)</span
				>
				<input
					type="password"
					name="password"
					required
					minlength="10"
					autocomplete="new-password"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Rolle</span>
				<select
					name="role"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				>
					{#each data.roles as r (r)}
						<option value={r} selected={r === 'viewer'}>{roleLabel(r)}</option>
					{/each}
				</select>
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
					Anlegen
				</button>
			</div>
		</form>
	{/if}

	{#each data.users as u (u.id)}
		<section
			class="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<header class="flex items-center justify-between gap-2">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span class="truncate font-semibold">{u.username}</span>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide {roleColor(
								u.role
							)}">{roleLabel(u.role)}</span
						>
						{#if u.id === data.me.id}
							<span
								class="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300"
								>Du</span
							>
						{/if}
						{#if !u.active}
							<span
								class="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-700 dark:bg-stone-700 dark:text-stone-300"
								>deaktiviert</span
							>
						{/if}
					</div>
					<div class="truncate text-xs text-stone-500 dark:text-stone-400">{u.email}</div>
					<div class="text-[11px] text-stone-400">
						{#if u.lastLoginAt}Letzter Login: {formatRelative(u.lastLoginAt)}{:else}Noch nie
							eingeloggt{/if}
						· angelegt {formatRelative(u.createdAt)}
					</div>
				</div>
				<div class="flex shrink-0 gap-1">
					<button
						type="button"
						onclick={() => (editingId = editingId === u.id ? null : u.id)}
						class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
						aria-label="Bearbeiten"
					>
						<Pencil size={14} />
					</button>
					<button
						type="button"
						onclick={() => (resettingId = resettingId === u.id ? null : u.id)}
						class="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
						aria-label="Passwort zurücksetzen"
					>
						<KeyRound size={14} />
					</button>
					{#if u.id !== data.me.id}
						<button
							type="button"
							onclick={() => (confirmDelete = confirmDelete === u.id ? null : u.id)}
							class="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
							aria-label="Löschen"
						>
							<Trash2 size={14} />
						</button>
					{/if}
				</div>
			</header>

			{#if editingId === u.id}
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						return ({ update }) => update().finally(() => (editingId = null));
					}}
					class="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
				>
					<input type="hidden" name="id" value={u.id} />
					<div class="grid gap-2 sm:grid-cols-2">
						<label class="block">
							<span class="text-xs text-stone-500 dark:text-stone-400">Username</span>
							<input
								type="text"
								name="username"
								value={u.username}
								required
								class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							/>
						</label>
						<label class="block">
							<span class="text-xs text-stone-500 dark:text-stone-400">E-Mail</span>
							<input
								type="email"
								name="email"
								value={u.email}
								required
								class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							/>
						</label>
					</div>
					<div class="flex items-center gap-3">
						<label class="block flex-1">
							<span class="text-xs text-stone-500 dark:text-stone-400">Rolle</span>
							<select
								name="role"
								class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
							>
								{#each data.roles as r (r)}
									<option value={r} selected={r === u.role}>{roleLabel(r)}</option>
								{/each}
							</select>
						</label>
						<label class="flex items-center gap-2 pt-5 text-sm">
							<input
								type="checkbox"
								name="active"
								checked={u.active}
								class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
							/>
							aktiv
						</label>
					</div>
					{#if form?.editError && editingId === u.id}
						<p
							class="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
						>
							{form.editError}
						</p>
					{/if}
					<button
						type="submit"
						class="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
					>
						Speichern
					</button>
				</form>
			{/if}

			{#if resettingId === u.id}
				<form
					method="POST"
					action="?/resetPassword"
					use:enhance={() => {
						return ({ update }) => update().finally(() => (resettingId = null));
					}}
					class="mt-3 flex gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
				>
					<input type="hidden" name="id" value={u.id} />
					<input
						type="password"
						name="password"
						placeholder="Neues Passwort (≥10 Zeichen)"
						required
						minlength="10"
						autocomplete="new-password"
						class="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
					/>
					<button
						type="submit"
						class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
					>
						<ShieldCheck size={14} />
					</button>
				</form>
			{/if}

			{#if confirmDelete === u.id}
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						return ({ update }) => update().finally(() => (confirmDelete = null));
					}}
					class="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950"
				>
					<input type="hidden" name="id" value={u.id} />
					<span class="flex-1">User <strong>{u.username}</strong> wirklich löschen?</span>
					<button
						type="button"
						onclick={() => (confirmDelete = null)}
						class="rounded border border-stone-300 px-2 py-1 text-xs dark:border-stone-700"
						>Abbrechen</button
					>
					<button type="submit" class="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white"
						>Löschen</button
					>
				</form>
			{/if}
		</section>
	{/each}
</main>

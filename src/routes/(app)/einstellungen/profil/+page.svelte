<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Save from '@lucide/svelte/icons/save';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import { formatRelative } from '$lib/util/format';

	let { data, form } = $props();

	const saved = $derived(page.url.searchParams.get('saved'));
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Mein Profil</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24">
	{#if saved === 'profile'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Profil gespeichert.
		</div>
	{:else if saved === 'password'}
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
		>
			<CheckCircle2 size={16} />
			Passwort geändert.
		</div>
	{/if}

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-base font-semibold">Profil-Daten</h2>
		<form method="POST" action="?/updateProfile" use:enhance class="space-y-2">
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Username</span>
				<input
					type="text"
					name="username"
					value={data.profile.username}
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
					value={data.profile.email}
					required
					autocapitalize="off"
					spellcheck="false"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			<dl class="grid grid-cols-2 gap-2 pt-2 text-xs text-stone-500 dark:text-stone-400">
				<div>
					<dt>Rolle</dt>
					<dd class="font-medium text-stone-700 dark:text-stone-300">{data.profile.role}</dd>
				</div>
				<div>
					<dt>Account erstellt</dt>
					<dd class="font-medium text-stone-700 dark:text-stone-300">
						{formatRelative(data.profile.createdAt)}
					</dd>
				</div>
			</dl>
			{#if form?.profileError}
				<p
					class="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.profileError}
				</p>
			{/if}
			<button
				type="submit"
				class="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
			>
				<Save size={14} />
				Profil speichern
			</button>
		</form>
	</section>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="mb-3 text-base font-semibold">Passwort ändern</h2>
		<form method="POST" action="?/changePassword" use:enhance class="space-y-2">
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Aktuelles Passwort</span>
				<input
					type="password"
					name="current"
					required
					autocomplete="current-password"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			<label class="block">
				<span class="text-xs text-stone-500 dark:text-stone-400">Neues Passwort (≥10 Zeichen)</span>
				<input
					type="password"
					name="next"
					required
					minlength="10"
					autocomplete="new-password"
					class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
				/>
			</label>
			{#if form?.passwordError}
				<p
					class="rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
				>
					{form.passwordError}
				</p>
			{/if}
			<button
				type="submit"
				class="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
			>
				<ShieldCheck size={14} />
				Passwort ändern
			</button>
		</form>
	</section>
</main>

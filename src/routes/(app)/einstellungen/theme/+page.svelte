<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { enhance } from '$app/forms';
	import { THEMES, THEME_META, type Theme } from '$lib/theme';
	import Check from '@lucide/svelte/icons/check';

	let { data, form } = $props();
	let submitting = $state<Theme | null>(null);
</script>

<AppHeader title="Erscheinungsbild" back="/einstellungen" />

<main class="mx-auto max-w-2xl space-y-3 px-4 py-4">
	<p class="text-sm text-stone-500 dark:text-stone-400">
		Wähle ein Theme. Wirkt sofort, wird pro Browser gespeichert.
	</p>

	<form
		method="POST"
		use:enhance={({ formData }) => {
			submitting = formData.get('theme') as Theme;
			return ({ update }) => update().finally(() => (submitting = null));
		}}
		class="grid gap-3"
	>
		{#each THEMES as t (t)}
			{@const meta = THEME_META[t]}
			{@const isCurrent = data.current === t}
			<button
				name="theme"
				value={t}
				type="submit"
				class="group relative flex items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left transition active:scale-[0.99] dark:bg-stone-900"
				class:border-brand-500={isCurrent}
				class:border-stone-200={!isCurrent}
				class:dark:border-stone-800={!isCurrent}
				disabled={submitting !== null}
			>
				<span
					class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-800"
					style:background={meta.swatchBg}
					style:color={meta.swatchAccent}
				>
					<BrandLogo size={36} />
				</span>
				<span class="min-w-0 flex-1">
					<span class="flex items-center gap-2">
						<span class="text-base font-semibold">{meta.label}</span>
						{#if isCurrent}
							<span
								class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white"
							>
								<Check size={12} />
							</span>
						{/if}
					</span>
					<span class="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
						{meta.description}
					</span>
					<span class="mt-2 flex items-center gap-1.5">
						<span class="h-4 w-4 rounded-full ring-1 ring-black/10" style:background={meta.swatchBg}
						></span>
						<span class="h-4 w-4 rounded-full ring-1 ring-black/10" style:background={meta.swatchFg}
						></span>
						<span
							class="h-4 w-4 rounded-full ring-1 ring-black/10"
							style:background={meta.swatchAccent}
						></span>
					</span>
				</span>
				{#if submitting === t}
					<span class="text-xs text-stone-500">wird gesetzt…</span>
				{/if}
			</button>
		{/each}
	</form>

	{#if form?.error}
		<p
			class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
		>
			{form.error}
		</p>
	{/if}

	<a
		href="/logo-drafts"
		class="mt-6 flex items-center justify-between rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
	>
		<span class="flex items-center gap-2">
			<span class="text-base">✨</span>
			Logo-Entwürfe vergleichen
		</span>
		<span class="text-xs text-stone-400">5 Varianten</span>
	</a>
</main>

<script lang="ts">
	import { enhance } from '$app/forms';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import User from '@lucide/svelte/icons/user';
	import CassetteVisual from '$lib/components/CassetteVisual.svelte';
	import { reveal } from '$lib/actions/reveal';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<div class="relative min-h-screen overflow-hidden grain">
	<!-- Hintergrund: weiche Brand-Gradienten + Color-Blobs -->
	<div class="absolute inset-0 -z-10">
		<div
			class="absolute inset-x-0 top-0 h-[640px] bg-gradient-to-b from-brand-50/80 via-brand-100/30 to-transparent dark:from-brand-950/40 dark:via-brand-900/10"
		></div>
		<div
			class="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/10"
		></div>
		<div
			class="absolute -left-32 top-40 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20"
		></div>
	</div>

	<main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
		<div class="reveal mb-8 text-center" use:reveal>
			<span
				class="inline-flex items-center gap-2 rounded-full border border-brand-300/60 bg-brand-100/60 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800 backdrop-blur dark:border-brand-700/40 dark:bg-brand-950/40 dark:text-brand-300"
			>
				<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500"></span>
				Hörspielsammler · self-hosted
			</span>

			<div class="mt-6">
				<CassetteVisual />
			</div>

			<h1
				class="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50"
			>
				Bandsalat
			</h1>

			<p class="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-stone-600 dark:text-stone-400">
				Hörspielkassetten im Griff: Discogs-Sync, Foto-Scan, Wantlist.
			</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return ({ update }) => update().finally(() => (submitting = false));
			}}
			class="reveal space-y-4"
			autocomplete="off"
			use:reveal={{ delay: 200 }}
		>
			<input type="hidden" name="next" value={data.next} />
			<label class="block">
				<span
					class="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400"
					>Username oder E-Mail</span
				>
				<div class="relative">
					<span
						class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
					>
						<User size={18} />
					</span>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						name="login"
						required
						autocomplete="username"
						autocapitalize="off"
						spellcheck="false"
						autofocus
						class="w-full rounded-xl border border-stone-300 bg-white/80 py-3 pl-10 pr-3 shadow-sm outline-none backdrop-blur transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900/80 dark:focus:ring-brand-900"
					/>
				</div>
			</label>
			<label class="block">
				<span
					class="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400"
					>Passwort</span
				>
				<div class="relative">
					<span
						class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
					>
						<LockKeyhole size={18} />
					</span>
					<input
						type="password"
						name="password"
						required
						autocomplete="current-password"
						class="w-full rounded-xl border border-stone-300 bg-white/80 py-3 pl-10 pr-3 shadow-sm outline-none backdrop-blur transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-900/80 dark:focus:ring-brand-900"
					/>
				</div>
			</label>

			{#if form?.error}
				<p
					class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
				>
					{form.error}
				</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
			>
				{submitting ? 'Anmelden…' : 'Anmelden'}
			</button>
		</form>

		<dl
			class="reveal mt-10 grid grid-cols-3 gap-4 border-t border-stone-200/70 pt-5 text-center dark:border-stone-800/60"
			use:reveal={{ delay: 400 }}
		>
			<div>
				<dt
					class="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-500"
				>
					Lizenz
				</dt>
				<dd class="mt-1 font-display text-sm font-bold text-stone-900 dark:text-stone-50">MIT</dd>
			</div>
			<div>
				<dt
					class="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-500"
				>
					Hosting
				</dt>
				<dd class="mt-1 font-display text-sm font-bold text-stone-900 dark:text-stone-50">
					1 Docker
				</dd>
			</div>
			<div>
				<dt
					class="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-500"
				>
					Discogs
				</dt>
				<dd class="mt-1 font-display text-sm font-bold text-stone-900 dark:text-stone-50">2-Way</dd>
			</div>
		</dl>
	</main>
</div>

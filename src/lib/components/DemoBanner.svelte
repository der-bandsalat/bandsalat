<script lang="ts">
	import { onMount } from 'svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import Timer from '@lucide/svelte/icons/timer';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Download from '@lucide/svelte/icons/download';
	import Info from '@lucide/svelte/icons/info';

	interface Props {
		expiresAt: string | null;
		orchestratorUrl: string | null;
	}

	let { expiresAt, orchestratorUrl }: Props = $props();

	let now = $state(Date.now());

	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const remainingMs = $derived(expiresAt ? new Date(expiresAt).getTime() - now : 0);
	const expired = $derived(remainingMs <= 0);

	function fmt(ms: number): string {
		if (ms <= 0) return 'abgelaufen';
		const s = Math.floor(ms / 1000);
		const days = Math.floor(s / 86400);
		const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
		const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
		const ss = String(s % 60).padStart(2, '0');
		if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
		return `${hh}:${mm}:${ss}`;
	}

	// `from` ist der eigene Hostname (z.B. "s2.demo.bandsa.lat") — der
	// Orchestrator nutzt das, um per Subdomain den Slot zu identifizieren und
	// die zugehörige Session zu finden.
	let host = $state('');
	$effect(() => {
		host = typeof location !== 'undefined' ? location.host : '';
	});
	const fromParam = $derived(host ? `?from=${encodeURIComponent(host)}` : '');
	const extendUrl = $derived(orchestratorUrl ? `${orchestratorUrl}/extend${fromParam}` : null);
	const promoteUrl = $derived(orchestratorUrl ? `${orchestratorUrl}/promote${fromParam}` : null);

	const warnSoon = $derived(remainingMs > 0 && remainingMs < 15 * 60 * 1000);
</script>

<div
	class="fixed inset-x-0 top-0 z-40 border-b text-sm shadow-sm
		{expired
		? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-100'
		: warnSoon
			? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100'
			: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/80 dark:text-sky-100'}"
>
	<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
		<div class="flex items-center gap-2 font-medium">
			<Info class="size-4 shrink-0" />
			<span>Demo-Modus</span>
		</div>
		<div class="flex items-center gap-1.5 tabular-nums">
			<Clock class="size-4 shrink-0 opacity-70" />
			{#if expired}
				<span>Session abgelaufen</span>
			{:else}
				<span>läuft noch <strong>{fmt(remainingMs)}</strong></span>
			{/if}
		</div>
		<div class="ml-auto flex flex-wrap items-center gap-2">
			{#if extendUrl}
				<a
					href={extendUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1 rounded border border-current/30 px-2.5 py-1 text-xs font-medium hover:bg-current/10"
				>
					<Timer class="size-3.5" />
					Verlängern
				</a>
			{/if}
			{#if promoteUrl}
				<a
					href={promoteUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1 rounded border border-current/30 px-2.5 py-1 text-xs font-medium hover:bg-current/10"
				>
					<Rocket class="size-3.5" />
					Auf Produktiv umstellen
				</a>
			{/if}
			<a
				href="/einstellungen/transfer"
				class="inline-flex items-center gap-1 rounded border border-current/30 px-2.5 py-1 text-xs font-medium hover:bg-current/10"
			>
				<Download class="size-3.5" />
				Daten exportieren
			</a>
		</div>
	</div>
</div>

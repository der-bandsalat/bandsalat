<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	onMount(() => {
		// Daten neu laden wenn der Tab wieder Fokus bekommt — verhindert, dass
		// SvelteKit gecachte Load-Daten zeigt (z.B. /sync nach Push von woanders).
		const onVisibility = () => {
			if (!document.hidden) void invalidateAll();
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('focus', onVisibility);
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('focus', onVisibility);
		};
	});
</script>

{#if data.demo}
	<DemoBanner expiresAt={data.demo.expiresAt} orchestratorUrl={data.demo.orchestratorUrl} />
{/if}

<!-- Banner ist fixed top-0; sticky AppHeader liest --demo-banner-h, damit er
     direkt drunter andockt statt verdeckt zu werden. Mobile wickeln die CTAs
     in eine zweite Zeile, daher dort mehr Höhe. -->
<div
	class="min-h-screen pb-24 demo-shell"
	class:demo-active={data.demo}
>
	{@render children()}
</div>
<AppNav />
<ToastContainer />

<style>
	.demo-active {
		padding-top: var(--demo-banner-h, 0);
	}
	:global(.demo-active) {
		--demo-banner-h: 3.25rem;
	}
	@media (max-width: 640px) {
		:global(.demo-active) {
			--demo-banner-h: 5.5rem;
		}
	}
</style>

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

<div class="min-h-screen pb-24" class:pt-12={data.demo}>
	{@render children()}
</div>
<AppNav />
<ToastContainer />

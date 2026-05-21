<script lang="ts">
	import AppNav from '$lib/components/AppNav.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

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

<div class="min-h-screen pb-24">
	{@render children()}
</div>
<AppNav />
<ToastContainer />

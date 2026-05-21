<script lang="ts">
	type Props = {
		label: string;
		name: string;
		error?: string | null;
		hint?: string;
		children: import('svelte').Snippet;
	};
	let { label, name, error, hint, children }: Props = $props();
</script>

<label class="block">
	<span class="mb-1 flex items-baseline justify-between">
		<span class="text-sm font-medium">{label}</span>
		{#if hint}
			<span class="text-xs text-stone-400">{hint}</span>
		{/if}
	</span>
	{@render children()}
	{#if error}
		<span id={`${name}-err`} class="mt-1 block text-xs text-rose-600 dark:text-rose-400"
			>{error}</span
		>
	{/if}
</label>

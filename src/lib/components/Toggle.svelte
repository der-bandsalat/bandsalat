<script lang="ts">
	type Props = {
		name: string;
		label: string;
		checked: boolean;
		description?: string;
	};
	let { name, label, checked = $bindable(), description }: Props = $props();
</script>

<label
	class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900"
>
	<span class="min-w-0 flex-1">
		<span class="block text-sm font-medium">{label}</span>
		{#if description}
			<span class="block text-xs text-stone-500 dark:text-stone-400">{description}</span>
		{/if}
	</span>
	<span class="relative inline-flex h-6 w-11 shrink-0 items-center">
		<input type="checkbox" {name} bind:checked class="peer sr-only" />
		<span
			class="block h-6 w-11 rounded-full bg-stone-300 transition peer-checked:bg-brand-500 dark:bg-stone-700"
		></span>
		<span
			class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
		></span>
	</span>
</label>

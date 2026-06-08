<script lang="ts">
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import { EDITABLE_COLUMNS } from './columns';

	type Props = {
		/** Sichtbare Spaltenschlüssel (bindable). */
		visible: string[];
	};

	let { visible = $bindable() }: Props = $props();

	let open = $state(false);
	let root: HTMLDivElement;

	function toggle(key: string) {
		visible = visible.includes(key)
			? visible.filter((k) => k !== key)
			: // Reihenfolge der Definition beibehalten.
				EDITABLE_COLUMNS.filter((c) => c.key === key || visible.includes(c.key as string)).map(
					(c) => c.key as string
				);
	}

	function onWindowClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative" bind:this={root}>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
	>
		<Columns3 size={16} />
		Spalten
		<span class="text-xs text-stone-400">({visible.length})</span>
	</button>

	{#if open}
		<div
			class="absolute right-0 z-20 mt-1 max-h-80 w-56 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
		>
			{#each EDITABLE_COLUMNS as col (col.key)}
				<label
					class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
				>
					<input
						type="checkbox"
						class="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-400 dark:border-stone-600"
						checked={visible.includes(col.key as string)}
						onchange={() => toggle(col.key as string)}
					/>
					<span>{col.label}</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

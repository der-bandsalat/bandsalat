<script lang="ts" module>
	export type VBar = { label: string; value: number };
</script>

<script lang="ts">
	type Props = {
		data: VBar[];
		height?: number;
		valueFormat?: (v: number) => string;
		labelEvery?: number;
		empty?: string;
	};

	let {
		data,
		height = 140,
		valueFormat = (v) => String(v),
		labelEvery = 0,
		empty = 'Keine Daten.'
	}: Props = $props();

	const max = $derived(Math.max(1, ...data.map((d) => d.value)));

	const labelStride = $derived(
		labelEvery > 0 ? labelEvery : Math.max(1, Math.ceil(data.length / 8))
	);
</script>

{#if data.length === 0}
	<p class="text-xs text-stone-500 dark:text-stone-400">{empty}</p>
{:else}
	<div class="flex items-end gap-1" style:height={`${height}px`}>
		{#each data as bar, i (bar.label)}
			{@const pct = (bar.value / max) * 100}
			{@const showLabel = i % labelStride === 0 || i === data.length - 1}
			<div class="flex min-w-0 flex-1 flex-col items-center justify-end">
				<div
					class="w-full rounded-t bg-brand-500/80 transition hover:bg-brand-600"
					style:height={`${pct}%`}
					title={`${bar.label}: ${valueFormat(bar.value)}`}
				></div>
				<div
					class="mt-1 w-full truncate text-center text-[10px] text-stone-500 dark:text-stone-400"
					class:opacity-0={!showLabel}
					aria-hidden={!showLabel}
				>
					{bar.label}
				</div>
			</div>
		{/each}
	</div>
{/if}

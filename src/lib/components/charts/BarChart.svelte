<script lang="ts" module>
	export type BarItem = {
		label: string;
		value: number;
		subtitle?: string;
		tone?: 'brand' | 'emerald' | 'rose' | 'sky' | 'amber' | 'stone';
	};
</script>

<script lang="ts">
	type Props = {
		data: BarItem[];
		max?: number | null;
		format?: (v: number) => string;
		empty?: string;
	};

	let { data, max = null, format = (v) => String(v), empty = 'Keine Daten.' }: Props = $props();

	const effectiveMax = $derived(max ?? Math.max(1, ...data.map((d) => d.value)));

	const toneClass: Record<NonNullable<BarItem['tone']>, string> = {
		brand: 'bg-brand-500',
		emerald: 'bg-emerald-500',
		rose: 'bg-rose-500',
		sky: 'bg-sky-500',
		amber: 'bg-amber-500',
		stone: 'bg-stone-400'
	};
</script>

{#if data.length === 0}
	<p class="text-xs text-stone-500 dark:text-stone-400">{empty}</p>
{:else}
	<ul class="space-y-2">
		{#each data as item (item.label)}
			{@const pct = Math.min(100, (item.value / effectiveMax) * 100)}
			<li>
				<div class="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
					<span class="truncate font-medium">{item.label}</span>
					<span class="shrink-0 text-stone-500 dark:text-stone-400">
						{format(item.value)}{item.subtitle ? ` · ${item.subtitle}` : ''}
					</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
					<div
						class="h-full rounded-full {toneClass[item.tone ?? 'brand']}"
						style:width={`${pct}%`}
					></div>
				</div>
			</li>
		{/each}
	</ul>
{/if}

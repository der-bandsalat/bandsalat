<script lang="ts" module>
	export type DonutSlice = { label: string; value: number; color?: string };
</script>

<script lang="ts">
	type Props = {
		data: DonutSlice[];
		size?: number;
		thickness?: number;
		empty?: string;
		topN?: number;
	};

	let { data, size = 180, thickness = 26, topN = 6, empty = 'Keine Daten.' }: Props = $props();

	const PALETTE = [
		'#f2750c',
		'#3b82f6',
		'#10b981',
		'#a855f7',
		'#ec4899',
		'#14b8a6',
		'#eab308',
		'#ef4444'
	];

	const bundled = $derived(bundle(data, topN));
	const total = $derived(bundled.reduce((acc, s) => acc + s.value, 0));
	const arcs = $derived(buildArcs(bundled, total));

	function bundle(slices: DonutSlice[], top: number): DonutSlice[] {
		if (slices.length <= top) return slices;
		const head = slices.slice(0, top);
		const tail = slices.slice(top);
		const restSum = tail.reduce((acc, s) => acc + s.value, 0);
		if (restSum === 0) return head;
		return [...head, { label: `Andere (${tail.length})`, value: restSum }];
	}

	function polar(cx: number, cy: number, r: number, deg: number) {
		const rad = ((deg - 90) * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	function buildArcs(slices: DonutSlice[], sum: number) {
		if (sum === 0) return [];
		const cx = size / 2;
		const cy = size / 2;
		const r = size / 2 - 2;
		const inner = r - thickness;
		let angle = 0;
		return slices.map((s, i) => {
			const a = (s.value / sum) * 360;
			const start = angle;
			const end = Math.min(angle + a, 359.999);
			angle += a;
			const sp = polar(cx, cy, r, start);
			const ep = polar(cx, cy, r, end);
			const sp2 = polar(cx, cy, inner, end);
			const ep2 = polar(cx, cy, inner, start);
			const large = a > 180 ? 1 : 0;
			const path = [
				`M ${sp.x.toFixed(2)} ${sp.y.toFixed(2)}`,
				`A ${r} ${r} 0 ${large} 1 ${ep.x.toFixed(2)} ${ep.y.toFixed(2)}`,
				`L ${sp2.x.toFixed(2)} ${sp2.y.toFixed(2)}`,
				`A ${inner} ${inner} 0 ${large} 0 ${ep2.x.toFixed(2)} ${ep2.y.toFixed(2)}`,
				'Z'
			].join(' ');
			return {
				path,
				color: s.color ?? PALETTE[i % PALETTE.length],
				label: s.label,
				value: s.value,
				percent: Math.round((s.value / sum) * 100)
			};
		});
	}
</script>

{#if data.length === 0 || total === 0}
	<p class="text-xs text-stone-500 dark:text-stone-400">{empty}</p>
{:else}
	<div class="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
		<svg
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			class="shrink-0"
			role="img"
			aria-label="Verteilung"
		>
			{#each arcs as arc, i (i)}
				<path d={arc.path} fill={arc.color}>
					<title>{arc.label}: {arc.value} ({arc.percent}%)</title>
				</path>
			{/each}
			<text
				x={size / 2}
				y={size / 2 - 4}
				text-anchor="middle"
				class="fill-stone-700 text-base font-semibold dark:fill-stone-200">{total}</text
			>
			<text x={size / 2} y={size / 2 + 12} text-anchor="middle" class="fill-stone-400 text-[10px]"
				>gesamt</text
			>
		</svg>
		<ul class="flex-1 space-y-1 text-xs">
			{#each arcs as arc, i (i)}
				<li class="flex items-center justify-between gap-2">
					<span class="flex min-w-0 items-center gap-2">
						<span class="h-3 w-3 shrink-0 rounded-sm" style:background-color={arc.color}></span>
						<span class="truncate">{arc.label}</span>
					</span>
					<span class="shrink-0 text-stone-500 dark:text-stone-400">
						{arc.value} · {arc.percent}%
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}

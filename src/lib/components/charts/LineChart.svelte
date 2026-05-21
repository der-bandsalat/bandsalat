<script lang="ts" module>
	export type LinePoint = { label: string; value: number };
</script>

<script lang="ts">
	type Props = {
		data: LinePoint[];
		height?: number;
		yFormat?: (v: number) => string;
		empty?: string;
	};

	let { data, height = 180, yFormat = (v) => String(v), empty = 'Keine Daten.' }: Props = $props();

	const WIDTH = 600;
	const PAD = { top: 12, right: 12, bottom: 22, left: 36 };

	const xs = $derived(data.map((_, i) => i));
	const ys = $derived(data.map((p) => p.value));
	const xMax = $derived(Math.max(1, xs.length - 1));
	const yMax = $derived(niceMax(Math.max(1, ...ys)));

	function niceMax(v: number): number {
		if (v <= 1) return 1;
		const pow = Math.pow(10, Math.floor(Math.log10(v)));
		const n = v / pow;
		const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
		return m * pow;
	}

	function sx(i: number): number {
		if (xMax === 0) return PAD.left + (WIDTH - PAD.left - PAD.right) / 2;
		return PAD.left + (i / xMax) * (WIDTH - PAD.left - PAD.right);
	}
	function sy(v: number): number {
		return height - PAD.bottom - (v / yMax) * (height - PAD.top - PAD.bottom);
	}

	const linePath = $derived(
		data.length === 0
			? ''
			: 'M ' + data.map((p, i) => `${sx(i).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' L ')
	);
	const areaPath = $derived(
		data.length < 2
			? ''
			: linePath +
					` L ${sx(data.length - 1).toFixed(1)} ${(height - PAD.bottom).toFixed(1)}` +
					` L ${sx(0).toFixed(1)} ${(height - PAD.bottom).toFixed(1)} Z`
	);

	const yTicks = $derived(buildTicks(yMax, 4));
	function buildTicks(max: number, count: number): number[] {
		const step = niceMax(max / count);
		const ticks: number[] = [];
		for (let v = 0; v <= max + 0.0001; v += step) ticks.push(v);
		return ticks;
	}

	const xTicks = $derived(
		data.length === 0
			? []
			: data.length <= 6
				? data.map((_, i) => i)
				: [0, Math.floor((data.length - 1) / 2), data.length - 1]
	);
</script>

{#if data.length === 0}
	<p class="text-xs text-stone-500 dark:text-stone-400">{empty}</p>
{:else}
	<svg
		viewBox={`0 0 ${WIDTH} ${height}`}
		preserveAspectRatio="none"
		class="block w-full"
		style:height={`${height}px`}
		role="img"
		aria-label="Sammlungs-Wachstum"
	>
		{#each yTicks as tick (tick)}
			<line
				x1={PAD.left}
				x2={WIDTH - PAD.right}
				y1={sy(tick)}
				y2={sy(tick)}
				class="stroke-stone-200 dark:stroke-stone-800"
				stroke-width="1"
			/>
			<text x={PAD.left - 6} y={sy(tick) + 4} class="fill-stone-400 text-[10px]" text-anchor="end"
				>{yFormat(tick)}</text
			>
		{/each}

		{#if areaPath}
			<path d={areaPath} class="fill-brand-500/15" />
		{/if}
		{#if linePath}
			<path
				d={linePath}
				class="fill-none stroke-brand-500"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		{/if}

		{#each xTicks as i (i)}
			<text
				x={sx(i)}
				y={height - 6}
				class="fill-stone-400 text-[10px]"
				text-anchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
				>{data[i].label}</text
			>
		{/each}
	</svg>
{/if}

<script lang="ts" module>
	const PALETTE = [
		['#fef3c7', '#92400e'], // amber
		['#dbeafe', '#1e3a8a'], // blue
		['#dcfce7', '#14532d'], // green
		['#fce7f3', '#831843'], // pink
		['#ede9fe', '#4c1d95'], // purple
		['#fee2e2', '#7f1d1d'], // red
		['#cffafe', '#155e75'], // cyan
		['#fef7ed', '#7c2d12'] // brand
	] as const;

	function hash(s: string): number {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
		return Math.abs(h);
	}

	export function paletteFor(serie: string): { bg: string; fg: string } {
		const [bg, fg] = PALETTE[hash(serie) % PALETTE.length];
		return { bg, fg };
	}

	export function initialsFor(serie: string): string {
		const cleaned = serie.replace(/[^\p{L}\p{N} ]/gu, '').trim();
		if (!cleaned) return '?';
		const words = cleaned.split(/\s+/);
		if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
		return (words[0][0] + words[1][0]).toUpperCase();
	}
</script>

<script lang="ts">
	type Props = {
		serie: string;
		logoPath?: string | null;
		size?: number;
		rounded?: 'full' | 'lg' | 'xl' | '2xl';
	};

	let { serie, logoPath = null, size = 48, rounded = 'xl' }: Props = $props();

	const palette = $derived(paletteFor(serie));
	const initials = $derived(initialsFor(serie));
	const radiusCls = $derived(
		rounded === 'full'
			? 'rounded-full'
			: rounded === 'lg'
				? 'rounded-lg'
				: rounded === '2xl'
					? 'rounded-2xl'
					: 'rounded-xl'
	);
</script>

{#if logoPath}
	<img
		src={`/uploads/${logoPath}`}
		alt={serie}
		width={size}
		height={size}
		class="{radiusCls} object-cover"
		style:width={`${size}px`}
		style:height={`${size}px`}
	/>
{:else}
	<div
		class="{radiusCls} flex shrink-0 items-center justify-center font-semibold tracking-tight"
		style:width={`${size}px`}
		style:height={`${size}px`}
		style:background-color={palette.bg}
		style:color={palette.fg}
		style:font-size={`${Math.max(12, Math.floor(size * 0.38))}px`}
		aria-hidden="true"
	>
		{initials}
	</div>
{/if}

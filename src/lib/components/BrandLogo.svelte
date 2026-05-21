<script lang="ts">
	import { page } from '$app/state';
	import LogoDraft, { type DraftKind } from './LogoDraft.svelte';

	type Props = {
		size?: number;
		title?: string;
		variant?: 'mark' | 'wordmark';
		/** Override für den expliziten Logo-Kind. Wenn nicht gesetzt, wird die
		 *  globale Auswahl aus page.data.brandLogo benutzt (default 'salat'). */
		kind?: DraftKind | 'custom';
		customPath?: string | null;
	};

	let {
		size = 32,
		title = 'Bandsalat',
		variant = 'mark',
		kind: kindProp,
		customPath: customPathProp
	}: Props = $props();

	type BrandLogoData = { variant: string; customPath: string | null };
	const brandData = $derived((page.data as { brandLogo?: BrandLogoData } | undefined)?.brandLogo);
	const effectiveKind = $derived(
		(kindProp ?? brandData?.variant ?? 'salat') as DraftKind | 'custom'
	);
	const effectiveCustomPath = $derived(customPathProp ?? brandData?.customPath ?? null);

	// Bei Custom-Image den Wordmark als breiteres Bild ausgeben, beim Mark
	// quadratisch.
	const customStyleWidth = $derived(variant === 'wordmark' ? 'auto' : `${size}px`);
	const customStyleHeight = $derived(`${size}px`);
</script>

{#if effectiveKind === 'custom' && effectiveCustomPath}
	<img
		src={`/uploads/${effectiveCustomPath}`}
		alt={title}
		style:width={customStyleWidth}
		style:height={customStyleHeight}
		style:max-width={variant === 'wordmark' ? `${size * 4.4}px` : `${size}px`}
		style:object-fit="contain"
	/>
{:else}
	<LogoDraft kind={effectiveKind as DraftKind} {size} {variant} {title} />
{/if}

<script lang="ts">
	type Props = {
		/** Bewertung in Halb-Sternen: 1 = ½, 10 = 5. null/0 = unbewertet. */
		value: number | null;
		readonly?: boolean;
		size?: number;
		name?: string;
		ariaLabel?: string;
		/** Numerische Bewertung (z.B. "4,5") neben den Sternen anzeigen. */
		showValue?: boolean;
		/** Wird nach jedem User-Klick mit dem neuen Wert aufgerufen. */
		onchange?: (next: number | null) => void;
	};

	let {
		value = $bindable(),
		readonly = false,
		size = 28,
		name,
		ariaLabel,
		showValue = true,
		onchange
	}: Props = $props();

	let hover = $state<number | null>(null);

	function setValue(v: number) {
		if (readonly) return;
		// Erneutes Klicken auf denselben Wert löscht die Bewertung.
		const next = value === v ? null : v;
		value = next;
		onchange?.(next);
	}

	function fmt(v: number | null | undefined): string {
		if (v == null) return '–';
		return (v / 2).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
	}

	const displayValue = $derived(hover ?? value ?? 0);
</script>

<div
	class="inline-flex items-center"
	class:gap-1.5={size >= 18}
	class:gap-0.5={size < 18}
	role={readonly ? 'img' : 'radiogroup'}
	aria-label={ariaLabel ?? 'Bewertung'}
>
	<div class="relative inline-flex items-center" style:height={`${size}px`}>
		{#each [1, 2, 3, 4, 5] as star (star)}
			{@const halfValue = star * 2 - 1}
			{@const fullValue = star * 2}
			<div class="relative" style:width={`${size}px`} style:height={`${size}px`}>
				<!-- Background star (empty) -->
				<svg
					viewBox="0 0 24 24"
					width={size}
					height={size}
					class="absolute inset-0 text-stone-300 dark:text-stone-700"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
					/>
				</svg>
				<!-- Foreground full or half fill -->
				{#if displayValue >= fullValue}
					<svg
						viewBox="0 0 24 24"
						width={size}
						height={size}
						class="absolute inset-0 text-amber-400"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
						/>
					</svg>
				{:else if displayValue >= halfValue}
					<svg
						viewBox="0 0 24 24"
						width={size}
						height={size}
						class="absolute inset-0 text-amber-400"
						fill="currentColor"
						aria-hidden="true"
					>
						<defs>
							<clipPath id={`half-clip-${star}`}>
								<rect x="0" y="0" width="12" height="24" />
							</clipPath>
						</defs>
						<path
							d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"
							clip-path={`url(#half-clip-${star})`}
						/>
					</svg>
				{/if}
				<!-- Click overlays: left half = halfValue, right half = fullValue -->
				{#if !readonly}
					<button
						type="button"
						onmouseenter={() => (hover = halfValue)}
						onmouseleave={() => (hover = null)}
						onclick={() => setValue(halfValue)}
						aria-label={`${halfValue / 2} Sterne`}
						class="star-btn absolute inset-y-0 left-0 w-1/2 cursor-pointer bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
					></button>
					<button
						type="button"
						onmouseenter={() => (hover = fullValue)}
						onmouseleave={() => (hover = null)}
						onclick={() => setValue(fullValue)}
						aria-label={`${fullValue / 2} Sterne`}
						class="star-btn absolute inset-y-0 right-0 w-1/2 cursor-pointer bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
					></button>
				{/if}
			</div>
		{/each}
	</div>
	{#if !readonly}
		<span class="ml-1 text-xs tabular-nums text-stone-500 dark:text-stone-400">
			{fmt(displayValue) === '0.0' ? '–' : fmt(displayValue)}
		</span>
	{:else if value != null && showValue}
		<span class="ml-1 text-xs tabular-nums text-stone-500 dark:text-stone-400">{fmt(value)}</span>
	{/if}
	{#if name}
		<input type="hidden" {name} value={value ?? ''} />
	{/if}
</div>

<style>
	/* Tailwind preflight aktiviert Browser-Defaults (z.B. button:hover transform
	   in manchen Themes). Wir wollen die Sterne *statisch* — keine Animation,
	   keine Skalierung, keine Rotation. */
	.star-btn {
		transform: none !important;
		transition: none !important;
		appearance: none;
		border: 0;
		padding: 0;
		margin: 0;
	}
	.star-btn:hover,
	.star-btn:active,
	.star-btn:focus {
		transform: none !important;
	}
</style>

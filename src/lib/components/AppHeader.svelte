<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import BrandLogo from './BrandLogo.svelte';

	type Props = {
		title?: string;
		subtitle?: string;
		back?: string;
		children?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
		leading?: import('svelte').Snippet;
	};

	let { title, subtitle, back, children, actions, leading }: Props = $props();
</script>

<header
	class="sticky top-[var(--demo-banner-h,0px)] z-20 border-b border-stone-200/50 bg-white/85 backdrop-blur-xl dark:border-stone-800/60 dark:bg-stone-950/80"
>
	<div>
		<div class="mx-auto flex h-14 max-w-2xl items-center gap-1 px-3">
			<a
				href="/serien"
				class="group -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/30 transition-transform active:scale-90 hover:rotate-[-4deg] hover:scale-105"
				aria-label="Bandsalat — zur Startseite"
				title="Zur Startseite"
			>
				<BrandLogo size={22} />
			</a>
			{#if back}
				<a
					href={back}
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-700 transition active:scale-90 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
					aria-label="Zurück"
				>
					<ChevronLeft size={22} />
				</a>
			{:else if leading}
				<div class="flex shrink-0 items-center">{@render leading()}</div>
			{/if}
			<div class="min-w-0 flex-1 pl-1">
				<h1 class="truncate text-base font-semibold leading-tight tracking-tight">
					{#if children}{@render children()}{:else}{title ?? ''}{/if}
				</h1>
				{#if subtitle}
					<div class="truncate text-[11px] text-stone-500 dark:text-stone-400">
						{subtitle}
					</div>
				{/if}
			</div>
			{#if actions}
				<div class="flex shrink-0 items-center gap-0.5">{@render actions()}</div>
			{/if}
		</div>
	</div>
</header>

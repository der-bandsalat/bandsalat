<script lang="ts">
	import { page } from '$app/state';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Plus from '@lucide/svelte/icons/plus';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Settings from '@lucide/svelte/icons/settings';

	const items = [
		{
			href: '/serien',
			label: 'Serien',
			Icon: LayoutGrid,
			match: ['/serien', '/kassetten/luecken', '/kassetten'] as const
		},
		{ href: '/kassetten/neu', label: 'Neu', Icon: Plus, accent: true },
		{ href: '/statistik', label: 'Stats', Icon: ChartColumn },
		{
			href: '/einstellungen',
			label: 'Einst.',
			Icon: Settings,
			match: ['/einstellungen', '/sync'] as const
		}
	];

	function active(item: (typeof items)[number]): boolean {
		const p = page.url.pathname;
		if ('match' in item && item.match) {
			return item.match.some((m) => p === m || p.startsWith(m + '/'));
		}
		return p === item.href || p.startsWith(item.href + '/');
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-stone-800/70 dark:bg-stone-950/95"
>
	<ul class="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-2 py-1.5">
		{#each items as item (item.href)}
			{@const isActive = active(item)}
			<li>
				<a
					href={item.href}
					class="relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition active:scale-95"
					style:background={isActive && !item.accent
						? 'color-mix(in oklab, var(--color-brand-500) 12%, transparent)'
						: 'transparent'}
				>
					{#if item.accent}
						<span
							class="-mt-7 mb-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30 ring-[3px] ring-white transition active:scale-95 dark:ring-stone-950"
						>
							<item.Icon size={22} />
						</span>
						<span class="text-[11px] font-medium text-stone-500 dark:text-stone-400">
							{item.label}
						</span>
					{:else}
						<item.Icon
							size={22}
							class={isActive
								? 'text-brand-600 dark:text-brand-300'
								: 'text-stone-500 dark:text-stone-400'}
						/>
						<span
							class="text-[11px] font-medium tracking-tight"
							class:text-brand-700={isActive}
							class:dark:text-brand-200={isActive}
							class:text-stone-500={!isActive}
							class:dark:text-stone-400={!isActive}
						>
							{item.label}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>

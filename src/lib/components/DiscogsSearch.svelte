<script lang="ts">
	import type { SearchResult } from '$lib/server/discogs/types';
	import Search from '@lucide/svelte/icons/search';
	import Loader2 from '@lucide/svelte/icons/loader-circle';
	import X from '@lucide/svelte/icons/x';
	import ImageIcon from '@lucide/svelte/icons/image';

	type Props = {
		defaultQuery?: string;
		onpick: (result: SearchResult) => void;
		onclose: () => void;
	};

	let { defaultQuery = '', onpick, onclose }: Props = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(defaultQuery);
	let format = $state<'Cassette' | 'all'>('Cassette');
	let loading = $state(false);
	let results = $state<SearchResult[]>([]);
	let error = $state<string | null>(null);
	let abortCtrl: AbortController | null = null;
	let lastQuery = '';

	async function runSearch() {
		const q = query.trim();
		if (q.length < 2) {
			results = [];
			error = null;
			return;
		}
		if (q === lastQuery && results.length > 0) return;
		lastQuery = q;
		abortCtrl?.abort();
		abortCtrl = new AbortController();
		loading = true;
		error = null;
		try {
			const url = new URL('/api/discogs/search', location.origin);
			url.searchParams.set('q', q);
			url.searchParams.set('format', format);
			const res = await fetch(url, { signal: abortCtrl.signal });
			const body = await res.json();
			if (!res.ok) {
				error = body?.error ?? `Fehler ${res.status}`;
				results = [];
			} else {
				results = body.results ?? [];
				if (results.length === 0) error = 'Keine Treffer.';
			}
		} catch (e) {
			if ((e as Error).name === 'AbortError') return;
			error = e instanceof Error ? e.message : 'Suche fehlgeschlagen.';
			results = [];
		} finally {
			loading = false;
		}
	}

	let timer: ReturnType<typeof setTimeout> | null = null;
	function onInput() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(runSearch, 350);
	}

	function pick(r: SearchResult) {
		onpick(r);
	}

	function joinFormat(r: SearchResult): string {
		if (!r.format || r.format.length === 0) return '';
		return r.format.slice(0, 3).join(' · ');
	}
</script>

<div
	role="dialog"
	aria-modal="true"
	aria-label="Discogs-Suche"
	class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm sm:items-center"
>
	<div
		class="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-2xl"
	>
		<header class="flex items-center gap-2 border-b border-stone-200 p-3 dark:border-stone-800">
			<div class="relative flex-1">
				<span
					class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
				>
					<Search size={18} />
				</span>
				<input
					type="search"
					bind:value={query}
					oninput={onInput}
					onkeydown={(e) => e.key === 'Enter' && runSearch()}
					placeholder="Suche bei Discogs…"
					class="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-3 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-950 dark:focus:ring-brand-900"
				/>
			</div>
			<button
				type="button"
				aria-label="Schließen"
				onclick={onclose}
				class="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
			>
				<X size={20} />
			</button>
		</header>

		<div
			class="flex items-center gap-2 border-b border-stone-200 px-3 py-2 text-xs dark:border-stone-800"
		>
			<label class="flex items-center gap-1">
				<input
					type="radio"
					bind:group={format}
					value="Cassette"
					onchange={() => {
						lastQuery = '';
						runSearch();
					}}
				/>
				Nur Kassetten
			</label>
			<label class="flex items-center gap-1">
				<input
					type="radio"
					bind:group={format}
					value="all"
					onchange={() => {
						lastQuery = '';
						runSearch();
					}}
				/>
				Alle Formate
			</label>
			{#if loading}
				<span class="ml-auto inline-flex items-center gap-1 text-stone-500 dark:text-stone-400">
					<Loader2 size={14} class="animate-spin" />
					lädt…
				</span>
			{/if}
		</div>

		<div class="flex-1 overflow-y-auto">
			{#if error}
				<div
					class="m-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
				>
					{error}
				</div>
			{/if}

			{#if results.length > 0}
				<ul class="divide-y divide-stone-100 dark:divide-stone-800">
					{#each results as r (r.id)}
						<li>
							<button
								type="button"
								onclick={() => pick(r)}
								class="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
							>
								<div
									class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
								>
									{#if r.thumb}
										<img src={r.thumb} alt="" class="h-full w-full object-cover" />
									{:else}
										<div class="flex h-full items-center justify-center text-stone-400">
											<ImageIcon size={20} />
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-medium">{r.title}</div>
									<div class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
										{[r.year, r.label?.[0], r.country, r.catno].filter(Boolean).join(' · ')}
									</div>
									{#if joinFormat(r)}
										<div class="mt-0.5 text-xs text-stone-400">{joinFormat(r)}</div>
									{/if}
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{:else if !loading && !error}
				<div class="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
					Tipp Serien-, Titel- oder Catno-Stichworte ein.
				</div>
			{/if}
		</div>
	</div>
</div>

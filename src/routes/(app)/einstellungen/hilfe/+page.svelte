<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';

	let { data } = $props();
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Hilfe & Handbuch</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl px-4 py-4 pb-24">
	<article
		class="handbuch rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<!-- Inhalt ist statisches, eigenes Handbuch (kein User-Input) → unbedenklich. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html data.html}
	</article>
</main>

<style>
	/* Markdown-Styling — manuell statt Typography-Plugin (Tailwind v4). */
	.handbuch :global(h1) {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		margin-bottom: 0.5rem;
	}
	.handbuch :global(h2) {
		font-size: 1.2rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgb(231 229 228 / 0.7);
		scroll-margin-top: 4.5rem;
	}
	:global(.dark) .handbuch :global(h2) {
		border-color: rgb(41 37 36 / 0.7);
	}
	.handbuch :global(h3) {
		font-size: 1rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.35rem;
		scroll-margin-top: 4.5rem;
	}
	.handbuch :global(p),
	.handbuch :global(ul),
	.handbuch :global(ol) {
		font-size: 0.9rem;
		line-height: 1.65;
		color: rgb(68 64 60);
		margin-bottom: 0.75rem;
	}
	:global(.dark) .handbuch :global(p),
	:global(.dark) .handbuch :global(ul),
	:global(.dark) .handbuch :global(ol) {
		color: rgb(214 211 209);
	}
	.handbuch :global(ul),
	.handbuch :global(ol) {
		padding-left: 1.25rem;
	}
	.handbuch :global(ul) {
		list-style: disc;
	}
	.handbuch :global(ol) {
		list-style: decimal;
	}
	.handbuch :global(li) {
		margin-bottom: 0.25rem;
	}
	.handbuch :global(li > ul),
	.handbuch :global(li > ol) {
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
	}
	.handbuch :global(a) {
		color: var(--color-brand-600, #c2410c);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.handbuch :global(strong) {
		font-weight: 600;
		color: rgb(28 25 23);
	}
	:global(.dark) .handbuch :global(strong) {
		color: rgb(245 245 244);
	}
	.handbuch :global(code) {
		font-family: ui-monospace, monospace;
		font-size: 0.82em;
		background: rgb(245 245 244);
		padding: 0.1rem 0.35rem;
		border-radius: 0.3rem;
	}
	:global(.dark) .handbuch :global(code) {
		background: rgb(41 37 36);
	}
	.handbuch :global(blockquote) {
		border-left: 3px solid var(--color-brand-400, #fb923c);
		padding: 0.4rem 0 0.4rem 0.9rem;
		margin: 0.75rem 0;
		color: rgb(87 83 78);
		background: rgb(250 250 249);
		border-radius: 0 0.4rem 0.4rem 0;
	}
	:global(.dark) .handbuch :global(blockquote) {
		color: rgb(168 162 158);
		background: rgb(28 25 23 / 0.5);
	}
	.handbuch :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
		margin: 0.75rem 0;
		display: block;
		overflow-x: auto;
	}
	.handbuch :global(th),
	.handbuch :global(td) {
		border: 1px solid rgb(231 229 228);
		padding: 0.4rem 0.6rem;
		text-align: left;
		vertical-align: top;
	}
	:global(.dark) .handbuch :global(th),
	:global(.dark) .handbuch :global(td) {
		border-color: rgb(41 37 36);
	}
	.handbuch :global(th) {
		background: rgb(245 245 244);
		font-weight: 600;
	}
	:global(.dark) .handbuch :global(th) {
		background: rgb(41 37 36);
	}
	.handbuch :global(hr) {
		border: none;
		border-top: 1px solid rgb(231 229 228);
		margin: 1.5rem 0;
	}
	:global(.dark) .handbuch :global(hr) {
		border-color: rgb(41 37 36);
	}
	.handbuch :global(em) {
		color: rgb(120 113 108);
	}
</style>

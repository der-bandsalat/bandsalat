<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import CassetteTape from '@lucide/svelte/icons/cassette-tape';
	import Headphones from '@lucide/svelte/icons/headphones';
	import { onMount } from 'svelte';

	type FontDef = {
		id: string;
		name: string;
		description: string;
		css: string;
		import?: string;
	};

	const FONTS: FontDef[] = [
		{
			id: 'system',
			name: 'System-Sans (aktuell)',
			description: 'ui-sans-serif → SF Pro / Segoe UI / Roboto je nach Plattform.',
			css: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
		},
		{
			id: 'inter',
			name: 'Inter',
			description:
				'UI-Standard. Sehr klar bei kleinen Größen, neutral, plattformübergreifend gleich.',
			css: "Inter, 'Inter Tight', ui-sans-serif, system-ui, sans-serif",
			import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
		},
		{
			id: 'manrope',
			name: 'Manrope',
			description: 'Leicht abgerundet, freundlicher Charakter. Hobby-/Sammler-vibe.',
			css: 'Manrope, ui-sans-serif, system-ui, sans-serif',
			import: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
		},
		{
			id: 'jakarta',
			name: 'Plus Jakarta Sans',
			description: 'Modern, geometric-humanist. Etwas verspielter als Inter, gute Umlaute.',
			css: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
			import:
				'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
		},
		{
			id: 'geist',
			name: 'Geist Sans',
			description: 'Vercel-Style. Konsistent mit dem Geist Mono der bereits in der App ist.',
			css: "'Geist', ui-sans-serif, system-ui, sans-serif",
			import: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap'
		},
		{
			id: 'outfit',
			name: 'Outfit',
			description: 'Strenger geometric. Display-Charakter — gut für Headlines + Brand.',
			css: 'Outfit, ui-sans-serif, system-ui, sans-serif',
			import: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap'
		}
	];

	let active = $state('system');

	onMount(() => {
		// Alle Google-Fonts vorladen.
		for (const f of FONTS) {
			if (!f.import) continue;
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = f.import;
			document.head.appendChild(link);
		}
	});

	const activeFont = $derived(FONTS.find((f) => f.id === active)!);
</script>

<AppHeader back="/einstellungen">
	{#snippet children()}
		<span class="truncate">Font-Lab</span>
	{/snippet}
</AppHeader>

<main class="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-24" style:font-family={activeFont.css}>
	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h2 class="text-base font-semibold">Font wechseln</h2>
		<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
			Klick auf einen Font — die Vorschau unten zeigt eine reale Bandsalat-Karte in der Schrift.
			Nichts wird gespeichert, nichts wird global gewechselt.
		</p>
		<div class="mt-3 grid gap-1.5 sm:grid-cols-2">
			{#each FONTS as f (f.id)}
				<button
					type="button"
					onclick={() => (active = f.id)}
					class="flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition"
					class:border-brand-500={active === f.id}
					class:bg-brand-50={active === f.id}
					class:dark:border-brand-400={active === f.id}
					class:dark:bg-brand-950={active === f.id}
					class:border-stone-200={active !== f.id}
					class:dark:border-stone-700={active !== f.id}
				>
					<span class="font-semibold" style:font-family={f.css}>{f.name}</span>
					<span class="text-[11px] text-stone-500 dark:text-stone-400">{f.description}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Live-Preview im aktiven Font -->
	<section class="space-y-3">
		<header
			class="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
				<BrandLogo size={28} />
			</span>
			<div>
				<div class="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
					Beispiel-Brand-Header
				</div>
				<div class="text-xl font-semibold tracking-tight">Bandsalat</div>
			</div>
		</header>

		<article
			class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<div class="bg-stone-900 px-4 py-6 text-stone-50">
				<div class="text-xs font-medium uppercase tracking-wider text-stone-400">
					Die drei ??? · Folge 100
				</div>
				<h3 class="mt-1 text-2xl font-semibold tracking-tight">Toteninsel — André Marx</h3>
				<p class="mt-2 text-sm text-stone-300">Veröffentlicht 2001 · EUROPA Logo! · Auflage 1</p>
			</div>
			<dl class="grid grid-cols-2 gap-px bg-stone-100 text-sm dark:bg-stone-800">
				<div class="bg-white p-3 dark:bg-stone-900">
					<dt class="text-xs text-stone-500 dark:text-stone-400">Zustand MC</dt>
					<dd class="font-medium">Very Good Plus (VG+)</dd>
				</div>
				<div class="bg-white p-3 dark:bg-stone-900">
					<dt class="text-xs text-stone-500 dark:text-stone-400">Hülle</dt>
					<dd class="font-medium">Near Mint (NM)</dd>
				</div>
				<div class="bg-white p-3 dark:bg-stone-900">
					<dt class="text-xs text-stone-500 dark:text-stone-400">Kaufpreis</dt>
					<dd class="font-medium">3,50 €</dd>
				</div>
				<div class="bg-white p-3 dark:bg-stone-900">
					<dt class="text-xs text-stone-500 dark:text-stone-400">Bewertung</dt>
					<dd><StarRating value={9} readonly size={18} /></dd>
				</div>
			</dl>
			<div class="border-t border-stone-100 p-4 dark:border-stone-800">
				<div class="flex items-center gap-2 text-sm">
					<Headphones size={16} class="text-brand-500" />
					<span class="font-medium">3× gehört</span>
					<span class="text-stone-500 dark:text-stone-400">· zuletzt vor 12 Tagen</span>
				</div>
				<p class="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
					Der Auftrag an die drei Detektive hört sich recht harmlos an: Sie sollen einen entflogenen
					Papagei suchen. Doch kaum beginnen sie mit ihren Nachforschungen, da scheinen sich
					plötzlich noch einige andere Leute sehr für diesen Papagei zu interessieren. Vielleicht
					deshalb, weil er lateinische Sprüche zitieren kann?
				</p>
			</div>
		</article>

		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h3 class="text-base font-semibold">Typografie-Skala</h3>
			<div class="mt-3 space-y-2">
				<div>
					<div class="text-[11px] uppercase tracking-wide text-stone-400">text-3xl</div>
					<div class="text-3xl font-semibold tracking-tight">Hörspielkassetten-Sammlung</div>
				</div>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-stone-400">text-xl</div>
					<div class="text-xl font-semibold">Die drei ??? und der Super-Papagei</div>
				</div>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-stone-400">text-base</div>
					<div class="text-base">Justus Jonas, Peter Shaw, Bob Andrews — sie lösen jeden Fall.</div>
				</div>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-stone-400">text-sm</div>
					<div class="text-sm text-stone-700 dark:text-stone-300">
						Originalhülle ja · Vollständig ja · Seriennummer 41 6022 5
					</div>
				</div>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-stone-400">text-xs (UI-Detail)</div>
					<div class="text-xs text-stone-500 dark:text-stone-400">
						Erfasst vor 3 Wochen, zuletzt aktualisiert vor 2 Tagen.
					</div>
				</div>
			</div>
		</section>

		<section
			class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<h3 class="text-base font-semibold">Tabellen-Eindruck (Liste)</h3>
			<div
				class="mt-2 overflow-hidden rounded-lg border border-stone-100 text-sm dark:border-stone-800"
			>
				<table class="w-full">
					<thead
						class="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-800"
					>
						<tr>
							<th class="px-2 py-1.5 text-left font-medium">Folge</th>
							<th class="px-2 py-1.5 text-left font-medium">Titel</th>
							<th class="px-2 py-1.5 text-left font-medium">Jahr</th>
							<th class="px-2 py-1.5 text-right font-medium">Preis</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-stone-100 dark:divide-stone-800">
						<tr>
							<td class="px-2 py-1.5 font-mono">1</td>
							<td class="px-2 py-1.5">und der Super-Papagei</td>
							<td class="px-2 py-1.5 text-stone-500">1979</td>
							<td class="px-2 py-1.5 text-right tabular-nums">3,50 €</td>
						</tr>
						<tr>
							<td class="px-2 py-1.5 font-mono">12</td>
							<td class="px-2 py-1.5">Der seltsame Wecker</td>
							<td class="px-2 py-1.5 text-stone-500">1981</td>
							<td class="px-2 py-1.5 text-right tabular-nums">2,00 €</td>
						</tr>
						<tr>
							<td class="px-2 py-1.5 font-mono">100</td>
							<td class="px-2 py-1.5">Toteninsel</td>
							<td class="px-2 py-1.5 text-stone-500">2001</td>
							<td class="px-2 py-1.5 text-right tabular-nums">14,90 €</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<div
			class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
		>
			<CassetteTape size={14} class="-mt-0.5 inline-block" />
			Aktuell zur Vorschau: <strong>{activeFont.name}</strong>. CSS:
			<code class="block break-all rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900"
				>{activeFont.css}</code
			>
			Sag Bescheid welcher dir gefällt — ich integriere ihn dann als Default in app.css und lade ihn selbst-gehostet
			statt von Google Fonts.
		</div>
	</section>
</main>

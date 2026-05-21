<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import LogoDraft, { DRAFT_META, type DraftKind } from '$lib/components/LogoDraft.svelte';

	const salatDrafts: DraftKind[] = ['salat', 'doppel', 'welle3', 'bogen', 'schleife', 'knaeuel'];
	const refDrafts: DraftKind[] = ['classic', 'spulen', 'bmono', 'knoten'];

	const swatches = [
		{
			name: 'Hell',
			style: 'background:#fafaf9;color:#27272a',
			accentStyle: 'background:#f2750c;color:#fff'
		},
		{
			name: 'Dunkel',
			style: 'background:#1c1917;color:#e7e5e4',
			accentStyle: 'background:#f59332;color:#fff'
		},
		{
			name: 'HiFi',
			style: 'background:#0a0907;color:#e8dcc2',
			accentStyle: 'background:#d4af37;color:#1c1408'
		}
	];
</script>

<AppHeader title="Logo-Entwürfe" back="/einstellungen/theme" />

<main class="mx-auto max-w-3xl space-y-6 px-4 py-4">
	<section
		class="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900 dark:bg-brand-950/40"
	>
		<h2 class="mb-1 font-semibold text-brand-800 dark:text-brand-200">Salat-Familie</h2>
		<p class="text-stone-600 dark:text-stone-400">
			Sechs Varianten des Cassette-mit-Tape-Konzepts. Reicht von ruhig-symmetrisch (Doppelschleife)
			bis chaotisch (Knäuel).
		</p>
	</section>

	{#each salatDrafts as kind, i (kind)}
		{@const meta = DRAFT_META[kind]}
		<section
			class="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
		>
			<header
				class="flex items-baseline justify-between gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800"
			>
				<div>
					<h2 class="text-base font-semibold">
						<span
							class="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-mono text-brand-700 dark:bg-brand-950 dark:text-brand-300"
							>{i + 1}</span
						>
						{meta.name}
					</h2>
					<p class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{meta.description}</p>
				</div>
				<code class="hidden text-[10px] text-stone-400 sm:block">{kind}</code>
			</header>

			<div class="grid gap-px bg-stone-200 sm:grid-cols-3 dark:bg-stone-800">
				{#each swatches as sw (sw.name)}
					<div class="space-y-3 p-5" style={sw.style}>
						<div class="text-[10px] font-medium uppercase tracking-wider opacity-60">{sw.name}</div>
						<div class="flex items-center gap-3">
							<span
								class="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
								style={sw.accentStyle}
							>
								<LogoDraft {kind} size={34} />
							</span>
							<div style="color:inherit" class="text-sm opacity-90">
								<div class="font-semibold">Auf Akzent</div>
								<div class="text-xs opacity-70">Login, Hero</div>
							</div>
						</div>
						<div class="flex items-center gap-3 border-t border-current/10 pt-3">
							<div class="flex h-14 w-14 items-center justify-center opacity-90">
								<LogoDraft {kind} size={42} />
							</div>
							<div style="color:inherit" class="text-sm opacity-90">
								<div class="font-semibold">Monochrom</div>
								<div class="text-xs opacity-70">Favicon, Nav-Icon</div>
							</div>
						</div>
						<div class="border-t border-current/10 pt-3">
							<LogoDraft {kind} variant="wordmark" size={22} />
							<div class="mt-1 text-xs opacity-60">Header / Login</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/each}

	<details
		class="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
	>
		<summary class="cursor-pointer px-4 py-3 text-sm font-semibold">
			Andere Konzept-Richtungen (Referenz)
		</summary>
		<div class="space-y-6 border-t border-stone-200 px-4 pb-4 pt-4 dark:border-stone-800">
			{#each refDrafts as kind (kind)}
				{@const meta = DRAFT_META[kind]}
				<div class="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
					<header
						class="border-b border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-800"
					>
						<h3 class="text-sm font-semibold">{meta.name}</h3>
						<p class="text-xs text-stone-500 dark:text-stone-400">{meta.description}</p>
					</header>
					<div class="grid gap-px bg-stone-200 sm:grid-cols-3 dark:bg-stone-800">
						{#each swatches as sw (sw.name)}
							<div class="flex items-center justify-center gap-2 p-4" style={sw.style}>
								<span
									class="flex h-10 w-10 items-center justify-center rounded-xl"
									style={sw.accentStyle}
								>
									<LogoDraft {kind} size={24} />
								</span>
								<div class="flex h-10 items-center" style="color:inherit">
									<LogoDraft {kind} size={28} />
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</details>

	<section
		class="rounded-2xl border border-stone-200 bg-white p-4 text-sm dark:border-stone-800 dark:bg-stone-900"
	>
		<h3 class="mb-2 font-semibold">Wenn du dich entschieden hast</h3>
		<p class="text-stone-600 dark:text-stone-400">
			Sag mir die Nummer aus der Salat-Familie (z.B. „nimm 3") — ich tausche dann
			<code>BrandLogo.svelte</code> gegen den Entwurf. Oder schick dein eigenes Logo als SVG/PNG.
		</p>
	</section>
</main>

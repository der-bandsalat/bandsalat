<script lang="ts">
	import { topFolgen, pickWeighted, starStates, type Folge } from '$lib/content/folgen';

	// SSR-stabiler Initial-State (verhindert Hydration-Mismatch); $effect picked
	// auf dem Client gewichtet neu, ?folge=NR erzwingt eine bestimmte Folge.
	let folge: Folge = $state(topFolgen[0]!);

	$effect(() => {
		const forced = new URLSearchParams(location.search).get('folge');
		if (forced) {
			const match = topFolgen.find((x) => x.nr === parseInt(forced, 10));
			folge = match ?? pickWeighted(topFolgen);
		} else {
			folge = pickWeighted(topFolgen);
		}
	});

	let states = $derived(starStates(folge.bewertung));
	let isLiebling = $derived((folge.weight ?? 1) > 1);
</script>

<div class="mx-auto w-full max-w-xs">
	<div class="relative aspect-[4/3] w-full">
		<div
			class="absolute inset-0 -z-10 rounded-[40%] bg-gradient-to-br from-brand-300/40 via-brand-500/30 to-brand-700/40 blur-3xl dark:from-brand-500/30 dark:via-brand-700/20 dark:to-brand-900/40"
		></div>

		<svg
			viewBox="0 0 320 240"
			xmlns="http://www.w3.org/2000/svg"
			class="h-full w-full drop-shadow-[0_30px_60px_rgba(242,117,12,0.25)]"
			role="img"
			aria-label="Animierte Hörspielkassette mit zufälliger Top-Folge"
		>
			<defs>
				<linearGradient id="cv-body" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#fbd6a6" />
					<stop offset="100%" stop-color="#f2750c" />
				</linearGradient>
				<linearGradient id="cv-body-dark" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#3a2f25" />
					<stop offset="100%" stop-color="#1c1408" />
				</linearGradient>
				<linearGradient id="cv-label" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#fef7ed" />
					<stop offset="100%" stop-color="#fdedd3" />
				</linearGradient>
				<filter id="cv-shadow">
					<feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2" />
				</filter>
				<symbol id="cv-star" viewBox="0 0 12 12">
					<path
						d="M6 1 L7.19 4.13 L10.5 4.64 L8 7.07 L8.72 10.51 L6 8.89 L3.27 10.51 L4 7.07 L1.5 4.64 L4.8 4.13 Z"
					/>
				</symbol>
			</defs>

			<g filter="url(#cv-shadow)">
				<rect
					x="20"
					y="40"
					width="280"
					height="160"
					rx="14"
					fill="url(#cv-body)"
					class="dark:[fill:url(#cv-body-dark)]"
				/>

				<rect x="36" y="56" width="248" height="62" rx="6" fill="url(#cv-label)" />

				<!-- "die drei ???" — Original-Optik gedaempft -->
				<g transform="translate(48, 76)">
					<text
						x="0"
						y="0"
						font-family="Inter, sans-serif"
						font-size="11"
						font-weight="800"
						fill="#1c1408"
						letter-spacing="0.04em">die drei</text
					>
					<text
						x="58"
						y="-2"
						font-family="Inter, sans-serif"
						font-size="14"
						font-weight="900"
						fill="#b91c1c">?</text
					>
					<text
						x="66"
						y="1"
						font-family="Inter, sans-serif"
						font-size="14"
						font-weight="900"
						fill="#fefcf7"
						stroke="#1c1408"
						stroke-width="0.6"
						paint-order="stroke">?</text
					>
					<text
						x="74"
						y="-2"
						font-family="Inter, sans-serif"
						font-size="14"
						font-weight="900"
						fill="#1e3a8a">?</text
					>
				</g>

				<text
					x="48"
					y="98"
					font-family="Inter, sans-serif"
					font-size="11"
					font-weight="700"
					fill="#1c1408">{folge.titel}</text
				>

				<text
					x="48"
					y="112"
					font-family="JetBrains Mono, monospace"
					font-size="8"
					font-weight="700"
					fill="#782f10"
					letter-spacing="0.1em">FOLGE {folge.nr} · A-SEITE</text
				>

				<g transform="translate(232, 78)">
					<rect
						x="0"
						y="0"
						width="40"
						height="14"
						rx="2"
						fill="none"
						stroke="#782f10"
						stroke-width="0.8"
						opacity="0.6"
					/>
					<text
						x="20"
						y="10"
						font-family="Inter, sans-serif"
						font-size="8"
						font-weight="700"
						fill="#782f10"
						text-anchor="middle"
						opacity="0.8">EUROPA</text
					>
				</g>

				<rect x="36" y="130" width="248" height="56" rx="6" fill="#1c1408" fill-opacity="0.85" />

				<g class="cv-spool" style="transform-origin: 90px 158px;">
					<circle cx="90" cy="158" r="22" fill="#fef7ed" />
					<circle cx="90" cy="158" r="6" fill="#1c1408" />
					<g stroke="#1c1408" stroke-width="2" stroke-linecap="round">
						<line x1="90" y1="140" x2="90" y2="148" />
						<line x1="90" y1="168" x2="90" y2="176" />
						<line x1="72" y1="158" x2="80" y2="158" />
						<line x1="100" y1="158" x2="108" y2="158" />
						<line x1="77" y1="145" x2="83" y2="151" />
						<line x1="97" y1="165" x2="103" y2="171" />
						<line x1="103" y1="145" x2="97" y2="151" />
						<line x1="83" y1="165" x2="77" y2="171" />
					</g>
				</g>

				<g class="cv-spool" style="transform-origin: 230px 158px;">
					<circle cx="230" cy="158" r="22" fill="#fef7ed" />
					<circle cx="230" cy="158" r="6" fill="#1c1408" />
					<g stroke="#1c1408" stroke-width="2" stroke-linecap="round">
						<line x1="230" y1="140" x2="230" y2="148" />
						<line x1="230" y1="168" x2="230" y2="176" />
						<line x1="212" y1="158" x2="220" y2="158" />
						<line x1="240" y1="158" x2="248" y2="158" />
						<line x1="217" y1="145" x2="223" y2="151" />
						<line x1="237" y1="165" x2="243" y2="171" />
						<line x1="243" y1="145" x2="237" y2="151" />
						<line x1="223" y1="165" x2="217" y2="171" />
					</g>
				</g>

				<path
					class="cv-tape"
					d="M 112 158 C 130 130, 150 180, 170 150 S 200 130, 208 158"
					fill="none"
					stroke="#fef7ed"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-dasharray="6 4"
					opacity="0.9"
				/>

				<circle cx="36" cy="194" r="2.5" fill="#1c1408" opacity="0.5" />
				<circle cx="284" cy="194" r="2.5" fill="#1c1408" opacity="0.5" />
				<circle cx="36" cy="50" r="2.5" fill="#1c1408" opacity="0.5" />
				<circle cx="284" cy="50" r="2.5" fill="#1c1408" opacity="0.5" />
			</g>

			<!-- Badge: Folge-Nr + Liebling-Herz -->
			<g class="cv-badge-folge">
				<rect
					x="218"
					y="14"
					width="86"
					height="26"
					rx="13"
					fill="white"
					stroke="#bc450a"
					stroke-width="1.5"
				/>
				<circle cx="232" cy="27" r="4" fill="#f2750c" />
				<text
					x="244"
					y="31"
					font-family="Inter, sans-serif"
					font-size="11"
					font-weight="600"
					fill="#782f10">Folge {folge.nr}</text
				>
				{#if isLiebling}
					<g class="cv-heart" transform="translate(289, 22)">
						<path
							d="M5 9.5 C 5 9.5, 0.5 6.5, 0.5 3.5 A 2.5 2.5 0 0 1 5 2 A 2.5 2.5 0 0 1 9.5 3.5 C 9.5 6.5, 5 9.5, 5 9.5 Z"
							fill="#b91c1c"
						/>
					</g>
				{/if}
			</g>

			<!-- Badge: Stern-Rating -->
			<g class="cv-badge-rating">
				<rect
					x="14"
					y="206"
					width="92"
					height="26"
					rx="13"
					fill="white"
					stroke="#bc450a"
					stroke-width="1.5"
				/>
				<g transform="translate(26, 213)">
					{#each states as state, i (i)}
						<g class="cv-star" data-fill={state} transform={`translate(${i * 14}, 0)`}>
							<use
								href="#cv-star"
								width="12"
								height="12"
								fill="none"
								stroke="#bc450a"
								stroke-width="1"
							/>
							<use href="#cv-star" width="12" height="12" fill="#b91c1c" class="cv-fill" />
							<use href="#cv-star" width="12" height="12" fill="#b91c1c" class="cv-half" />
						</g>
					{/each}
				</g>
			</g>
		</svg>
	</div>

	<p class="mt-3 text-center text-xs text-stone-500 dark:text-stone-500">
		Zufalls-Top-Folge aus
		<a
			href="https://www.rocky-beach.com/php/project/f_wertung.html"
			target="_blank"
			rel="noopener"
			class="underline decoration-dotted underline-offset-2 hover:text-brand-600 dark:hover:text-brand-400"
		>
			rocky-beach.com
		</a>
		· Reload für die nächste
	</p>
</div>

<style>
	.cv-spool {
		animation: spool 4s linear infinite;
	}
	.cv-tape {
		animation: tape 4s linear infinite;
	}
	.cv-badge-folge {
		animation: fadeUp 1s 0.4s both;
	}
	.cv-badge-rating {
		animation: fadeUp 1s 0.6s both;
	}

	/* Sterne: per data-fill drei States */
	.cv-star .cv-fill,
	.cv-star .cv-half {
		display: none;
	}
	.cv-star[data-fill='full'] .cv-fill {
		display: inline;
	}
	.cv-star[data-fill='half'] .cv-half {
		display: inline;
		clip-path: inset(0 50% 0 0);
	}

	.cv-heart {
		animation: cv-heartbeat 1.6s ease-in-out infinite;
		transform-origin: 5px 5px;
		transform-box: fill-box;
	}
	@keyframes cv-heartbeat {
		0%,
		100% {
			transform: scale(1);
		}
		20% {
			transform: scale(1.18);
		}
		40% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cv-spool,
		.cv-tape,
		.cv-badge-folge,
		.cv-badge-rating,
		.cv-heart {
			animation: none;
		}
	}
</style>

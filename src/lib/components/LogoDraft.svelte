<script lang="ts" module>
	export type DraftKind =
		| 'classic'
		| 'salat'
		| 'doppel'
		| 'welle3'
		| 'bogen'
		| 'schleife'
		| 'knaeuel'
		| 'spulen'
		| 'bmono'
		| 'knoten';

	export const DRAFT_META: Record<DraftKind, { name: string; description: string }> = {
		salat: {
			name: 'Salat — Welle',
			description: 'Original: Cassette mit wild verschlungener Tape-Linie. Verspielt, asymmetrisch.'
		},
		doppel: {
			name: 'Salat — Doppelschleife',
			description:
				'Symmetrische ∩∩-Form aus beiden Reels — ruhiger und ausbalancierter als die Welle.'
		},
		welle3: {
			name: 'Salat — Dreiwelle',
			description: 'Drei gleichmäßige Wellen, wie ausgespultes Band. Elegant, audiophil.'
		},
		bogen: {
			name: 'Salat — Bogen',
			description:
				'Ein großer Bogen über die Cassette mit kleinem Knoten-Akzent in der Mitte. Reduziert.'
		},
		schleife: {
			name: 'Salat — Bandschleife',
			description:
				'Bandschleife wie auf einem Geschenk — zwei Seitenloops, Knotenpunkt in der Mitte.'
		},
		knaeuel: {
			name: 'Salat — Knäuel',
			description: 'Tape-Knäuel aus mehreren überlappenden Loops. Am wildesten, „echter" Bandsalat.'
		},
		classic: {
			name: 'Klassisch (Referenz)',
			description: 'Cassette-Outline mit zwei Reels — der bestehende Mark, zum Vergleich.'
		},
		spulen: {
			name: 'Spulen (Referenz)',
			description: 'Zwei überlappende Reels — abstrakt, kein Salat-Bezug.'
		},
		bmono: {
			name: 'Schleife-B (Referenz)',
			description: 'Monogramm B — kein Salat-Bezug, hier nur zum Vergleich.'
		},
		knoten: {
			name: 'Triquetra (Referenz)',
			description: 'Abstrakter Knoten — kein Cassette-Bezug, hier nur zum Vergleich.'
		}
	};
</script>

<script lang="ts">
	type Props = {
		kind: DraftKind;
		size?: number;
		variant?: 'mark' | 'wordmark';
		title?: string;
	};

	let { kind, size = 32, variant = 'mark', title = 'Bandsalat' }: Props = $props();

	const markViewBox: Record<DraftKind, string> = {
		classic: '0 0 64 48',
		salat: '0 0 64 48',
		doppel: '0 0 64 48',
		welle3: '0 0 64 48',
		bogen: '0 0 64 48',
		schleife: '0 0 64 48',
		knaeuel: '0 0 64 48',
		spulen: '0 0 64 48',
		bmono: '0 0 48 48',
		knoten: '0 0 48 48'
	};

	const markAspect = $derived.by(() => {
		const [, , w, h] = markViewBox[kind].split(' ').map(Number);
		return w / h;
	});

	const markWidth = $derived(size * markAspect);
	const markHeight = $derived(size);
</script>

{#snippet draft(k: DraftKind)}
	{#if k === 'classic'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="2" y="2" width="60" height="40" rx="6" fill="currentColor" fill-opacity="0.1" />
			<circle cx="20" cy="22" r="6" />
			<circle cx="44" cy="22" r="6" />
			<line x1="26" y1="22" x2="38" y2="22" />
			<path d="M14 42 L17 46.5 H47 L50 42" />
			<line x1="9" y1="12" x2="55" y2="12" stroke-width="1" opacity="0.4" />
		</g>
	{:else if k === 'salat'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<path
				d="M18 28.5 C 10 18, 18 6, 26 14 C 32 20, 36 6, 40 12 C 44 18, 54 4, 48 18 C 44 26, 50 30, 46 28.5"
			/>
		</g>
	{:else if k === 'doppel'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<path
				d="M 18 28.5 C 10 18, 14 5, 24 5 C 30 5, 30 16, 32 17 C 34 16, 34 5, 40 5 C 50 5, 54 18, 46 28.5"
			/>
		</g>
	{:else if k === 'welle3'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<path d="M 14 26 Q 18 10, 24 18 Q 30 26, 32 16 Q 34 6, 40 16 Q 46 26, 50 18 Q 54 12, 50 26" />
		</g>
	{:else if k === 'bogen'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<path d="M 18 28.5 Q 32 -8, 46 28.5" />
			<path d="M 27 9 L 37 7" stroke-width="3" />
			<circle cx="32" cy="8" r="1.6" fill="currentColor" stroke="none" />
		</g>
	{:else if k === 'schleife'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<path d="M 18 28.5 C 4 22, 4 8, 18 10 C 26 12, 30 18, 32 20" />
			<path d="M 32 20 C 34 18, 38 12, 46 10 C 60 8, 60 22, 46 28.5" />
			<rect x="29.5" y="17.5" width="5" height="5" rx="1.2" fill="currentColor" stroke="none" />
		</g>
	{:else if k === 'knaeuel'}
		<g
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<rect x="4" y="22" width="56" height="22" rx="3" fill="currentColor" fill-opacity="0.1" />
			<circle cx="18" cy="33" r="4.5" />
			<circle cx="46" cy="33" r="4.5" />
			<circle cx="18" cy="33" r="1.2" fill="currentColor" />
			<circle cx="46" cy="33" r="1.2" fill="currentColor" />
			<circle cx="22" cy="14" r="6" />
			<circle cx="34" cy="9" r="5" />
			<circle cx="44" cy="14" r="6" />
			<circle cx="30" cy="18" r="4" />
			<path d="M 18 28 C 18 22, 20 20, 22 20" />
			<path d="M 46 28 C 46 22, 44 20, 42 20" />
		</g>
	{:else if k === 'spulen'}
		<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none">
			<circle cx="22" cy="24" r="15" />
			<circle cx="42" cy="24" r="15" />
			<g opacity="0.45" stroke-width="1.5">
				<line x1="22" y1="11" x2="22" y2="37" />
				<line x1="9" y1="24" x2="35" y2="24" />
				<line x1="13" y1="15" x2="31" y2="33" />
				<line x1="42" y1="11" x2="42" y2="37" />
				<line x1="29" y1="24" x2="55" y2="24" />
				<line x1="51" y1="15" x2="33" y2="33" />
			</g>
			<circle cx="22" cy="24" r="2.5" fill="currentColor" stroke="none" />
			<circle cx="42" cy="24" r="2.5" fill="currentColor" stroke="none" />
		</g>
	{:else if k === 'bmono'}
		<g
			stroke="currentColor"
			stroke-width="3.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<line x1="10" y1="6" x2="10" y2="42" />
			<path d="M 10 6 H 22 a 9 9 0 0 1 0 18 H 10" />
			<path d="M 10 24 H 24 a 9 9 0 0 1 0 18 H 10" />
			<circle cx="22" cy="15" r="2" fill="currentColor" stroke="none" />
			<circle cx="24" cy="33" r="2" fill="currentColor" stroke="none" />
		</g>
	{:else if k === 'knoten'}
		<g
			stroke="currentColor"
			stroke-width="2.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			<circle cx="24" cy="24" r="20" opacity="0.25" />
			<path d="M 24 8 A 12 12 0 0 1 37.86 32 A 12 12 0 0 1 10.14 32 A 12 12 0 0 1 24 8 Z" />
		</g>
	{/if}
{/snippet}

{#if variant === 'wordmark'}
	{@const markW = 56 * markAspect}
	<svg
		viewBox={`0 0 ${markW + 192} 56`}
		width={size * ((markW + 192) / 56)}
		height={size}
		role="img"
		aria-label={title}
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<svg x="0" y={(56 - 48) / 2} width={markW} height="48" viewBox={markViewBox[kind]}>
			{@render draft(kind)}
		</svg>
		<text
			x={markW + 14}
			y="38"
			fill="currentColor"
			font-family="ui-sans-serif, system-ui, sans-serif"
			font-size="32"
			font-weight="600"
			letter-spacing="-0.5">Bandsalat</text
		>
	</svg>
{:else}
	<svg
		viewBox={markViewBox[kind]}
		width={markWidth}
		height={markHeight}
		role="img"
		aria-label={title}
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		{@render draft(kind)}
	</svg>
{/if}

<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import StarRating from './StarRating.svelte';

	type Props = {
		cassetteId: string;
		value: number | null;
		size?: number;
		showValue?: boolean;
		/** Verhindert, dass Klicks im Stern-Bereich an einen umgebenden Link
		 *  bubbeln (Grid-Karten wickeln häufig das Cover in <a>). */
		stopPropagation?: boolean;
	};

	let { cassetteId, value, size = 16, showValue = false, stopPropagation = true }: Props = $props();

	// Optimistischer lokaler Wert, der sofort gerendert wird, während der
	// Server-Roundtrip läuft.
	// svelte-ignore state_referenced_locally
	let optimistic = $state<number | null>(value);
	$effect(() => {
		optimistic = value;
	});

	let saving = $state(false);

	async function save(next: number | null) {
		optimistic = next;
		saving = true;
		try {
			await fetch(`/api/cassettes/${cassetteId}/rating`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rating: next })
			});
			await invalidateAll();
		} finally {
			saving = false;
		}
	}
</script>

<!-- Klicks innerhalb der Sterne sollen keinen umgebenden <a>-Link triggern.
     onclick auf einem div ist hier OK – die echten Buttons sitzen darunter
     und bekommen ihren eigenen Fokus/Tastatur-Support aus StarRating. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="inline-block"
	style:opacity={saving ? 0.6 : 1}
	onclick={stopPropagation ? (e) => e.stopPropagation() : undefined}
	onmousedown={stopPropagation ? (e) => e.stopPropagation() : undefined}
>
	<StarRating value={optimistic} {size} {showValue} onchange={save} />
</div>

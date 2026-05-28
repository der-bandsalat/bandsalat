<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import Crop from '@lucide/svelte/icons/crop';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-2';

	interface Props {
		file: File;
		onCancel: () => void;
		onConfirm: (croppedFile: File) => void;
	}

	let { file, onCancel, onConfirm }: Props = $props();

	let containerEl: HTMLDivElement;
	let cropper: any = null;
	let imgUrl = $state<string>('');
	let ratio = $state<number | null>(null); // null = frei
	let busy = $state(false);
	let errorMsg = $state<string | null>(null);

	const ratios: Array<{ label: string; value: number | null }> = [
		{ label: 'Frei', value: null },
		{ label: '1 : 1', value: 1 },
		{ label: '4 : 3', value: 4 / 3 }
	];

	$effect(() => {
		const url = URL.createObjectURL(file);
		untrack(() => (imgUrl = url));
		return () => URL.revokeObjectURL(url);
	});

	$effect(() => {
		if (!imgUrl || !containerEl) return;
		let cancelled = false;
		(async () => {
			try {
				// dist/cropper.esm.js statt package default (raw) — letzteres
				// registriert die <cropper-canvas>/<cropper-image>/... Web-Components
				// nicht und das Crop-UI bleibt unsichtbar.
				const { default: Cropper } = await import('cropperjs/dist/cropper.esm.js');
				if (cancelled) return;
				// Frisches <img> in Container injizieren — cropperjs ersetzt es
				// durch das <cropper-canvas>-Konstrukt.
				containerEl.innerHTML = '';
				const img = document.createElement('img');
				img.alt = 'Foto-Vorschau';
				img.style.display = 'block';
				img.style.maxWidth = '100%';
				img.style.maxHeight = '100%';
				img.src = imgUrl;
				containerEl.appendChild(img);
				await new Promise<void>((res, rej) => {
					if (img.complete && img.naturalWidth > 0) res();
					else {
						img.onload = () => res();
						img.onerror = () => rej(new Error('Bild konnte nicht geladen werden.'));
					}
				});
				if (cancelled) return;
				cropper = new Cropper(img, {});
				// cropper-canvas hat per Default nur min-height 100px → explizit
				// auf 100% setzen, damit das Bild den ganzen Modal-Body nutzt.
				const cc = cropper.getCropperCanvas() as HTMLElement | null;
				if (cc) {
					cc.style.display = 'block';
					cc.style.width = '100%';
					cc.style.height = '100%';
				}
				await tick();
				applyRatio(ratio);
			} catch (err) {
				if (!cancelled) {
					console.error('[PhotoCropModal] init failed', err);
					errorMsg = err instanceof Error ? err.message : 'Crop-Editor konnte nicht starten.';
				}
			}
		})();
		return () => {
			cancelled = true;
			if (cropper) {
				try {
					cropper.destroy();
				} catch {
					/* ignore */
				}
				cropper = null;
			}
		};
	});

	onDestroy(() => {
		if (cropper) {
			try {
				cropper.destroy();
			} catch {
				/* ignore */
			}
			cropper = null;
		}
	});

	function applyRatio(r: number | null) {
		if (!cropper) return;
		const sel = cropper.getCropperSelection();
		if (!sel) return;
		// v2-API: aspectRatio property als number, NaN für frei.
		sel.aspectRatio = r ?? Number.NaN;
	}

	function setRatio(r: number | null) {
		ratio = r;
		applyRatio(r);
	}

	function rotate90() {
		if (!cropper) return;
		const image = cropper.getCropperImage();
		if (!image) return;
		image.$rotate('90deg');
	}

	async function confirmCrop() {
		if (!cropper || busy) return;
		busy = true;
		errorMsg = null;
		try {
			const sel = cropper.getCropperSelection();
			if (!sel) throw new Error('Auswahl fehlt.');
			// Auf max 2400px Kante begrenzen; sharp komprimiert serverseitig nochmal.
			const canvas = await sel.$toCanvas({ width: 2400 });
			const blob: Blob | null = await new Promise((res) =>
				canvas.toBlob((b: Blob | null) => res(b), 'image/jpeg', 0.92)
			);
			if (!blob) throw new Error('Konnte kein JPEG erzeugen.');
			const croppedFile = new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });
			onConfirm(croppedFile);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Zuschnitt fehlgeschlagen.';
		} finally {
			busy = false;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
		if (e.key === 'Enter' && !busy) void confirmCrop();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label="Foto zuschneiden"
>
	<div
		class="flex h-[100dvh] w-full flex-col bg-stone-900 text-stone-100 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
	>
		<header class="flex items-center justify-between border-b border-stone-700 px-4 py-3">
			<div class="flex items-center gap-2 text-sm font-semibold">
				<Crop size={16} />
				Foto zuschneiden
			</div>
			<button
				type="button"
				onclick={onCancel}
				aria-label="Schließen"
				class="-mr-2 rounded-lg p-2 hover:bg-stone-800"
			>
				<X size={18} />
			</button>
		</header>

		<div
			bind:this={containerEl}
			class="relative flex flex-1 items-stretch justify-stretch overflow-hidden bg-black"
			style="touch-action: none; min-height: 50dvh"
		></div>

		{#if errorMsg}
			<p class="px-4 py-2 text-sm text-red-300">{errorMsg}</p>
		{/if}

		<footer
			class="flex flex-col gap-2 border-t border-stone-700 p-3"
			style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
		>
			<div class="flex flex-wrap items-center justify-center gap-2">
				{#each ratios as r (r.label)}
					<button
						type="button"
						onclick={() => setRatio(r.value)}
						class="rounded-full border px-3 py-1.5 text-xs font-medium transition
							{ratio === r.value
							? 'border-brand-500 bg-brand-500 text-white'
							: 'border-stone-600 text-stone-200 hover:bg-stone-800'}"
					>
						{r.label}
					</button>
				{/each}
				<button
					type="button"
					onclick={rotate90}
					aria-label="90° drehen"
					title="90° drehen"
					class="rounded-full border border-stone-600 p-1.5 text-stone-200 hover:bg-stone-800"
				>
					<RotateCw size={14} />
				</button>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={onCancel}
					class="flex-1 rounded-xl border border-stone-600 px-3 py-3 text-sm font-medium hover:bg-stone-800"
				>
					Abbrechen
				</button>
				<button
					type="button"
					onclick={confirmCrop}
					disabled={busy}
					class="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
				>
					{#if busy}
						<Loader size={16} class="animate-spin" />
						Wird hochgeladen…
					{:else}
						<Check size={16} />
						Übernehmen
					{/if}
				</button>
			</div>
		</footer>
	</div>
</div>

<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { downscaleImage } from '$lib/util/image';
	import Camera from '@lucide/svelte/icons/camera';
	import Image from '@lucide/svelte/icons/image';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Star from '@lucide/svelte/icons/star';
	import Loader from '@lucide/svelte/icons/loader-2';
	import Crop from '@lucide/svelte/icons/crop';
	import PhotoCropModal from './PhotoCropModal.svelte';

	export type PhotoRole = 'front' | 'back' | 'extra';
	export interface PhotoItem {
		id: string;
		role: PhotoRole;
		path: string;
		thumbPath: string | null;
		caption: string | null;
		sortOrder: number;
		createdAt: string;
	}

	export interface ExternalFrontCover {
		thumbUrl: string;
		fullUrl: string;
		/** Anzeige-Badge, z.B. 'Discogs', 'Dreimetadaten', 'Aktuell'. */
		source: string;
		/** Optionaler Callback fuer X-Button auf der Karte. Wenn nicht gesetzt,
		 *  ist die Karte rein read-only ohne Aktions-Chrome. */
		onClear?: () => Promise<void> | void;
	}

	interface Props {
		cassetteId: string;
		photos: PhotoItem[];
		/** Externe Cover-Quellen (Discogs-Cache, Dreimetadaten), die immer in der
		 *  Front-Section als read-only Karten erscheinen — egal ob eigene Front-Fotos
		 *  existieren. So bleiben die Quellen sichtbar und auditierbar. */
		externalFrontCovers?: ExternalFrontCover[];
		uploadsBase?: string;
		disabled?: boolean;
	}

	let {
		cassetteId,
		photos,
		externalFrontCovers = [],
		uploadsBase = '/uploads/',
		disabled = false
	}: Props = $props();

	let uploading = $state<Record<PhotoRole, boolean>>({ front: false, back: false, extra: false });
	let busyId = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);
	let cropTarget = $state<{ file: File; role: PhotoRole; replacePhotoId?: string } | null>(null);

	const byRole = $derived.by(() => {
		const out: Record<PhotoRole, PhotoItem[]> = { front: [], back: [], extra: [] };
		for (const p of photos) out[p.role].push(p);
		for (const role of ['front', 'back', 'extra'] as const) {
			out[role].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
		}
		return out;
	});

	function urlFor(path: string) {
		return `${uploadsBase}${path}`;
	}

	async function uploadFile(file: File, role: PhotoRole) {
		errorMsg = null;
		uploading[role] = true;
		try {
			const fd = new FormData();
			fd.set('file', file);
			fd.set('role', role);
			const res = await fetch(`/api/cassettes/${cassetteId}/photos`, {
				method: 'POST',
				body: fd
			});
			if (!res.ok) {
				const text = await res.text().catch(() => 'Upload fehlgeschlagen.');
				throw new Error(text);
			}
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Upload fehlgeschlagen.';
		} finally {
			uploading[role] = false;
		}
	}

	function handlePick(role: PhotoRole) {
		return async (e: Event) => {
			const input = e.currentTarget as HTMLInputElement;
			const file = input.files?.[0];
			input.value = '';
			if (file) cropTarget = { file: await downscaleImage(file), role };
		};
	}

	async function onCropConfirm(croppedFile: File) {
		const target = cropTarget;
		if (!target) return;
		cropTarget = null;
		if (target.replacePhotoId) {
			// Erst neuen Crop hochladen, dann altes Foto löschen — Reihenfolge
			// hilft, damit die Front-Cover-Synchronisation während des Übergangs
			// nicht kurz auf "kein Foto" fällt.
			await uploadFile(croppedFile, target.role);
			try {
				await fetch(`/api/cassettes/${cassetteId}/photos/${target.replacePhotoId}`, {
					method: 'DELETE'
				});
				await invalidateAll();
			} catch (err) {
				errorMsg = err instanceof Error ? err.message : 'Altes Foto konnte nicht entfernt werden.';
			}
		} else {
			await uploadFile(croppedFile, target.role);
		}
	}

	async function editPhoto(photo: PhotoItem) {
		errorMsg = null;
		busyId = photo.id;
		try {
			const res = await fetch(urlFor(photo.path));
			if (!res.ok) throw new Error('Original konnte nicht geladen werden.');
			const blob = await res.blob();
			const file = new File([blob], `edit-${photo.id}.jpg`, {
				type: blob.type || 'image/jpeg'
			});
			// Alt-Bestände können noch riesige Originale sein — fürs Re-Croppen
			// genügt die Archivgröße, und der Crop-Editor bleibt flüssig.
			cropTarget = {
				file: await downscaleImage(file),
				role: photo.role,
				replacePhotoId: photo.id
			};
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Bearbeiten fehlgeschlagen.';
		} finally {
			busyId = null;
		}
	}

	async function deletePhoto(photo: PhotoItem) {
		if (!confirm('Foto wirklich löschen?')) return;
		errorMsg = null;
		busyId = photo.id;
		try {
			const res = await fetch(`/api/cassettes/${cassetteId}/photos/${photo.id}`, {
				method: 'DELETE'
			});
			if (!res.ok) throw new Error(await res.text());
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Löschen fehlgeschlagen.';
		} finally {
			busyId = null;
		}
	}

	async function setRole(photo: PhotoItem, role: PhotoRole) {
		if (photo.role === role) return;
		errorMsg = null;
		busyId = photo.id;
		try {
			const res = await fetch(`/api/cassettes/${cassetteId}/photos/${photo.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});
			if (!res.ok) throw new Error(await res.text());
			await invalidateAll();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Aktion fehlgeschlagen.';
		} finally {
			busyId = null;
		}
	}

	const roleLabel: Record<PhotoRole, string> = {
		front: 'Front-Cover',
		back: 'Rückseite',
		extra: 'Weitere'
	};

	interface LightboxItem {
		key: string;
		fullUrl: string;
		label: string;
	}
	let lightboxIndex = $state<number | null>(null);
	const lightboxItems = $derived.by<LightboxItem[]>(() => {
		const out: LightboxItem[] = [];
		// Reihenfolge spiegelt das Gallery-Layout: own front, dann externals,
		// dann own back, own extra.
		for (const p of byRole.front) {
			out.push({
				key: `own:${p.id}`,
				fullUrl: urlFor(p.path),
				label: p.caption ?? roleLabel.front
			});
		}
		for (const ext of externalFrontCovers) {
			out.push({
				key: `ext:${ext.fullUrl}`,
				fullUrl: ext.fullUrl,
				label: ext.source
			});
		}
		for (const p of [...byRole.back, ...byRole.extra]) {
			out.push({
				key: `own:${p.id}`,
				fullUrl: urlFor(p.path),
				label: p.caption ?? roleLabel[p.role]
			});
		}
		return out;
	});

	function openLightboxFor(key: string) {
		const idx = lightboxItems.findIndex((i) => i.key === key);
		if (idx >= 0) lightboxIndex = idx;
	}
	function openLightbox(photo: PhotoItem) {
		openLightboxFor(`own:${photo.id}`);
	}
	function openLightboxExternal(ext: ExternalFrontCover) {
		openLightboxFor(`ext:${ext.fullUrl}`);
	}

	let clearingExternal = $state<string | null>(null);
	async function handleClearExternal(ext: ExternalFrontCover) {
		if (!ext.onClear) return;
		if (!confirm(`${ext.source}-Cover wirklich entfernen?`)) return;
		clearingExternal = ext.fullUrl;
		errorMsg = null;
		try {
			await ext.onClear();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Entfernen fehlgeschlagen.';
		} finally {
			clearingExternal = null;
		}
	}

	function closeLightbox() {
		lightboxIndex = null;
	}

	function nextLightbox(delta: number) {
		if (lightboxIndex === null) return;
		const n = lightboxItems.length;
		if (n === 0) {
			lightboxIndex = null;
			return;
		}
		lightboxIndex = (lightboxIndex + delta + n) % n;
	}

	function onLightboxKey(e: KeyboardEvent) {
		if (lightboxIndex === null) return;
		if (e.key === 'Escape') closeLightbox();
		else if (e.key === 'ArrowRight') nextLightbox(1);
		else if (e.key === 'ArrowLeft') nextLightbox(-1);
	}

	const roleHint: Record<PhotoRole, string> = {
		front: 'Hauptbild der Kassette',
		back: 'Inlay-Rückseite oder Trackliste',
		extra: 'Zusätzliche Aufnahmen, beliebig viele'
	};
</script>

<svelte:window onkeydown={onLightboxKey} />

<section class="space-y-5">
	{#each ['front', 'back', 'extra'] as const as role (role)}
		{@const items = byRole[role]}
		{@const single = role !== 'extra'}
		<div>
			<div class="mb-2 flex items-baseline justify-between gap-3">
				<div>
					<h3 class="text-sm font-semibold text-stone-800 dark:text-stone-100">
						{roleLabel[role]}
					</h3>
					<p class="text-xs text-stone-500 dark:text-stone-400">{roleHint[role]}</p>
				</div>
				{#if single && items.length > 0}
					<span class="text-xs text-stone-400">1 Bild</span>
				{:else if !single}
					<span class="text-xs text-stone-400">{items.length} Bilder</span>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each items as photo (photo.id)}
					<figure
						class="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
					>
						<button
							type="button"
							onclick={() => openLightbox(photo)}
							class="block h-full w-full"
							aria-label="Foto vergrößern"
						>
							<img
								src={urlFor(photo.thumbPath ?? photo.path)}
								alt={photo.caption ?? roleLabel[role]}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
						</button>
						{#if busyId === photo.id}
							<div class="absolute inset-0 flex items-center justify-center bg-black/40">
								<Loader size={20} class="animate-spin text-white" />
							</div>
						{/if}
						<div
							class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 transition
								opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100
								[&_button]:pointer-events-auto"
						>
							<div class="flex gap-1">
								{#if role !== 'front'}
									<button
										type="button"
										title="Als Front-Cover setzen"
										aria-label="Als Front-Cover setzen"
										onclick={() => setRole(photo, 'front')}
										disabled={disabled || busyId !== null}
										class="rounded bg-white/90 p-1.5 text-stone-700 hover:bg-white disabled:opacity-50"
									>
										<Star size={14} />
									</button>
								{/if}
								{#if role !== 'back' && role !== 'front'}
									<button
										type="button"
										title="Als Rückseite setzen"
										aria-label="Als Rückseite setzen"
										onclick={() => setRole(photo, 'back')}
										disabled={disabled || busyId !== null}
										class="rounded bg-white/90 p-1.5 text-stone-700 hover:bg-white disabled:opacity-50"
									>
										<Image size={14} />
									</button>
								{/if}
								{#if role !== 'extra'}
									<button
										type="button"
										title="Zu Weitere verschieben"
										aria-label="Zu Weitere verschieben"
										onclick={() => setRole(photo, 'extra')}
										disabled={disabled || busyId !== null}
										class="rounded bg-white/90 p-1.5 text-stone-700 hover:bg-white disabled:opacity-50"
									>
										<Plus size={14} />
									</button>
								{/if}
							</div>
							<div class="flex gap-1">
								<button
									type="button"
									title="Zuschneiden"
									aria-label="Foto zuschneiden"
									onclick={() => editPhoto(photo)}
									disabled={disabled || busyId !== null}
									class="rounded bg-white/90 p-1.5 text-stone-700 hover:bg-white disabled:opacity-50"
								>
									<Crop size={14} />
								</button>
								<button
									type="button"
									title="Löschen"
									aria-label="Foto löschen"
									onclick={() => deletePhoto(photo)}
									disabled={disabled || busyId !== null}
									class="rounded bg-red-500/90 p-1.5 text-white hover:bg-red-500 disabled:opacity-50"
								>
									<Trash2 size={14} />
								</button>
							</div>
						</div>
					</figure>
				{/each}

				{#if role === 'front' && externalFrontCovers.length > 0}
					{#each externalFrontCovers as ext, i (ext.thumbUrl + i)}
						<figure
							class="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
							title="{ext.source}-Cover"
						>
							<button
								type="button"
								onclick={() => openLightboxExternal(ext)}
								class="block h-full w-full"
								aria-label="{ext.source}-Cover vergrößern"
							>
								<img
									src={ext.thumbUrl}
									alt="{ext.source}-Cover"
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							</button>
							<div
								class="pointer-events-none absolute inset-x-0 top-0 bg-black/60 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wide text-white"
							>
								{ext.source}
							</div>
							{#if clearingExternal === ext.fullUrl}
								<div class="absolute inset-0 flex items-center justify-center bg-black/40">
									<Loader size={20} class="animate-spin text-white" />
								</div>
							{/if}
							{#if ext.onClear}
								<button
									type="button"
									title="{ext.source}-Cover entfernen"
									aria-label="{ext.source}-Cover entfernen"
									onclick={() => handleClearExternal(ext)}
									disabled={clearingExternal !== null}
									class="absolute bottom-1.5 right-1.5 rounded bg-red-500/90 p-1.5 text-white hover:bg-red-500 disabled:opacity-50"
								>
									<Trash2 size={14} />
								</button>
							{/if}
						</figure>
					{/each}
				{/if}

				{#if !single || items.length === 0}
					<label
						class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800
						{disabled ? 'pointer-events-none opacity-50' : ''}"
					>
						{#if uploading[role]}
							<Loader size={20} class="animate-spin" />
							<span class="text-xs">Wird hochgeladen…</span>
						{:else}
							<Camera size={22} />
							<span class="text-xs">Foto hinzufügen</span>
						{/if}
						<input
							type="file"
							accept="image/*"
							capture="environment"
							class="hidden"
							onchange={handlePick(role)}
							{disabled}
						/>
					</label>
				{/if}
			</div>
		</div>
	{/each}

	{#if cropTarget}
		<PhotoCropModal
			file={cropTarget.file}
			onCancel={() => (cropTarget = null)}
			onConfirm={onCropConfirm}
		/>
	{/if}

	{#if lightboxIndex !== null}
		{@const current = lightboxItems[lightboxIndex]}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
			role="dialog"
			aria-modal="true"
			aria-label="Foto-Vorschau"
		>
			<button
				type="button"
				onclick={closeLightbox}
				aria-label="Schließen"
				class="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
				style="top: calc(0.75rem + env(safe-area-inset-top))"
			>
				<X size={22} />
			</button>
			{#if lightboxItems.length > 1}
				<button
					type="button"
					onclick={() => nextLightbox(-1)}
					aria-label="Vorheriges Bild"
					class="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
				>
					‹
				</button>
				<button
					type="button"
					onclick={() => nextLightbox(1)}
					aria-label="Nächstes Bild"
					class="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
				>
					›
				</button>
			{/if}
			{#if current}
				<img
					src={current.fullUrl}
					alt={current.label}
					class="max-h-[100dvh] max-w-full object-contain"
				/>
				<div
					class="absolute inset-x-0 bottom-0 px-4 py-3 text-center text-xs text-white/70"
					style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
				>
					{current.label} · {lightboxIndex + 1} / {lightboxItems.length}
				</div>
			{/if}
		</div>
	{/if}

	{#if errorMsg}
		<p
			role="alert"
			class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
		>
			{errorMsg}
		</p>
	{/if}
</section>

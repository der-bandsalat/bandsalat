/**
 * Clientseitiges Downscale vor dem Upload. Moderne Handy-Kameras liefern
 * 8–15-MB-JPEGs — das sprengt gern das 12-MiB-Upload-Limit, macht das
 * Crop-Tool auf schwächeren Geräten zäh und verbrennt mobiles Datenvolumen
 * beim Erfassen ganzer Sammlungen. Der Server skaliert für den KI-Scan
 * ohnehin auf 1024px herunter; 2048px Kantenlänge reichen als Archivqualität.
 *
 * EXIF geht beim Re-Encode verloren — die Orientierung wird deshalb über
 * `imageOrientation: 'from-image'` eingebacken. Schlägt irgendetwas fehl
 * (exotisches Format, alter Browser), geht das Original unverändert raus.
 */
const MAX_DIM = 2048;
const JPEG_QUALITY = 0.85;
/** Unterhalb dieser Größe lohnt ein Re-Encode nicht, wenn die Maße passen. */
const SKIP_BYTES = 4 * 1024 * 1024;

export async function downscaleImage(file: File, maxDim = MAX_DIM): Promise<File> {
	if (!file.type.startsWith('image/')) return file;
	try {
		const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
		try {
			const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
			if (scale >= 1 && file.size <= SKIP_BYTES) return file;

			const w = Math.max(1, Math.round(bmp.width * scale));
			const h = Math.max(1, Math.round(bmp.height * scale));
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d');
			if (!ctx) return file;
			ctx.drawImage(bmp, 0, 0, w, h);

			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
			);
			// Wenn das Ergebnis nicht kleiner ist, bringt es nichts — Original behalten.
			if (!blob || blob.size >= file.size) return file;
			const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
			return new File([blob], name, { type: 'image/jpeg' });
		} finally {
			bmp.close();
		}
	} catch {
		return file;
	}
}

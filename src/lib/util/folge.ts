/**
 * Folgennummer aus freier Eingabe: "14" → 14, alles andere (leer, "14a",
 * "100 A/B/C", mehr als vier Ziffern) → null und damit Sonderfolgen-Label.
 * Eine Regel für Scanner-Übernahme und Dubletten-Endpoint.
 */
export function parseFolgeNr(raw: string | null | undefined): number | null {
	const s = (raw ?? '').trim();
	return /^\d{1,4}$/.test(s) ? Number(s) : null;
}

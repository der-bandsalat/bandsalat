/**
 * Effektiver Favorit: manuell geherzt ODER die Bewertung erreicht die in den
 * Einstellungen gesetzte Sterne-Schwelle (Halbsterne 1–10, null = Feature aus).
 * Eine Stelle für alle Ansichten (Badges, /favoriten, Folgenansicht).
 */
export function isFavorit(
	c: { favorit: boolean; rating: number | null },
	thresholdHalbsterne: number | null | undefined
): boolean {
	return (
		c.favorit ||
		(thresholdHalbsterne != null && c.rating != null && c.rating >= thresholdHalbsterne)
	);
}

/** "4,5" für Anzeige-Zwecke (Halbsterne → Sterne). */
export function halbsterneLabel(halbsterne: number): string {
	return (halbsterne / 2).toLocaleString('de-DE', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 1
	});
}

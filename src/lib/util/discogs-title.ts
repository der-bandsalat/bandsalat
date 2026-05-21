/**
 * Versucht einen Discogs-Release-Titel der Form
 *   "Autor - Serie Nr - Folgentitel"
 *   "Serie - Nr - Folgentitel"
 *   "Serie Nr - Folgentitel"
 *   "Serie - Folge Nr - Folgentitel"
 * in Serie, Folgennummer und Folgentitel zu zerlegen.
 *
 * Wir suchen einen Trenner mit Folge-Nummer (entweder als eigene Chunk
 * "100" / "Folge 100" oder als Trailing-Nummer in einem Chunk wie
 * "Die Drei ??? 100"). Alles vor der Nummer ist Serien-/Autor-Präfix,
 * alles danach Folgentitel. Bei Autor + Serie nehmen wir den letzten
 * Präfix-Chunk als Serie — Discogs listet den Verfasser typischerweise
 * davor.
 */
export interface ParsedDiscogsTitle {
	serie?: string;
	folgeNr?: number;
	titel?: string;
}

const NUMBER_ONLY = /^(?:folge\s+)?(\d{1,4})\.?$/i;
const TRAILING_NUMBER = /^(.+?)\s+(\d{1,4})$/;

export function parseDiscogsTitle(raw: string): ParsedDiscogsTitle {
	if (!raw) return {};
	const parts = raw
		.split(/\s+[-–—]\s+/)
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length === 0) return {};

	// 1) Pure-Number-Chunk suchen ("100" oder "Folge 100").
	for (let i = 0; i < parts.length; i++) {
		const m = parts[i].match(NUMBER_ONLY);
		if (!m) continue;
		const folgeNr = Number.parseInt(m[1], 10);
		if (!Number.isFinite(folgeNr) || folgeNr <= 0 || folgeNr > 9999) continue;
		// Vor dem Number-Chunk: Serie/Autor. Den letzten Präfix-Chunk
		// als Serie übernehmen (Autoren stehen meist davor).
		const before = parts.slice(0, i);
		const serie = before.length > 0 ? before[before.length - 1] : undefined;
		const after = parts.slice(i + 1);
		const titel = after.length > 0 ? after.join(' – ') : undefined;
		return { serie, folgeNr, titel };
	}

	// 2) Trailing-Number in einem Chunk ("Die Drei ??? 100").
	for (let i = 0; i < parts.length; i++) {
		const m = parts[i].match(TRAILING_NUMBER);
		if (!m) continue;
		const folgeNr = Number.parseInt(m[2], 10);
		if (!Number.isFinite(folgeNr) || folgeNr <= 0 || folgeNr > 9999) continue;
		const serie = m[1].trim();
		const after = parts.slice(i + 1);
		const titel = after.length > 0 ? after.join(' – ') : undefined;
		return { serie, folgeNr, titel };
	}

	// 3) Keine Nummer gefunden. Wenn mind. 2 Chunks: letzter = Titel,
	//    vorletzter = Serie. Bei nur 1 Chunk: gesamter String als Titel.
	if (parts.length === 1) return { titel: parts[0] };
	return {
		serie: parts[parts.length - 2],
		titel: parts[parts.length - 1]
	};
}

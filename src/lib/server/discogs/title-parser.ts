// Parser für Discogs-Hörspiel-Releases: zerlegt z.B. "Die Drei ??? 12 - Der Seltsame Wecker"
// in {serie, folgeNr, titel}. Wird sowohl vom Import-Skript als auch vom Bulk-Pull genutzt.

export interface ParsedTitle {
	serie: string;
	folgeNr: number | null;
	titel: string;
}

function cleanSerie(s: string): string {
	return s
		.replace(/\s+und$/i, '')
		.replace(/\s+-$/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function parseTitle(raw: string): ParsedTitle {
	const t = raw.trim();
	// 1) "Serie N - Episodentitel" / "Serie - Folge N: Titel"
	const m1 = t.match(/^(.+?)[\s:.,-]+(?:Folge|Nr\.?|#)?\s*\(?(\d{1,4})\)?\s*[-–—:.]+\s*(.+)$/i);
	if (m1) {
		return { serie: cleanSerie(m1[1]), folgeNr: Number.parseInt(m1[2], 10), titel: m1[3].trim() };
	}
	// 2) "Serie N Titel" (Nummer ohne Trenner)
	const m2 = t.match(/^(.+?)\s+(\d{1,4})\s+([A-Za-zÄÖÜäöüß].+)$/);
	if (m2) {
		return { serie: cleanSerie(m2[1]), folgeNr: Number.parseInt(m2[2], 10), titel: m2[3].trim() };
	}
	// 3) "Serie - Titel" (ohne Folge)
	const m3 = t.match(/^(.+?)\s+[-–—:]\s+(.+)$/);
	if (m3) {
		return { serie: cleanSerie(m3[1]), folgeNr: null, titel: m3[2].trim() };
	}
	return { serie: 'Unbekannt', folgeNr: null, titel: t };
}

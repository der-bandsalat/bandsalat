export interface GapInput {
	serie: string;
	folgeNr: number | null;
}

export interface SerieGaps {
	serie: string;
	min: number;
	max: number;
	have: number;
	missing: number[];
	hasTarget: boolean;
}

export interface SerieTarget {
	min: number;
	max: number;
}

/**
 * Berechnet pro Serie die fehlenden Folgennummern.
 *
 * Range-Bestimmung:
 *  - Wenn ein Target für die Serie übergeben wird: target.min..target.max
 *  - Sonst: min(owned)..max(owned), nur wenn ≥2 verschiedene Folgen vorhanden
 *
 * Einträge ohne folge_nr werden ignoriert (Sonderfolgen).
 *
 * Sortierung: nach Anzahl Lücken absteigend, dann alphabetisch.
 * Serien ohne Lücken werden weggelassen.
 */
export function findGaps(
	items: readonly GapInput[],
	targets?: ReadonlyMap<string, SerieTarget>
): SerieGaps[] {
	const bySerie = new Map<string, number[]>();
	for (const it of items) {
		if (it.folgeNr == null) continue;
		if (!Number.isInteger(it.folgeNr)) continue;
		const list = bySerie.get(it.serie);
		if (list) list.push(it.folgeNr);
		else bySerie.set(it.serie, [it.folgeNr]);
	}

	const seriesNames = new Set<string>([...bySerie.keys(), ...(targets ? targets.keys() : [])]);

	const result: SerieGaps[] = [];
	for (const serie of seriesNames) {
		const raw = bySerie.get(serie) ?? [];
		const sorted = [...new Set(raw)].sort((a, b) => a - b);
		const target = targets?.get(serie);

		let min: number;
		let max: number;
		if (target) {
			min = target.min;
			max = target.max;
		} else if (sorted.length >= 2) {
			min = sorted[0];
			max = sorted[sorted.length - 1];
		} else {
			continue;
		}

		const have = new Set(sorted);
		const missing: number[] = [];
		for (let i = min; i <= max; i++) if (!have.has(i)) missing.push(i);
		if (missing.length === 0) continue;
		result.push({
			serie,
			min,
			max,
			have: sorted.length,
			missing,
			hasTarget: target != null
		});
	}

	result.sort(
		(a, b) => b.missing.length - a.missing.length || a.serie.localeCompare(b.serie, 'de')
	);
	return result;
}

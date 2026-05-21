import { describe, expect, it } from 'vitest';
import { findGaps } from './gaps';

describe('findGaps', () => {
	it('liefert für leere Eingabe ein leeres Ergebnis', () => {
		expect(findGaps([])).toEqual([]);
	});

	it('ignoriert Einträge ohne folge_nr (Sonderfolgen)', () => {
		expect(
			findGaps([
				{ serie: 'TKKG', folgeNr: null },
				{ serie: 'TKKG', folgeNr: null }
			])
		).toEqual([]);
	});

	it('ignoriert Serien mit nur einer einzigen erfassten Folge', () => {
		expect(findGaps([{ serie: 'Die drei ???', folgeNr: 1 }])).toEqual([]);
	});

	it('findet keine Lücke bei lückenloser Folge', () => {
		expect(
			findGaps([
				{ serie: 'TKKG', folgeNr: 1 },
				{ serie: 'TKKG', folgeNr: 2 },
				{ serie: 'TKKG', folgeNr: 3 }
			])
		).toEqual([]);
	});

	it('findet einzelne Lücke zwischen Min und Max', () => {
		const gaps = findGaps([
			{ serie: 'Die drei ???', folgeNr: 10 },
			{ serie: 'Die drei ???', folgeNr: 12 }
		]);
		expect(gaps).toEqual([
			{ serie: 'Die drei ???', min: 10, max: 12, have: 2, missing: [11], hasTarget: false }
		]);
	});

	it('listet mehrere fehlende Folgen aufsteigend', () => {
		const [g] = findGaps([
			{ serie: 'TKKG', folgeNr: 1 },
			{ serie: 'TKKG', folgeNr: 4 },
			{ serie: 'TKKG', folgeNr: 7 }
		]);
		expect(g.missing).toEqual([2, 3, 5, 6]);
		expect(g.min).toBe(1);
		expect(g.max).toBe(7);
		expect(g.have).toBe(3);
	});

	it('behandelt Duplikate korrekt', () => {
		const [g] = findGaps([
			{ serie: 'X', folgeNr: 1 },
			{ serie: 'X', folgeNr: 1 },
			{ serie: 'X', folgeNr: 3 }
		]);
		expect(g.have).toBe(2);
		expect(g.missing).toEqual([2]);
	});

	it('trennt mehrere Serien sauber', () => {
		const result = findGaps([
			{ serie: 'A', folgeNr: 1 },
			{ serie: 'A', folgeNr: 3 },
			{ serie: 'B', folgeNr: 5 },
			{ serie: 'B', folgeNr: 8 }
		]);
		expect(result).toHaveLength(2);
		const a = result.find((g) => g.serie === 'A')!;
		const b = result.find((g) => g.serie === 'B')!;
		expect(a.missing).toEqual([2]);
		expect(b.missing).toEqual([6, 7]);
	});

	it('sortiert Serien nach Anzahl Lücken absteigend, dann alphabetisch', () => {
		const result = findGaps([
			{ serie: 'Bibi Blocksberg', folgeNr: 1 },
			{ serie: 'Bibi Blocksberg', folgeNr: 3 },
			{ serie: 'Asterix', folgeNr: 1 },
			{ serie: 'Asterix', folgeNr: 5 },
			{ serie: 'Connie', folgeNr: 1 },
			{ serie: 'Connie', folgeNr: 3 }
		]);
		expect(result.map((g) => g.serie)).toEqual(['Asterix', 'Bibi Blocksberg', 'Connie']);
		expect(result[0].missing).toEqual([2, 3, 4]);
		expect(result[1].missing).toEqual([2]);
		expect(result[2].missing).toEqual([2]);
	});

	it('mischt Sonderfolgen mit nummerierten Folgen', () => {
		const [g] = findGaps([
			{ serie: 'TKKG', folgeNr: 1 },
			{ serie: 'TKKG', folgeNr: null },
			{ serie: 'TKKG', folgeNr: 3 }
		]);
		expect(g.missing).toEqual([2]);
		expect(g.have).toBe(2);
	});

	it('ignoriert nicht-ganzzahlige folgeNr', () => {
		const result = findGaps([
			{ serie: 'X', folgeNr: 1 },
			{ serie: 'X', folgeNr: 2.5 },
			{ serie: 'X', folgeNr: 4 }
		]);
		expect(result[0].missing).toEqual([2, 3]);
	});
});

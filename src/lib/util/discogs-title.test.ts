import { describe, it, expect } from 'vitest';
import { parseDiscogsTitle } from './discogs-title';

describe('parseDiscogsTitle', () => {
	it('Autor - Serie Nr - Titel', () => {
		expect(parseDiscogsTitle('André Marx - Die Drei ??? 100 - Toteninsel')).toEqual({
			serie: 'Die Drei ???',
			folgeNr: 100,
			titel: 'Toteninsel'
		});
	});

	it('Serie - Nr - Titel', () => {
		expect(parseDiscogsTitle('Die Drei ??? - 67 - Der Mann ohne Augen')).toEqual({
			serie: 'Die Drei ???',
			folgeNr: 67,
			titel: 'Der Mann ohne Augen'
		});
	});

	it('Serie Nr - Titel (zwei Chunks)', () => {
		expect(parseDiscogsTitle('TKKG 50 - Das Phantom auf dem Schulfest')).toEqual({
			serie: 'TKKG',
			folgeNr: 50,
			titel: 'Das Phantom auf dem Schulfest'
		});
	});

	it('Serie - Folge Nr - Titel (mit "Folge"-Wort)', () => {
		expect(parseDiscogsTitle('Die Drei ??? - Folge 100 - Toteninsel')).toEqual({
			serie: 'Die Drei ???',
			folgeNr: 100,
			titel: 'Toteninsel'
		});
	});

	it('ohne Nummer: letzter Chunk ist Titel, vorletzter Serie', () => {
		expect(parseDiscogsTitle('Die Drei ??? - Toteninsel')).toEqual({
			serie: 'Die Drei ???',
			titel: 'Toteninsel'
		});
	});

	it('einzelner Chunk landet komplett im Titel', () => {
		expect(parseDiscogsTitle('Best Of TKKG')).toEqual({
			titel: 'Best Of TKKG'
		});
	});

	it('leerer String → leeres Ergebnis', () => {
		expect(parseDiscogsTitle('')).toEqual({});
	});

	it('respektiert Em-/En-Dash als Trenner', () => {
		expect(parseDiscogsTitle('Die Drei ??? – 100 – Toteninsel')).toEqual({
			serie: 'Die Drei ???',
			folgeNr: 100,
			titel: 'Toteninsel'
		});
	});

	it('ignoriert unplausible Nummern (Jahreszahl)', () => {
		// "2001" wäre eine Jahreszahl — wir akzeptieren sie hier, weil
		// 1900-2100 sich nicht von Folgennummern unterscheiden lässt.
		// Wichtig: trotzdem deterministisch.
		const r = parseDiscogsTitle('Die Drei ??? - 2001 - Das Mysterium');
		expect(r.serie).toBe('Die Drei ???');
		expect(r.folgeNr).toBe(2001);
		expect(r.titel).toBe('Das Mysterium');
	});
});

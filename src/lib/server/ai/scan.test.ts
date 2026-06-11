import { describe, expect, it } from 'vitest';
import { sanitizeFolgeNr } from './scan';

describe('sanitizeFolgeNr', () => {
	it('lässt plausible Folgennummern durch', () => {
		expect(sanitizeFolgeNr(14, '115311')).toBe(14);
		expect(sanitizeFolgeNr(1, undefined)).toBe(1);
		expect(sanitizeFolgeNr(228, 'CBS 463')).toBe(228);
	});

	it('verwirft undefined unverändert', () => {
		expect(sanitizeFolgeNr(undefined, '115311')).toBeUndefined();
	});

	it('verwirft Katalognummern, die als Folgennummer durchrutschen (> 999)', () => {
		expect(sanitizeFolgeNr(115311, '115311')).toBeUndefined();
		expect(sanitizeFolgeNr(1000, undefined)).toBeUndefined();
	});

	it('verwirft Nummern < 1', () => {
		expect(sanitizeFolgeNr(0, undefined)).toBeUndefined();
		expect(sanitizeFolgeNr(-3, undefined)).toBeUndefined();
	});

	it('verwirft Folgennummern, die exakt den Ziffern der Seriennummer entsprechen', () => {
		// Modell hat die Seriennummer in beide Felder geschrieben
		expect(sanitizeFolgeNr(311, '311')).toBeUndefined();
		expect(sanitizeFolgeNr(463, 'CBS 4-63')).toBeUndefined();
	});

	it('lässt Folgennummern durch, die nur Teil der Seriennummer sind', () => {
		// Europa-Seriennummern enthalten oft die Folge — das ist legitim
		expect(sanitizeFolgeNr(11, '115311')).toBe(11);
	});
});

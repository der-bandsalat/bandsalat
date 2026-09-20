import { describe, expect, it } from 'vitest';
import { parseFolgeNr } from './folge';

describe('parseFolgeNr', () => {
	it('liest reine Nummern', () => {
		expect(parseFolgeNr('14')).toBe(14);
		expect(parseFolgeNr(' 007 ')).toBe(7);
		expect(parseFolgeNr('1234')).toBe(1234);
	});
	it('gibt null für Sonderfolgen-Labels und Leerwerte', () => {
		expect(parseFolgeNr('')).toBeNull();
		expect(parseFolgeNr(null)).toBeNull();
		expect(parseFolgeNr('14a')).toBeNull();
		expect(parseFolgeNr('100 A/B/C')).toBeNull();
		expect(parseFolgeNr('12345')).toBeNull();
	});
});

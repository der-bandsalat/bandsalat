import { describe, expect, it } from 'vitest';
import {
	composeNotes,
	findMediaField,
	findNotesField,
	findSleeveField,
	isKnownMediaGrade,
	isKnownSleeveGrade,
	validateGradeOption,
	type CollectionFieldDef
} from './mapping';

const fields: CollectionFieldDef[] = [
	{
		id: 1,
		name: 'Media Condition',
		type: 'dropdown',
		options: ['Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)']
	},
	{
		id: 2,
		name: 'Sleeve Condition',
		type: 'dropdown',
		options: ['Near Mint (NM or M-)', 'Very Good (VG)', 'Generic', 'No Cover']
	},
	{ id: 3, name: 'Notes', type: 'textarea' }
];

describe('field lookup', () => {
	it('findet Media-Feld', () => {
		expect(findMediaField(fields)?.id).toBe(1);
	});
	it('findet Sleeve-Feld', () => {
		expect(findSleeveField(fields)?.id).toBe(2);
	});
	it('findet Notes-Feld', () => {
		expect(findNotesField(fields)?.id).toBe(3);
	});
	it('liefert null wenn nicht vorhanden', () => {
		expect(findMediaField([])).toBeNull();
	});
});

describe('validateGradeOption', () => {
	it('akzeptiert gültige Media-Option', () => {
		expect(validateGradeOption(fields[0], 'Very Good Plus (VG+)')).toEqual({ ok: true });
	});
	it('lehnt unbekannte Option ab', () => {
		const r = validateGradeOption(fields[0], 'Good (G)');
		expect(r.ok).toBe(false);
		expect(r.reason).toMatch(/keine gültige Option/);
	});
	it('lehnt fehlendes Feld ab', () => {
		expect(validateGradeOption(null, 'Mint (M)').ok).toBe(false);
	});
	it('lehnt leeren Wert ab', () => {
		expect(validateGradeOption(fields[0], null).ok).toBe(false);
	});
});

describe('composeNotes', () => {
	it('liefert null wenn alles leer', () => {
		expect(composeNotes({ seriennummer: null, auflageVariante: null, notiz: null })).toBeNull();
	});
	it('komponiert nur Seriennummer', () => {
		expect(composeNotes({ seriennummer: '12345', auflageVariante: null, notiz: null })).toBe(
			'Seriennummer: 12345'
		);
	});
	it('kombiniert alle drei Felder mit Zeilenumbruch', () => {
		const out = composeNotes({
			seriennummer: '12345',
			auflageVariante: 'schwarz-gelb',
			notiz: 'Inlay fehlt'
		});
		expect(out).toBe('Seriennummer: 12345\nAuflage: schwarz-gelb\nInlay fehlt');
	});
	it('trimmt freie Notiz', () => {
		expect(composeNotes({ seriennummer: null, auflageVariante: null, notiz: '   hello   ' })).toBe(
			'hello'
		);
	});
});

describe('known grade checks', () => {
	it('akzeptiert lokale Grading-Konstanten', () => {
		expect(isKnownMediaGrade('Mint (M)')).toBe(true);
		expect(isKnownSleeveGrade('Generic')).toBe(true);
		expect(isKnownSleeveGrade('Very Good (VG)')).toBe(true);
	});
	it('weist Unbekanntes ab', () => {
		expect(isKnownMediaGrade('A+')).toBe(false);
		expect(isKnownMediaGrade(null)).toBe(false);
	});
});

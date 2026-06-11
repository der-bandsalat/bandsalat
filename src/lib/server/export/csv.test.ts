import { describe, expect, it } from 'vitest';
import { discogsCsv, parseCsv } from './csv';
import type { Cassette } from '../db/schema';

function cassette(overrides: Partial<Cassette> = {}): Cassette {
	return {
		id: 'id',
		serie: 'Die drei ???',
		folgeNr: 12,
		folgeNrLabel: null,
		titel: 'Der seltsame Wecker',
		format: 'cassette',
		label: 'Europa',
		auflageVariante: null,
		erstauflage: false,
		jahr: 1981,
		discogsReleaseId: 12345,
		discogsUrl: null,
		seriennummer: '115311',
		zustandMc: 'Very Good Plus (VG+)',
		zustandHuelle: 'Very Good (VG)',
		originalhuelle: true,
		vollstaendig: true,
		kaufdatum: '2024-03-12',
		kaufpreisCent: 350,
		kaufort: null,
		folder: null,
		auflageId: null,
		coverSource: 'auto',
		rating: null,
		review: null,
		notiz: null,
		coverFotoPath: null,
		discogsCoverUrl: null,
		discogsCoverCachePath: null,
		discogsFolderId: null,
		discogsInstanceId: null,
		discogsSyncedAt: null,
		createdAt: '2024-03-12T00:00:00.000Z',
		updatedAt: '2024-03-12T00:00:00.000Z',
		...overrides
	};
}

describe('discogsCsv', () => {
	it('schreibt Header + Datenzeile mit allen Pflichtfeldern', () => {
		const csv = discogsCsv([cassette()]);
		const lines = csv.trim().split('\r\n');
		expect(lines[0]).toContain('release_id');
		expect(lines[1]).toContain('12345');
		expect(lines[1]).toContain('Die drei ???');
		expect(lines[1]).toContain('Very Good Plus (VG+)');
	});

	it('quotet Felder mit Komma', () => {
		const csv = discogsCsv([cassette({ titel: 'Wecker, der seltsame' })]);
		expect(csv).toContain('"Wecker, der seltsame"');
	});

	it('escaped Anführungszeichen', () => {
		const csv = discogsCsv([cassette({ titel: 'Die "drei" Detektive' })]);
		expect(csv).toContain('"Die ""drei"" Detektive"');
	});

	it('überspringt Einträge ohne Release-ID', () => {
		const csv = discogsCsv([
			cassette({ discogsReleaseId: null }),
			cassette({ discogsReleaseId: 9 })
		]);
		const dataLines = csv.trim().split('\r\n').slice(1);
		expect(dataLines).toHaveLength(1);
		expect(dataLines[0]).toContain('9');
	});

	it('komponiert Notes aus Seriennummer, Auflage, Notiz', () => {
		const csv = discogsCsv([
			cassette({ seriennummer: '111', auflageVariante: 'rot', notiz: 'frei' })
		]);
		expect(csv).toContain('Seriennummer: 111 · Auflage: rot · frei');
	});
});

describe('parseCsv', () => {
	it('liest einfache CSV', () => {
		const rows = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
		expect(rows).toEqual([
			{ a: '1', b: '2', c: '3' },
			{ a: '4', b: '5', c: '6' }
		]);
	});

	it('versteht quotierte Felder mit Komma und Newline', () => {
		const rows = parseCsv('a,b\n"x, y","mit\nnewline"\n');
		expect(rows[0].a).toBe('x, y');
		expect(rows[0].b).toBe('mit\nnewline');
	});

	it('versteht escaped quotes', () => {
		const rows = parseCsv('a\n"sag ""hallo"""\n');
		expect(rows[0].a).toBe('sag "hallo"');
	});

	it('roundtrip discogsCsv → parseCsv liefert dieselben Werte', () => {
		const csv = discogsCsv([cassette({ titel: 'Mit, Komma und "Quote"' })]);
		const rows = parseCsv(csv);
		expect(rows).toHaveLength(1);
		expect(rows[0].Title).toBe('Mit, Komma und "Quote"');
		expect(rows[0].release_id).toBe('12345');
	});
});

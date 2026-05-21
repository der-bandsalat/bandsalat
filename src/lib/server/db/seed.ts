import { randomUUID } from 'node:crypto';
import { db } from './client';
import { cassettes, type NewCassette } from './schema';

const samples: NewCassette[] = [
	{
		id: randomUUID(),
		serie: 'Die drei ???',
		folgeNr: 12,
		titel: 'Der seltsame Wecker',
		label: 'Europa',
		jahr: 1981,
		auflageVariante: 'schwarz-gelb Logo',
		zustandMc: 'Very Good Plus (VG+)',
		zustandHuelle: 'Very Good (VG)',
		originalhuelle: true,
		vollstaendig: true,
		seriennummer: '115311',
		kaufdatum: '2024-03-12',
		kaufpreisCent: 350,
		kaufort: 'Flohmarkt Schanze',
		notiz: 'Inlay leicht knickig.'
	},
	{
		id: randomUUID(),
		serie: 'Die drei ???',
		folgeNr: 14,
		titel: 'Die schwarze Katze',
		label: 'Europa',
		jahr: 1982,
		zustandMc: 'Near Mint (NM or M-)',
		zustandHuelle: 'Near Mint (NM or M-)',
		originalhuelle: true,
		vollstaendig: true,
		kaufdatum: '2024-05-04',
		kaufpreisCent: 500,
		kaufort: 'Discogs (offline-Test)',
		notiz: null
	},
	{
		id: randomUUID(),
		serie: 'Die drei ???',
		folgeNr: 31,
		titel: 'Nacht in Angst',
		label: 'Europa',
		jahr: 1985,
		zustandMc: 'Very Good (VG)',
		zustandHuelle: 'Good Plus (G+)',
		originalhuelle: false,
		vollstaendig: false,
		notiz: 'Hülle generisch; Folge ohne Inlay.',
		auflageVariante: 'weißes Cover'
	},
	{
		id: randomUUID(),
		serie: 'TKKG',
		folgeNr: 5,
		titel: 'Das Phantom auf dem Feuerstuhl',
		label: 'Europa',
		jahr: 1981,
		zustandMc: 'Very Good Plus (VG+)',
		zustandHuelle: 'Very Good Plus (VG+)',
		originalhuelle: true,
		vollstaendig: true,
		seriennummer: '115254'
	},
	{
		id: randomUUID(),
		serie: 'Benjamin Blümchen',
		folgeNr: 1,
		titel: 'Benjamin Blümchen rettet den Zoo',
		label: 'Kiosk',
		jahr: 1977,
		zustandMc: 'Good (G)',
		zustandHuelle: 'Generic',
		originalhuelle: false,
		vollstaendig: true,
		notiz: 'Frühe Auflage, Tonband leicht ausgeleiert.'
	}
];

console.log(`[seed] Einfügen von ${samples.length} Datensätzen…`);
const existing = db().select().from(cassettes).all();
if (existing.length > 0) {
	console.log(`[seed] DB enthält bereits ${existing.length} Einträge — kein Seed nötig.`);
	process.exit(0);
}

db().insert(cassettes).values(samples).run();
console.log('[seed] Fertig.');

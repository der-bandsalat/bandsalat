/**
 * Top-Folgen der „Die drei ???"-Hörspielreihe für die rotierende Login-Kassette.
 * Hauptquelle: rocky-beach.com/php/project/f_wertung.html (Top 20 zum Zeitpunkt
 * der letzten Aktualisierung). Folge 76 ist als Maltes Lieblingsfolge zusätzlich
 * mit erhöhter Auswahl-Wahrscheinlichkeit aufgenommen (weight 1.33).
 * Bewertung: 1 = wunderbar … 6 = vergessen wir's.
 */
export interface Folge {
	nr: number;
	titel: string;
	bewertung: number;
	/** Auswahl-Gewicht für die Hero-Rotation. Default 1. */
	weight?: number;
}

export const topFolgen: Folge[] = [
	{ nr: 237, titel: '…und der rote Büffel', bewertung: 1.32 },
	{ nr: 200, titel: 'Feuriges Auge', bewertung: 1.52 },
	{ nr: 125, titel: 'Feuermond', bewertung: 1.53 },
	{ nr: 11, titel: 'Das Gespensterschloss', bewertung: 1.54 },
	{ nr: 100, titel: 'Toteninsel', bewertung: 1.59 },
	{ nr: 169, titel: 'Die Spur des Spielers', bewertung: 1.59 },
	{ nr: 86, titel: 'Nacht in Angst', bewertung: 1.6 },
	{ nr: 1, titel: 'Der Super-Papagei', bewertung: 1.62 },
	{ nr: 225, titel: '…und der Puppenmacher', bewertung: 1.65 },
	{ nr: 3, titel: 'Der Karpatenhund', bewertung: 1.65 },
	{ nr: 17, titel: 'Die gefährliche Erbschaft', bewertung: 1.67 },
	{ nr: 103, titel: 'Das Erbe des Meisterdiebs', bewertung: 1.75 },
	{ nr: 186, titel: 'Insel des Vergessens', bewertung: 1.78 },
	{ nr: 162, titel: '…und der schreiende Nebel', bewertung: 1.79 },
	{ nr: 150, titel: 'Geisterbucht', bewertung: 1.8 },
	{ nr: 196, titel: 'Geheimnis des Bauchredners', bewertung: 1.8 },
	{ nr: 155, titel: 'Der Meister des Todes', bewertung: 1.82 },
	{ nr: 220, titel: 'Im Wald der Gefahren', bewertung: 1.82 },
	{ nr: 105, titel: 'Der Nebelberg', bewertung: 1.83 },
	{ nr: 217, titel: '…und der Kristallschädel', bewertung: 1.88 },
	{ nr: 76, titel: 'Stimmen aus dem Nichts', bewertung: 1.93, weight: 1.33 }
];

/** Wählt eine Folge gewichtet zufällig aus (default-Gewicht = 1). */
export function pickWeighted(folgen: Folge[], rng: () => number = Math.random): Folge {
	const weights = folgen.map((f) => f.weight ?? 1);
	const total = weights.reduce((a, b) => a + b, 0);
	let r = rng() * total;
	for (let i = 0; i < folgen.length; i++) {
		r -= weights[i]!;
		if (r <= 0) return folgen[i]!;
	}
	return folgen[folgen.length - 1]!;
}

export type StarState = 'full' | 'half' | 'empty';

/**
 * Wandelt eine rocky-beach.com-Bewertung (1 = wunderbar, 6 = vergessen wir's)
 * in 5 Stern-States um (auf halbe Sterne gerundet).
 */
export function starStates(bewertung: number): StarState[] {
	const score = Math.max(0, Math.min(5, 6 - bewertung));
	const halves = Math.round(score * 2) / 2;
	const full = Math.floor(halves);
	const hasHalf = halves - full > 0;
	return [0, 1, 2, 3, 4].map((i) => {
		if (i < full) return 'full';
		if (i === full && hasHalf) return 'half';
		return 'empty';
	});
}

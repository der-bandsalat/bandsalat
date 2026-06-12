import sharp from 'sharp';
import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic, scanModel } from './anthropic';
import { MEDIA_FORMATS, MEDIA_GRADES, SLEEVE_GRADES, type MediaFormat } from '../db/schema';

const MAX_DIMENSION = 1024;
const MAX_OUTPUT_TOKENS = 512;

const SYSTEM_PROMPT = `Du bist ein Spezialist für deutsche Hörspielkassetten (Die drei ???, TKKG, Benjamin Blümchen, Bibi Blocksberg, Europa/Maritim/Kiosk-Auflagen).

Aus dem Foto einer Kassette oder ihres Covers extrahierst du strukturierte Metadaten und gibst sie ausschließlich über das Tool save_cassette_metadata zurück.

Regeln:
- Wenn du dir bei einem Feld unsicher bist, lass es WEG. Rate nicht.
- "serie" enthält NUR den Serien-Namen ohne Folgennummer oder Episodentitel.
- "folge_nr" NUR übernehmen, wenn sie explizit als Folgennummer auf dem Cover steht (z.B. "Folge 14" oder die große Nummer direkt beim Serien-Namen/Titel). NIEMALS aus der Katalog-/Seriennummer ableiten: "115311" auf dem Rücken ist eine Seriennummer, NICHT Folge 115311 und auch nicht Folge 11 oder 31.
- "seriennummer" ist die gedruckte/eingeprägte Katalognummer (oft 6-stellig, z.B. "115311") — ein anderes Feld als die Folgennummer. Verwechsle die beiden nicht.
- "titel" enthält NUR den Episodentitel, ohne "Folge X" oder Serien-Namen davor. Behalte die exakte Groß-/Kleinschreibung wie auf dem Cover.
- "huellen_zustand" ist eine grobe visuelle Einschätzung NUR der Hülle (Knicke, Verfärbungen, Risse). Niemals die MC selbst bewerten. Wenn du keine Hülle siehst, lass es weg.
- "auflage_variante" nur ausfüllen wenn auf dem Cover ein eindeutiges Merkmal wie "schwarz-gelb Logo", "weißes Cover", "Original Hörspiel zum Film" sichtbar ist.
- "format" nur setzen, wenn der Tonträger-Typ klar erkennbar ist: MC-Hülle/Kassette → "cassette", CD-Jewelcase/Digipak → "cd", LP-/Vinyl-Cover → "lp". Im Zweifel weglassen.`;

const SCAN_TOOL: Anthropic.Tool = {
	name: 'save_cassette_metadata',
	description:
		'Strukturierte Metadaten einer auf einem Foto erkannten Hörspielkassette zurückgeben.',
	input_schema: {
		type: 'object',
		properties: {
			serie: {
				type: 'string',
				description:
					'Serien-Name ohne Folge/Titel, z.B. "Die drei ???", "TKKG", "Benjamin Blümchen".'
			},
			folge_nr: {
				type: 'integer',
				description:
					'Folgennummer (numerisch), z.B. 14 für "Die drei ??? 14". Nur wenn explizit als Folge auf dem Cover — nie aus der Katalog-/Seriennummer ableiten.'
			},
			folge_label: {
				type: 'string',
				description: 'Folgen-Label falls nicht-numerisch (z.B. "100 A/B/C", "Master of Chess").'
			},
			titel: {
				type: 'string',
				description: 'Episoden-Titel ohne Serien-Namen oder Folgennummer.'
			},
			label: {
				type: 'string',
				description: 'Plattenlabel wie auf dem Cover sichtbar, z.B. "Europa", "Maritim", "Kiosk".'
			},
			jahr: {
				type: 'integer',
				description: 'Veröffentlichungsjahr, falls direkt vom Cover/Inlay erkennbar.'
			},
			seriennummer: {
				type: 'string',
				description: 'Katalog-/Seriennummer wie eingeprägt oder gedruckt, z.B. "115311".'
			},
			huellen_zustand: {
				type: 'string',
				enum: [...SLEEVE_GRADES],
				description: 'Geschätzter visueller Zustand der Hülle. NUR die Hülle, nicht das Band.'
			},
			auflage_variante: {
				type: 'string',
				description: 'Eindeutige Auflage-Variante wenn klar erkennbar.'
			},
			notiz: {
				type: 'string',
				description: 'Zusätzliche Beobachtungen, max 200 Zeichen.'
			},
			format: {
				type: 'string',
				enum: [...MEDIA_FORMATS],
				description:
					'Tonträger-Typ, nur wenn klar erkennbar: Kassette/MC-Hülle → "cassette", CD-Jewelcase → "cd", LP-/Vinyl-Cover → "lp".'
			}
		},
		required: []
	}
};

export interface ExtractedMetadata {
	serie?: string;
	folge_nr?: number;
	folge_label?: string;
	titel?: string;
	label?: string;
	jahr?: number;
	seriennummer?: string;
	huellen_zustand?: string;
	auflage_variante?: string;
	notiz?: string;
	format?: MediaFormat;
}

export interface ScanResult {
	extracted: ExtractedMetadata;
	model: string;
	tokens: { input: number; output: number };
}

/**
 * Re-encodiert das Bild auf max. 1024px JPEG-Qualität 86 für günstigere
 * Token-Kosten und schnellere Übertragung.
 */
async function prepareImage(buf: Buffer): Promise<Buffer> {
	const pipeline = sharp(buf, { failOn: 'truncated' }).rotate();
	const meta = await pipeline.metadata();
	const needsResize = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;
	const stage = needsResize
		? pipeline.resize({
				width: MAX_DIMENSION,
				height: MAX_DIMENSION,
				fit: 'inside',
				withoutEnlargement: true
			})
		: pipeline;
	return stage.jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

/**
 * Fängt Katalognummer-Verwechslungen ab: Folgennummern jenseits 999 gibt es
 * bei Hörspielserien nicht (das ist eine Seriennummer wie "115311"), und wenn
 * die Folgennummer exakt den Ziffern der erkannten Seriennummer entspricht,
 * hat das Modell die Felder vertauscht. Lieber leer lassen als falsch raten.
 */
function sanitizeFolgeNr(
	folgeNr: number | undefined,
	seriennummer: string | undefined
): number | undefined {
	if (folgeNr === undefined) return undefined;
	if (folgeNr < 1 || folgeNr > 999) return undefined;
	const serienDigits = seriennummer?.replace(/\D/g, '');
	if (serienDigits && String(folgeNr) === serienDigits) return undefined;
	return folgeNr;
}

function validateGrade(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return (SLEEVE_GRADES as readonly string[]).includes(value) ? value : undefined;
}

function validateMediaGrade(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return (MEDIA_GRADES as readonly string[]).includes(value) ? value : undefined;
}

export async function scanCassettePhoto(buf: Buffer): Promise<ScanResult> {
	const optimized = await prepareImage(buf);
	const base64 = optimized.toString('base64');
	const client = getAnthropic();
	const model = scanModel();

	const response = await client.messages.create({
		model,
		max_tokens: MAX_OUTPUT_TOKENS,
		system: SYSTEM_PROMPT,
		tools: [SCAN_TOOL],
		tool_choice: { type: 'tool', name: 'save_cassette_metadata' },
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
					},
					{
						type: 'text',
						text: 'Analysiere die abgebildete Hörspielkassette und gib die erkennbaren Metadaten zurück. Lass unsichere Felder leer.'
					}
				]
			}
		]
	});

	const toolBlock = response.content.find(
		(c): c is Anthropic.ToolUseBlock => c.type === 'tool_use'
	);
	if (!toolBlock) {
		throw new Error('Keine strukturierte Antwort vom Modell.');
	}
	const raw = toolBlock.input as ExtractedMetadata;
	const extracted: ExtractedMetadata = {
		serie: raw.serie?.trim() || undefined,
		folge_nr: sanitizeFolgeNr(
			typeof raw.folge_nr === 'number' && Number.isFinite(raw.folge_nr) ? raw.folge_nr : undefined,
			raw.seriennummer?.trim() || undefined
		),
		folge_label: raw.folge_label?.trim() || undefined,
		titel: raw.titel?.trim() || undefined,
		label: raw.label?.trim() || undefined,
		jahr:
			typeof raw.jahr === 'number' && raw.jahr >= 1900 && raw.jahr <= 2100 ? raw.jahr : undefined,
		seriennummer: raw.seriennummer?.trim() || undefined,
		huellen_zustand: validateGrade(raw.huellen_zustand),
		auflage_variante: raw.auflage_variante?.trim() || undefined,
		notiz: raw.notiz?.trim().slice(0, 200) || undefined,
		format: (MEDIA_FORMATS as readonly string[]).includes(raw.format ?? '') ? raw.format : undefined
	};

	return {
		extracted,
		model,
		tokens: {
			input: response.usage.input_tokens,
			output: response.usage.output_tokens
		}
	};
}

export { validateGrade, validateMediaGrade, sanitizeFolgeNr };

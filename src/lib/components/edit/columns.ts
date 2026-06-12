import type { Cassette } from '$lib/server/db/schema';

export type EditWidget =
	| 'text'
	| 'number'
	| 'euro'
	| 'date'
	| 'select'
	| 'checkbox'
	| 'rating'
	| 'textarea';

export type EditableColumn = {
	/** Spaltenschlüssel = DB-/Schema-Feldname (muss in CassetteUpdateSchema erlaubt sein). */
	key: keyof Cassette;
	label: string;
	widget: EditWidget;
	/** Tailwind-Breite für die Spalte (table-fixed-artig per min-width). */
	width: string;
	/** Bei widget 'select': Quelle der Optionen. 'format' kommt aus $lib/format,
	 *  'media'/'sleeve' aus den vom Server gelieferten Grade-Listen. */
	optionSource?: 'format' | 'media' | 'sleeve';
};

/**
 * Inline editierbare Spalten für den Desktop-Bearbeitungsmodus.
 * Reihenfolge = Standard-Anzeigereihenfolge im Spalten-Picker.
 * Textareas (review/notiz) sind bewusst NICHT dabei – die laufen über das
 * Zeilen-Panel (Phase 3b).
 */
export const EDITABLE_COLUMNS: EditableColumn[] = [
	{ key: 'serie', label: 'Serie', widget: 'text', width: 'min-w-44' },
	{ key: 'folgeNr', label: 'Folge', widget: 'number', width: 'min-w-20' },
	{ key: 'folgeNrLabel', label: 'Folge-Label', widget: 'text', width: 'min-w-28' },
	{ key: 'titel', label: 'Titel', widget: 'text', width: 'min-w-56' },
	{ key: 'format', label: 'Format', widget: 'select', width: 'min-w-32', optionSource: 'format' },
	{ key: 'label', label: 'Label', widget: 'text', width: 'min-w-36' },
	{ key: 'auflageVariante', label: 'Auflage/Variante', widget: 'text', width: 'min-w-44' },
	{ key: 'erstauflage', label: 'Erstauflage', widget: 'checkbox', width: 'min-w-24' },
	{ key: 'jahr', label: 'Jahr', widget: 'number', width: 'min-w-20' },
	{ key: 'seriennummer', label: 'Seriennr.', widget: 'text', width: 'min-w-36' },
	{
		// "Medium" statt "MC" — die Tabelle kann MC/CD/LP gemischt enthalten.
		key: 'zustandMc',
		label: 'Zustand Medium',
		widget: 'select',
		width: 'min-w-44',
		optionSource: 'media'
	},
	{
		key: 'zustandHuelle',
		label: 'Zustand Hülle',
		widget: 'select',
		width: 'min-w-44',
		optionSource: 'sleeve'
	},
	{ key: 'originalhuelle', label: 'Orig.-Hülle', widget: 'checkbox', width: 'min-w-24' },
	{ key: 'vollstaendig', label: 'Vollständig', widget: 'checkbox', width: 'min-w-24' },
	{ key: 'kaufdatum', label: 'Kaufdatum', widget: 'date', width: 'min-w-40' },
	{ key: 'kaufpreisCent', label: 'Kaufpreis', widget: 'euro', width: 'min-w-28' },
	{ key: 'kaufort', label: 'Kaufort', widget: 'text', width: 'min-w-40' },
	{ key: 'folder', label: 'Ordner', widget: 'text', width: 'min-w-36' },
	{ key: 'rating', label: 'Bewertung', widget: 'rating', width: 'min-w-32' }
];

export const EDITABLE_COLUMN_MAP: Record<string, EditableColumn> = Object.fromEntries(
	EDITABLE_COLUMNS.map((c) => [c.key, c])
);

/**
 * Alle editierbaren Felder für das Zeilen-Panel (Phase 3b) – die Inline-Spalten
 * plus die Textareas, die in der Tabelle keinen Platz haben.
 */
export const PANEL_COLUMNS: EditableColumn[] = [
	...EDITABLE_COLUMNS,
	{ key: 'review', label: 'Review', widget: 'textarea', width: '' },
	{ key: 'notiz', label: 'Notiz', widget: 'textarea', width: '' }
];

/** Standard-Auswahl: die Schmerzpunkt-Felder beim Nachpflegen. */
export const DEFAULT_VISIBLE_COLUMNS: string[] = [
	'zustandMc',
	'zustandHuelle',
	'kaufdatum',
	'kaufpreisCent',
	'kaufort'
];

export const COLUMN_STORAGE_KEY = 'bandsalat:editcols:v1';

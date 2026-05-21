import type { Cassette, MediaGrade, SleeveGrade } from '../db/schema';
import { MEDIA_GRADES, SLEEVE_GRADES } from '../db/schema';

/** Felder-Definitionen aus Discogs (gecached in app_meta). */
export interface CollectionFieldDef {
	id: number;
	name: string;
	type: 'dropdown' | 'textarea' | string;
	position?: number;
	public?: boolean;
	options?: string[];
}

/**
 * Findet das Media-Condition-Dropdown.
 * Discogs nennt das standardmäßig "Media Condition".
 */
export function findMediaField(fields: CollectionFieldDef[]): CollectionFieldDef | null {
	return findFieldByName(fields, ['Media Condition', 'Media', 'Medien-Zustand']);
}

export function findSleeveField(fields: CollectionFieldDef[]): CollectionFieldDef | null {
	return findFieldByName(fields, ['Sleeve Condition', 'Sleeve', 'Hülle']);
}

export function findNotesField(fields: CollectionFieldDef[]): CollectionFieldDef | null {
	return findFieldByName(fields, ['Notes', 'Notiz', 'Notizen']);
}

function findFieldByName(fields: CollectionFieldDef[], names: string[]): CollectionFieldDef | null {
	const lc = names.map((n) => n.toLowerCase());
	for (const f of fields) {
		if (lc.includes(f.name.toLowerCase())) return f;
	}
	return null;
}

/** Prüft, ob ein Grading-Wert eine Discogs-Option des Feldes ist. */
export function validateGradeOption(
	field: CollectionFieldDef | null,
	value: string | null | undefined
): { ok: boolean; reason?: string } {
	if (!field) return { ok: false, reason: 'Feld nicht gefunden bei Discogs.' };
	if (!value) return { ok: false, reason: 'Wert ist leer.' };
	if (field.type !== 'dropdown')
		return { ok: false, reason: `Feld ${field.name} ist kein Dropdown.` };
	if (!field.options || field.options.length === 0)
		return { ok: false, reason: `Feld ${field.name} hat keine Optionen.` };
	if (!field.options.includes(value)) {
		return { ok: false, reason: `Wert "${value}" ist keine gültige Option in ${field.name}.` };
	}
	return { ok: true };
}

/**
 * Komponiert die Notes für Discogs aus Seriennummer + Auflage-Variante + Notiz.
 * Liefert null wenn alle drei leer sind (dann nicht setzen).
 */
export function composeNotes(
	c: Pick<Cassette, 'seriennummer' | 'auflageVariante' | 'notiz'>
): string | null {
	const lines: string[] = [];
	if (c.seriennummer) lines.push(`Seriennummer: ${c.seriennummer}`);
	if (c.auflageVariante) lines.push(`Auflage: ${c.auflageVariante}`);
	if (c.notiz) lines.push(c.notiz.trim());
	const joined = lines.join('\n');
	return joined ? joined : null;
}

/** Validiert lokale Grading-Werte gegen die Konstanten — defensive sanity check. */
export function isKnownMediaGrade(v: string | null | undefined): v is MediaGrade {
	return Boolean(v) && (MEDIA_GRADES as readonly string[]).includes(v as string);
}

export function isKnownSleeveGrade(v: string | null | undefined): v is SleeveGrade {
	return Boolean(v) && (SLEEVE_GRADES as readonly string[]).includes(v as string);
}

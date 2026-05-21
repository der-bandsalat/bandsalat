/**
 * Konfigurierbare Runtime-Settings, die von der UI (`/einstellungen`) gesetzt
 * werden können. Werte aus `app_meta` haben Vorrang vor Umgebungsvariablen,
 * damit Änderungen im UI ohne Neustart greifen. Leerer/null Wert in app_meta
 * = "kein Override, nimm env()".
 */
import { env } from './env';
import { getMeta, setMeta } from './db/meta';

const KEY_DISCOGS_TOKEN = 'app_setting:discogs_token';
const KEY_DISCOGS_USERNAME = 'app_setting:discogs_username';
const KEY_ANTHROPIC_API_KEY = 'app_setting:anthropic_api_key';
const KEY_SCAN_MODEL = 'app_setting:scan_model';
const KEY_ENABLED_FORMATS = 'app_setting:enabled_formats';
const KEY_DREI_AUFLAGEN_ENABLED = 'app_setting:drei_auflagen_enabled';
const KEY_BRAND_LOGO_VARIANT = 'app_setting:brand_logo_variant';
const KEY_BRAND_LOGO_CUSTOM_PATH = 'app_setting:brand_logo_custom_path';

function pick(metaKey: string, envFallback: string | undefined): string | null {
	const meta = getMeta(metaKey);
	if (meta && meta.length > 0) return meta;
	return envFallback ?? null;
}

export function getDiscogsToken(): string | null {
	return pick(KEY_DISCOGS_TOKEN, env().DISCOGS_TOKEN);
}

export function getDiscogsUsername(): string | null {
	return pick(KEY_DISCOGS_USERNAME, env().DISCOGS_USERNAME);
}

export function getAnthropicKey(): string | null {
	return pick(KEY_ANTHROPIC_API_KEY, env().ANTHROPIC_API_KEY);
}

export function getScanModel(): string {
	return pick(KEY_SCAN_MODEL, env().SCAN_MODEL) ?? env().SCAN_MODEL;
}

export function setDiscogsToken(value: string | null): void {
	setMeta(KEY_DISCOGS_TOKEN, value && value.length > 0 ? value : null);
}

export function setDiscogsUsername(value: string | null): void {
	setMeta(KEY_DISCOGS_USERNAME, value && value.length > 0 ? value : null);
}

export function setAnthropicKey(value: string | null): void {
	setMeta(KEY_ANTHROPIC_API_KEY, value && value.length > 0 ? value : null);
}

export function setScanModel(value: string | null): void {
	setMeta(KEY_SCAN_MODEL, value && value.length > 0 ? value : null);
}

import { MEDIA_FORMATS, type MediaFormat } from './db/schema';

/**
 * Welche Tonträger-Formate der User sammelt. Default: nur 'cassette'.
 * Steuert, ob im Formular ein Format-Picker erscheint und welche Optionen
 * dort verfügbar sind.
 */
export function getEnabledFormats(): MediaFormat[] {
	const raw = getMeta(KEY_ENABLED_FORMATS);
	if (!raw) return ['cassette'];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return ['cassette'];
		const valid = parsed.filter((f): f is MediaFormat =>
			(MEDIA_FORMATS as readonly string[]).includes(f)
		);
		return valid.length > 0 ? valid : ['cassette'];
	} catch {
		return ['cassette'];
	}
}

export function setEnabledFormats(formats: MediaFormat[]): void {
	const unique = Array.from(new Set(formats)).filter((f) =>
		(MEDIA_FORMATS as readonly string[]).includes(f)
	);
	if (unique.length === 0) {
		setMeta(KEY_ENABLED_FORMATS, null);
		return;
	}
	setMeta(KEY_ENABLED_FORMATS, JSON.stringify(unique));
}

/**
 * Ob das Auflagen-Tracking für „Die drei ???" aktiv ist. Default: aus.
 * Steuert Sichtbarkeit von Auflagen-Link auf der Serien-Detailseite und
 * Erreichbarkeit der /auflagen-Route.
 */
export function isDreiAuflagenEnabled(): boolean {
	return getMeta(KEY_DREI_AUFLAGEN_ENABLED) === '1';
}

export function setDreiAuflagenEnabled(value: boolean): void {
	setMeta(KEY_DREI_AUFLAGEN_ENABLED, value ? '1' : null);
}

/**
 * App-Brand-Logo: entweder eine der vorhandenen Draft-Varianten aus
 * LogoDraft.svelte oder ein vom User hochgeladenes Bild (PNG/SVG).
 *
 * `variant === 'custom'` impliziert dass ein `customPath` gesetzt sein
 * muss; sonst fällt's auf 'salat' (der bisherige Default) zurück.
 */
export const BRAND_LOGO_VARIANTS = [
	'salat',
	'doppel',
	'welle3',
	'bogen',
	'schleife',
	'knaeuel',
	'classic'
] as const;
export type BrandLogoVariant = (typeof BRAND_LOGO_VARIANTS)[number] | 'custom';

export function getBrandLogoVariant(): BrandLogoVariant {
	const v = getMeta(KEY_BRAND_LOGO_VARIANT);
	if (v && (BRAND_LOGO_VARIANTS as readonly string[]).includes(v)) return v as BrandLogoVariant;
	if (v === 'custom') return 'custom';
	return 'salat';
}

export function getBrandLogoCustomPath(): string | null {
	return getMeta(KEY_BRAND_LOGO_CUSTOM_PATH);
}

export function setBrandLogoVariant(variant: BrandLogoVariant): void {
	setMeta(KEY_BRAND_LOGO_VARIANT, variant);
}

export function setBrandLogoCustomPath(path: string | null): void {
	setMeta(KEY_BRAND_LOGO_CUSTOM_PATH, path);
}

/**
 * Quelle der aktiven Werte zur Anzeige im UI ("env" | "db" | "missing").
 * Wir geben nicht den Wert selbst zurück, sondern nur den Status — Secrets
 * sollen nicht in HTML gerendert werden.
 */
export interface SettingState {
	source: 'env' | 'db' | 'missing';
	/** Letzte 4 Zeichen des Wertes für Wiedererkennung (oder null wenn missing). */
	hint: string | null;
}

function stateFor(metaKey: string, envValue: string | undefined): SettingState {
	const meta = getMeta(metaKey);
	if (meta && meta.length > 0) return { source: 'db', hint: tail(meta) };
	if (envValue && envValue.length > 0) return { source: 'env', hint: tail(envValue) };
	return { source: 'missing', hint: null };
}

function tail(s: string): string {
	const clean = s.trim();
	if (clean.length <= 4) return clean;
	return '…' + clean.slice(-4);
}

export function getSettingsStates() {
	return {
		discogsToken: stateFor(KEY_DISCOGS_TOKEN, env().DISCOGS_TOKEN),
		discogsUsername: stateFor(KEY_DISCOGS_USERNAME, env().DISCOGS_USERNAME),
		anthropicKey: stateFor(KEY_ANTHROPIC_API_KEY, env().ANTHROPIC_API_KEY),
		scanModel: stateFor(KEY_SCAN_MODEL, env().SCAN_MODEL)
	};
}

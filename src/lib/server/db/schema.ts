import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export { MEDIA_FORMATS, FORMAT_LABELS, FORMAT_SHORT } from '$lib/format';
export type { MediaFormat } from '$lib/format';
import type { MediaFormat } from '$lib/format';

export const MEDIA_GRADES = [
	'Mint (M)',
	'Near Mint (NM or M-)',
	'Very Good Plus (VG+)',
	'Very Good (VG)',
	'Good Plus (G+)',
	'Good (G)',
	'Fair (F)',
	'Poor (P)'
] as const;

export const SLEEVE_EXTRA = ['Generic', 'Not Graded', 'No Cover'] as const;

export const SLEEVE_GRADES = [...MEDIA_GRADES, ...SLEEVE_EXTRA] as const;

export type MediaGrade = (typeof MEDIA_GRADES)[number];
export type SleeveGrade = (typeof SLEEVE_GRADES)[number];

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const cassettes = sqliteTable(
	'cassettes',
	{
		id: text('id').primaryKey(),
		serie: text('serie').notNull(),
		folgeNr: integer('folge_nr'),
		folgeNrLabel: text('folge_nr_label'),
		titel: text('titel').notNull(),
		/** Tonträger-Format: cassette (Default, MC), lp (Schallplatte), cd. */
		format: text('format').notNull().default('cassette').$type<MediaFormat>(),
		label: text('label'),
		auflageVariante: text('auflage_variante'),
		jahr: integer('jahr'),
		discogsReleaseId: integer('discogs_release_id'),
		discogsUrl: text('discogs_url'),
		seriennummer: text('seriennummer'),
		zustandMc: text('zustand_mc').$type<MediaGrade>(),
		zustandHuelle: text('zustand_huelle').$type<SleeveGrade>(),
		originalhuelle: integer('originalhuelle', { mode: 'boolean' }).notNull().default(true),
		vollstaendig: integer('vollstaendig', { mode: 'boolean' }).notNull().default(true),
		kaufdatum: text('kaufdatum'),
		kaufpreisCent: integer('kaufpreis_cent'),
		kaufort: text('kaufort'),
		/** Optionale Sammel-/Organisations-Gruppe ("Grabbelkiste" etc.).
		 *  Wenn gesetzt, gruppiert die Übersicht den Eintrag unter diesem Ordner
		 *  statt unter `serie`. */
		folder: text('folder'),
		/** Verknüpfung zu einer Auflage in der bekannten-Auflagen-Liste.
		 *  Format: "discogs:<release_id>" oder "manual:<uuid>". Aktuell nur für
		 *  Serie "Die drei ???" + Format "cassette" genutzt. */
		auflageId: text('auflage_id'),
		/** Welche Cover-Quelle in der Anzeige bevorzugt wird:
		 *   - 'auto'    (Default): Foto → Discogs → Folge-Quelle → Discogs-URL
		 *   - 'photo':              eigenes hochgeladenes Foto
		 *   - 'discogs':            gecachtes Discogs-Cover
		 *   - 'external':           Folge-Cover (z.B. dreimetadaten.de) */
		coverSource: text('cover_source')
			.notNull()
			.default('auto')
			.$type<'auto' | 'photo' | 'discogs' | 'external'>(),
		/** Bewertung in Halbsternen: 1 = ½ Stern, 10 = 5 Sterne, null = nicht bewertet. */
		rating: integer('rating'),
		review: text('review'),
		notiz: text('notiz'),
		coverFotoPath: text('cover_foto_path'),
		discogsCoverUrl: text('discogs_cover_url'),
		discogsCoverCachePath: text('discogs_cover_cache_path'),
		discogsFolderId: integer('discogs_folder_id'),
		discogsInstanceId: integer('discogs_instance_id'),
		discogsSyncedAt: text('discogs_synced_at'),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso)
	},
	(t) => [
		index('cassettes_serie_idx').on(t.serie),
		index('cassettes_discogs_release_idx').on(t.discogsReleaseId),
		index('cassettes_created_at_idx').on(t.createdAt),
		index('cassettes_serie_folge_idx').on(t.serie, t.folgeNr),
		index('cassettes_folder_idx').on(t.folder),
		index('cassettes_format_idx').on(t.format),
		index('cassettes_auflage_idx').on(t.auflageId)
	]
);

export const appMeta = sqliteTable('app_meta', {
	key: text('key').primaryKey(),
	value: text('value'),
	updatedAt: text('updated_at').notNull().default(nowIso)
});

export const discogsPriceCache = sqliteTable('discogs_price_cache', {
	releaseId: integer('release_id').primaryKey(),
	fetchedAt: text('fetched_at').notNull().default(nowIso),
	currency: text('currency'),
	pricesJson: text('prices_json').notNull()
});

export const listenLog = sqliteTable(
	'listen_log',
	{
		id: text('id').primaryKey(),
		cassetteId: text('cassette_id')
			.notNull()
			.references(() => cassettes.id, { onDelete: 'cascade' }),
		listenedAt: text('listened_at').notNull().default(nowIso),
		note: text('note'),
		createdAt: text('created_at').notNull().default(nowIso)
	},
	(t) => [
		index('listen_log_cassette_idx').on(t.cassetteId),
		index('listen_log_listened_at_idx').on(t.listenedAt),
		// Composite-Index für die korrelierten Subqueries der
		// "last_listened"/"most_listened"-Sortierungen.
		index('listen_log_cassette_listened_idx').on(t.cassetteId, t.listenedAt)
	]
);

export const USER_ROLES = ['admin', 'editor', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = sqliteTable(
	'users',
	{
		id: text('id').primaryKey(),
		username: text('username').notNull().unique(),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		role: text('role').notNull().default('viewer').$type<UserRole>(),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso),
		lastLoginAt: text('last_login_at'),
		demoScansUsed: integer('demo_scans_used').notNull().default(0)
	},
	(t) => [index('users_username_idx').on(t.username), index('users_email_idx').on(t.email)]
);

export const CASSETTE_PHOTO_ROLES = ['front', 'back', 'extra'] as const;
export type CassettePhotoRole = (typeof CASSETTE_PHOTO_ROLES)[number];

/** Fotos einer Kassette. Front + Back + beliebig viele Extras, jeweils mit
 *  thumbnail. `coverFotoPath` auf cassettes bleibt synchron zum
 *  ersten 'front'-Foto für API-Kompatibilität älterer Endpoints. */
export const cassettePhotos = sqliteTable(
	'cassette_photos',
	{
		id: text('id').primaryKey(),
		cassetteId: text('cassette_id')
			.notNull()
			.references(() => cassettes.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('extra').$type<CassettePhotoRole>(),
		sortOrder: integer('sort_order').notNull().default(0),
		path: text('path').notNull(),
		thumbPath: text('thumb_path'),
		caption: text('caption'),
		createdAt: text('created_at').notNull().default(nowIso)
	},
	(t) => [
		index('cassette_photos_cassette_idx').on(t.cassetteId),
		index('cassette_photos_role_idx').on(t.cassetteId, t.role)
	]
);

/** Event-Log für Vision-Scans. Wird beim erfolgreichen oder gescheiterten
 *  Scan-Aufruf befüllt — damit kann der Orchestrator (oder die App-Stats)
 *  Lifetime-Scan-Counts und Tokens-Statistik anzeigen. */
export const scanEvents = sqliteTable(
	'scan_events',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		model: text('model').notNull(),
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		success: integer('success', { mode: 'boolean' }).notNull().default(true),
		createdAt: text('created_at').notNull().default(nowIso)
	},
	(t) => [
		index('scan_events_created_idx').on(t.createdAt),
		index('scan_events_user_idx').on(t.userId)
	]
);

export const shares = sqliteTable(
	'shares',
	{
		id: text('id').primaryKey(),
		token: text('token').notNull().unique(),
		/** Was wird geteilt: 'collection' = ganze Sammlung; 'serie' = eine Serie. */
		scope: text('scope').notNull().$type<'collection' | 'serie'>(),
		/** Bei scope='serie': Name der Serie. Bei 'collection': null. */
		scopeRef: text('scope_ref'),
		title: text('title'),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: text('expires_at'),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso),
		revokedAt: text('revoked_at')
	},
	(t) => [index('shares_token_idx').on(t.token), index('shares_owner_idx').on(t.createdByUserId)]
);

/**
 * Pro-Folge-Cover (Serie + Folgennummer). Wird z.B. von dreimetadaten.de
 * gefüllt — eine Quelle pro Folge, alle Kassetten dieser Folge teilen sich
 * das Cover wenn ihre coverSource auf 'external' steht.
 */
export const folgeCover = sqliteTable(
	'folge_cover',
	{
		id: text('id').primaryKey(),
		serie: text('serie').notNull(),
		folgeNr: integer('folge_nr').notNull(),
		source: text('source').notNull().$type<'dreimetadaten' | 'manual'>(),
		sourceUrl: text('source_url'),
		cachePath: text('cache_path').notNull(),
		thumbPath: text('thumb_path').notNull(),
		/** Kanonischer Folgentitel aus der Quelle (z.B. "und der Super-Papagei"
		 *  von dreimetadaten.de) — Fallback wenn kein Cassette-Eintrag der Folge
		 *  existiert. */
		titel: text('titel'),
		fetchedAt: text('fetched_at').notNull().default(nowIso),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso)
	},
	(t) => [index('folge_cover_serie_folge_idx').on(t.serie, t.folgeNr)]
);

/**
 * Pro-Folge-Klappentext (Serie + Folgennummer). Mehrere Auflagen derselben
 * Folge zeigen denselben Text.
 */
export const folgeSynopsis = sqliteTable(
	'folge_synopsis',
	{
		id: text('id').primaryKey(),
		serie: text('serie').notNull(),
		folgeNr: integer('folge_nr').notNull(),
		text: text('text').notNull(),
		source: text('source').notNull().$type<'dreimetadaten' | 'discogs' | 'manual'>(),
		sourceUrl: text('source_url'),
		fetchedAt: text('fetched_at').notNull().default(nowIso),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso)
	},
	(t) => [index('folge_synopsis_serie_folge_idx').on(t.serie, t.folgeNr)]
);

export const wantlist = sqliteTable(
	'wantlist',
	{
		id: text('id').primaryKey(),
		serie: text('serie'),
		folgeNr: integer('folge_nr'),
		titel: text('titel'),
		auflageVariante: text('auflage_variante'),
		jahr: integer('jahr'),
		label: text('label'),
		discogsReleaseId: integer('discogs_release_id'),
		discogsUrl: text('discogs_url'),
		discogsCoverUrl: text('discogs_cover_url'),
		discogsCoverCachePath: text('discogs_cover_cache_path'),
		maxPriceCent: integer('max_price_cent'),
		priority: integer('priority').notNull().default(1),
		notiz: text('notiz'),
		createdAt: text('created_at').notNull().default(nowIso),
		updatedAt: text('updated_at').notNull().default(nowIso)
	},
	(t) => [
		index('wantlist_serie_idx').on(t.serie),
		index('wantlist_release_idx').on(t.discogsReleaseId)
	]
);

export type Cassette = InferSelectModel<typeof cassettes>;
export type NewCassette = InferInsertModel<typeof cassettes>;
export type AppMeta = InferSelectModel<typeof appMeta>;
export type DiscogsPriceCacheRow = InferSelectModel<typeof discogsPriceCache>;
export type ListenLogEntry = InferSelectModel<typeof listenLog>;
export type NewListenLogEntry = InferInsertModel<typeof listenLog>;
export type WantlistEntry = InferSelectModel<typeof wantlist>;
export type NewWantlistEntry = InferInsertModel<typeof wantlist>;
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Share = InferSelectModel<typeof shares>;
export type NewShare = InferInsertModel<typeof shares>;
export type FolgeCover = InferSelectModel<typeof folgeCover>;
export type NewFolgeCover = InferInsertModel<typeof folgeCover>;
export type FolgeSynopsis = InferSelectModel<typeof folgeSynopsis>;
export type NewFolgeSynopsis = InferInsertModel<typeof folgeSynopsis>;

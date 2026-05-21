CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cassettes` (
	`id` text PRIMARY KEY NOT NULL,
	`serie` text NOT NULL,
	`folge_nr` integer,
	`folge_nr_label` text,
	`titel` text NOT NULL,
	`label` text,
	`auflage_variante` text,
	`jahr` integer,
	`discogs_release_id` integer,
	`discogs_url` text,
	`seriennummer` text,
	`zustand_mc` text,
	`zustand_huelle` text,
	`originalhuelle` integer DEFAULT true NOT NULL,
	`vollstaendig` integer DEFAULT true NOT NULL,
	`kaufdatum` text,
	`kaufpreis_cent` integer,
	`kaufort` text,
	`notiz` text,
	`cover_foto_path` text,
	`discogs_cover_url` text,
	`discogs_cover_cache_path` text,
	`discogs_folder_id` integer,
	`discogs_instance_id` integer,
	`discogs_synced_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cassettes_serie_idx` ON `cassettes` (`serie`);--> statement-breakpoint
CREATE INDEX `cassettes_discogs_release_idx` ON `cassettes` (`discogs_release_id`);--> statement-breakpoint
CREATE INDEX `cassettes_created_at_idx` ON `cassettes` (`created_at`);--> statement-breakpoint
CREATE INDEX `cassettes_serie_folge_idx` ON `cassettes` (`serie`,`folge_nr`);
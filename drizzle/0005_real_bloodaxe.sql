CREATE TABLE `wantlist` (
	`id` text PRIMARY KEY NOT NULL,
	`serie` text,
	`folge_nr` integer,
	`titel` text,
	`auflage_variante` text,
	`jahr` integer,
	`label` text,
	`discogs_release_id` integer,
	`discogs_url` text,
	`discogs_cover_url` text,
	`discogs_cover_cache_path` text,
	`max_price_cent` integer,
	`priority` integer DEFAULT 1 NOT NULL,
	`notiz` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wantlist_serie_idx` ON `wantlist` (`serie`);--> statement-breakpoint
CREATE INDEX `wantlist_release_idx` ON `wantlist` (`discogs_release_id`);
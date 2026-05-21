CREATE TABLE `folge_cover` (
	`id` text PRIMARY KEY NOT NULL,
	`serie` text NOT NULL,
	`folge_nr` integer NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`cache_path` text NOT NULL,
	`thumb_path` text NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `folge_cover_serie_folge_idx` ON `folge_cover` (`serie`,`folge_nr`);--> statement-breakpoint
CREATE TABLE `folge_synopsis` (
	`id` text PRIMARY KEY NOT NULL,
	`serie` text NOT NULL,
	`folge_nr` integer NOT NULL,
	`text` text NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `folge_synopsis_serie_folge_idx` ON `folge_synopsis` (`serie`,`folge_nr`);--> statement-breakpoint
ALTER TABLE `cassettes` ADD `cover_source` text DEFAULT 'auto' NOT NULL;
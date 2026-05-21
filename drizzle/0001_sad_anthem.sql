CREATE TABLE `discogs_price_cache` (
	`release_id` integer PRIMARY KEY NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`currency` text,
	`prices_json` text NOT NULL
);

CREATE TABLE `listen_log` (
	`id` text PRIMARY KEY NOT NULL,
	`cassette_id` text NOT NULL,
	`listened_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`cassette_id`) REFERENCES `cassettes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listen_log_cassette_idx` ON `listen_log` (`cassette_id`);--> statement-breakpoint
CREATE INDEX `listen_log_listened_at_idx` ON `listen_log` (`listened_at`);
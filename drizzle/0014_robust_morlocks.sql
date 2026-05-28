CREATE TABLE `cassette_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`cassette_id` text NOT NULL,
	`role` text DEFAULT 'extra' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text,
	`caption` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`cassette_id`) REFERENCES `cassettes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cassette_photos_cassette_idx` ON `cassette_photos` (`cassette_id`);--> statement-breakpoint
CREATE INDEX `cassette_photos_role_idx` ON `cassette_photos` (`cassette_id`,`role`);--> statement-breakpoint
-- Backfill: existierende cover_foto_path zu front-Fotos machen. thumb_path
-- ist auf bisheriger Konvention `<stem>.thumb.jpg`. ID = randomblob-hex.
INSERT INTO `cassette_photos` (id, cassette_id, role, sort_order, path, thumb_path)
SELECT
	lower(hex(randomblob(16))),
	id,
	'front',
	0,
	cover_foto_path,
	replace(replace(cover_foto_path, '.jpg', '.thumb.jpg'), '.jpeg', '.thumb.jpg')
FROM `cassettes`
WHERE cover_foto_path IS NOT NULL AND cover_foto_path != '';
ALTER TABLE `cassettes` ADD `auflage_id` text;--> statement-breakpoint
CREATE INDEX `cassettes_auflage_idx` ON `cassettes` (`auflage_id`);
ALTER TABLE `cassettes` ADD `format` text DEFAULT 'cassette' NOT NULL;--> statement-breakpoint
CREATE INDEX `cassettes_format_idx` ON `cassettes` (`format`);
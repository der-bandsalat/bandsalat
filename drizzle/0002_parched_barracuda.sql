ALTER TABLE `cassettes` ADD `folder` text;--> statement-breakpoint
CREATE INDEX `cassettes_folder_idx` ON `cassettes` (`folder`);
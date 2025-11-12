ALTER TABLE `urls` ADD `citation_validation_status` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `citation_validated_at` integer;--> statement-breakpoint
ALTER TABLE `urls` ADD `citation_validation_details` text;--> statement-breakpoint
CREATE INDEX `urls_citation_validation_status_idx` ON `urls` (`citation_validation_status`);
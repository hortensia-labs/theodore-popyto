ALTER TABLE `urls` ADD `zotero_item_key` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `zotero_processed_at` integer;--> statement-breakpoint
ALTER TABLE `urls` ADD `zotero_processing_status` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `zotero_processing_error` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `zotero_processing_method` text;--> statement-breakpoint
CREATE INDEX `urls_zotero_item_key_idx` ON `urls` (`zotero_item_key`);--> statement-breakpoint
CREATE INDEX `urls_zotero_processing_status_idx` ON `urls` (`zotero_processing_status`);
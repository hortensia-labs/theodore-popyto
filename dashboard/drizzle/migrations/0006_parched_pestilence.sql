CREATE TABLE `zotero_item_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_key` text NOT NULL,
	`url_id` integer NOT NULL,
	`created_by_theodore` integer DEFAULT true NOT NULL,
	`user_modified` integer DEFAULT false NOT NULL,
	`linked_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_zotero_links_item_key` ON `zotero_item_links` (`item_key`);--> statement-breakpoint
CREATE INDEX `idx_zotero_links_url_id` ON `zotero_item_links` (`url_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `zotero_item_links_unique` ON `zotero_item_links` (`item_key`,`url_id`);--> statement-breakpoint
ALTER TABLE `urls` ADD `processing_status` text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `urls` ADD `user_intent` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `urls` ADD `processing_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `urls` ADD `processing_history` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `last_processing_method` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `created_by_theodore` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `urls` ADD `user_modified_in_zotero` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `urls` ADD `linked_url_count` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `idx_urls_processing_status` ON `urls` (`processing_status`);--> statement-breakpoint
CREATE INDEX `idx_urls_user_intent` ON `urls` (`user_intent`);--> statement-breakpoint
CREATE INDEX `idx_urls_processing_attempts` ON `urls` (`processing_attempts`);
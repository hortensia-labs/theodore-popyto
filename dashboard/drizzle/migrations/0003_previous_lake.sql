CREATE TABLE `url_content_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`content_hash` text NOT NULL,
	`content_type` text NOT NULL,
	`content_size` integer NOT NULL,
	`content_language` text,
	`raw_content_path` text NOT NULL,
	`processed_content_path` text,
	`status_code` integer NOT NULL,
	`redirect_chain` text,
	`response_headers` text,
	`fetched_at` integer NOT NULL,
	`last_accessed_at` integer NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `url_content_cache_url_id_unique` ON `url_content_cache` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_content_cache_hash_idx` ON `url_content_cache` (`content_hash`);--> statement-breakpoint
CREATE INDEX `url_content_cache_fetched_at_idx` ON `url_content_cache` (`fetched_at`);--> statement-breakpoint
CREATE INDEX `url_content_cache_url_id_idx` ON `url_content_cache` (`url_id`);--> statement-breakpoint
CREATE TABLE `url_extracted_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`title` text,
	`creators` text,
	`date` text,
	`item_type` text,
	`abstract_note` text,
	`publication_title` text,
	`url` text,
	`access_date` text,
	`language` text,
	`extraction_method` text NOT NULL,
	`extraction_sources` text,
	`quality_score` integer,
	`validation_status` text,
	`validation_errors` text,
	`missing_fields` text,
	`user_reviewed` integer DEFAULT false,
	`user_approved` integer,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `url_extracted_metadata_url_id_unique` ON `url_extracted_metadata` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_extracted_metadata_url_id_idx` ON `url_extracted_metadata` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_extracted_metadata_validation_status_idx` ON `url_extracted_metadata` (`validation_status`);--> statement-breakpoint
CREATE TABLE `url_identifiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`identifier_type` text NOT NULL,
	`identifier_value` text NOT NULL,
	`extraction_method` text NOT NULL,
	`extraction_source` text,
	`confidence` text NOT NULL,
	`preview_fetched` integer DEFAULT false,
	`preview_data` text,
	`preview_quality_score` integer,
	`preview_error` text,
	`preview_fetched_at` integer,
	`user_selected` integer DEFAULT false,
	`selected_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `url_identifiers_url_id_idx` ON `url_identifiers` (`url_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `url_identifiers_type_value_idx` ON `url_identifiers` (`identifier_type`,`identifier_value`,`url_id`);--> statement-breakpoint
CREATE INDEX `url_identifiers_preview_fetched_idx` ON `url_identifiers` (`preview_fetched`);--> statement-breakpoint
CREATE INDEX `url_identifiers_type_idx` ON `url_identifiers` (`identifier_type`);--> statement-breakpoint
ALTER TABLE `urls` ADD `process_workflow_version` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `content_fetch_attempts` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `urls` ADD `last_fetch_error` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `identifier_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `urls` ADD `has_extracted_metadata` integer DEFAULT false;
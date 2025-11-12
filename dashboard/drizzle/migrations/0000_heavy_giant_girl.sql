CREATE TABLE `import_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`file_path` text NOT NULL,
	`file_hash` text NOT NULL,
	`urls_imported` integer DEFAULT 0 NOT NULL,
	`urls_updated` integer DEFAULT 0 NOT NULL,
	`urls_skipped` integer DEFAULT 0 NOT NULL,
	`errors` text,
	`imported_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `import_history_section_id_idx` ON `import_history` (`section_id`);--> statement-breakpoint
CREATE INDEX `import_history_imported_at_idx` ON `import_history` (`imported_at`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`path` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sections_name_unique` ON `sections` (`name`);--> statement-breakpoint
CREATE TABLE `url_analysis_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`valid_identifiers` text,
	`web_translators` text,
	`ai_translation` integer DEFAULT false,
	`raw_metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `url_analysis_data_url_id_unique` ON `url_analysis_data` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_analysis_data_url_id_idx` ON `url_analysis_data` (`url_id`);--> statement-breakpoint
CREATE TABLE `url_enrichments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`notes` text,
	`custom_identifiers` text DEFAULT '[]',
	`reviewed_at` integer,
	`reviewed_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `url_enrichments_url_id_unique` ON `url_enrichments` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_enrichments_url_id_idx` ON `url_enrichments` (`url_id`);--> statement-breakpoint
CREATE TABLE `url_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url_id` integer NOT NULL,
	`metadata_type` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `url_metadata_url_id_idx` ON `url_metadata` (`url_id`);--> statement-breakpoint
CREATE INDEX `url_metadata_type_idx` ON `url_metadata` (`metadata_type`);--> statement-breakpoint
CREATE TABLE `urls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`url` text NOT NULL,
	`domain` text,
	`status_code` integer,
	`content_type` text,
	`final_url` text,
	`redirect_count` integer,
	`is_accessible` integer DEFAULT false,
	`success` integer DEFAULT true NOT NULL,
	`has_errors` integer DEFAULT false NOT NULL,
	`discovered_at` integer,
	`last_checked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `urls_section_id_idx` ON `urls` (`section_id`);--> statement-breakpoint
CREATE INDEX `urls_domain_idx` ON `urls` (`domain`);--> statement-breakpoint
CREATE INDEX `urls_status_code_idx` ON `urls` (`status_code`);--> statement-breakpoint
CREATE INDEX `urls_is_accessible_idx` ON `urls` (`is_accessible`);--> statement-breakpoint
CREATE UNIQUE INDEX `urls_url_section_unique` ON `urls` (`url`,`section_id`);
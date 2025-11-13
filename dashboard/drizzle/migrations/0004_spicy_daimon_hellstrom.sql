ALTER TABLE `urls` ADD `llm_extraction_status` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `llm_extraction_provider` text;--> statement-breakpoint
ALTER TABLE `urls` ADD `llm_extraction_attempts` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `urls` ADD `llm_extracted_at` integer;--> statement-breakpoint
ALTER TABLE `urls` ADD `llm_extraction_error` text;
CREATE TABLE `fipe_price_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`vehicle_type` text DEFAULT 'cars' NOT NULL,
	`fipe_code` text NOT NULL,
	`year_id` text NOT NULL,
	`reference_code` text NOT NULL,
	`reference_label` text NOT NULL,
	`brand_code` text NOT NULL,
	`brand_name` text NOT NULL,
	`model_code` text NOT NULL,
	`model_name` text NOT NULL,
	`fuel` text NOT NULL,
	`model_year` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`fetched_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `fipe_price_cache_key_uidx` ON `fipe_price_cache` (`provider`,`fipe_code`,`year_id`,`reference_code`);--> statement-breakpoint
CREATE INDEX `fipe_price_cache_code_idx` ON `fipe_price_cache` (`fipe_code`);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_match_status` text DEFAULT 'unmatched' NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_year_id` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_fuel` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_brand_code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_model_code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_provider` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_reference_code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_reference_label` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_price_cents` integer;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fipe_fetched_at` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `desired_margin_bps` integer;--> statement-breakpoint
CREATE INDEX `vehicles_fipe_code_idx` ON `vehicles` (`fipe_code`);

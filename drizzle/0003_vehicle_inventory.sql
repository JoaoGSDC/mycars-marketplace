ALTER TABLE `vehicles` ADD `internal_code` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `asking_price_cents` integer;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `consignor_name` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `consignor_phone` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `consignor_document` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `is_draft` text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `notes_commercial` text;--> statement-breakpoint
CREATE INDEX `vehicles_store_plate_idx` ON `vehicles` (`store_id`,`plate`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_store_internal_uidx` ON `vehicles` (`store_id`,`internal_code`);

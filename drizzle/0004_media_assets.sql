CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`purpose` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`storage_key` text NOT NULL,
	`url` text NOT NULL,
	`card_url` text,
	`detail_url` text,
	`mime_type` text NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`variant_keys_json` text DEFAULT '[]' NOT NULL,
	`uploaded_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `media_assets_store_idx` ON `media_assets` (`store_id`);--> statement-breakpoint
CREATE INDEX `media_assets_status_idx` ON `media_assets` (`status`);--> statement-breakpoint
CREATE INDEX `media_assets_entity_idx` ON `media_assets` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `media_assets_key_idx` ON `media_assets` (`storage_key`);--> statement-breakpoint
ALTER TABLE `vehicle_media` ADD `card_url` text;--> statement-breakpoint
ALTER TABLE `vehicle_media` ADD `detail_url` text;--> statement-breakpoint
ALTER TABLE `vehicle_media` ADD `storage_key` text;--> statement-breakpoint
ALTER TABLE `vehicle_media` ADD `media_asset_id` text;

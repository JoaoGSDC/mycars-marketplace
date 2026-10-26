ALTER TABLE `listings` ADD `features_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE TABLE `listing_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`message` text NOT NULL,
	`source` text NOT NULL,
	`origin_path` text NOT NULL,
	`listing_slug` text NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`status` text DEFAULT 'new_lead' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
CREATE INDEX `listing_leads_store_idx` ON `listing_leads` (`store_id`);--> statement-breakpoint
CREATE INDEX `listing_leads_listing_idx` ON `listing_leads` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_leads_store_created_idx` ON `listing_leads` (`store_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `listing_leads_ip_created_idx` ON `listing_leads` (`ip_hash`,`created_at`);

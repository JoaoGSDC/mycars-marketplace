CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`legal_name` text NOT NULL,
	`trade_name` text NOT NULL,
	`public_name` text NOT NULL,
	`slug` text NOT NULL,
	`subdomain` text,
	`document` text,
	`email` text,
	`phone` text,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`neighborhood` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`verified` text DEFAULT 'false' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_slug_uidx` ON `stores` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `stores_subdomain_uidx` ON `stores` (`subdomain`);--> statement-breakpoint
CREATE INDEX `stores_status_idx` ON `stores` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`image_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uidx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `store_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_memberships_store_user_uidx` ON `store_memberships` (`store_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `store_memberships_user_idx` ON `store_memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `store_memberships_store_idx` ON `store_memberships` (`store_id`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`make` text NOT NULL,
	`make_slug` text NOT NULL,
	`model` text NOT NULL,
	`model_slug` text NOT NULL,
	`version` text NOT NULL,
	`condition` text NOT NULL,
	`status` text DEFAULT 'preparing' NOT NULL,
	`ownership` text DEFAULT 'own' NOT NULL,
	`entered_at` text NOT NULL,
	`mileage_km` integer DEFAULT 0 NOT NULL,
	`fuel` text NOT NULL,
	`transmission` text NOT NULL,
	`year_manufacture` integer NOT NULL,
	`year_model` integer NOT NULL,
	`body_type` text NOT NULL,
	`color` text,
	`power_kw` real,
	`drivetrain` text,
	`vin` text,
	`plate` text,
	`notes_internal` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `vehicles_store_idx` ON `vehicles` (`store_id`);--> statement-breakpoint
CREATE INDEX `vehicles_store_status_idx` ON `vehicles` (`store_id`,`status`);--> statement-breakpoint
CREATE INDEX `vehicles_make_model_idx` ON `vehicles` (`make_slug`,`model_slug`);--> statement-breakpoint
CREATE TABLE `vehicle_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`incurred_at` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vehicle_costs_store_idx` ON `vehicle_costs` (`store_id`);--> statement-breakpoint
CREATE INDEX `vehicle_costs_vehicle_idx` ON `vehicle_costs` (`vehicle_id`);--> statement-breakpoint
CREATE TABLE `vehicle_media` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_primary` text DEFAULT 'false' NOT NULL,
	`alt` text,
	`width` integer,
	`height` integer,
	`mime_type` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vehicle_media_vehicle_idx` ON `vehicle_media` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `vehicle_media_store_idx` ON `vehicle_media` (`store_id`);--> statement-breakpoint
CREATE INDEX `vehicle_media_vehicle_order_idx` ON `vehicle_media` (`vehicle_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`previous_price_cents` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` text DEFAULT 'false' NOT NULL,
	`published_at` text,
	`closed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_vehicle_uidx` ON `listings` (`vehicle_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `listings_slug_uidx` ON `listings` (`slug`);--> statement-breakpoint
CREATE INDEX `listings_store_idx` ON `listings` (`store_id`);--> statement-breakpoint
CREATE INDEX `listings_store_status_idx` ON `listings` (`store_id`,`status`);--> statement-breakpoint
CREATE INDEX `listings_status_published_idx` ON `listings` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `storefront_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`logo_url` text,
	`cover_image_url` text,
	`primary_color` text,
	`tagline` text,
	`about` text,
	`contact_email` text,
	`contact_phone` text,
	`whatsapp_number` text,
	`social_instagram` text,
	`social_facebook` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `storefront_settings_store_uidx` ON `storefront_settings` (`store_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_events_store_idx` ON `audit_events` (`store_id`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_events_created_idx` ON `audit_events` (`created_at`);

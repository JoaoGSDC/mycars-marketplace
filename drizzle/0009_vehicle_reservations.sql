CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`opportunity_id` text,
	`assignee_user_id` text,
	`starts_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_by_user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `reservations_store_idx` ON `reservations` (`store_id`);--> statement-breakpoint
CREATE INDEX `reservations_store_status_idx` ON `reservations` (`store_id`,`status`);--> statement-breakpoint
CREATE INDEX `reservations_vehicle_idx` ON `reservations` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `reservations_expires_idx` ON `reservations` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_vehicle_active_uidx` ON `reservations` (`vehicle_id`) WHERE `status` = 'active';--> statement-breakpoint
CREATE TABLE `reservation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`reservation_id` text NOT NULL,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`actor_user_id` text,
	`metadata_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `reservation_events_reservation_idx` ON `reservation_events` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `reservation_events_store_created_idx` ON `reservation_events` (`store_id`,`created_at`);

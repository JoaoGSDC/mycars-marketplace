CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`seller_user_id` text NOT NULL,
	`opportunity_id` text,
	`sold_at` text NOT NULL,
	`listed_price_cents` integer,
	`negotiated_price_cents` integer NOT NULL,
	`costs_cents` integer DEFAULT 0 NOT NULL,
	`costs_incomplete` text DEFAULT 'false' NOT NULL,
	`gross_result_cents` integer,
	`modality` text NOT NULL,
	`ownership` text NOT NULL,
	`has_trade_in` text DEFAULT 'false' NOT NULL,
	`trade_in_description` text,
	`notes` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`cancel_reason` text,
	`cancelled_at` text,
	`cancelled_by_user_id` text,
	`created_by_user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `sales_store_idx` ON `sales` (`store_id`);--> statement-breakpoint
CREATE INDEX `sales_store_status_idx` ON `sales` (`store_id`,`status`);--> statement-breakpoint
CREATE INDEX `sales_store_sold_at_idx` ON `sales` (`store_id`,`sold_at`);--> statement-breakpoint
CREATE INDEX `sales_store_seller_idx` ON `sales` (`store_id`,`seller_user_id`);--> statement-breakpoint
CREATE INDEX `sales_vehicle_idx` ON `sales` (`vehicle_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_vehicle_completed_uidx` ON `sales` (`vehicle_id`) WHERE `status` = 'completed';--> statement-breakpoint
CREATE TABLE `sale_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`sale_id` text NOT NULL,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`actor_user_id` text,
	`metadata_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `sale_events_sale_idx` ON `sale_events` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_events_store_created_idx` ON `sale_events` (`store_id`,`created_at`);

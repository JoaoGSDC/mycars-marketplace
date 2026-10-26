ALTER TABLE `vehicles` ADD `availability_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `availability_due_at` text;--> statement-breakpoint
CREATE INDEX `vehicles_store_availability_due_idx` ON `vehicles` (`store_id`,`availability_due_at`);--> statement-breakpoint
ALTER TABLE `listings` ADD `availability_hold` text DEFAULT 'false' NOT NULL;--> statement-breakpoint
CREATE INDEX `listings_availability_hold_idx` ON `listings` (`store_id`,`availability_hold`);--> statement-breakpoint
CREATE TABLE `store_integrity_policies` (
	`store_id` text PRIMARY KEY NOT NULL,
	`confirmation_interval_days` integer DEFAULT 14 NOT NULL,
	`grace_days` integer DEFAULT 3 NOT NULL,
	`auto_pause_published` text DEFAULT 'true' NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `vehicle_availability_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`confirmed_at` text NOT NULL,
	`due_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`actor_user_id` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `vac_store_idx` ON `vehicle_availability_confirmations` (`store_id`);--> statement-breakpoint
CREATE INDEX `vac_vehicle_idx` ON `vehicle_availability_confirmations` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `vac_store_confirmed_idx` ON `vehicle_availability_confirmations` (`store_id`,`confirmed_at`);--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`processed_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`result_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `job_runs_idempotency_uidx` ON `job_runs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `job_runs_kind_started_idx` ON `job_runs` (`kind`,`started_at`);--> statement-breakpoint
CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by_user_id` text,
	`reason` text,
	`result_json` text,
	`retention_hold_until` text,
	`processed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `privacy_requests_store_idx` ON `privacy_requests` (`store_id`);--> statement-breakpoint
CREATE INDEX `privacy_requests_status_idx` ON `privacy_requests` (`status`);

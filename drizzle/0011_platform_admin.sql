CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`max_published_listings` integer DEFAULT 10 NOT NULL,
	`max_vehicles` integer DEFAULT 50 NOT NULL,
	`max_members` integer DEFAULT 5 NOT NULL,
	`grace_period_days` integer DEFAULT 7 NOT NULL,
	`price_cents_monthly` integer DEFAULT 0 NOT NULL,
	`is_active` text DEFAULT 'true' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `plans_code_uidx` ON `plans` (`code`);--> statement-breakpoint
CREATE INDEX `plans_active_idx` ON `plans` (`is_active`);--> statement-breakpoint
CREATE TABLE `store_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`grace_ends_at` text,
	`notes` text,
	`activated_by_user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`activated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `store_subscriptions_store_idx` ON `store_subscriptions` (`store_id`);--> statement-breakpoint
CREATE INDEX `store_subscriptions_status_idx` ON `store_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `store_subscriptions_plan_idx` ON `store_subscriptions` (`plan_id`);--> statement-breakpoint
CREATE TABLE `listing_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`reporter_user_id` text,
	`reporter_email` text,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_notes` text,
	`resolved_by_user_id` text,
	`resolved_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `listing_reports_store_idx` ON `listing_reports` (`store_id`);--> statement-breakpoint
CREATE INDEX `listing_reports_listing_idx` ON `listing_reports` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_reports_status_idx` ON `listing_reports` (`status`);--> statement-breakpoint
INSERT INTO `plans` (`id`, `code`, `name`, `description`, `max_published_listings`, `max_vehicles`, `max_members`, `grace_period_days`, `price_cents_monthly`, `is_active`)
VALUES
  ('plan_piloto', 'piloto', 'Piloto', 'Plano operacional para fase piloto sem cobrança automática', 25, 100, 10, 14, 0, 'true'),
  ('plan_starter', 'starter', 'Starter', 'Limites iniciais para lojas pequenas', 15, 40, 5, 7, 19900, 'true'),
  ('plan_pro', 'pro', 'Pro', 'Capacidade ampliada para operação comercial', 80, 200, 20, 7, 49900, 'true');

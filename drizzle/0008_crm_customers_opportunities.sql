CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_normalized` text NOT NULL,
	`email` text,
	`notes` text,
	`source` text NOT NULL,
	`data_purpose` text DEFAULT 'commercial_contact' NOT NULL,
	`collected_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
CREATE INDEX `customers_store_idx` ON `customers` (`store_id`);--> statement-breakpoint
CREATE INDEX `customers_store_phone_idx` ON `customers` (`store_id`,`phone_normalized`);--> statement-breakpoint
CREATE INDEX `customers_store_name_idx` ON `customers` (`store_id`,`name`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`vehicle_id` text,
	`listing_id` text,
	`listing_lead_id` text,
	`origin` text NOT NULL,
	`stage` text DEFAULT 'new_lead' NOT NULL,
	`assignee_user_id` text,
	`entered_at` text NOT NULL,
	`next_action_at` text,
	`next_action_label` text,
	`notes` text,
	`result_notes` text,
	`closed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`listing_lead_id`) REFERENCES `listing_leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `opportunities_store_idx` ON `opportunities` (`store_id`);--> statement-breakpoint
CREATE INDEX `opportunities_store_stage_idx` ON `opportunities` (`store_id`,`stage`);--> statement-breakpoint
CREATE INDEX `opportunities_store_assignee_idx` ON `opportunities` (`store_id`,`assignee_user_id`);--> statement-breakpoint
CREATE INDEX `opportunities_store_origin_idx` ON `opportunities` (`store_id`,`origin`);--> statement-breakpoint
CREATE INDEX `opportunities_customer_idx` ON `opportunities` (`customer_id`);--> statement-breakpoint
CREATE INDEX `opportunities_store_next_action_idx` ON `opportunities` (`store_id`,`next_action_at`);--> statement-breakpoint
CREATE TABLE `opportunity_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`assignee_user_id` text NOT NULL,
	`assigned_by_user_id` text,
	`assigned_at` text NOT NULL,
	`ended_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `opportunity_assignments_opp_idx` ON `opportunity_assignments` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `opportunity_assignments_store_assignee_idx` ON `opportunity_assignments` (`store_id`,`assignee_user_id`);--> statement-breakpoint
CREATE TABLE `opportunity_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`actor_user_id` text,
	`metadata_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `opportunity_activities_opp_idx` ON `opportunity_activities` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `opportunity_activities_store_created_idx` ON `opportunity_activities` (`store_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `follow_up_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`title` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` text,
	`created_by_user_id` text,
	`assigned_to_user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_opp_idx` ON `follow_up_tasks` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_store_due_idx` ON `follow_up_tasks` (`store_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_store_status_idx` ON `follow_up_tasks` (`store_id`,`status`);--> statement-breakpoint
CREATE TABLE `listing_engagement_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`listing_slug` text NOT NULL,
	`event_type` text NOT NULL,
	`origin_path` text NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
CREATE INDEX `listing_engagement_store_idx` ON `listing_engagement_events` (`store_id`);--> statement-breakpoint
CREATE INDEX `listing_engagement_listing_idx` ON `listing_engagement_events` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_engagement_ip_created_idx` ON `listing_engagement_events` (`ip_hash`,`created_at`);

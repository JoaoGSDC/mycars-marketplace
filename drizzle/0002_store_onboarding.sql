ALTER TABLE `users` ADD `platform_role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `whatsapp` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `street` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `address_number` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `complement` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `zip_code` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `institutional_info` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `responsible_name` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `responsible_email` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `responsible_phone` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `subscription_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `stores` ADD `reviewed_by_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `stores_document_uidx` ON `stores` (`document`);--> statement-breakpoint
ALTER TABLE `storefront_settings` ADD `business_hours_json` text DEFAULT '[]' NOT NULL;

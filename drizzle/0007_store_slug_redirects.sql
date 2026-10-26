CREATE TABLE `store_slug_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`old_slug` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `store_slug_redirects_old_slug_uidx` ON `store_slug_redirects` (`old_slug`);--> statement-breakpoint
CREATE INDEX `store_slug_redirects_store_idx` ON `store_slug_redirects` (`store_id`);

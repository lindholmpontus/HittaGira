CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`path` text NOT NULL,
	`target` text,
	`referrer` text,
	`visitor_id` text NOT NULL,
	`country` text,
	`device` text,
	`day` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_day_idx` ON `events` (`day`,`type`);
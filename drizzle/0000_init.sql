CREATE TABLE `ads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text DEFAULT 'blocket' NOT NULL,
	`source_ad_id` text NOT NULL,
	`model_id` integer NOT NULL,
	`heading` text NOT NULL,
	`price_amount` integer,
	`price_currency` text,
	`location` text,
	`lat` real,
	`lon` real,
	`organisation_name` text,
	`is_retailer` integer DEFAULT false NOT NULL,
	`trade_type` text,
	`canonical_url` text NOT NULL,
	`primary_image_url` text,
	`image_urls_json` text,
	`published_at` integer,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ads_source_unique` ON `ads` (`source`,`source_ad_id`);--> statement-breakpoint
CREATE INDEX `ads_model_idx` ON `ads` (`model_id`);--> statement-breakpoint
CREATE INDEX `ads_price_idx` ON `ads` (`price_amount`);--> statement-breakpoint
CREATE INDEX `ads_first_seen_idx` ON `ads` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `ads_source_idx` ON `ads` (`source`);--> statement-breakpoint
CREATE TABLE `manufacturers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`blurb` text,
	`logo_file` text,
	`sort_order` integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manufacturers_slug_unique` ON `manufacturers` (`slug`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`search_query` text NOT NULL,
	`guitar_type` integer,
	`sort_order` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_manufacturer_slug_idx` ON `models` (`manufacturer_id`,`slug`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad_id` integer NOT NULL,
	`price_amount` integer NOT NULL,
	`observed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`ad_id`) REFERENCES `ads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_ad_idx` ON `price_history` (`ad_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`models_processed` integer DEFAULT 0 NOT NULL,
	`ads_upserted` integer DEFAULT 0 NOT NULL,
	`ads_new` integer DEFAULT 0 NOT NULL,
	`price_changes` integer DEFAULT 0 NOT NULL,
	`error` text
);

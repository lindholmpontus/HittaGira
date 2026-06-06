ALTER TABLE `ads` ADD `is_auction` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ads` ADD `total_bids` integer;--> statement-breakpoint
ALTER TABLE `ads` ADD `auction_end_at` integer;--> statement-breakpoint
ALTER TABLE `ads` ADD `buy_now_price` integer;
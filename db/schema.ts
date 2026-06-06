import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const manufacturers = sqliteTable("manufacturers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb"),
  logoFile: text("logo_file"),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const models = sqliteTable(
  "models",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    manufacturerId: integer("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    searchQuery: text("search_query").notNull(),
    guitarType: integer("guitar_type"),
    sortOrder: integer("sort_order").notNull().default(100),
  },
  (t) => ({
    manufacturerSlug: uniqueIndex("models_manufacturer_slug_idx").on(
      t.manufacturerId,
      t.slug,
    ),
  }),
);

export const ads = sqliteTable(
  "ads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull().default("blocket"),
    sourceAdId: text("source_ad_id").notNull(),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    heading: text("heading").notNull(),
    priceAmount: integer("price_amount"),
    priceCurrency: text("price_currency"),
    location: text("location"),
    lat: real("lat"),
    lon: real("lon"),
    organisationName: text("organisation_name"),
    isRetailer: integer("is_retailer", { mode: "boolean" })
      .notNull()
      .default(false),
    tradeType: text("trade_type"),
    canonicalUrl: text("canonical_url").notNull(),
    primaryImageUrl: text("primary_image_url"),
    imageUrlsJson: text("image_urls_json"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    isAuction: integer("is_auction", { mode: "boolean" })
      .notNull()
      .default(false),
    totalBids: integer("total_bids"),
    auctionEndAt: integer("auction_end_at", { mode: "timestamp_ms" }),
    buyNowPrice: integer("buy_now_price"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    removedAt: integer("removed_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    sourceUnique: uniqueIndex("ads_source_unique").on(t.source, t.sourceAdId),
    modelIdx: index("ads_model_idx").on(t.modelId),
    priceIdx: index("ads_price_idx").on(t.priceAmount),
    firstSeenIdx: index("ads_first_seen_idx").on(t.firstSeenAt),
    sourceIdx: index("ads_source_idx").on(t.source),
  }),
);

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adId: integer("ad_id")
      .notNull()
      .references(() => ads.id, { onDelete: "cascade" }),
    priceAmount: integer("price_amount").notNull(),
    observedAt: integer("observed_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ adIdx: index("price_history_ad_idx").on(t.adId) }),
);

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  modelsProcessed: integer("models_processed").notNull().default(0),
  adsUpserted: integer("ads_upserted").notNull().default(0),
  adsNew: integer("ads_new").notNull().default(0),
  priceChanges: integer("price_changes").notNull().default(0),
  error: text("error"),
});

export type Manufacturer = typeof manufacturers.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Ad = typeof ads.$inferSelect;

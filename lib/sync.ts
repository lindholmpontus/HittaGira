import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { blocketAdapter } from "@/lib/blocket";
import { traderaAdapter } from "@/lib/tradera";
import { musikborsenAdapter } from "@/lib/musikborsen";
import { guitargeeksAdapter } from "@/lib/guitargeeks";
import { dlxmusicAdapter } from "@/lib/dlxmusic";
import {
  SOURCE_IDS,
  type Adapter,
  type NormalizedAd,
  type SourceId,
} from "@/lib/sources";

const ADAPTERS: Adapter[] = [
  blocketAdapter,
  traderaAdapter,
  musikborsenAdapter,
  guitargeeksAdapter,
  dlxmusicAdapter,
];

type SyncStats = {
  modelsProcessed: number;
  adsUpserted: number;
  adsNew: number;
  priceChanges: number;
  sourceBreakdown: Record<SourceId, { new: number; updated: number }>;
};

function emptyStats(): SyncStats {
  const sourceBreakdown = {} as Record<
    SourceId,
    { new: number; updated: number }
  >;
  for (const id of SOURCE_IDS) {
    sourceBreakdown[id] = { new: 0, updated: 0 };
  }
  return {
    modelsProcessed: 0,
    adsUpserted: 0,
    adsNew: 0,
    priceChanges: 0,
    sourceBreakdown,
  };
}

async function syncModelForSource(
  modelId: number,
  query: string,
  adapter: Adapter,
  stats: SyncStats,
): Promise<void> {
  const seenSourceIds: string[] = [];

  for await (const ads of adapter.search(query)) {
    for (const ad of ads) {
      seenSourceIds.push(ad.sourceAdId);
      await upsertAd(modelId, adapter.id, ad, stats);
    }
  }

  // mark previously-seen ads for this (model, source) that weren't in this run as removed
  if (seenSourceIds.length > 0) {
    await db.run(sql`
      UPDATE ads
      SET removed_at = (unixepoch() * 1000)
      WHERE model_id = ${modelId}
        AND source = ${adapter.id}
        AND removed_at IS NULL
        AND source_ad_id NOT IN (${sql.join(
          seenSourceIds.map((id) => sql`${id}`),
          sql`, `,
        )})
    `);
  }
}

async function upsertAd(
  modelId: number,
  source: SourceId,
  ad: NormalizedAd,
  stats: SyncStats,
): Promise<void> {
  const existing = await db
    .select({
      id: schema.ads.id,
      priceAmount: schema.ads.priceAmount,
    })
    .from(schema.ads)
    .where(
      and(
        eq(schema.ads.source, source),
        eq(schema.ads.sourceAdId, ad.sourceAdId),
      ),
    )
    .get();

  const now = new Date();

  if (!existing) {
    const inserted = await db
      .insert(schema.ads)
      .values({
        source,
        sourceAdId: ad.sourceAdId,
        modelId,
        heading: ad.heading,
        priceAmount: ad.priceAmount,
        priceCurrency: ad.priceCurrency,
        location: ad.location,
        lat: ad.lat,
        lon: ad.lon,
        organisationName: ad.organisationName,
        isRetailer: ad.isRetailer,
        tradeType: ad.tradeType,
        canonicalUrl: ad.canonicalUrl,
        primaryImageUrl: ad.primaryImageUrl,
        imageUrlsJson:
          ad.imageUrls.length > 0 ? JSON.stringify(ad.imageUrls) : null,
        publishedAt: ad.publishedAt,
        isAuction: ad.isAuction,
        totalBids: ad.totalBids,
        auctionEndAt: ad.auctionEndAt,
        buyNowPrice: ad.buyNowPrice,
        firstSeenAt: now,
        lastSeenAt: now,
        removedAt: null,
      })
      .returning({ id: schema.ads.id })
      .get();
    stats.adsNew += 1;
    stats.adsUpserted += 1;
    stats.sourceBreakdown[source].new += 1;
    if (ad.priceAmount != null && inserted) {
      await db
        .insert(schema.priceHistory)
        .values({ adId: inserted.id, priceAmount: ad.priceAmount, observedAt: now })
        .run();
    }
  } else {
    await db
      .update(schema.ads)
      .set({
        modelId,
        heading: ad.heading,
        priceAmount: ad.priceAmount,
        priceCurrency: ad.priceCurrency,
        location: ad.location,
        organisationName: ad.organisationName,
        isRetailer: ad.isRetailer,
        primaryImageUrl: ad.primaryImageUrl,
        imageUrlsJson:
          ad.imageUrls.length > 0 ? JSON.stringify(ad.imageUrls) : null,
        isAuction: ad.isAuction,
        totalBids: ad.totalBids,
        auctionEndAt: ad.auctionEndAt,
        buyNowPrice: ad.buyNowPrice,
        lastSeenAt: now,
        removedAt: null,
      })
      .where(eq(schema.ads.id, existing.id))
      .run();
    stats.adsUpserted += 1;
    stats.sourceBreakdown[source].updated += 1;
    if (ad.priceAmount != null && ad.priceAmount !== existing.priceAmount) {
      await db
        .insert(schema.priceHistory)
        .values({
          adId: existing.id,
          priceAmount: ad.priceAmount,
          observedAt: now,
        })
        .run();
      stats.priceChanges += 1;
    }
  }
}

export async function runSync(modelIds?: number[]): Promise<SyncStats> {
  const stats = emptyStats();

  const run = await db
    .insert(schema.syncRuns)
    .values({})
    .returning({ id: schema.syncRuns.id })
    .get();

  try {
    const allModels = await db
      .select({
        id: schema.models.id,
        searchQuery: schema.models.searchQuery,
      })
      .from(schema.models)
      .all();

    const targets = modelIds
      ? allModels.filter((m) => modelIds.includes(m.id))
      : allModels;

    for (const m of targets) {
      for (const adapter of ADAPTERS) {
        try {
          await syncModelForSource(m.id, m.searchQuery, adapter, stats);
        } catch (err) {
          console.error(
            `[sync] ${adapter.id} model ${m.id} (${m.searchQuery}) failed:`,
            err,
          );
        }
        // polite pause between source calls
        await new Promise((r) => setTimeout(r, 250));
      }
      stats.modelsProcessed += 1;
    }

    await db
      .update(schema.syncRuns)
      .set({
        finishedAt: new Date(),
        modelsProcessed: stats.modelsProcessed,
        adsUpserted: stats.adsUpserted,
        adsNew: stats.adsNew,
        priceChanges: stats.priceChanges,
      })
      .where(eq(schema.syncRuns.id, run!.id))
      .run();

    return stats;
  } catch (err) {
    await db
      .update(schema.syncRuns)
      .set({
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
        modelsProcessed: stats.modelsProcessed,
        adsUpserted: stats.adsUpserted,
        adsNew: stats.adsNew,
        priceChanges: stats.priceChanges,
      })
      .where(eq(schema.syncRuns.id, run!.id))
      .run();
    throw err;
  }
}

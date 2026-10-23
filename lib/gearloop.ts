import { z } from "zod";
import { getPlace } from "./places";
import type { Adapter, NormalizedAd } from "./sources";

// Gearloop (gearloop.se) — Swedish marketplace for music gear. Official
// read-only REST API, key issued by Gearloop (Bearer `gearloop_…`).
// Spec: https://api.gearloop.se/v1/openapi.json
const BASE = "https://gearloop.se/api/v1";

// Gearloop's categories are flat: 4 = Elgitarrer, 1 = Akustiska gitarrer.
// Semi-acoustics and 12-strings are listed under one of these two.
const CATEGORIES = [4, 1];
const PER_PAGE = 100;
const MAX_PAGES = 30;

// The key allows 60 requests/minute, but the sync loop calls `search()` once
// per model (60+). So, like DLX and Halkans, we fetch both guitar categories
// once and filter the cached catalogue per model query.
const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { at: number; items: Listing[] } | null = null;

// Gearloop asked for this on every link back to them.
const UTM_SOURCE = "hittagira";

const NEGATIVE_KEYWORDS = [
  "gigbag",
  "fodral",
  "väska",
  "vaska",
  "pickguard",
  "kapodaster",
  "kapo",
  "strängar",
  "pickup",
  "humbucker",
  "förstärkare",
  " amp ",
  "pedal",
  "tuner",
  "stativ",
  "stand",
  "kabel",
  "noter",
  "köpes",
  "sökes",
];

const Image = z.object({ url: z.string() });

const Listing = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  listing_type: z.string(),
  intent: z.string(),
  price: z
    .object({
      amount: z.number(),
      currency: z.string(),
      unit: z.string().nullish(),
    })
    .nullish(),
  location: z
    .object({
      community: z.object({ name: z.string().nullish() }),
      county: z.object({ name: z.string() }).nullish(),
    })
    .nullish(),
  published_at: z.string().nullish(),
  image: z.object({ thumb: Image.nullish() }).nullish(),
  account: z.object({
    name: z.string(),
    type: z.string(),
  }),
});
type Listing = z.infer<typeof Listing>;

const ListingsPage = z.object({
  data: z.array(Listing.passthrough()),
  pagination: z.object({ has_more: z.boolean() }),
});

async function fetchPage(
  apiKey: string,
  category: number,
  page: number,
): Promise<z.infer<typeof ListingsPage>> {
  const params = new URLSearchParams({
    category: String(category),
    intent: "sell",
    sort: "-published_at",
    per_page: String(PER_PAGE),
    page: String(page),
  });
  const url = `${BASE}/listings?${params.toString()}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; HittaGira/0.1; +https://hittagira.se)",
      },
      cache: "no-store",
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 60, 60);
      console.warn(`[gearloop] rate limited, retrying in ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Gearloop ${res.status} for ${url}: ${await res.text()}`);
    }
    return ListingsPage.parse(await res.json());
  }
}

async function getAllListings(apiKey: string): Promise<Listing[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.items;

  const all: Listing[] = [];
  for (const category of CATEGORIES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      let result;
      try {
        result = await fetchPage(apiKey, category, page);
      } catch (err) {
        console.error(`[gearloop] category ${category} page ${page} failed:`, err);
        break;
      }
      all.push(...result.data);
      if (!result.pagination.has_more) break;
      // Polite pause
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  cache = { at: now, items: all };
  return all;
}

function passesRelevance(heading: string, query: string): boolean {
  const h = heading.toLowerCase();
  if (NEGATIVE_KEYWORDS.some((k) => h.includes(k))) return false;
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => w.length >= 2);
  // Sellers write model numbers loosely ("HD 28", "D28"), so a hyphen inside a
  // query word matches a hyphen, a space or nothing. A trailing hyphen
  // ("LTD M-") stays literal. Words are only letters, digits and hyphens
  // here, so they're safe to use as a pattern.
  return words.every((w) =>
    new RegExp(
      w.replace(/(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, "[-\\s]?"),
    ).test(h),
  );
}

function withUtm(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", UTM_SOURCE);
  return u.toString();
}

function toNormalizedAd(l: Listing): NormalizedAd {
  const image = l.image?.thumb?.url ?? null;
  const community = l.location?.community.name ?? null;
  // Gearloop gives the municipality, not coordinates. When it's one of our
  // curated cities, use its centre so the "within X km" filter catches it.
  const place = getPlace(community);
  const isBusiness = l.account.type === "business";
  return {
    sourceAdId: String(l.id),
    heading: l.title.trim(),
    priceAmount: l.price?.amount ?? null,
    priceCurrency: l.price?.currency ?? "SEK",
    location: community ?? l.location?.county?.name ?? null,
    lat: place?.lat ?? null,
    lon: place?.lon ?? null,
    organisationName: isBusiness ? l.account.name : null,
    isRetailer: isBusiness,
    tradeType: null,
    canonicalUrl: withUtm(l.url),
    primaryImageUrl: image,
    imageUrls: image ? [image] : [],
    publishedAt: l.published_at ? new Date(l.published_at) : null,
    isAuction: false,
    totalBids: null,
    auctionEndAt: null,
    buyNowPrice: null,
  };
}

let warnedNoKey = false;

export const gearloopAdapter: Adapter = {
  id: "gearloop",
  label: "Gearloop",
  async *search(query: string) {
    const apiKey = process.env.GEARLOOP_API_KEY;
    if (!apiKey) {
      if (!warnedNoKey) {
        console.warn("[gearloop] GEARLOOP_API_KEY not set — skipping Gearloop");
        warnedNoKey = true;
      }
      return;
    }
    let listings: Listing[];
    try {
      listings = await getAllListings(apiKey);
    } catch (err) {
      console.error(`[gearloop] catalog fetch failed:`, err);
      return;
    }
    const matches = listings
      .filter(
        (l) =>
          l.listing_type === "gear" &&
          // Rentals carry a per-hour/day price unit — only one-off sales here.
          !l.price?.unit &&
          passesRelevance(l.title, query),
      )
      .map(toNormalizedAd);
    yield matches;
  },
};

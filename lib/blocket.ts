import { z } from "zod";
import type { Adapter, NormalizedAd } from "./sources";

const BASE = process.env.BLOCKET_API_BASE ?? "https://blocket-api.se";

// Blocket category for "Leisure, hobby & entertainment" — covers musical instruments.
// Filtering here eliminates Aston Martin cars, La Martina clothing, Chris Martin furniture, etc.
const HOBBY_CATEGORY = "FRITID_HOBBY_OCH_UNDERHALLNING";

// Heading must NOT contain these — they indicate the item is NOT a guitar.
const NEGATIVE_KEYWORDS = [
  "saxofon",
  "saxophone",
  "trumpet",
  "trombon",
  "kornett",
  "klarinett",
  "flöjt",
  "fiol",
  "violin",
  "cello",
  "piano",
  "keyboard",
  "synth",
  "trumma",
  "trummset",
  "cymbal",
  "gigbag",
  "fodral",
  "väska",
  "vaska",
  "pickguard",
  "plektrumskydd",
  "plekt",
  "kapodaster",
  "kapo",
  "strängar",
  "strings",
  "pickup",
  "förstärkare",
  "amp ",
  "pedal",
  "switch",
  "octa-switch",
  "tuner",
  "stativ",
  "stand",
  "kabel",
  "noter",
  "skola",
  "bok ",
  "böcker",
  "aston martin",
  "la martina",
  "carl martin",
];

function passesRelevance(heading: string, query: string): boolean {
  const h = heading.toLowerCase();
  if (NEGATIVE_KEYWORDS.some((k) => h.includes(k))) return false;
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => w.length >= 2);
  return words.every((w) => h.includes(w));
}

const BlocketDoc = z.object({
  ad_id: z.number(),
  heading: z.string(),
  location: z.string().nullish(),
  canonical_url: z.string().url(),
  timestamp: z.number().nullish(),
  price: z
    .object({
      amount: z.number().nullish(),
      currency_code: z.string().nullish(),
    })
    .nullish(),
  coordinates: z
    .object({
      lat: z.number().nullish(),
      lon: z.number().nullish(),
    })
    .nullish(),
  organisation_name: z.string().nullish(),
  flags: z.array(z.string()).nullish(),
  trade_type: z.string().nullish(),
  image: z.object({ url: z.string().nullish() }).nullish(),
  image_urls: z.array(z.string()).nullish(),
});

const SearchResponse = z.object({
  docs: z.array(BlocketDoc.passthrough()),
  metadata: z
    .object({
      paging: z
        .object({
          current: z.number().nullish(),
          last: z.number().nullish(),
        })
        .nullish(),
      result_size: z
        .object({ match_count: z.number().nullish() })
        .nullish(),
    })
    .partial(),
});

async function fetchPage(query: string, page: number) {
  const params = new URLSearchParams({
    query,
    sort_order: "PUBLISHED_DESC",
    category: HOBBY_CATEGORY,
  });
  if (page > 1) params.set("page", String(page));
  const res = await fetch(`${BASE}/v1/search?${params.toString()}`, {
    headers: { "user-agent": "HittaGira/0.1 (+personal)" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Blocket API ${res.status}: ${body.slice(0, 200)}`);
  }
  return SearchResponse.parse(await res.json());
}

function normalize(doc: z.infer<typeof BlocketDoc>): NormalizedAd {
  const images = doc.image_urls ?? (doc.image?.url ? [doc.image.url] : []);
  return {
    sourceAdId: String(doc.ad_id),
    heading: doc.heading,
    priceAmount: doc.price?.amount ?? null,
    priceCurrency: doc.price?.currency_code ?? null,
    location: doc.location ?? null,
    lat: doc.coordinates?.lat ?? null,
    lon: doc.coordinates?.lon ?? null,
    organisationName: doc.organisation_name ?? null,
    isRetailer: (doc.flags ?? []).includes("retailer"),
    tradeType: doc.trade_type ?? null,
    canonicalUrl: doc.canonical_url,
    primaryImageUrl: images[0] ?? null,
    imageUrls: images,
    publishedAt: doc.timestamp ? new Date(doc.timestamp) : null,
    isAuction: false,
    totalBids: null,
    auctionEndAt: null,
    buyNowPrice: null,
  };
}

export const blocketAdapter: Adapter = {
  id: "blocket",
  label: "Blocket",
  async *search(query: string, maxPages = 5) {
    let page = 1;
    while (page <= maxPages) {
      const result = await fetchPage(query, page);
      const relevant = result.docs.filter((d) =>
        passesRelevance(d.heading, query),
      );
      yield relevant.map(normalize);
      const last = result.metadata.paging?.last ?? 1;
      if (page >= last) break;
      page += 1;
    }
  },
};

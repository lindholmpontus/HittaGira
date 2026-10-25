import { z } from "zod";
import { matchesQuery } from "./relevance";
import type { Adapter, NormalizedAd } from "./sources";

const BASE = "https://www.tradera.com";

// Tradera category tree:
//   21 Musik > 2104 Musikinstrument > 210405 Gitarr & bas
// Filtering to 210405 excludes accessories, picks, magazines, video games etc.
const GUITAR_CATEGORY = "210405";

// Headings containing any of these (case-insensitive) are accessories, not guitars.
const NEGATIVE_KEYWORDS = [
  "gigbag",
  "fodral",
  "väska",
  "vaska",
  "strap",
  " rem ",
  "pickguard",
  "plektrumskydd",
  "plekt",
  "mikrofon",
  "stämapparat",
  "tuner",
  "kapodaster",
  "kapo",
  "stränguppsättning",
  "strängar",
  "strings ",
  "knappar",
  "pickup",
  "humbucker",
  "single coil",
  "förstärkare",
  "amp ",
  "kabel",
  "stativ",
  "stand",
  "verktyg",
  "bok ",
  "böcker",
  "skola",
  "noter",
  // spare parts & decals — Tradera is full of these; titles still name the model
  "vattendekal",
  "dekal",
  "decal",
  "sticker",
  "klistermärke",
  "fjäder",
  "fjädrar",
  "svajfjäder",
  "stallfjäder",
  "switch tip",
  "switchknapp",
  "rattar",
  "knappar",
  "knobs",
  "repro",
  "replacement",
  " diy ",
];

function passesRelevance(heading: string, query: string): boolean {
  const h = heading.toLowerCase();
  // Reject if any accessory keyword appears
  if (NEGATIVE_KEYWORDS.some((k) => h.includes(k))) return false;
  return matchesQuery(h, query);
}

const TraderaItem = z.object({
  itemId: z.number(),
  price: z.number().nullish(),
  buyNowPrice: z.number().nullish(),
  shortDescription: z.string(),
  imageUrlTemplate: z.string().nullish(),
  imageSecondaryUrlTemplate: z.string().nullish(),
  itemUrl: z.string(),
  itemType: z.string().nullish(),
  totalBids: z.number().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isActive: z.boolean().nullish(),
  sellerAlias: z.string().nullish(),
  sellerCountryCodeIso2: z.string().nullish(),
  sellerIsCompany: z.boolean().nullish(),
});

function expandImageUrl(template: string | null | undefined): string | null {
  if (!template) return null;
  return template.replace("{format}", "medium");
}

// Tradera's search page moved to the Next.js App Router (June 2026), which
// dropped `__NEXT_DATA__`. The results now ride in the RSC flight payload —
// `self.__next_f.push([1,"…"])` string chunks — as a Redux action:
//   {"type":"discover/receiveSearchResults","payload":{"result":{items,…}}}
const RESULTS_MARKER = '"type":"discover/receiveSearchResults","payload":';

/** Returns the JSON value (object/array) that starts at `start` in `s`. */
function sliceJsonValue(s: string, start: number): string {
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error("Tradera: unterminated search payload");
}

function extractSearchPayload(html: string): unknown {
  const flight = [
    ...html.matchAll(
      /self\.__next_f\.push\(\[1,("[^"\\]*(?:\\.[^"\\]*)*")\]\)/g,
    ),
  ]
    .map((m) => JSON.parse(m[1]) as string)
    .join("");
  const at = flight.indexOf(RESULTS_MARKER);
  if (at === -1) throw new Error("Tradera: search results not found in HTML");
  return JSON.parse(sliceJsonValue(flight, at + RESULTS_MARKER.length));
}

const SearchPayload = z.object({
  result: z.object({
    items: z.array(TraderaItem.passthrough()),
    pagination: z
      .object({
        pageIndex: z.number().nullish(),
        pageCount: z.number().nullish(),
      })
      .nullish(),
  }),
});

async function fetchPage(query: string, page: number) {
  const params = new URLSearchParams({
    q: query,
    categoryId: GUITAR_CATEGORY,
  });
  if (page > 1) params.set("paging", String(page));
  const url = `${BASE}/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; HittaGira/0.1; +personal-project)",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "sv-SE,sv;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Tradera ${res.status} for ${url}`);
  }
  const html = await res.text();
  return SearchPayload.parse(extractSearchPayload(html)).result;
}

function normalize(item: z.infer<typeof TraderaItem>): NormalizedAd {
  const primary = expandImageUrl(item.imageUrlTemplate);
  const secondary = expandImageUrl(item.imageSecondaryUrlTemplate);
  const images = [primary, secondary].filter((u): u is string => !!u);
  const isAuction = item.itemType === "Auction";
  const buyNowPrice =
    item.buyNowPrice && item.buyNowPrice > 0 ? item.buyNowPrice : null;
  // For auctions we keep priceAmount = current bid (may be 0); UI handles display.
  // For fixed-price items, priceAmount = the listed price.
  const displayPrice = isAuction
    ? item.price ?? null
    : item.price && item.price > 0
      ? item.price
      : buyNowPrice;
  const url = item.itemUrl.startsWith("http")
    ? item.itemUrl
    : `${BASE}${item.itemUrl}`;
  return {
    sourceAdId: String(item.itemId),
    heading: item.shortDescription,
    priceAmount: displayPrice,
    priceCurrency: "SEK",
    location: null,
    lat: null,
    lon: null,
    organisationName: item.sellerAlias ?? null,
    isRetailer: item.sellerIsCompany === true,
    tradeType: item.itemType ?? null,
    canonicalUrl: url,
    primaryImageUrl: primary,
    imageUrls: images,
    publishedAt: item.startDate ? new Date(item.startDate) : null,
    isAuction,
    totalBids: item.totalBids ?? null,
    auctionEndAt: item.endDate ? new Date(item.endDate) : null,
    buyNowPrice,
  };
}

export const traderaAdapter: Adapter = {
  id: "tradera",
  label: "Tradera",
  async *search(query: string, maxPages = 5) {
    let page = 1;
    while (page <= maxPages) {
      let result;
      try {
        result = await fetchPage(query, page);
      } catch (err) {
        console.error(`[tradera] page ${page} for "${query}" failed:`, err);
        return;
      }
      const relevant = result.items.filter((it) =>
        passesRelevance(it.shortDescription, query),
      );
      yield relevant.map(normalize);
      const last = result.pagination?.pageCount ?? 1;
      if (page >= last) break;
      page += 1;
    }
  },
};

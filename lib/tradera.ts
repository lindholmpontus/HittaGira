import { z } from "zod";
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
  // Require every query word (>=2 chars) appears in heading
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((w) => w.length >= 2);
  return words.every((w) => h.includes(w));
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

function extractNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("Tradera: __NEXT_DATA__ not found in HTML");
  return JSON.parse(match[1]);
}

const NextData = z.object({
  props: z.object({
    pageProps: z.object({
      initialState: z.object({
        discover: z.object({
          items: z.array(TraderaItem.passthrough()),
          pagination: z
            .object({
              pageIndex: z.number().nullish(),
              pageCount: z.number().nullish(),
            })
            .nullish(),
        }),
      }),
    }),
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
  const data = NextData.parse(extractNextData(html));
  return data.props.pageProps.initialState.discover;
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
      let discover;
      try {
        discover = await fetchPage(query, page);
      } catch (err) {
        console.error(`[tradera] page ${page} for "${query}" failed:`, err);
        return;
      }
      const relevant = discover.items.filter((it) =>
        passesRelevance(it.shortDescription, query),
      );
      yield relevant.map(normalize);
      const last = discover.pagination?.pageCount ?? 1;
      if (page >= last) break;
      page += 1;
    }
  },
};

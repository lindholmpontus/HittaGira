import type { Adapter, NormalizedAd } from "./sources";

const BASE = "https://www.dlxmusic.se";
const CATEGORY_PATH = "/dlx/used-b-stock/gitarr-bas-begagnat-b-stock-demo";
const MAX_PAGES = 8;

// Stale-while-revalidate cache, per Node.js process. The sync loop calls
// `search()` once per model — without this we'd re-fetch 5 pages × 64 models.
const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { at: number; items: ParsedProduct[] } | null = null;

const NEGATIVE_KEYWORDS = [
  "saxofon",
  "trumpet",
  "trombon",
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
];

type ParsedProduct = {
  articleNumber: string;
  name: string;
  description: string;
  url: string;
  priceAmount: number | null;
  primaryImageUrl: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x?([0-9a-fA-F]+);/g, (m, code) =>
      String.fromCharCode(parseInt(code, m.toLowerCase().includes("x") ? 16 : 10)),
    )
    .replace(/&nbsp;/g, " ");
}

/** Pull the first capturing group, or null. */
function pick(re: RegExp, block: string): string | null {
  const m = block.match(re);
  return m ? m[1] : null;
}

/** Parse a single <li class="product-list__item"> block. */
function parseBlock(block: string): ParsedProduct | null {
  const articleNumber =
    pick(/data-article-number="(\d+)"/, block) ??
    pick(/data-item-id="(\d+)"/, block);
  if (!articleNumber) return null;

  const href =
    pick(/<a[^>]+href="([^"]+)"[^>]*itemprop="url"/, block) ??
    pick(/data-href="([^"]+)"/, block);
  if (!href) return null;

  const name = pick(
    /<h3[^>]*class="[^"]*product__name[^"]*"[^>]*>([^<]+)<\/h3>/,
    block,
  );
  if (!name) return null;

  const desc = pick(
    /<p[^>]*class="[^"]*product__description[^"]*"[^>]*>([^<]+)<\/p>/,
    block,
  );

  // <div itemprop="price" content="19999.00" class=price>
  const priceRaw = pick(/itemprop="price"\s+content="([0-9.]+)"/, block);
  const priceAmount = priceRaw ? Math.round(Number(priceRaw)) : null;
  if (priceAmount == null || !Number.isFinite(priceAmount) || priceAmount < 1) {
    return null;
  }

  // First product image (skip the bstock-tag .png in the product__tag div).
  const imgs = Array.from(
    block.matchAll(/src="(\/storage\/[^"]+?\.(?:jpe?g|png|webp))"/gi),
  ).map((m) => m[1]);
  const productImg = imgs.find((u) => !/bstock|sv_dlx_music/i.test(u));
  const primaryImageUrl = productImg ? `${BASE}${productImg}` : null;

  return {
    articleNumber,
    name: decodeEntities(name).trim(),
    description: desc ? decodeEntities(desc).trim() : "",
    url: href.startsWith("http") ? href : `${BASE}${href}`,
    priceAmount,
    primaryImageUrl,
  };
}

async function fetchPage(page: number): Promise<ParsedProduct[]> {
  const url = `${BASE}${CATEGORY_PATH}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "HittaGira/0.1 (+personal)",
      accept: "text/html",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`DLX ${res.status} for page ${page}`);
  }
  const html = await res.text();
  // Split by product-list__item li tags
  const blocks = html.split(/<li[^>]*class="[^"]*product-list__item/);
  // first element is preamble, skip it
  const items: ParsedProduct[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const parsed = parseBlock(blocks[i]);
    if (parsed) items.push(parsed);
  }
  return items;
}

async function getAllProducts(): Promise<ParsedProduct[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.items;

  const all: ParsedProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let items: ParsedProduct[];
    try {
      items = await fetchPage(page);
    } catch (err) {
      console.error(`[dlxmusic] page ${page} failed:`, err);
      break;
    }
    if (items.length === 0) break;
    all.push(...items);
    // Polite pause
    await new Promise((r) => setTimeout(r, 250));
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
  return words.every((w) => h.includes(w));
}

function toNormalizedAd(p: ParsedProduct): NormalizedAd {
  return {
    sourceAdId: p.articleNumber,
    heading: p.name,
    priceAmount: p.priceAmount,
    priceCurrency: "SEK",
    location: null,
    lat: null,
    lon: null,
    organisationName: "DLX Music",
    isRetailer: true,
    tradeType: null,
    canonicalUrl: p.url,
    primaryImageUrl: p.primaryImageUrl,
    imageUrls: p.primaryImageUrl ? [p.primaryImageUrl] : [],
    publishedAt: null,
    isAuction: false,
    totalBids: null,
    auctionEndAt: null,
    buyNowPrice: null,
  };
}

export const dlxmusicAdapter: Adapter = {
  id: "dlxmusic",
  label: "DLX Music",
  async *search(query: string) {
    let products: ParsedProduct[];
    try {
      products = await getAllProducts();
    } catch (err) {
      console.error(`[dlxmusic] catalog fetch failed:`, err);
      return;
    }
    const matches = products
      .filter((p) => passesRelevance(p.name, query))
      .map(toNormalizedAd);
    yield matches;
  },
};

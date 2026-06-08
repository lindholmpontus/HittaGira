import type { Adapter, NormalizedAd } from "./sources";

// Halkans Rockhouse (Stockholm) lists its whole used stock on two long
// WordPress pages — one per guitar type. We fetch both once and filter the
// combined catalogue per model query, the same approach the DLX Music adapter
// uses. There are no per-product pages, so cards link back to the category.
const CATEGORIES = [
  "https://www.halkans.com/products/instruments/electricguitars/",
  "https://www.halkans.com/products/instruments/acoustic_steel/",
];

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { at: number; items: HalkansProduct[] } | null = null;

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
];

type HalkansProduct = {
  id: string;
  name: string;
  /** null when the listing is priced "CALL" (price on request). */
  priceAmount: number | null;
  isCall: boolean;
  primaryImageUrl: string | null;
  imageUrls: string[];
  categoryUrl: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#x?([0-9a-fA-F]+);/g, (whole, code: string) =>
      String.fromCharCode(parseInt(code, /x/i.test(whole) ? 16 : 10)),
    )
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Parse the price-heading text. Halkans uses several conventions:
 *   "18 500 SEK"          → 18500
 *   "46 500 // 39 500 SEK"→ 39500  (old // reduced — take the asking price)
 *   "CALL" / "Offers"     → price on request (isCall)
 *   "SOLD" / "SÅLD"       → sold (caller skips these)
 */
function parsePrice(raw: string): {
  amount: number | null;
  isCall: boolean;
  sold: boolean;
} {
  const t = decodeEntities(raw);
  if (/sold|s[åa]ld/i.test(t)) {
    return { amount: null, isCall: false, sold: true };
  }
  // Plausible price tokens — handles "18 500" and "38.500"; ignores stray digits.
  const nums = (t.match(/\d[\d\s.]*\d|\d/g) ?? [])
    .map((x) => Number(x.replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 100);
  if (nums.length === 0) {
    return { amount: null, isCall: true, sold: false };
  }
  return { amount: Math.min(...nums), isCall: false, sold: false };
}

function pickImage(block: string): string | null {
  // Prefer the 1024px-wide srcset variant — crisp but not multi-MB.
  const big = block.match(
    /https?:\/\/www\.halkans\.com\/wp-content\/uploads\/[^"\s]+?-1024x\d+\.(?:jpe?g|png|webp)/i,
  );
  if (big) return big[0].replace(/^http:/, "https:");
  // Fall back to the <img src> (usually a 300px thumb), then the full <a href>.
  const src = block.match(
    /<img[^>]+src="([^"]+\/wp-content\/uploads\/[^"]+?\.(?:jpe?g|png|webp))"/i,
  );
  if (src) return src[1].replace(/^http:/, "https:");
  const href = block.match(
    /<a[^>]+href="([^"]+\/wp-content\/uploads\/[^"]+?\.(?:jpe?g|png|webp))"/i,
  );
  return href ? href[1].replace(/^http:/, "https:") : null;
}

async function parseCategory(url: string): Promise<HalkansProduct[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "HittaGira/0.1 (+personal)", accept: "text/html" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Halkans ${res.status} for ${url}`);
  const html = await res.text();

  // Each guitar is a <div class="entry-content product-content"> block.
  const blocks = html
    .split(/<div class="entry-content product-content">/)
    .slice(1);

  const items: HalkansProduct[] = [];
  for (const block of blocks) {
    const nameMatch = block.match(/<h2>([\s\S]*?)<\/h2>/);
    if (!nameMatch) continue;
    const name = decodeEntities(nameMatch[1]);
    if (!name) continue;

    const priceMatch = block.match(/class="price-heading">([^<]*)</);
    const { amount, isCall, sold } = parsePrice(priceMatch ? priceMatch[1] : "");
    if (sold) continue; // don't list guitars that are already sold

    const image = pickImage(block);

    // wp-image-NNNN is WordPress' stable attachment id — reliably unique even
    // when two guitars share a name (e.g. "Crafton – 50's").
    const wpImage = block.match(/wp-image-(\d+)/);
    const id = wpImage ? `wp-${wpImage[1]}` : slugify(name);

    items.push({
      id,
      name,
      priceAmount: amount,
      isCall,
      primaryImageUrl: image,
      imageUrls: image ? [image] : [],
      categoryUrl: url,
    });
  }
  return items;
}

async function getAllProducts(): Promise<HalkansProduct[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.items;

  const byId = new Map<string, HalkansProduct>();
  for (const url of CATEGORIES) {
    let items: HalkansProduct[];
    try {
      items = await parseCategory(url);
    } catch (err) {
      console.error(`[halkans] ${url} failed:`, err);
      continue;
    }
    for (const it of items) if (!byId.has(it.id)) byId.set(it.id, it);
    await new Promise((r) => setTimeout(r, 250));
  }

  const all = [...byId.values()];
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

function toNormalizedAd(p: HalkansProduct): NormalizedAd {
  return {
    sourceAdId: p.id,
    heading: p.name,
    priceAmount: p.priceAmount,
    priceCurrency: "SEK",
    location: null,
    lat: null,
    lon: null,
    organisationName: "Halkans Rockhouse",
    isRetailer: true,
    // Marks "CALL" listings so the UI can show "Ring för pris" instead of a price.
    tradeType: p.isCall ? "call" : null,
    canonicalUrl: p.categoryUrl,
    primaryImageUrl: p.primaryImageUrl,
    imageUrls: p.imageUrls,
    publishedAt: null,
    isAuction: false,
    totalBids: null,
    auctionEndAt: null,
    buyNowPrice: null,
  };
}

export const halkansAdapter: Adapter = {
  id: "halkans",
  label: "Halkans",
  async *search(query: string) {
    let products: HalkansProduct[];
    try {
      products = await getAllProducts();
    } catch (err) {
      console.error(`[halkans] catalog fetch failed:`, err);
      return;
    }
    const matches = products
      .filter((p) => passesRelevance(p.name, query))
      .map(toNormalizedAd);
    yield matches;
  },
};

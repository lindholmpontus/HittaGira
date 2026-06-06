import { z } from "zod";
import type { Adapter, NormalizedAd } from "./sources";

const BASE = "https://guitargeeks.se";

// Headings containing any of these are accessories or non-guitars.
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

const ProductImage = z.object({
  src: z.string().url(),
});

const ProductPrices = z.object({
  price: z.string(), // "8500000" — in minor units (öre)
  currency_code: z.string(),
  currency_minor_unit: z.number(),
});

const Product = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  permalink: z.string().url(),
  prices: ProductPrices,
  images: z.array(ProductImage),
});

async function fetchPage(query: string, page: number) {
  const params = new URLSearchParams({
    search: query,
    per_page: "30",
    page: String(page),
  });
  const url = `${BASE}/wp-json/wc/store/v1/products?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "HittaGira/0.1 (+personal)",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return [];
  if (!res.ok) {
    throw new Error(`GuitarGeeks ${res.status} for "${query}" p${page}`);
  }
  const data: unknown = await res.json();
  return z.array(Product.passthrough()).parse(data);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function normalize(p: z.infer<typeof Product>): NormalizedAd | null {
  const heading = decodeEntities(p.name);
  // Convert minor units (öre) to SEK.
  const minor = Number(p.prices.price);
  if (!Number.isFinite(minor) || minor <= 0) return null;
  const priceAmount = Math.round(minor / Math.pow(10, p.prices.currency_minor_unit));
  const primary = p.images[0]?.src ?? null;
  return {
    sourceAdId: String(p.id),
    heading,
    priceAmount,
    priceCurrency: p.prices.currency_code,
    location: null,
    lat: null,
    lon: null,
    organisationName: "Guitar Geeks",
    isRetailer: true,
    tradeType: null,
    canonicalUrl: p.permalink,
    primaryImageUrl: primary,
    imageUrls: p.images.map((img) => img.src),
    publishedAt: null,
    isAuction: false,
    totalBids: null,
    auctionEndAt: null,
    buyNowPrice: null,
  };
}

export const guitargeeksAdapter: Adapter = {
  id: "guitargeeks",
  label: "GuitarGeeks",
  async *search(query: string, maxPages = 2) {
    let page = 1;
    while (page <= maxPages) {
      let products;
      try {
        products = await fetchPage(query, page);
      } catch (err) {
        console.error(
          `[guitargeeks] page ${page} for "${query}" failed:`,
          err,
        );
        return;
      }
      if (products.length === 0) return;

      const relevant = products
        .filter((p) => passesRelevance(decodeEntities(p.name), query))
        .map(normalize)
        .filter((n): n is NormalizedAd => n !== null);

      yield relevant;
      if (products.length < 30) return;
      page += 1;
    }
  },
};

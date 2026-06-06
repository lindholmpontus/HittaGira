import { z } from "zod";
import type { Adapter, NormalizedAd } from "./sources";

const BASE = "https://musikborsen.se";

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
  "skola",
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

const ListItem = z.object({
  id: z.number(),
  slug: z.string(),
  link: z.string().url(),
  date: z.string().nullish(),
  title: z.object({ rendered: z.string() }),
  status: z.string().nullish(),
});

async function fetchList(query: string, page: number) {
  const params = new URLSearchParams({
    search: query,
    per_page: "30",
    page: String(page),
    _fields: "id,slug,link,date,title,status",
  });
  const url = `${BASE}/wp-json/wp/v2/second_hand?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "HittaGira/0.1 (+personal)",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (res.status === 400 || res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`MusikBörsen list ${res.status} for "${query}" p${page}`);
  }
  const data: unknown = await res.json();
  return z.array(ListItem.passthrough()).parse(data);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractMainImage(html: string): string | null {
  // 1) Try og:image (some pages have it, most second-hand posts don't)
  const og = html.match(
    /<meta[^>]*?property=["']og:image["'][^>]*?content=["']([^"']+)["']/i,
  );
  if (og) return og[1];

  // 2) Fall back to the first wp-content/uploads image with a size suffix
  //    (e.g. ...-690x518.jpeg). Avoids tiny thumbnails and site logos.
  const sized = html.match(
    /https:\/\/musikborsen\.se\/wp-content\/uploads\/[^"' )]+-(\d{3,4})x\d{2,4}\.(?:jpe?g|png|webp)/i,
  );
  if (sized) return sized[0];

  // 3) Last resort: any wp-content upload image.
  const any = html.match(
    /https:\/\/musikborsen\.se\/wp-content\/uploads\/[^"' )]+\.(?:jpe?g|png|webp)/i,
  );
  return any ? any[0] : null;
}

function extractPrice(html: string): number | null {
  // Strip scripts so we don't pick up JS literals.
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Collect every "X kr" on the page. Capture an optional "/månad" suffix so
  // we can drop financing copy like "från 999 kr/månad".
  const re =
    /(\d{1,3}(?:[\s. ]\d{3})+|\d{3,7})\s*kr\b\s*(\/?\s*m[åa]n(?:ad)?\.?)?/gi;
  const candidates: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match[2]) continue; // skip "/månad" financing copy
    const n = Number(match[1].replace(/[\s. ]/g, ""));
    if (!Number.isFinite(n) || n < 500 || n > 9_999_999) continue;
    candidates.push(n);
  }
  if (candidates.length === 0) return null;
  // Product price is the largest "X kr" on the page — shipping & fees are smaller.
  return Math.max(...candidates);
}

async function fetchDetails(link: string): Promise<{
  primaryImageUrl: string | null;
  priceAmount: number | null;
}> {
  try {
    const res = await fetch(link, {
      headers: {
        "user-agent": "HittaGira/0.1 (+personal)",
        accept: "text/html",
      },
      cache: "no-store",
    });
    if (!res.ok) return { primaryImageUrl: null, priceAmount: null };
    const html = await res.text();
    return {
      primaryImageUrl: extractMainImage(html),
      priceAmount: extractPrice(html),
    };
  } catch {
    return { primaryImageUrl: null, priceAmount: null };
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const musikborsenAdapter: Adapter = {
  id: "musikborsen",
  label: "MusikBörsen",
  async *search(query: string, maxPages = 2) {
    let page = 1;
    while (page <= maxPages) {
      let items;
      try {
        items = await fetchList(query, page);
      } catch (err) {
        console.error(
          `[musikborsen] list page ${page} for "${query}" failed:`,
          err,
        );
        return;
      }
      if (items.length === 0) return;

      const relevant = items.filter((it) =>
        passesRelevance(decodeEntities(it.title.rendered), query),
      );

      const normalized: NormalizedAd[] = [];
      for (const it of relevant) {
        const heading = decodeEntities(it.title.rendered);
        const { primaryImageUrl, priceAmount } = await fetchDetails(it.link);
        // Skip listings where we couldn't pull a price — the UI relies on it.
        if (priceAmount == null) {
          continue;
        }
        normalized.push({
          sourceAdId: String(it.id),
          heading,
          priceAmount,
          priceCurrency: "SEK",
          location: null,
          lat: null,
          lon: null,
          organisationName: "Musikbörsen",
          isRetailer: true,
          tradeType: null,
          canonicalUrl: it.link,
          primaryImageUrl,
          imageUrls: primaryImageUrl ? [primaryImageUrl] : [],
          publishedAt: it.date ? new Date(it.date) : null,
          isAuction: false,
          totalBids: null,
          auctionEndAt: null,
          buyNowPrice: null,
        });
        await sleep(200);
      }

      yield normalized;
      if (items.length < 30) return;
      page += 1;
    }
  },
};

import { createHash } from "node:crypto";

// Server-side helpers for the cookieless analytics in app/api/collect.
//
// Privacy model (same idea as Plausible): we never store an IP address or set
// a cookie. Each visitor gets `hash(secret + day + ip + user-agent)`, so the
// same person maps to the same id for one Stockholm day and to an unrelated
// id the next. That is enough to count unique visitors per day and nothing
// more — which also keeps the site clear of cookie-consent banners.

const SALT = process.env.ANALYTICS_SALT ?? "";

const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Stockholm calendar date as YYYY-MM-DD. */
export function stockholmDay(at: Date = new Date()): string {
  return dayFormat.format(at);
}

/** Move a YYYY-MM-DD date by `n` calendar days (DST-safe: pure date math). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function visitorId(day: string, ip: string, userAgent: string): string {
  return createHash("sha256")
    .update(`${SALT}|${day}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 16);
}

const BOT_UA =
  /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch|go-http|java\//i;

export function isBot(userAgent: string): boolean {
  return userAgent === "" || BOT_UA.test(userAgent);
}

export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /mobi|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
}

/**
 * Reduce a referrer to something groupable. An explicit `?ref=` /
 * `utm_source` tag wins; otherwise the referring hostname, minus `www.`.
 * Internal navigation (same host) counts as no referrer.
 */
export function normalizeReferrer(
  referrer: string | undefined,
  tag: string | undefined,
  ownHost: string | null,
): string | null {
  if (tag) return tag.trim().toLowerCase().slice(0, 64) || null;
  if (!referrer) return null;
  try {
    const bare = (h: string) => h.replace(/:\d+$/, "").replace(/^www\./, "");
    const host = bare(new URL(referrer).hostname);
    if (ownHost && host === bare(ownHost)) return null;
    return host || null;
  } catch {
    return null;
  }
}

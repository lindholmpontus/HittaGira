import { z } from "zod";
import { db, schema } from "@/db/client";
import {
  deviceOf,
  isBot,
  normalizeReferrer,
  stockholmDay,
  visitorId,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Beacon sent by components/Analytics.tsx. Always answers 204 — analytics
// must never surface an error to a visitor.

const Body = z.object({
  type: z.enum(["pageview", "outbound", "support"]),
  path: z.string().startsWith("/").max(512),
  target: z.string().max(64).optional(),
  referrer: z.string().max(2048).optional(),
  ref: z.string().max(64).optional(),
});

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return noContent();

  let body: z.infer<typeof Body>;
  try {
    // Sent as text/plain via sendBeacon, so parse the raw text ourselves.
    body = Body.parse(JSON.parse(await req.text()));
  } catch {
    return noContent();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";
  const day = stockholmDay();

  try {
    await db.insert(schema.events).values({
      type: body.type,
      path: body.path,
      target: body.type === "pageview" ? null : (body.target ?? null),
      referrer: normalizeReferrer(
        body.referrer,
        body.ref,
        req.headers.get("host"),
      ),
      visitorId: visitorId(day, ip, ua),
      country: req.headers.get("x-vercel-ip-country"),
      device: deviceOf(ua),
      day,
    });
  } catch (err) {
    console.error("analytics insert failed:", err);
  }

  return noContent();
}

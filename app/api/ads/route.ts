import { NextResponse } from "next/server";
import { and, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");

  if (!idsParam) return NextResponse.json({ ads: [] });

  const ids = Array.from(
    new Set(
      idsParam
        .split(",")
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ).slice(0, 200);

  if (ids.length === 0) return NextResponse.json({ ads: [] });

  const rows = db
    .select()
    .from(schema.ads)
    .where(and(inArray(schema.ads.id, ids), isNull(schema.ads.removedAt)))
    .all();

  return NextResponse.json({ ads: rows });
}

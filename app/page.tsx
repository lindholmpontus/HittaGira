import Link from "next/link";
import { and, count, desc, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { AdCardMobile } from "@/components/AdCardMobile";
import { AnimatedGrid, AnimatedItem } from "@/components/AnimatedGrid";
import { SOURCE_IDS } from "@/lib/sources";

// Re-render at most once a minute. The DB queries below run only on the
// revalidation tick rather than on every request — drops per-request work
// from ~5 SQL round-trips to a static HTML hit.
export const revalidate = 60;

const DAY_MS = 24 * 3600 * 1000;

export default async function HomePage() {
  const manufacturers = await db
    .select()
    .from(schema.manufacturers)
    .orderBy(schema.manufacturers.sortOrder)
    .all();

  const statsResult = await db.run(sql`
    SELECT m.manufacturer_id AS manufacturer_id,
           COUNT(a.id) AS ad_count
    FROM models m
    LEFT JOIN ads a ON a.model_id = m.id AND a.removed_at IS NULL
    GROUP BY m.manufacturer_id
  `);

  const stats = statsResult.rows as unknown as Array<{
    manufacturer_id: number;
    ad_count: number;
  }>;

  const statsByMaker = new Map(stats.map((s) => [s.manufacturer_id, s]));

  const makers = manufacturers.map((m) => {
    const s = statsByMaker.get(m.id);
    return {
      ...m,
      adCount: s?.ad_count ?? 0,
    };
  });

  const totalAds = makers.reduce((acc, r) => acc + r.adCount, 0);
  const totalMakers = makers.filter((m) => m.adCount > 0).length;

  // Sort by the actual listing date (publishedAt) — falling back to firstSeenAt
  // for sources that don't publish a date. This avoids backfilled shop items
  // (e.g. a year-old Musikbörsen post we just discovered) dominating the feed.
  const newestAds = await db
    .select()
    .from(schema.ads)
    .where(isNull(schema.ads.removedAt))
    .orderBy(
      desc(sql`COALESCE(${schema.ads.publishedAt}, ${schema.ads.firstSeenAt})`),
    )
    .limit(12)
    .all();

  // Count *every* ad first seen in the last 24h — not just those in the 12-row
  // preview above (which capped the figure at "+12").
  const cutoff = new Date(Date.now() - DAY_MS);
  const [{ newToday }] = await db
    .select({ newToday: count() })
    .from(schema.ads)
    .where(and(isNull(schema.ads.removedAt), gt(schema.ads.firstSeenAt, cutoff)))
    .all();

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ============================================================ */}
      {/* STATS STRIP                                                   */}
      {/* ============================================================ */}
      <section className="pt-2 sm:pt-4">
        <div className="rule-thick" />
        <div className="grid grid-cols-2 divide-x divide-[var(--color-line)] border-y border-[var(--color-line)] sm:grid-cols-4">
          <Stat label="Aktiva annonser" value={totalAds.toLocaleString("sv-SE")} />
          <Stat label="Märken" value={String(totalMakers)} />
          <Stat
            label="Nya senaste dygnet"
            value={newToday > 0 ? `+${newToday}` : "—"}
            accent={newToday > 0}
          />
          <Stat
            label="Källor"
            value={String(SOURCE_IDS.length).padStart(2, "0")}
          />
        </div>
        <div className="rule-solid" />

        <div className="mt-3 flex justify-end font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
          <span>Uppdaterad {new Date().toLocaleDateString("sv-SE")}</span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SENAST INKOMNA                                                */}
      {/* ============================================================ */}
      <section>
        <SectionHeading
          kicker="Nytt på golvet"
          title={
            <>
              Senast{" "}
              <em
                className="text-[var(--color-ox-500)]"
                style={{ fontWeight: 500 }}
              >
                inkomna
              </em>
            </>
          }
          href="/sok"
          hrefLabel="Hela arkivet"
        />
        {newestAds.length > 0 ? (
          <AnimatedGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {newestAds.map((ad) => (
              <AnimatedItem key={ad.id}>
                <AdCardMobile ad={ad} />
              </AnimatedItem>
            ))}
          </AnimatedGrid>
        ) : (
          <div className="paper-card-flat rounded-md p-10 text-center">
            <p
              className="text-xl text-[var(--color-ink-soft)]"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
            >
              Hyllorna är tomma — för stunden.
            </p>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
              Kör en sync för att hämta in nya annonser
            </p>
          </div>
        )}
      </section>

      {/* Ornament divider */}
      <Fleuron />

      {/* ============================================================ */}
      {/* MÄRKESREGISTER                                                */}
      {/* ============================================================ */}
      <section>
        <SectionHeading
          kicker="Märkesregister"
          title={
            <>
              Bläddra efter{" "}
              <em
                className="text-[var(--color-ox-500)]"
                style={{ fontWeight: 500 }}
              >
                tillverkare
              </em>
            </>
          }
        />
        <AnimatedGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {makers.map((m, i) => (
            <AnimatedItem key={m.id}>
              <Link
                href={`/${m.slug}`}
                className="paper-card group block h-full overflow-hidden rounded-md transition hover:border-[var(--color-ox-500)] hover:shadow-[0_18px_36px_-22px_rgba(122,31,43,0.45)] active:scale-[0.985]"
              >
                <div className="relative grid aspect-[5/3] place-items-center border-b border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-5 transition-colors group-hover:bg-[var(--color-bg-soft)]">
                  <span className="absolute left-2 top-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]/80">
                    № {String(i + 1).padStart(2, "0")}
                  </span>
                  <ManufacturerLogo
                    name={m.name}
                    logoFile={m.logoFile}
                    className="size-full flex items-center justify-center"
                  />
                </div>
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="truncate text-base text-[var(--color-ink)] group-hover:text-[var(--color-ox-500)]"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                    >
                      {m.name}
                    </span>
                    {m.adCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--color-ox-500)]/10 px-2 py-0.5 specs text-[10.5px] font-semibold text-[var(--color-ox-500)]">
                        {m.adCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
                    {m.adCount === 0
                      ? "Inga aktiva"
                      : `${m.adCount} aktiv${m.adCount === 1 ? "" : "a"}`}
                  </div>
                </div>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-4 sm:px-5 sm:py-5">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
        {label}
      </div>
      <div
        className={`mt-1 specs text-2xl leading-none tracking-tight sm:text-3xl ${
          accent ? "text-[var(--color-ox-500)]" : "text-[var(--color-ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  href,
  hrefLabel,
}: {
  kicker: string;
  title: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
            {kicker}
          </span>
        </div>
        <h2
          className="mt-2 text-3xl tracking-tight text-[var(--color-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {title}
        </h2>
      </div>
      {href && hrefLabel && (
        <Link
          href={href}
          className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)] hover:text-[var(--color-ox-500)]"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

function Fleuron() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-[var(--color-line)]">
      <div className="h-px w-16 bg-[var(--color-line)]" />
      <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
        <circle cx="3" cy="7" r="1.4" fill="currentColor" />
        <path
          d="M7 7 Q11 1 15 7 Q11 13 7 7 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <circle cx="19" cy="7" r="1.4" fill="currentColor" />
      </svg>
      <div className="h-px w-16 bg-[var(--color-line)]" />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { AnimatedGrid, AnimatedItem } from "@/components/AnimatedGrid";
import { AdCardMobile } from "@/components/AdCardMobile";

export const dynamic = "force-dynamic";

type Params = Promise<{ manufacturer: string }>;

export default async function ManufacturerPage({
  params,
}: {
  params: Params;
}) {
  const { manufacturer: slug } = await params;
  const m = db
    .select()
    .from(schema.manufacturers)
    .where(eq(schema.manufacturers.slug, slug))
    .get();
  if (!m) notFound();

  const models = db
    .select({
      id: schema.models.id,
      slug: schema.models.slug,
      name: schema.models.name,
      searchQuery: schema.models.searchQuery,
      sortOrder: schema.models.sortOrder,
      adCount: sql<number>`(
        SELECT COUNT(*) FROM ${schema.ads}
        WHERE ${schema.ads.modelId} = ${schema.models.id}
          AND ${schema.ads.removedAt} IS NULL
      )`,
      newSinceYesterday: sql<number>`(
        SELECT COUNT(*) FROM ${schema.ads}
        WHERE ${schema.ads.modelId} = ${schema.models.id}
          AND ${schema.ads.removedAt} IS NULL
          AND ${schema.ads.firstSeenAt} > (unixepoch() * 1000 - 86400000)
      )`,
    })
    .from(schema.models)
    .where(eq(schema.models.manufacturerId, m.id))
    .orderBy(schema.models.sortOrder)
    .all();

  const modelIds = models.map((mo) => mo.id);
  const newest = modelIds.length
    ? db
        .select()
        .from(schema.ads)
        .where(
          and(
            isNull(schema.ads.removedAt),
            sql`${schema.ads.modelId} IN (${sql.join(
              modelIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        )
        .orderBy(
          desc(
            sql`COALESCE(${schema.ads.publishedAt}, ${schema.ads.firstSeenAt})`,
          ),
        )
        .limit(6)
        .all()
    : [];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* Breadcrumb */}
      <nav className="px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
        <Link href="/" className="hover:text-[var(--color-ox-500)]">
          Register
        </Link>
        <span className="mx-2 text-[var(--color-line)]">/</span>
        <span className="text-[var(--color-ink-soft)]">{m.name}</span>
      </nav>

      {/* Editorial header — logo as full-width watermark behind text */}
      <header className="relative isolate -mx-4 sm:-mx-6">
        {/* Logo watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.10] sm:opacity-[0.13]"
        >
          <ManufacturerLogo
            name={m.name}
            logoFile={m.logoFile}
            className="h-[260px] w-full max-w-5xl px-6 sm:h-[420px] lg:h-[520px]"
          />
        </div>

        {/* Foreground content */}
        <div className="relative mx-auto max-w-3xl space-y-7 px-4 py-14 text-center sm:py-20 lg:py-28">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
            Tillverkare
          </div>

          {m.blurb && (
            <p
              className="mx-auto max-w-[58ch] text-lg leading-relaxed text-[var(--color-ink-soft)] sm:text-xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
            >
              {m.blurb}
            </p>
          )}

          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            {models.length > 0 ? (
              <span>
                <span className="text-[var(--color-ink)] specs">
                  {models.length}
                </span>{" "}
                modeller
              </span>
            ) : (
              <span>Inga modeller</span>
            )}
          </div>
        </div>
      </header>

      <div className="rule-thick" />

      {/* Models */}
      <section>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
            Modellregister
          </span>
        </div>
        <AnimatedGrid className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {models.map((mo, i) => (
            <AnimatedItem key={mo.id}>
              <Link
                href={`/${m.slug}/${mo.slug}`}
                className="paper-card group relative block h-full overflow-hidden rounded-md transition hover:border-[var(--color-ox-500)] hover:shadow-[0_18px_36px_-22px_rgba(122,31,43,0.45)] active:scale-[0.985]"
              >
                <div className="relative grid aspect-[5/3] place-items-center overflow-hidden px-4">
                  <span
                    className="text-center text-2xl leading-[1.05] tracking-tight text-[var(--color-ox-500)] sm:text-3xl"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    {mo.name}
                  </span>

                  <span className="absolute left-2.5 top-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]/80">
                    № {String(i + 1).padStart(2, "0")}
                  </span>

                  {mo.newSinceYesterday > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-[var(--color-ox-500)] px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--color-gold-100)]">
                      +{mo.newSinceYesterday} ny
                    </span>
                  )}
                </div>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      </section>

      {newest.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-2.5">
            <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
              Nytt på golvet
            </span>
          </div>
          <AnimatedGrid className="grid grid-cols-2 gap-3 lg:grid-cols-3 sm:gap-5">
            {newest.map((ad) => (
              <AnimatedItem key={ad.id}>
                <AdCardMobile ad={ad} />
              </AnimatedItem>
            ))}
          </AnimatedGrid>
        </section>
      )}
    </div>
  );
}

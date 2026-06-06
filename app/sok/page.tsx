import Link from "next/link";
import { and, desc, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { AdCardMobile } from "@/components/AdCardMobile";
import { AnimatedGrid, AnimatedItem } from "@/components/AnimatedGrid";

export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hasQuery = query.length >= 2;

  const results = hasQuery
    ? await db
        .select()
        .from(schema.ads)
        .where(
          and(
            isNull(schema.ads.removedAt),
            sql`LOWER(${schema.ads.heading}) LIKE LOWER('%' || ${query} || '%')`,
          ),
        )
        .orderBy(desc(schema.ads.firstSeenAt))
        .limit(60)
        .all()
    : [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
          <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
          Fritext-sök
        </div>
        <h1
          className="mt-3 text-4xl tracking-tight text-[var(--color-ink)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Sök i{" "}
          <em
            className="text-[var(--color-ox-500)]"
            style={{ fontWeight: 500 }}
          >
            registret
          </em>
          .
        </h1>
      </header>

      {/* Search form */}
      <form action="/sok" className="paper-card rounded-md p-2 sm:p-2.5">
        <div className="flex items-center gap-2">
          <span className="pl-2 text-[var(--color-ink-mute)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Stratocaster, ES-335, Martin D-28…"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]/60 focus:outline-none sm:text-lg"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          />
          {query && (
            <Link
              href="/sok"
              aria-label="Rensa sökning"
              className="grid size-9 place-items-center rounded-md text-[var(--color-ink-mute)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-ink)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Link>
          )}
          <button
            type="submit"
            className="rounded-md bg-[var(--color-ox-500)] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-100)] transition hover:bg-[var(--color-ox-600)]"
          >
            Sök
          </button>
        </div>
      </form>

      {/* Body */}
      {!hasQuery ? (
        <div className="py-10">
          <p
            className="max-w-[55ch] text-lg text-[var(--color-ink-soft)] sm:text-xl"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontStyle: "italic",
            }}
          >
            Skriv vad du letar efter — en modell, ett ord ur en annonsrubrik,
            en stad. Sökningen letar igenom alla annonser från Blocket och
            Tradera.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span className="text-[var(--color-ink-mute)]">Prova:</span>
            {["Stratocaster", "Telecaster", "Les Paul", "Taylor", "Martin"].map(
              (s) => (
                <Link
                  key={s}
                  href={`/sok?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-2.5 py-1 hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
                >
                  {s}
                </Link>
              ),
            )}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="paper-card-flat rounded-md p-12 text-center">
          <p
            className="text-2xl text-[var(--color-ink-soft)]"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            Inga träffar för "{query}".
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
            Prova ett kortare ord, eller bläddra i{" "}
            <Link
              href="/"
              className="text-[var(--color-ox-500)] hover:text-[var(--color-ox-700)]"
            >
              registret
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span>
              <span className="specs text-[var(--color-ink)]">
                {results.length}
              </span>{" "}
              träff{results.length === 1 ? "" : "ar"} för{" "}
              <span className="text-[var(--color-ink)]">"{query}"</span>
            </span>
            {results.length === 60 && <span>Visar 60 senaste</span>}
          </div>
          <AnimatedGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {results.map((ad) => (
              <AnimatedItem key={ad.id}>
                <AdCardMobile ad={ad} />
              </AnimatedItem>
            ))}
          </AnimatedGrid>
        </>
      )}
    </div>
  );
}

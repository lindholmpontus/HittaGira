import Link from "next/link";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, schema } from "@/db/client";
import { AdCardMobile } from "@/components/AdCardMobile";
import { MobileFilters } from "@/components/MobileFilters";
import { SOURCES, SOURCE_IDS, type SourceId } from "@/lib/sources";

export const dynamic = "force-dynamic";

type SortKey = "newest" | "oldest" | "cheapest" | "expensive";
type TypeKey = "all" | "auction" | "fixed";
type SellerKey = "all" | "private" | "retailer";

const SORT_KEYS: SortKey[] = ["newest", "oldest", "cheapest", "expensive"];
const TYPE_KEYS: TypeKey[] = ["all", "auction", "fixed"];
const SELLER_KEYS: SellerKey[] = ["all", "private", "retailer"];

const PER_PAGE = 60;

type Search = Promise<{
  q?: string;
  sort?: string;
  src?: string;
  type?: string;
  seller?: string;
  min?: string;
  max?: string;
  page?: string;
}>;

function asEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;

  const query = (sp.q ?? "").trim();
  const hasQuery = query.length >= 2;
  const sort = asEnum(sp.sort, SORT_KEYS, "newest");
  const typeFilter = asEnum(sp.type, TYPE_KEYS, "all");
  const sellerFilter = asEnum(sp.seller, SELLER_KEYS, "all");
  const srcFilter: "all" | SourceId = SOURCE_IDS.includes(sp.src as SourceId)
    ? (sp.src as SourceId)
    : "all";
  const min =
    sp.min && !Number.isNaN(Number(sp.min)) ? Number(sp.min) : undefined;
  const max =
    sp.max && !Number.isNaN(Number(sp.max)) ? Number(sp.max) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = page * PER_PAGE;

  // --- Build the WHERE clause from the active filters -------------------
  const filters: SQL[] = [isNull(schema.ads.removedAt)];
  if (hasQuery) {
    filters.push(
      sql`LOWER(${schema.ads.heading}) LIKE LOWER('%' || ${query} || '%')`,
    );
  }
  if (srcFilter !== "all") filters.push(eq(schema.ads.source, srcFilter));
  if (typeFilter === "auction") filters.push(eq(schema.ads.isAuction, true));
  if (typeFilter === "fixed") filters.push(eq(schema.ads.isAuction, false));
  if (sellerFilter === "private")
    filters.push(eq(schema.ads.isRetailer, false));
  if (sellerFilter === "retailer")
    filters.push(eq(schema.ads.isRetailer, true));
  if (min != null) filters.push(gte(schema.ads.priceAmount, min));
  if (max != null) filters.push(lte(schema.ads.priceAmount, max));

  const where = and(...filters);

  // Chronological order falls back to firstSeenAt for sources (shops) that
  // don't publish a date — same logic the home feed uses.
  const dateExpr = sql`COALESCE(${schema.ads.publishedAt}, ${schema.ads.firstSeenAt})`;
  const orderBy =
    sort === "cheapest"
      ? [asc(schema.ads.priceAmount)]
      : sort === "expensive"
        ? [desc(schema.ads.priceAmount)]
        : sort === "oldest"
          ? [asc(dateExpr)]
          : [desc(dateExpr)];

  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.ads)
    .where(where)
    .all();

  const rows = await db
    .select()
    .from(schema.ads)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .all();

  const filtersActive =
    hasQuery ||
    srcFilter !== "all" ||
    typeFilter !== "all" ||
    sellerFilter !== "all" ||
    min != null ||
    max != null ||
    sort !== "newest";

  const hasMore = rows.length < total;

  // Preserve the current view when paging / searching / clearing.
  const activeParams = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sort !== "newest") p.set("sort", sort);
    if (srcFilter !== "all") p.set("src", srcFilter);
    if (typeFilter !== "all") p.set("type", typeFilter);
    if (sellerFilter !== "all") p.set("seller", sellerFilter);
    if (min != null) p.set("min", String(min));
    if (max != null) p.set("max", String(max));
    for (const [k, v] of Object.entries(extra)) {
      if (v === "") p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/sok?${s}` : "/sok";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
          <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
          Hela arkivet
        </div>
        <h1
          className="mt-3 text-4xl tracking-tight text-[var(--color-ink)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Bläddra i{" "}
          <em className="text-[var(--color-ox-500)]" style={{ fontWeight: 500 }}>
            registret
          </em>
          .
        </h1>
      </header>

      {/* Search — preserves the active filters via hidden fields */}
      <form action="/sok" className="paper-card rounded-md p-2 sm:p-2.5">
        {sort !== "newest" && (
          <input type="hidden" name="sort" defaultValue={sort} />
        )}
        {srcFilter !== "all" && (
          <input type="hidden" name="src" defaultValue={srcFilter} />
        )}
        {typeFilter !== "all" && (
          <input type="hidden" name="type" defaultValue={typeFilter} />
        )}
        {sellerFilter !== "all" && (
          <input type="hidden" name="seller" defaultValue={sellerFilter} />
        )}
        {min != null && (
          <input type="hidden" name="min" defaultValue={String(min)} />
        )}
        {max != null && (
          <input type="hidden" name="max" defaultValue={String(max)} />
        )}
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
            placeholder="Stratocaster, ES-335, Martin D-28…"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]/60 focus:outline-none sm:text-lg"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          />
          {query && (
            <Link
              href={activeParams({ q: "" })}
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

      {/* Desktop filter bar */}
      <form
        className="paper-card hidden flex-wrap items-end gap-3 rounded-md p-4 sm:flex"
        action="/sok"
      >
        {query && <input type="hidden" name="q" defaultValue={query} />}
        <FilterControls
          sort={sort}
          srcFilter={srcFilter}
          typeFilter={typeFilter}
          sellerFilter={sellerFilter}
          min={min}
          max={max}
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--color-ox-500)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-100)] transition hover:bg-[var(--color-ox-600)]"
        >
          Filtrera
        </button>
        {filtersActive && (
          <Link
            href="/sok"
            className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
          >
            Rensa
          </Link>
        )}
      </form>

      {/* Mobile filter trigger + sheet */}
      <div className="flex items-center justify-between sm:hidden">
        <MobileFilters
          trigger={
            <>
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
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="6" y1="12" x2="18" y2="12" />
                <line x1="9" y1="18" x2="15" y2="18" />
              </svg>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                Filter
              </span>
              {filtersActive && (
                <span className="ml-1 size-2 rounded-full bg-[var(--color-ox-500)]" />
              )}
            </>
          }
        >
          <form action="/sok" className="space-y-4">
            {query && <input type="hidden" name="q" defaultValue={query} />}
            <FilterControls
              sort={sort}
              srcFilter={srcFilter}
              typeFilter={typeFilter}
              sellerFilter={sellerFilter}
              min={min}
              max={max}
            />
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-md bg-[var(--color-ox-500)] px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-100)]"
              >
                Visa resultat
              </button>
              {filtersActive && (
                <Link
                  href="/sok"
                  className="rounded-md border border-[var(--color-line)] px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]"
                >
                  Rensa
                </Link>
              )}
            </div>
          </form>
        </MobileFilters>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
          Sort · {sortLabel(sort)}
        </span>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
        <span>
          <span className="specs text-[var(--color-ink)]">
            {total.toLocaleString("sv-SE")}
          </span>{" "}
          annons{total === 1 ? "" : "er"}
          {hasQuery && (
            <>
              {" "}
              för <span className="text-[var(--color-ink)]">&quot;{query}&quot;</span>
            </>
          )}
        </span>
        {hasMore && <span>Visar {rows.length.toLocaleString("sv-SE")}</span>}
      </div>

      {/* Results */}
      {rows.length === 0 ? (
        <div className="paper-card-flat rounded-md p-12 text-center">
          <p
            className="text-2xl text-[var(--color-ink-soft)]"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            Inga annonser matchar.
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
            Justera filtren eller{" "}
            <Link
              href="/sok"
              className="text-[var(--color-ox-500)] hover:text-[var(--color-ox-700)]"
            >
              rensa allt
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {rows.map((ad) => (
              <AdCardMobile key={ad.id} ad={ad} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              {/* scroll={false} keeps the user's position so new cards
                  simply extend the list below. */}
              <Link
                href={activeParams({ page: String(page + 1) })}
                scroll={false}
                className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)] transition hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
              >
                Visa fler · {(total - rows.length).toLocaleString("sv-SE")} kvar
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

const fieldClass =
  "w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ox-500)] focus:outline-none sm:w-auto";

function FilterControls({
  sort,
  srcFilter,
  typeFilter,
  sellerFilter,
  min,
  max,
}: {
  sort: SortKey;
  srcFilter: "all" | SourceId;
  typeFilter: TypeKey;
  sellerFilter: SellerKey;
  min?: number;
  max?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
      <FilterLabel label="Sortera">
        <select name="sort" defaultValue={sort} className={fieldClass}>
          <option value="newest">Nyast först</option>
          <option value="oldest">Äldst först</option>
          <option value="cheapest">Billigast</option>
          <option value="expensive">Dyrast</option>
        </select>
      </FilterLabel>
      <FilterLabel label="Källa">
        <select name="src" defaultValue={srcFilter} className={fieldClass}>
          <option value="all">Alla källor</option>
          {SOURCE_IDS.map((id) => (
            <option key={id} value={id}>
              {SOURCES[id].label}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Typ">
        <select name="type" defaultValue={typeFilter} className={fieldClass}>
          <option value="all">Alla annonser</option>
          <option value="auction">Endast auktioner</option>
          <option value="fixed">Endast fasta priser</option>
        </select>
      </FilterLabel>
      <FilterLabel label="Säljare">
        <select name="seller" defaultValue={sellerFilter} className={fieldClass}>
          <option value="all">Alla säljare</option>
          <option value="private">Privat</option>
          <option value="retailer">Återförsäljare</option>
        </select>
      </FilterLabel>
      <FilterLabel label="Min pris (kr)">
        <input
          type="number"
          name="min"
          defaultValue={min ?? ""}
          placeholder="0"
          className={`${fieldClass} specs sm:w-28`}
        />
      </FilterLabel>
      <FilterLabel label="Max pris (kr)">
        <input
          type="number"
          name="max"
          defaultValue={max ?? ""}
          placeholder="∞"
          className={`${fieldClass} specs sm:w-28`}
        />
      </FilterLabel>
    </div>
  );
}

function FilterLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
        {label}
      </div>
      {children}
    </label>
  );
}

function sortLabel(s: SortKey): string {
  switch (s) {
    case "cheapest":
      return "Billigast";
    case "expensive":
      return "Dyrast";
    case "oldest":
      return "Äldst";
    case "newest":
    default:
      return "Nyast";
  }
}

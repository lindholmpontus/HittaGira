import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, isNull, lte, type SQL } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { AnimatedGrid, AnimatedItem } from "@/components/AnimatedGrid";
import { MobileFilters } from "@/components/MobileFilters";
import { AdCardMobile } from "@/components/AdCardMobile";
import { SOURCES, SOURCE_IDS, type SourceId } from "@/lib/sources";

export const dynamic = "force-dynamic";

type SortKey = "newest" | "oldest" | "cheapest" | "expensive";

type Params = Promise<{ manufacturer: string; model: string }>;
type Search = Promise<{
  min?: string;
  max?: string;
  sort?: SortKey;
  source?: "all" | "private" | "retailer";
  src?: "all" | SourceId;
  type?: "all" | "fixed";
}>;

function FilterFields({
  sp,
  sort,
  sellerFilter,
  srcFilter,
  typeFilter,
}: {
  sp: Awaited<Search>;
  sort: SortKey;
  sellerFilter: string;
  srcFilter: string;
  typeFilter: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3">
      <FilterLabel label="Min pris (kr)">
        <input
          type="number"
          name="min"
          defaultValue={sp.min ?? ""}
          placeholder="0"
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 specs text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]/60 focus:border-[var(--color-ox-500)] focus:outline-none sm:w-28"
        />
      </FilterLabel>
      <FilterLabel label="Max pris (kr)">
        <input
          type="number"
          name="max"
          defaultValue={sp.max ?? ""}
          placeholder="∞"
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 specs text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]/60 focus:border-[var(--color-ox-500)] focus:outline-none sm:w-28"
        />
      </FilterLabel>
      <FilterLabel label="Sortera">
        <select
          name="sort"
          defaultValue={sort}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ox-500)] focus:outline-none sm:w-auto"
        >
          <option value="newest">Nyast först</option>
          <option value="oldest">Äldst först</option>
          <option value="cheapest">Billigast</option>
          <option value="expensive">Dyrast</option>
        </select>
      </FilterLabel>
      <FilterLabel label="Säljare">
        <select
          name="source"
          defaultValue={sellerFilter}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ox-500)] focus:outline-none sm:w-auto"
        >
          <option value="all">Alla</option>
          <option value="private">Privat</option>
          <option value="retailer">Återförsäljare</option>
        </select>
      </FilterLabel>
      <FilterLabel label="Källa">
        <select
          name="src"
          defaultValue={srcFilter}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ox-500)] focus:outline-none sm:w-auto"
        >
          <option value="all">Alla källor</option>
          {SOURCE_IDS.map((id) => (
            <option key={id} value={id}>
              {SOURCES[id].label}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Typ">
        <select
          name="type"
          defaultValue={typeFilter}
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ox-500)] focus:outline-none sm:w-auto"
        >
          <option value="all">Alla annonser</option>
          <option value="fixed">Endast fasta priser</option>
        </select>
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

export default async function ModelPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { manufacturer: mSlug, model: modSlug } = await params;
  const sp = await searchParams;

  const m = db
    .select()
    .from(schema.manufacturers)
    .where(eq(schema.manufacturers.slug, mSlug))
    .get();
  if (!m) notFound();

  const mod = db
    .select()
    .from(schema.models)
    .where(
      and(
        eq(schema.models.manufacturerId, m.id),
        eq(schema.models.slug, modSlug),
      ),
    )
    .get();
  if (!mod) notFound();

  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;
  const sort: SortKey = sp.sort ?? "newest";
  const sellerFilter = sp.source ?? "all";
  const srcFilter = sp.src ?? "all";
  const typeFilter = sp.type ?? "all";

  const filters: SQL[] = [
    eq(schema.ads.modelId, mod.id),
    isNull(schema.ads.removedAt),
  ];
  if (min != null && !Number.isNaN(min))
    filters.push(gte(schema.ads.priceAmount, min));
  if (max != null && !Number.isNaN(max))
    filters.push(lte(schema.ads.priceAmount, max));
  if (sellerFilter === "private") filters.push(eq(schema.ads.isRetailer, false));
  if (sellerFilter === "retailer") filters.push(eq(schema.ads.isRetailer, true));
  if (srcFilter !== "all" && SOURCE_IDS.includes(srcFilter as SourceId)) {
    filters.push(eq(schema.ads.source, srcFilter));
  }
  if (typeFilter === "fixed") filters.push(eq(schema.ads.isAuction, false));

  const orderBy = (() => {
    switch (sort) {
      case "cheapest":
        return [asc(schema.ads.priceAmount)];
      case "expensive":
        return [desc(schema.ads.priceAmount)];
      case "oldest":
        return [asc(schema.ads.publishedAt)];
      case "newest":
      default:
        return [desc(schema.ads.publishedAt)];
    }
  })();

  const rows = db
    .select()
    .from(schema.ads)
    .where(and(...filters))
    .orderBy(...orderBy)
    .limit(240)
    .all();

  const baseHref = `/${m.slug}/${mod.slug}`;
  const filtersActive = !!(
    sp.min ||
    sp.max ||
    sp.sort ||
    sp.source ||
    sp.src ||
    sp.type
  );
  const auctionsVisible = rows.some((r) => r.isAuction);
  const showPriceSortWarning =
    (sort === "cheapest" || sort === "expensive") &&
    auctionsVisible &&
    typeFilter !== "fixed";

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
        <Link href="/" className="hover:text-[var(--color-ox-500)]">
          Register
        </Link>
        <span className="mx-2 text-[var(--color-line)]">/</span>
        <Link
          href={`/${m.slug}`}
          className="hover:text-[var(--color-ox-500)]"
        >
          {m.name}
        </Link>
        <span className="mx-2 text-[var(--color-line)]">/</span>
        <span className="text-[var(--color-ink-soft)]">{mod.name}</span>
      </nav>

      {/* Editorial header — logo as full-width watermark behind text */}
      <header className="relative isolate -mx-4 sm:-mx-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.10] sm:opacity-[0.13]"
        >
          <ManufacturerLogo
            name={m.name}
            logoFile={m.logoFile}
            className="h-[220px] w-full max-w-5xl px-6 sm:h-[360px] lg:h-[440px]"
          />
        </div>

        <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-12 text-center sm:py-16 lg:py-20">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
            Modell
          </div>

          <h1
            className="text-4xl tracking-tight leading-[1.02] text-[var(--color-ink)] sm:text-6xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            {m.name}{" "}
            <em
              className="text-[var(--color-ox-500)]"
              style={{ fontWeight: 500 }}
            >
              {mod.name}
            </em>
          </h1>

          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span className="specs text-[var(--color-ink)]">
              {rows.length.toLocaleString("sv-SE")}
            </span>{" "}
            annonser
          </div>
        </div>
      </header>

      {/* Desktop filters */}
      <form
        className="paper-card hidden flex-wrap items-end gap-3 rounded-md p-4 sm:flex"
        action={baseHref}
      >
        <FilterFields
          sp={sp}
          sort={sort}
          sellerFilter={sellerFilter}
          srcFilter={srcFilter}
          typeFilter={typeFilter}
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--color-ox-500)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-100)] transition hover:bg-[var(--color-ox-600)]"
        >
          Filtrera
        </button>
        {filtersActive && (
          <Link
            href={baseHref}
            className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
          >
            Rensa
          </Link>
        )}
      </form>

      {/* Mobile filter trigger */}
      <div className="sm:hidden flex items-center justify-between">
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
          <form action={baseHref} className="space-y-4">
            <FilterFields
              sp={sp}
              sort={sort}
              sellerFilter={sellerFilter}
              srcFilter={srcFilter}
              typeFilter={typeFilter}
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
                  href={baseHref}
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

      {showPriceSortWarning && (
        <div className="flex items-start gap-3 rounded-md border border-[var(--color-ox-500)] bg-[var(--color-ox-500)]/8 px-4 py-3 text-sm text-[var(--color-ox-700)]">
          <span className="mt-0.5 text-base leading-none">⚠</span>
          <div className="flex-1">
            <strong
              className="text-[var(--color-ox-500)]"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
            >
              Auktionerna är på väg upp.
            </strong>{" "}
            Tradera-auktioner börjar ofta lågt och stiger sista dygnet, så
            "billigast" är missvisande. Vill du jämföra mot riktiga säljpriser?{" "}
            <Link
              href={`${baseHref}?${new URLSearchParams({
                ...(sp.min ? { min: sp.min } : {}),
                ...(sp.max ? { max: sp.max } : {}),
                ...(sp.sort ? { sort: sp.sort } : {}),
                ...(sp.source ? { source: sp.source } : {}),
                ...(sp.src ? { src: sp.src } : {}),
                type: "fixed",
              }).toString()}`}
              className="font-semibold text-[var(--color-ox-500)] underline hover:text-[var(--color-ox-700)]"
            >
              Visa endast fasta priser
            </Link>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="paper-card-flat rounded-md p-12 text-center">
          <p
            className="text-2xl text-[var(--color-ink-soft)]"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            Inga annonser matchar.
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
            Justera filtren — eller kör en sync
          </p>
        </div>
      ) : (
        <AnimatedGrid className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {rows.map((ad) => (
            <AnimatedItem key={ad.id}>
              <AdCardMobile ad={ad} />
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      )}
    </div>
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ExcludeThisDevice } from "@/components/Analytics";
import { getSource } from "@/lib/sources";
import { shiftDay, stockholmDay } from "@/lib/analytics";

// Private visitor dashboard. Open with /statistik?key=<STATS_TOKEN>; anyone
// without the key gets a 404, so the page's existence isn't advertised.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistik — HittaGira",
  robots: { index: false, follow: false },
};

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

type Search = Promise<{ key?: string; dagar?: string }>;

type Row = Record<string, unknown>;

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.run(query);
  return res.rows as unknown as T[];
}

export default async function StatistikPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const expected = process.env.STATS_TOKEN;
  if (!expected || sp.key !== expected) notFound();

  const range: Range = RANGES.includes(Number(sp.dagar) as Range)
    ? (Number(sp.dagar) as Range)
    : 30;

  const today = stockholmDay();
  const start = shiftDay(today, -(range - 1));
  const prevStart = shiftDay(start, -range);

  // Visitor ids rotate daily, so COUNT(DISTINCT visitor_id) per day is exact
  // and summing days gives "visitor-days" — the standard cookieless measure.
  const [daily, referrers, pages, clicks, countries, devices, support] =
    await Promise.all([
      rows<{ day: string; visitors: number; pageviews: number; clicks: number }>(sql`
        SELECT day,
               COUNT(DISTINCT visitor_id) AS visitors,
               SUM(type = 'pageview') AS pageviews,
               SUM(type = 'outbound') AS clicks
        FROM events
        WHERE day >= ${prevStart}
        GROUP BY day
      `),
      rows<{ referrer: string; visitors: number }>(sql`
        SELECT referrer, COUNT(DISTINCT visitor_id) AS visitors
        FROM events
        WHERE type = 'pageview' AND day >= ${start} AND referrer IS NOT NULL
        GROUP BY referrer
        ORDER BY visitors DESC
        LIMIT 10
      `),
      rows<{ path: string; views: number }>(sql`
        SELECT path, COUNT(*) AS views
        FROM events
        WHERE type = 'pageview' AND day >= ${start}
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `),
      rows<{ target: string | null; clicks: number }>(sql`
        SELECT target, COUNT(*) AS clicks
        FROM events
        WHERE type = 'outbound' AND day >= ${start}
        GROUP BY target
        ORDER BY clicks DESC
      `),
      rows<{ country: string | null; visitors: number }>(sql`
        SELECT country, COUNT(DISTINCT visitor_id) AS visitors
        FROM events
        WHERE day >= ${start}
        GROUP BY country
        ORDER BY visitors DESC
        LIMIT 8
      `),
      rows<{ device: string | null; visitors: number }>(sql`
        SELECT device, COUNT(DISTINCT visitor_id) AS visitors
        FROM events
        WHERE day >= ${start}
        GROUP BY device
        ORDER BY visitors DESC
      `),
      rows<{ target: string | null; n: number }>(sql`
        SELECT CASE WHEN type = 'pageview' THEN 'visit' ELSE target END AS target,
               COUNT(*) AS n
        FROM events
        WHERE day >= ${start}
          AND (type = 'support' OR (type = 'pageview' AND path = '/stod'))
        GROUP BY 1
        ORDER BY (target = 'visit') DESC, n DESC
      `),
    ]);

  // Fill every day in the window so quiet days show as zero, not as gaps.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days = Array.from({ length: range }, (_, i) => {
    const day = shiftDay(start, i);
    const d = byDay.get(day);
    return {
      day,
      visitors: Number(d?.visitors ?? 0),
      pageviews: Number(d?.pageviews ?? 0),
      clicks: Number(d?.clicks ?? 0),
    };
  });
  const prev = daily.filter((d) => d.day < start);

  const sum = (xs: Array<Row>, k: string) =>
    xs.reduce((acc, x) => acc + Number(x[k] ?? 0), 0);
  const totals = {
    visitors: sum(days, "visitors"),
    pageviews: sum(days, "pageviews"),
    clicks: sum(days, "clicks"),
  };
  const prevTotals = {
    visitors: sum(prev, "visitors"),
    pageviews: sum(prev, "pageviews"),
    clicks: sum(prev, "clicks"),
  };
  const todayVisitors = days[days.length - 1].visitors;

  const referred = sum(referrers, "visitors");
  const regionNames = new Intl.DisplayNames(["sv"], { type: "region" });
  const countryName = (code: string | null) => {
    if (!code) return "Okänt";
    try {
      return regionNames.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const href = (dagar: Range) =>
    `/statistik?key=${encodeURIComponent(sp.key ?? "")}&dagar=${dagar}`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-8">
      <ExcludeThisDevice />

      <header>
        <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
          <span className="inline-block h-[1.5px] w-8 bg-[var(--color-ox-500)]" />
          <span>Privat · bara för dig</span>
        </div>
        <h1
          className="mt-4 text-[36px] leading-none tracking-[-0.02em] text-[var(--color-ink)] sm:text-[52px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Besöksstatistik
        </h1>
        <p className="mt-3 max-w-[60ch] text-sm text-[var(--color-ink-soft)]">
          Cookiefri räkning: inga IP-adresser sparas, och en besökare känns
          bara igen inom samma dygn. Dina egna besök från den här enheten
          räknas inte längre.
        </p>
      </header>

      {/* Range filter — scopes everything below it */}
      <nav className="flex gap-1.5" aria-label="Tidsperiod">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={href(r)}
            aria-current={r === range ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
              r === range
                ? "border-[var(--color-ox-500)] bg-[var(--color-ox-500)] text-[var(--color-gold-100)]"
                : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
            }`}
          >
            {r} dagar
          </Link>
        ))}
      </nav>

      {/* KPI row */}
      {/* 2×2 on mobile, one row on desktop — hairlines between tiles */}
      <section className="grid grid-cols-2 border-y border-[var(--color-line)] sm:grid-cols-4 [&>*]:border-[var(--color-line)] [&>*:nth-child(-n+2)]:border-b sm:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r sm:[&>*:not(:last-child)]:border-r">
        <StatTile
          label="Besökare"
          value={totals.visitors}
          prev={prevTotals.visitors}
          range={range}
        />
        <StatTile
          label="Sidvisningar"
          value={totals.pageviews}
          prev={prevTotals.pageviews}
          range={range}
        />
        <StatTile
          label="Klick till annonser"
          value={totals.clicks}
          prev={prevTotals.clicks}
          range={range}
        />
        <StatTile label="Besökare idag" value={todayVisitors} />
      </section>

      <section>
        <SectionTitle
          title="Besökare per dag"
          note="Idag visas ljusare — dygnet pågår fortfarande."
        />
        <DailyChart days={days} today={today} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)] hover:text-[var(--color-ox-500)]">
            Visa som tabell
          </summary>
          <table className="mt-3 w-full text-left text-[13px] tabular-nums">
            <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
              <tr className="border-b border-[var(--color-line)]">
                <th className="py-1.5 font-normal">Datum</th>
                <th className="py-1.5 text-right font-normal">Besökare</th>
                <th className="py-1.5 text-right font-normal">Sidvisningar</th>
                <th className="py-1.5 text-right font-normal">Klick</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr
                  key={d.day}
                  className="border-b border-[var(--color-line-soft)]"
                >
                  <td className="py-1.5">{formatDay(d.day)}</td>
                  <td className="py-1.5 text-right">{d.visitors}</td>
                  <td className="py-1.5 text-right">{d.pageviews}</td>
                  <td className="py-1.5 text-right">{d.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        <RankList
          title="Varifrån de kommer"
          unit="Besökare"
          rows={[
            ...referrers.map((r) => ({
              label: r.referrer,
              value: Number(r.visitors),
            })),
            {
              label: "Direkt / okänt",
              value: Math.max(0, totals.visitors - referred),
              muted: true,
            },
          ].filter((r) => r.value > 0)}
        />
        <RankList
          title="Mest besökta sidor"
          unit="Visningar"
          rows={pages.map((p) => ({ label: p.path, value: Number(p.views) }))}
        />
        <RankList
          title="Klick vidare till källa"
          unit="Klick"
          rows={clicks.map((c) => ({
            label: getSource(c.target)?.label ?? c.target ?? "Okänd",
            value: Number(c.clicks),
          }))}
        />
        <RankList
          title="Länder"
          unit="Besökare"
          rows={countries.map((c) => ({
            label: countryName(c.country),
            value: Number(c.visitors),
            muted: !c.country,
          }))}
        />
        <RankList
          title="Enheter"
          unit="Besökare"
          rows={devices.map((d) => ({
            label:
              d.device === "mobile"
                ? "Mobil"
                : d.device === "desktop"
                  ? "Dator"
                  : "Okänd",
            value: Number(d.visitors),
          }))}
        />
        <RankList
          title="Stöd"
          unit="Antal"
          rows={support.map((s) => ({
            label: SUPPORT_LABELS[s.target ?? ""] ?? s.target ?? "Okänt",
            value: Number(s.n),
          }))}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------

const SUPPORT_LABELS: Record<string, string> = {
  visit: "Besök på Stöd-sidan",
  swish: "Tryckte Öppna Swish",
  "swish-copy": "Kopierade Swish-numret",
  buymeacoffee: "Klick till Buy Me a Coffee",
};

const numberFormat = new Intl.NumberFormat("sv-SE");
const dayLabel = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatDay(day: string) {
  return dayLabel.format(new Date(`${day}T12:00:00Z`));
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2
        className="text-xl text-[var(--color-ink)] sm:text-2xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        {title}
      </h2>
      {note && (
        <span className="text-xs text-[var(--color-ink-mute)]">{note}</span>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  prev,
  range,
}: {
  label: string;
  value: number;
  prev?: number;
  range?: number;
}) {
  const delta =
    prev !== undefined && prev > 0
      ? Math.round(((value - prev) / prev) * 100)
      : null;
  return (
    <div className="px-3 py-4 sm:px-5 sm:py-5">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
        {label}
      </div>
      <div className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-[var(--color-ink)] sm:text-4xl">
        {numberFormat.format(value)}
      </div>
      {delta !== null && (
        <div className="mt-2 text-xs text-[var(--color-ink-mute)]">
          <span
            className={
              delta >= 0
                ? "text-[var(--color-string-700)]"
                : "text-[var(--color-coral-600)]"
            }
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} %
          </span>{" "}
          mot förra {range} d
        </div>
      )}
    </div>
  );
}

/** Round up to a clean axis maximum whose half is also a whole number. */
function niceCeil(n: number) {
  if (n <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 4, 6, 8, 10].find((s) => n <= s * mag) ?? 10;
  return step * mag;
}

function DailyChart({
  days,
  today,
}: {
  days: Array<{ day: string; visitors: number; pageviews: number; clicks: number }>;
  today: string;
}) {
  const max = niceCeil(Math.max(...days.map((d) => d.visitors)));
  const ticks = [0, max / 2, max];

  return (
    <div className="flex gap-2">
      {/* Y-axis labels */}
      <div className="relative h-44 w-7 shrink-0 font-mono text-[10px] tabular-nums text-[var(--color-ink-mute)]">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2"
            style={{ bottom: `${(t / max) * 100}%` }}
          >
            {numberFormat.format(t)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px bg-[var(--color-line-soft)]"
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const pct = (d.visitors / max) * 100;
              const isToday = d.day === today;
              const align =
                i < days.length / 3
                  ? "left-0"
                  : i > (days.length * 2) / 3
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  aria-label={`${formatDay(d.day)}: ${d.visitors} besökare, ${d.pageviews} sidvisningar, ${d.clicks} klick`}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                >
                  <div
                    className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${
                      isToday
                        ? "bg-[var(--color-ox-200)]"
                        : "bg-[var(--color-ox-500)] group-hover:bg-[var(--color-ox-400)] group-focus-visible:bg-[var(--color-ox-400)]"
                    }`}
                    style={{
                      height: d.visitors > 0 ? `max(${pct}%, 2px)` : 0,
                    }}
                  />
                  <div
                    className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md border border-[var(--color-line)] bg-[var(--color-card)] px-2.5 py-2 text-xs shadow-[0_10px_24px_-14px_rgba(26,16,12,0.45)] group-hover:block group-focus-visible:block ${align}`}
                    style={{ bottom: `calc(${pct}% + 8px)` }}
                  >
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
                      {formatDay(d.day)}
                      {isToday && " · pågår"}
                    </div>
                    <TooltipRow value={d.visitors} label="besökare" />
                    <TooltipRow value={d.pageviews} label="sidvisningar" />
                    <TooltipRow value={d.clicks} label="klick" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis: first, middle and last date */}
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-mute)]">
          <span>{formatDay(days[0].day)}</span>
          <span>{formatDay(days[Math.floor(days.length / 2)].day)}</span>
          <span>{formatDay(days[days.length - 1].day)}</span>
        </div>
      </div>
    </div>
  );
}

function TooltipRow({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-semibold tabular-nums text-[var(--color-ink)]">
        {numberFormat.format(value)}
      </span>
      <span className="text-[var(--color-ink-soft)]">{label}</span>
    </div>
  );
}

function RankList({
  title,
  unit,
  rows,
}: {
  title: string;
  unit: string;
  rows: Array<{ label: string; value: number; muted?: boolean }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between border-b border-[var(--color-line)] pb-2">
        <h2
          className="text-lg text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {title}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
          {unit}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-[var(--color-ink-mute)]">
          Ingen data än.
        </p>
      ) : (
        <ul className="space-y-[2px]">
          {rows.map((r) => (
            <li
              key={r.label}
              className="relative flex items-center justify-between gap-3 px-2 py-1.5 text-sm"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-[4px] bg-[var(--color-ox-500)]/10"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
              <span
                className={`relative truncate ${
                  r.muted
                    ? "text-[var(--color-ink-mute)]"
                    : "text-[var(--color-ink)]"
                }`}
              >
                {r.label}
              </span>
              <span className="relative shrink-0 tabular-nums text-[var(--color-ink-soft)]">
                {numberFormat.format(r.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

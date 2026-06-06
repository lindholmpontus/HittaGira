import { AdPriceTag } from "./AdPriceTag";
import { WatchlistButton } from "./WatchlistButton";
import { formatRelative } from "@/lib/format";
import { getSource } from "@/lib/sources";

type Ad = {
  id: number;
  heading: string;
  source: string;
  isAuction: boolean;
  isRetailer: boolean;
  priceAmount: number | null;
  priceCurrency: string | null;
  buyNowPrice: number | null;
  totalBids: number | null;
  auctionEndAt: Date | null;
  location: string | null;
  organisationName: string | null;
  primaryImageUrl: string | null;
  canonicalUrl: string;
  publishedAt: Date | null;
  firstSeenAt: Date;
};

const DAY_MS = 24 * 3600 * 1000;

export function AdCardMobile({ ad }: { ad: Ad }) {
  const now = Date.now();
  const isNew = ad.firstSeenAt && now - ad.firstSeenAt.getTime() < DAY_MS;
  const source = getSource(ad.source);
  const catalogNo = ad.id.toString().padStart(4, "0").slice(-4);

  return (
    <div className="paper-card group relative block h-full overflow-hidden rounded-md transition hover:border-[var(--color-ox-500)] hover:shadow-[0_18px_36px_-22px_rgba(122,31,43,0.45)] active:scale-[0.985]">
      <a
        href={ad.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Image plate */}
        <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--color-line-soft)] bg-[var(--color-bg-soft)]">
          {ad.primaryImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ad.primaryImageUrl}
              alt={ad.heading}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
              Bild saknas
            </div>
          )}

          {/* Top-left stamps */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {isNew && (
              <span className="stamp bg-[var(--color-ox-500)] text-[var(--color-gold-100)] border-[var(--color-ox-700)]">
                Ny
              </span>
            )}
            {ad.isAuction && (
              <span className="stamp bg-[var(--color-card)]/95 text-[var(--color-coral-600)] border-[var(--color-coral-500)]">
                Auktion
              </span>
            )}
          </div>

          {/* Source badge — bottom-right */}
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)]/80 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-gold-100)] backdrop-blur-sm">
            <span
              className="size-1.5 rounded-full"
              style={{ background: source?.color ?? "var(--color-ink-mute)" }}
            />
            {source?.label ?? ad.source}
          </span>

          {ad.isRetailer && !ad.isAuction && (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[var(--color-ink)]/75 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-gold-100)] backdrop-blur-sm">
              Företag
            </span>
          )}
        </div>

        {/* Body */}
        <div className="relative p-3.5">
          <span className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]/80">
            № {catalogNo}
          </span>

          <div
            className="min-h-[2.6rem] pr-12 text-[15px] leading-snug text-[var(--color-ink)] line-clamp-2 group-hover:text-[var(--color-ox-500)]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            {ad.heading}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-ink-mute)]">
            <span className="truncate">
              {ad.location ?? ad.organisationName ?? "—"}
            </span>
            <span className="shrink-0">{formatRelative(ad.publishedAt)}</span>
          </div>

          <div className="my-2.5 h-px bg-[var(--color-line-soft)]" />

          <AdPriceTag
            source={ad.source}
            isAuction={ad.isAuction}
            priceAmount={ad.priceAmount}
            priceCurrency={ad.priceCurrency}
            buyNowPrice={ad.buyNowPrice}
            totalBids={ad.totalBids}
            auctionEndAt={ad.auctionEndAt}
          />
        </div>
      </a>

      {/* Watchlist button — overlay on image */}
      <WatchlistButton id={ad.id} className="absolute right-2.5 top-2.5 z-10" />
    </div>
  );
}

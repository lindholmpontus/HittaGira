import { formatPrice, formatTimeLeft, urgencyTone } from "@/lib/format";

type Props = {
  source?: string;
  isAuction: boolean;
  priceAmount: number | null;
  priceCurrency: string | null;
  buyNowPrice: number | null;
  totalBids: number | null;
  auctionEndAt: Date | null;
  tradeType?: string | null;
};

export function AdPriceTag({
  isAuction,
  priceAmount,
  priceCurrency,
  buyNowPrice,
  totalBids,
  auctionEndAt,
  tradeType,
}: Props) {
  if (!isAuction) {
    // "CALL" listings (e.g. Halkans) carry no price — invite contact instead.
    if (tradeType === "call") {
      return (
        <span className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-soft)]">
          Ring för pris
        </span>
      );
    }
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="specs text-lg font-semibold tracking-tight text-[var(--color-ox-500)]">
          {formatPrice(priceAmount, priceCurrency)}
        </span>
      </div>
    );
  }

  const tone = urgencyTone(auctionEndAt);
  const timeLabel = formatTimeLeft(auctionEndAt);
  const toneClass =
    tone === "urgent"
      ? "text-[var(--color-coral-500)] font-semibold"
      : tone === "soon"
        ? "text-[var(--color-coral-500)] font-medium"
        : "text-[var(--color-ink-mute)]";

  const hasBids = (totalBids ?? 0) > 0;
  const bidLabel = !hasBids ? "Inga bud än" : `${totalBids} bud`;

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
          Bud
        </span>
        <span className="specs text-base font-semibold tracking-tight text-[var(--color-ox-500)]">
          {formatPrice(priceAmount ?? 0, priceCurrency)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em]">
        <span className={toneClass}>{timeLabel}</span>
        <span className="text-[var(--color-line)]">·</span>
        <span className="text-[var(--color-ink-mute)]">{bidLabel}</span>
      </div>
      {buyNowPrice && (
        <div className="pt-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-string-500)]">
          Köp nu · {formatPrice(buyNowPrice, priceCurrency)}
        </div>
      )}
    </div>
  );
}

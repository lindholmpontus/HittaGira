"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdCardMobile } from "@/components/AdCardMobile";
import { AnimatedGrid, AnimatedItem } from "@/components/AnimatedGrid";
import { useWatchlist } from "@/lib/watchlist";

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

type ApiAd = Omit<Ad, "auctionEndAt" | "publishedAt" | "firstSeenAt"> & {
  auctionEndAt: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
};

export default function BevakadePage() {
  const { ids, hydrated } = useWatchlist();
  const [ads, setAds] = useState<Ad[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (ids.length === 0) {
      setAds([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/ads?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data: { ads: ApiAd[] }) => {
        if (cancelled) return;
        const byId = new Map(data.ads.map((a) => [a.id, a]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((a): a is ApiAd => Boolean(a))
          .map(
            (a): Ad => ({
              ...a,
              firstSeenAt: new Date(a.firstSeenAt),
              publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
              auctionEndAt: a.auctionEndAt ? new Date(a.auctionEndAt) : null,
            }),
          );
        setAds(ordered);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ids, hydrated]);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ox-500)]">
          <span className="inline-block h-[1.5px] w-6 bg-[var(--color-ox-500)]" />
          Mitt urval
        </div>
        <h1
          className="mt-3 text-4xl tracking-tight text-[var(--color-ink)] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          <em
            className="text-[var(--color-ox-500)]"
            style={{ fontWeight: 500 }}
          >
            Bevakade
          </em>{" "}
          annonser.
        </h1>
        {hydrated && ids.length > 0 && (
          <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            <span className="specs text-[var(--color-ink)]">{ids.length}</span>{" "}
            sparade · lagras lokalt i din webbläsare
          </div>
        )}
      </header>

      {/* States */}
      {!hydrated || ads === null ? (
        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
          Hämtar urval…
        </div>
      ) : ads.length === 0 ? (
        <div className="paper-card-flat rounded-md p-12 text-center">
          <p
            className="text-2xl text-[var(--color-ink-soft)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
          >
            {ids.length === 0
              ? "Inget urval än."
              : "Annonserna har tagits bort."}
          </p>
          <p className="mt-3 max-w-md mx-auto font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
            Tryck på hjärtat på en annons för att lägga till den här.
            Listan följer din webbläsare — den syns bara för dig.
          </p>
          <div className="mt-6 flex justify-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em]">
            <Link
              href="/"
              className="rounded-md bg-[var(--color-ox-500)] px-4 py-2.5 font-semibold text-[var(--color-gold-100)] hover:bg-[var(--color-ox-600)]"
            >
              Bläddra registret
            </Link>
            <Link
              href="/sok"
              className="rounded-md border border-[var(--color-line)] px-4 py-2.5 text-[var(--color-ink-soft)] hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
            >
              Sök
            </Link>
          </div>
        </div>
      ) : (
        <AnimatedGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
          {ads.map((ad) => (
            <AnimatedItem key={ad.id}>
              <AdCardMobile ad={ad} />
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      )}
    </div>
  );
}

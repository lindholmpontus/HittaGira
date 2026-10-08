import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import {
  BUY_ME_A_COFFEE_URL,
  SWISH_NUMBER,
  formatSwishNumber,
  swishAppLink,
  swishQrSvg,
} from "@/lib/support";

export const metadata: Metadata = {
  title: "Stöd HittaGira — bjud på en kaffe",
};

const primaryButton =
  "inline-flex items-center justify-center gap-2.5 rounded-full border border-[var(--color-ox-700)] bg-[var(--color-ox-500)] px-6 py-3 text-[15px] font-semibold text-[var(--color-gold-100)] shadow-[0_14px_28px_-18px_rgba(122,31,43,0.7)] transition hover:bg-[var(--color-ox-600)] active:scale-[0.98]";

export default async function StodPage() {
  const qr = SWISH_NUMBER ? await swishQrSvg(SWISH_NUMBER) : null;

  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-12">
      <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
        <span className="inline-block h-[1.5px] w-8 bg-[var(--color-ox-500)]" />
        <span>Stöd HittaGira</span>
      </div>

      <h1
        className="mt-5 max-w-[18ch] text-[44px] leading-[0.98] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[80px] sm:leading-[0.94]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Bjud på en{" "}
        <em className="text-[var(--color-ox-500)]" style={{ fontWeight: 500 }}>
          kaffe.
        </em>
      </h1>

      <p
        className="mt-6 max-w-[52ch] text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg"
        style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
      >
        Om du hittade något du gillade och uppskattar sidan är ditt stöd
        ovärderligt.
      </p>

      <div className="mt-10 flex max-w-sm flex-col gap-6">
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener"
          data-support="buymeacoffee"
          className={primaryButton}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          Buy Me a Coffee
        </a>

        {SWISH_NUMBER && qr && (
          <div>
            {/* Mobile: jump straight into the app */}
            <a
              href={swishAppLink(SWISH_NUMBER)}
              data-support="swish"
              className={`${primaryButton} w-full sm:hidden`}
            >
              Öppna Swish
            </a>

            {/* Desktop: scan with the phone */}
            <div className="hidden items-center gap-5 sm:flex">
              <div
                className="w-28 shrink-0 [&>svg]:h-auto [&>svg]:w-full"
                role="img"
                aria-label="QR-kod för Swish"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
                <span className="font-semibold text-[var(--color-ink)]">
                  Swish
                </span>
                <br />
                Skanna med Swish-appen.
              </p>
            </div>

            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-[var(--color-ink-mute)]">
                Swish-nummer{" "}
                <span className="tabular-nums text-[var(--color-ink)]">
                  {formatSwishNumber(SWISH_NUMBER)}
                </span>
              </span>
              <CopyButton
                text={SWISH_NUMBER}
                label="Kopiera"
                support="swish-copy"
                className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)] transition hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
        <Link
          href="/"
          className="text-[var(--color-ox-500)] hover:text-[var(--color-ox-700)]"
        >
          ← Tillbaka till första sidan
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";

// Phones follow the link straight into the Swish app; on anything else (where
// Swish isn't installed) the click opens a popup with a QR code to scan.
const PHONE_UA = /iPhone|Android.+Mobile|Windows Phone/i;

export function SwishButton({
  appLink,
  qrSvg,
  className,
}: {
  appLink: string;
  qrSvg: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <a
        href={appLink}
        data-support="swish"
        onClick={(e) => {
          if (PHONE_UA.test(navigator.userAgent)) return;
          e.preventDefault();
          dialog.current?.showModal();
        }}
        className={className}
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
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        Swish
      </a>

      <dialog
        ref={dialog}
        aria-label="Swish"
        // A click on the dialog element itself is a click on the backdrop.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(92vw,22rem)] rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-0 text-[var(--color-ink)] shadow-[0_30px_60px_-25px_rgba(26,16,12,0.55)] transition duration-200 starting:scale-95 starting:opacity-0 backdrop:bg-[#1A100C]/45 backdrop:backdrop-blur-[2px]"
      >
        <div className="relative px-6 pb-7 pt-8 text-center">
          <button
            type="button"
            onClick={close}
            aria-label="Stäng"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-[var(--color-ink-mute)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <p className="text-sm text-[var(--color-ink-soft)]">
            Skanna koden med Swish-appen.
          </p>

          <div
            className="mx-auto mt-5 w-52 rounded-lg bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line-soft)] [&>svg]:h-auto [&>svg]:w-full"
            role="img"
            aria-label="QR-kod för Swish"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <p className="mt-4 text-xs text-[var(--color-ink-mute)]">
            30&nbsp;kr är förifyllt — du kan ändra beloppet i appen.
          </p>
        </div>
      </dialog>
    </>
  );
}

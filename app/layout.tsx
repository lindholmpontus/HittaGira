import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Newsreader, Familjen_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { HittaGiraLogo } from "@/components/HittaGiraLogo";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display-loaded",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HittaGira — Sveriges begagnade gitarrer, samlade på ett ställe",
  description:
    "Ett kuraterat register över begagnade gitarrannonser från Blocket och Tradera. Bläddra efter tillverkare, se nytt först.",
};

export const viewport: Viewport = {
  themeColor: "#EFE6D2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sv"
      className={`${familjen.variable} ${newsreader.variable} ${plex.variable}`}
    >
      <body className="min-h-screen antialiased">
        {/* ------------------------------------------------------------ */}
        {/* MASTHEAD — magazine-style banner above the page              */}
        {/* ------------------------------------------------------------ */}
        <div className="border-b border-[var(--color-line)]/60 bg-[var(--color-bg)]/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
              Vol. I · Nr. 06 · {currentEdition()}
            </span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
              En oberoende katalog över andrahandsgitarrer i Sverige
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* HEADER — wordmark + navigation                                */}
        {/* ------------------------------------------------------------ */}
        <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-bg)]/92 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:gap-8 sm:py-4">
            <Link
              href="/"
              className="flex items-center"
              aria-label="HittaGira hem"
            >
              <HittaGiraLogo className="h-9 w-auto sm:h-11" />
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <HeaderLink href="/">Nytt</HeaderLink>
              <HeaderLink href="/sok">Sök</HeaderLink>
              <HeaderLink href="/bevakade">Bevakade</HeaderLink>
              <HeaderLink href="/mer">Kolofon</HeaderLink>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/mer"
                aria-label="Mer"
                className="grid size-9 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)] sm:hidden"
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
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
          {children}
        </main>

        {/* Minimal footer hairline */}
        <footer className="border-t border-[var(--color-line)] bg-[var(--color-bg)]/60 hidden sm:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)] sm:px-6">
            <span>© HittaGira · {new Date().getFullYear()}</span>
            <span>
              <Link
                href="/mer"
                className="hover:text-[var(--color-ox-500)]"
              >
                Kolofon
              </Link>
            </span>
          </div>
        </footer>

        <BottomNav />
      </body>
    </html>
  );
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 font-medium text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ox-500)]"
    >
      {children}
    </Link>
  );
}

function currentEdition(): string {
  const now = new Date();
  const months = [
    "Januari",
    "Februari",
    "Mars",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "Augusti",
    "September",
    "Oktober",
    "November",
    "December",
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

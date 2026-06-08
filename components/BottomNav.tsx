"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const HomeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V10z" />
  </svg>
);
const SearchIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);
const HeartIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const BookIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h11a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
    <path d="M4 16h15" />
  </svg>
);

const tabs: Tab[] = [
  { href: "/", label: "Nytt", icon: HomeIcon },
  { href: "/sok", label: "Sök", icon: SearchIcon },
  { href: "/bevakade", label: "Bevakade", icon: HeartIcon },
  { href: "/mer", label: "Om", icon: BookIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Huvudnavigation"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="relative flex flex-col items-center gap-1 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em]"
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute -top-px h-0.5 w-10 rounded-full bg-[var(--color-ox-500)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.85 }}
                  className={
                    active
                      ? "text-[var(--color-ox-500)]"
                      : "text-[var(--color-ink-mute)]"
                  }
                >
                  {tab.icon}
                </motion.span>
                <span
                  className={
                    active
                      ? "text-[var(--color-ox-500)]"
                      : "text-[var(--color-ink-mute)]"
                  }
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { motion } from "motion/react";
import { useWatchlist } from "@/lib/watchlist";

type Props = {
  id: number;
  className?: string;
};

export function WatchlistButton({ id, className }: Props) {
  const { has, toggle, hydrated } = useWatchlist();
  const active = hydrated && has(id);

  return (
    <motion.button
      type="button"
      aria-label={active ? "Ta bort från bevakade" : "Lägg till i bevakade"}
      aria-pressed={active}
      whileTap={{ scale: 0.82 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={`grid size-8 place-items-center rounded-full border backdrop-blur-sm transition ${
        active
          ? "border-[var(--color-ox-700)] bg-[var(--color-ox-500)] text-[var(--color-gold-100)]"
          : "border-[var(--color-line)] bg-[var(--color-card)]/85 text-[var(--color-ink-soft)] hover:border-[var(--color-ox-500)] hover:text-[var(--color-ox-500)]"
      } ${className ?? ""}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </motion.button>
  );
}

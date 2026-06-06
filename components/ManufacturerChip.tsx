"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ManufacturerLogo } from "./ManufacturerLogo";

type Props = {
  slug: string;
  name: string;
  logoFile: string | null;
  count: number;
};

export function ManufacturerChip({ slug, name, logoFile, count }: Props) {
  return (
    <motion.div whileTap={{ scale: 0.92 }} className="snap-start">
      <Link
        href={`/${slug}`}
        className="group flex w-20 flex-col items-center gap-2 sm:w-24"
      >
        <div className="paper-card relative grid size-16 place-items-center rounded-full p-3 transition group-hover:border-[var(--color-ox-500)] sm:size-20 sm:p-4">
          <ManufacturerLogo
            name={name}
            logoFile={logoFile}
            className="size-full flex items-center justify-center"
          />
          {count > 0 && (
            <span className="specs absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-ox-500)] text-[var(--color-gold-100)] text-[10px] font-bold flex items-center justify-center">
              {count > 999 ? "999+" : count}
            </span>
          )}
        </div>
        <span className="w-full truncate text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)] group-hover:text-[var(--color-ox-500)]">
          {name}
        </span>
      </Link>
    </motion.div>
  );
}

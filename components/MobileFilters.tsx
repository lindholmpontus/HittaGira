"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

export function MobileFilters({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition active:scale-95 sm:hidden"
      >
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/70 sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] rounded-t-3xl border-t border-[var(--color-line)] p-5 pb-8 max-h-[85vh] overflow-y-auto sm:hidden"
            >
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[var(--color-line)]" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Filter</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
                >
                  Stäng
                </button>
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

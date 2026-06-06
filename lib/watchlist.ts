"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "hittagira:watchlist:v1";
const EVENT = "hittagira:watchlist:change";

function read(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number");
  } catch {
    return [];
  }
}

function write(ids: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useWatchlist() {
  const [ids, setIds] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);
    const refresh = () => setIds(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: number) => {
      const next = ids.includes(id)
        ? ids.filter((x) => x !== id)
        : [id, ...ids];
      write(next);
      setIds(next);
    },
    [ids],
  );

  return { ids, has, toggle, hydrated };
}

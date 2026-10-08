"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Sends a beacon to /api/collect on every page view (including client-side
// navigations), on every click through to an ad (links marked with
// `data-outbound`) and on the donation buttons on /stod (`data-support`). Only runs in production builds, so `npm run dev` against
// the live Turso DB doesn't pollute the numbers.

const IGNORE_KEY = "hittagira:analytics:ignore";

function shouldTrack(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (navigator.webdriver) return false;
  try {
    return window.localStorage.getItem(IGNORE_KEY) !== "1";
  } catch {
    return true;
  }
}

function send(payload: Record<string, string | undefined>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.("/api/collect", body)) return;
  fetch("/api/collect", { method: "POST", body, keepalive: true }).catch(
    () => {},
  );
}

export function Analytics() {
  const pathname = usePathname();
  const isLanding = useRef(true);

  useEffect(() => {
    if (!shouldTrack() || pathname.startsWith("/statistik")) return;
    // Referrer and campaign tag only mean something on the first page of the
    // visit — document.referrer doesn't change on client-side navigation.
    const landing = isLanding.current;
    isLanding.current = false;
    const params = new URLSearchParams(window.location.search);
    send({
      type: "pageview",
      path: pathname,
      referrer: landing ? document.referrer || undefined : undefined,
      ref: landing
        ? (params.get("ref") ?? params.get("utm_source") ?? undefined)
        : undefined,
    });
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Left click, or middle click (auxclick) for "open in new tab".
      if (e.type === "auxclick" && e.button !== 1) return;
      const el = (e.target as Element | null)?.closest?.(
        "a[data-outbound], [data-support]",
      );
      if (!el || !shouldTrack()) return;
      const support = el.getAttribute("data-support");
      send({
        type: support ? "support" : "outbound",
        path: window.location.pathname,
        target: support ?? el.getAttribute("data-outbound") ?? undefined,
      });
    }
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}

/** Mounted on /statistik: stops counting the site owner's own visits. */
export function ExcludeThisDevice() {
  useEffect(() => {
    try {
      window.localStorage.setItem(IGNORE_KEY, "1");
    } catch {}
  }, []);
  return null;
}

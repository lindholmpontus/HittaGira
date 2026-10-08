"use client";

import { useState } from "react";

/** Copies `text` to the clipboard. `support` tags the click for analytics. */
export function CopyButton({
  text,
  label,
  support,
  className,
}: {
  text: string;
  label: string;
  support?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      data-support={support}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      className={className}
    >
      {copied ? "Kopierat!" : label}
    </button>
  );
}

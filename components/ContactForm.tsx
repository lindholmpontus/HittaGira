"use client";

import { useEffect, useRef, useState } from "react";

const fieldClass =
  "w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)]/60 focus:border-[var(--color-ox-500)] focus:outline-none";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const renderedAt = useRef(0);
  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: data.get("message"),
          name: data.get("name"),
          email: data.get("email"),
          website: data.get("website"),
          elapsedMs: Date.now() - renderedAt.current,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        className="text-lg text-[var(--color-ink)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Tack! Ditt meddelande är skickat.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Meddelande">
        <textarea
          name="message"
          required
          maxLength={5000}
          rows={6}
          placeholder="Vad tycker du? Saknas en modell eller butik?"
          className={`${fieldClass} resize-y`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Namn (valfritt)">
          <input
            name="name"
            maxLength={100}
            autoComplete="name"
            className={fieldClass}
          />
        </Field>
        <Field label="E-post (om du vill ha svar)">
          <input
            name="email"
            type="email"
            maxLength={200}
            autoComplete="email"
            className={fieldClass}
          />
        </Field>
      </div>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Webbplats
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-ox-700)] bg-[var(--color-ox-500)] px-6 py-3 text-[15px] font-semibold text-[var(--color-gold-100)] transition hover:bg-[var(--color-ox-600)] active:scale-[0.98] disabled:opacity-60"
        >
          {status === "sending" ? "Skickar…" : "Skicka"}
        </button>
        {status === "error" && (
          <p role="alert" className="text-sm text-[var(--color-coral-600)]">
            Något gick fel — försök igen om en stund.
          </p>
        )}
      </div>

      <p className="text-xs text-[var(--color-ink-mute)]">
        Din e-post används bara för att svara dig.
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">
        {label}
      </span>
      {children}
    </label>
  );
}

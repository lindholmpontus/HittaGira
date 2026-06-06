import Link from "next/link";

export default function MerPage() {
  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-12">
      <section className="relative">
        {/* Decorative rosette in the corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-2 hidden h-48 w-48 opacity-[0.07] sm:block"
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <g fill="none" stroke="#7A1F2B" strokeWidth="1">
              <circle cx="100" cy="100" r="98" />
              <circle cx="100" cy="100" r="80" />
              <circle cx="100" cy="100" r="60" />
              <circle cx="100" cy="100" r="40" />
              <circle cx="100" cy="100" r="20" />
            </g>
            <g stroke="#7A1F2B" strokeWidth="0.6">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI * 2) / 12;
                const x1 = 100 + Math.cos(a) * 20;
                const y1 = 100 + Math.sin(a) * 20;
                const x2 = 100 + Math.cos(a) * 98;
                const y2 = 100 + Math.sin(a) * 98;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
            </g>
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
            <span className="inline-block h-[1.5px] w-8 bg-[var(--color-ox-500)]" />
            <span>I detta nummer</span>
          </div>

          <h1
            className="mt-5 max-w-[18ch] text-[44px] leading-[0.98] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[80px] sm:leading-[0.94] lg:text-[100px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Hitta din nästa{" "}
            <em
              className="text-[var(--color-ox-500)]"
              style={{ fontWeight: 500 }}
            >
              gira.
            </em>
          </h1>

          <p
            className="mt-6 max-w-[52ch] text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
          >
            Ett oberoende register över andrahandsgitarrer i Sverige. Vi
            samlar dagligen från{" "}
            <span className="string-underline text-[var(--color-string-700)]">
              Blocket
            </span>
            ,{" "}
            <span className="string-underline text-[var(--color-coral-600)]">
              Tradera
            </span>
            , <span className="string-underline">Musikbörsen</span>,{" "}
            <span className="string-underline">GuitarGeeks</span> och{" "}
            <span className="string-underline">DLX Music</span> — och visar
            dig det nyaste först.
          </p>

          <div className="mt-10 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-mute)]">
            <Link
              href="/"
              className="text-[var(--color-ox-500)] hover:text-[var(--color-ox-700)]"
            >
              ← Tillbaka till första sidan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

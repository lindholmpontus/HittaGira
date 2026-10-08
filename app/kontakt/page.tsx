import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt — HittaGira",
};

export default function KontaktPage() {
  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-12">
      <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
        <span className="inline-block h-[1.5px] w-8 bg-[var(--color-ox-500)]" />
        <span>Kontakt</span>
      </div>

      <h1
        className="mt-5 text-[44px] leading-[0.98] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[80px] sm:leading-[0.94]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Hör av{" "}
        <em className="text-[var(--color-ox-500)]" style={{ fontWeight: 500 }}>
          dig.
        </em>
      </h1>

      <p
        className="mt-6 max-w-[52ch] text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg"
        style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
      >
        Feedback, buggar eller tips på modeller och butiker som saknas — allt
        är välkommet.
      </p>

      <div className="relative mt-10">
        <ContactForm />
      </div>
    </div>
  );
}

type Props = {
  name: string;
  logoFile: string | null;
  className?: string;
};

export function ManufacturerLogo({ name, logoFile, className }: Props) {
  if (!logoFile) {
    return (
      <div className={className} aria-hidden>
        <span className="text-xl font-extrabold tracking-tight text-[var(--color-ink)]">
          {name}
        </span>
      </div>
    );
  }
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/${logoFile}`}
        alt={`${name} logotyp`}
        className="max-h-full max-w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

type Props = {
  name: string;
  logoFile: string | null;
  className?: string;
};

export function ManufacturerLogo({ name, logoFile, className }: Props) {
  // Always centre the logo inside whatever box the caller sizes for it.
  const wrapper = `flex items-center justify-center ${className ?? ""}`;
  if (!logoFile) {
    return (
      <div className={wrapper} aria-hidden>
        <span className="text-xl font-extrabold tracking-tight text-[var(--color-ink)]">
          {name}
        </span>
      </div>
    );
  }
  return (
    <div className={wrapper}>
      {/* Fill the box and let object-contain fit + centre the artwork, so
          small source files scale up like the large ones. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/${logoFile}`}
        alt={`${name} logotyp`}
        className="h-full w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

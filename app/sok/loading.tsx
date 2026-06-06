export default function SearchLoading() {
  return (
    <div className="grid place-items-center py-40">
      <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-ink-mute)]">
        <span className="block h-px w-8 bg-[var(--color-ox-500)] animate-pulse" />
        <span>Söker</span>
        <span className="block h-px w-8 bg-[var(--color-ox-500)] animate-pulse" />
      </div>
    </div>
  );
}

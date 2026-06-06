export function formatPrice(amount: number | null, currency: string | null): string {
  if (amount == null) return "Pris saknas";
  const c = currency ?? "SEK";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRelative(date: Date | number | null): string {
  if (date == null) return "";
  const t = typeof date === "number" ? date : date.getTime();
  const seconds = Math.floor((Date.now() - t) / 1000);
  if (seconds < 60) return "just nu";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h sedan`;
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days} d sedan`;
  return new Date(t).toLocaleDateString("sv-SE");
}

export function formatTimeLeft(endAt: Date | number | null): string {
  if (endAt == null) return "";
  const t = typeof endAt === "number" ? endAt : endAt.getTime();
  const ms = t - Date.now();
  if (ms <= 0) return "Avslutad";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min kvar`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h kvar`;
  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  if (days < 7) {
    return leftoverHours > 0
      ? `${days} d ${leftoverHours} h kvar`
      : `${days} d kvar`;
  }
  return `${days} d kvar`;
}

export function urgencyTone(endAt: Date | number | null): "calm" | "soon" | "urgent" {
  if (endAt == null) return "calm";
  const t = typeof endAt === "number" ? endAt : endAt.getTime();
  const ms = t - Date.now();
  if (ms <= 0) return "calm";
  if (ms < 6 * 3600 * 1000) return "urgent";
  if (ms < 24 * 3600 * 1000) return "soon";
  return "calm";
}

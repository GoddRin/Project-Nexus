/** "just now", "3 min ago", "2 h ago", "5 d ago"; older than 30 days gives the date */
export function timeAgo(input: string | Date | null | undefined, now: Date = new Date()): string {
  if (!input) return "";
  const then = typeof input === "string" ? new Date(input) : input;
  const ms = now.getTime() - then.getTime();
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d <= 30) return `${d} d ago`;
  return new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(then);
}

/** Hour of the day in the Philippines (0-23), whatever the server's or viewer's timezone */
export function manilaHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).format(now)) % 24;
}

/** True when a moment is more than `ms` in the past */
export function olderThan(iso: string, ms: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() > ms;
}

import type { CleanMessage } from "./types";

const MANILA_OFFSET_MS = 8 * 3600 * 1000;

/** The Asia/Manila calendar date (YYYY-MM-DD) of an instant. */
export function manilaDate(d: Date): string {
  return new Date(d.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

export interface DayBucket {
  date: string;
  messages: CleanMessage[];
  hasSafety: boolean;
}

/** Groups cleaned messages into one bucket per Manila day, oldest first. Reports sent just after midnight still count for the day they were sent. */
export function groupByDay(messages: CleanMessage[]): DayBucket[] {
  const byDay = new Map<string, CleanMessage[]>();
  for (const m of messages) {
    const key = manilaDate(m.at);
    const list = byDay.get(key);
    if (list) list.push(m);
    else byDay.set(key, [m]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      messages: list.sort((x, y) => x.at.getTime() - y.at.getTime()),
      hasSafety: list.some((m) => m.safety),
    }));
}

/** Plain-text transcript of a day, one line per message, with Manila time. */
export function transcript(bucket: DayBucket): string {
  return bucket.messages
    .map((m) => {
      const hhmm = new Date(m.at.getTime() + MANILA_OFFSET_MS).toISOString().slice(11, 16);
      return `${hhmm} ${m.author}: ${m.text.replace(/\n/g, " / ")}`;
    })
    .join("\n");
}

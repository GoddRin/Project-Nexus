"use client";

import React, { useEffect, useState } from "react";

const DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/**
 * Today's date and a ticking clock in Philippine time. The server sends its own reading (so
 * there is text from the first byte); the client takes over each second. The two can differ by
 * a second at hand-over, hence suppressHydrationWarning on the time.
 */
export function LiveClock({ initialIso, className }: { initialIso: string; className?: string }) {
  const [now, setNow] = useState(() => new Date(initialIso));
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return (
    <span className={className}>
      <span suppressHydrationWarning>{DATE.format(now)}</span>
      <span aria-hidden className="mx-2 opacity-50">·</span>
      <time dateTime={now.toISOString()} className="font-mono tabular-nums" suppressHydrationWarning>
        {TIME.format(now)}
      </time>
      <span className="ml-1.5 font-mono text-[0.85em] opacity-70">PHT</span>
    </span>
  );
}

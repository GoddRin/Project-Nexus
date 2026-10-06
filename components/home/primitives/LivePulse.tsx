"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/home/time";

export interface LivePulseProps {
  /** when the data on screen was fetched (ISO string or Date); nothing is shown without it */
  updatedAt?: string | Date | null;
  isRefreshing?: boolean;
  /** the last refresh failed: the data shown is the last good copy */
  isStale?: boolean;
  /** leading word, e.g. "Updated" (default) */
  label?: string;
  className?: string;
}

/**
 * A heartbeat dot with "Updated 3 min ago" that re-reads the clock every 30 s. Green while
 * live, amber with a "stale" pill when the source failed and old data is being shown.
 * The text is rendered only after mount, so server and client never disagree about the time.
 */
export function LivePulse({ updatedAt, isRefreshing = false, isStale = false, label = "Updated", className }: LivePulseProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const text = isRefreshing ? "Refreshing…" : updatedAt && now ? `${label} ${timeAgo(updatedAt, now)}` : "";
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] text-text-muted", className)}>
      <span className={cn("home-heartbeat shrink-0", isStale ? "text-scic-amber" : "text-scic-green-energy")} aria-hidden />
      <span className="tabular-nums" suppressHydrationWarning>
        {text || "Live"}
      </span>
      {isStale && (
        <span className="rounded-full border border-scic-amber/40 bg-scic-amber/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-scic-amber">
          stale
        </span>
      )}
    </span>
  );
}

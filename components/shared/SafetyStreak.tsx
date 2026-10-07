"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAST_LTA_DATE } from "@/lib/home/companyFacts";

/** The marks a site counts toward, in days */
const MARKS = [7, 30, 60, 90, 180, 365, 500, 730, 1000];
const manilaDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
const shortDay = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

interface Streak {
  since: string;
  kind: "lta" | "incident";
}

/** The streak's start and the day count (null until the browser has read today's date) */
export function useSafetyStreak(): { streak: Streak | null; days: number | null } {
  const [streak, setStreak] = useState<Streak | null>(LAST_LTA_DATE ? { since: `${LAST_LTA_DATE}T00:00:00+08:00`, kind: "lta" } : null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setToday(manilaDay(new Date()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 10 * 60_000);
    const controller = new AbortController();
    // (signed out, this answers 401 and the stated date stands)
    fetch("/api/home/ops", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { lastIncidentAt?: string | null; lastIncidentKind?: "lta" | "incident" | null } } | null) => {
        const d = body?.data;
        if (d?.lastIncidentAt && d.lastIncidentKind) setStreak({ since: d.lastIncidentAt, kind: d.lastIncidentKind });
      })
      .catch(() => {});
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      controller.abort();
    };
  }, []);

  const days = streak && today ? Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${manilaDay(new Date(streak.since))}T00:00:00Z`)) / 86_400_000)) : null;
  return { streak, days };
}

/** The same count as plain text, for a figure tile: "11 days", with the wording beneath it */
export function SafetyStreakFigure({ valueClassName, captionClassName }: { valueClassName?: string; captionClassName?: string }) {
  const { streak, days } = useSafetyStreak();
  if (!streak) return null;
  return (
    <>
      <p className={valueClassName}>{days === null ? "–" : `${days} day${days === 1 ? "" : "s"}`}</p>
      <p className={captionClassName}>{streak.kind === "lta" ? "Without a lost-time accident" : "Since the last reported incident"}</p>
    </>
  );
}

/**
 * The site's safety board, as it hangs at a site gate: the number of days since the last
 * lost-time accident, on a ring that fills toward the next mark (7, 30, 60, 90 days and on).
 *
 * The count starts from the date the company has stated (lib/home/companyFacts.ts). When the
 * reader is signed in, the Incidents module is asked as well, and a later logged incident
 * restarts the count. Nothing here is a tally of man-hours: the system holds no such record.
 * The number is worked out in the browser from today's date in the Philippines, so it appears a
 * moment after the page does.
 */
export function SafetyStreak({ variant = "sidebar", className }: { variant?: "sidebar" | "drawer" | "compact"; className?: string }) {
  const { streak, days } = useSafetyStreak();

  if (!streak) return null;
  const next = MARKS.find((m) => m > (days ?? 0)) ?? MARKS[MARKS.length - 1];
  const previous = [...MARKS].reverse().find((m) => m <= (days ?? 0)) ?? 0;
  const share = days === null ? 0 : Math.min(1, (days - previous) / Math.max(1, next - previous));
  const what = streak.kind === "lta" ? "without a lost-time accident" : "since the last reported incident";
  const label = days === null ? "Site safety record" : `${days} day${days === 1 ? "" : "s"} ${what}, counted from ${shortDay(streak.since)}. Next mark: ${next} days.`;

  const size = variant === "compact" ? 36 : 46;
  const stroke = variant === "compact" ? 3 : 3.5;
  const r = (size - stroke) / 2;
  const ring = (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--home-ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--scic-green-energy)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - share}
          className="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      </svg>
      <span className={cn("absolute font-mono font-bold tabular-nums leading-none text-text-primary", variant === "compact" ? "text-[11px]" : "text-sm")}>{days ?? "–"}</span>
    </span>
  );

  if (variant === "compact") {
    return (
      <Link
        href="/dashboard/incidents"
        aria-label={label}
        title={label}
        className={cn("flex justify-center rounded-xl py-1.5 transition-colors hover:bg-scic-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40", className)}
      >
        {ring}
      </Link>
    );
  }
  return (
    <Link
      href="/dashboard/incidents"
      aria-label={label}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-scic-green/25 bg-scic-green/[0.06] transition-colors hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
        className
      )}
    >
      {/* the board's header strip */}
      <span className="flex items-center justify-between gap-2 border-b border-scic-green/15 bg-scic-green/10 px-2.5 py-1">
        <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-scic-green dark:text-scic-green-bright">
          <HardHat className="h-3 w-3" aria-hidden />
          Site safety
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">Tumauini</span>
      </span>
      <span className={cn("flex items-center gap-3 px-2.5", variant === "drawer" ? "py-3" : "py-2.5")}>
        {ring}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold leading-tight text-text-primary">
            day{days === 1 ? "" : "s"} {what}
          </span>
          <span className="mt-1 block truncate font-mono text-[9px] text-text-muted">since {shortDay(streak.since)}</span>
          <span className="block truncate font-mono text-[9px] text-text-muted">next mark: {next} days</span>
        </span>
      </span>
    </Link>
  );
}

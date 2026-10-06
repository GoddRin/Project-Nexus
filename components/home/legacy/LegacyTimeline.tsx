"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { useSeenOnce } from "@/components/home/useSeenOnce";
import type { TimelineEntry } from "@/lib/home/companyFacts";

export interface LegacyTimelineProps {
  entries: TimelineEntry[];
  founded: number;
  anniversary: number;
  /** the current year in Manila, for the "n years ago" line under each dated entry */
  thisYear: number;
  brandLine: string;
}

/**
 * Fifty years on one line. A rail runs through the company's milestones (left to right on a wide
 * screen, top to bottom on a phone) and fills in green the first time it is seen, each milestone
 * arriving as the line reaches it. The entries are the company's own statements (see
 * lib/home/companyFacts.ts); nothing here is computed except how long ago each year was.
 */
export function LegacyTimeline({ entries, founded, anniversary, thisYear, brandLine }: LegacyTimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeenOnce(ref, 0.25);
  usePauseOffscreen(ref);
  return (
    <div ref={ref} data-inview={seen ? "true" : undefined} className="relative overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel">
      <div className="home-aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="home-contours" aria-hidden />
      {/* the anniversary figure, large and faint behind everything */}
      <p aria-hidden className="pointer-events-none absolute -right-4 -top-10 select-none font-display text-[13rem] font-extrabold leading-none tracking-[-0.06em] text-text-primary opacity-[0.045] md:text-[19rem]">
        50
      </p>

      <div className="relative p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="home-eyebrow">
              {founded} – {anniversary}
            </p>
            <h2 id="legacy-title" className="mt-1 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary md:text-5xl">
              Fifty years of <span className="home-hero-accent">building.</span>
            </h2>
          </div>
          <BrandLogo variant="mark" height={44} className="opacity-90" />
        </div>

        {/* wide screens: one horizontal rail */}
        <ol className="relative mt-12 hidden gap-5 lg:grid" style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}>
          <li aria-hidden className="pointer-events-none absolute inset-x-0 top-[7px] h-0.5 rounded-full bg-[var(--home-timeline-rail)]">
            <span className="home-timeline-fill block h-full rounded-full bg-gradient-to-r from-scic-green via-scic-green-energy to-scic-green-bright" />
          </li>
          {entries.map((e, i) => (
            <Milestone key={e.marker} entry={e} index={i} thisYear={thisYear} last={i === entries.length - 1} />
          ))}
        </ol>

        {/* phones and tablets: a vertical rail */}
        <ol className="relative mt-8 space-y-7 pl-8 lg:hidden">
          <li aria-hidden className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full bg-[var(--home-timeline-rail)]">
            <span data-axis="y" className="home-timeline-fill block h-full w-full rounded-full bg-gradient-to-b from-scic-green via-scic-green-energy to-scic-green-bright" />
          </li>
          {entries.map((e, i) => (
            <Milestone key={e.marker} entry={e} index={i} thisYear={thisYear} last={i === entries.length - 1} vertical />
          ))}
        </ol>

        <p className="relative mt-10 border-t border-border-hairline pt-5 font-display text-lg font-semibold tracking-[-0.01em] text-text-secondary md:text-xl">{brandLine}</p>
      </div>
    </div>
  );
}

function Milestone({ entry, index, thisYear, last, vertical }: { entry: TimelineEntry; index: number; thisYear: number; last: boolean; vertical?: boolean }) {
  const ago = entry.year === null ? null : thisYear - entry.year;
  const style = { ["--i" as string]: index } as React.CSSProperties;
  return (
    <li className={cn("group relative", !vertical && "pt-9")}>
      <span
        aria-hidden
        style={style}
        className={cn(
          "home-timeline-pin absolute h-4 w-4 rounded-full border-[3px] bg-bg-panel transition-shadow duration-300 group-hover:shadow-[0_0_0_6px_color-mix(in_srgb,var(--scic-green-energy)_22%,transparent)]",
          last ? "border-scic-green-energy bg-scic-green-energy" : "border-scic-green-energy",
          vertical ? "-left-8 top-1.5" : "left-0 top-0"
        )}
      />
      <div style={style} className="home-timeline-node">
        <p className={cn("font-mono font-semibold leading-none tabular-nums tracking-[-0.02em]", last ? "home-hero-accent text-4xl md:text-[2.75rem]" : "text-3xl text-text-primary md:text-4xl")}>{entry.marker}</p>
        <h3 className="mt-2.5 font-display text-base font-bold leading-snug text-text-primary">{entry.title}</h3>
        <p className="mt-1 text-sm leading-6 text-text-secondary">{entry.caption}</p>
        {ago !== null && <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">{ago <= 0 ? "This year" : `${ago} years ago`}</p>}
      </div>
    </li>
  );
}

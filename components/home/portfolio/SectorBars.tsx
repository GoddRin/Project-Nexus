"use client";

import React, { useRef } from "react";
import { useSeenOnce } from "@/components/home/useSeenOnce";
import { sectorLabel } from "@/lib/home/sectors";

/**
 * The portfolio by sector: one bar per Atlas category, longest first, each grown from nothing
 * the first time the list is seen. The figures are counts of project records.
 */
export function SectorBars({ byCategory }: { byCategory: Record<string, number> }) {
  const ref = useRef<HTMLUListElement>(null);
  const seen = useSeenOnce(ref, 0.3);
  const rows = Object.entries(byCategory)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <ul ref={ref} className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {rows.map(([category, count], i) => (
        <li key={category} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-text-secondary">{sectorLabel(category)}</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-text-primary">{count}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--home-ring-track)]" aria-hidden>
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-scic-green to-scic-green-energy transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ width: `${(count / max) * 100}%`, transform: seen ? "none" : "scaleX(0)", transitionDelay: `${i * 55}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

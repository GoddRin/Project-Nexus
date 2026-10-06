"use client";

import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSeenOnce } from "@/components/home/useSeenOnce";

const W = 600;
const H = 160;
const day = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const shortDay = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short" }).format(new Date(iso));

/**
 * Actual overall progress over time: the logged readings, joined by straight lines (nothing is
 * smoothed or projected between or beyond them), on a time axis that runs to the target
 * commercial operation date when there is one. There is no planned line: the records hold none.
 * Pointing at the chart, or moving along it with the arrow keys, reads out the nearest reading.
 */
export function ProgressChart({ readings, targetDate, className }: { readings: { date: string; percent: number }[]; targetDate: string | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeenOnce(ref, 0.4);
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    if (readings.length < 2) return null;
    const t0 = new Date(readings[0].date).getTime();
    const tLast = new Date(readings[readings.length - 1].date).getTime();
    const tTarget = targetDate ? new Date(targetDate).getTime() : null;
    const t1 = Math.max(tLast, tTarget ?? tLast);
    const span = Math.max(1, t1 - t0);
    const pts = readings.map((r) => ({ ...r, x: (new Date(r.date).getTime() - t0) / span, y: 1 - Math.min(100, Math.max(0, r.percent)) / 100 }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${(p.x * W).toFixed(1)} ${(p.y * H).toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1];
    return {
      pts,
      line,
      area: `${line} L${(last.x * W).toFixed(1)} ${H} L${(pts[0].x * W).toFixed(1)} ${H} Z`,
      targetX: tTarget === null ? null : (tTarget - t0) / span,
    };
  }, [readings, targetDate]);
  if (!model) return null;

  const nearest = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    let best = 0;
    model.pts.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(model.pts[best].x - x)) best = i;
    });
    return best;
  };
  const shown = hover ?? model.pts.length - 1;
  const point = model.pts[shown];
  const summary = `Actual overall progress from ${day(readings[0].date)} (${readings[0].percent}%) to ${day(readings[readings.length - 1].date)} (${readings[readings.length - 1].percent}%), ${readings.length} readings.`;

  return (
    <div ref={ref} data-inview={seen ? "true" : undefined} className={cn("min-w-0", className)}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="home-eyebrow">Actual progress, as logged</p>
        <p className="font-mono text-[11px] tabular-nums text-text-secondary" aria-live="polite">
          <span className="font-semibold text-text-primary">{point.percent}%</span> · {day(point.date)}
        </p>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0 text-right font-mono text-[10px] leading-none text-text-muted" aria-hidden>
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label={summary}
          aria-valuemin={0}
          aria-valuemax={model.pts.length - 1}
          aria-valuenow={shown}
          aria-valuetext={`${point.percent} percent on ${day(point.date)}`}
          className="relative h-40 min-w-0 flex-1 cursor-crosshair touch-pan-y rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
          onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") setHover(Math.min(model.pts.length - 1, shown + 1));
            else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setHover(Math.max(0, shown - 1));
            else if (e.key === "Home") setHover(0);
            else if (e.key === "End") setHover(model.pts.length - 1);
            else return;
            e.preventDefault();
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="home-progress-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--scic-green-energy)" stopOpacity="0.34" />
                <stop offset="1" stopColor="var(--scic-green-energy)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((g) => (
              <line key={g} x1="0" x2={W} y1={g * H} y2={g * H} stroke="var(--home-chart-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray={g === 1 ? undefined : "3 5"} />
            ))}
            <path d={model.area} fill="url(#home-progress-fill)" className="home-chart-area" />
            <path d={model.line} fill="none" stroke="var(--scic-green-energy)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} className="home-draw" />
            {model.targetX !== null && (
              <line x1={model.targetX * W} x2={model.targetX * W} y1="0" y2={H} stroke="var(--scic-amber)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            )}
            <line x1={point.x * W} x2={point.x * W} y1={point.y * H} y2={H} stroke="var(--scic-green-energy)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* readings and labels sit in HTML so they keep their size at any chart width */}
          {model.pts.map((p, i) => (
            <span
              key={p.date}
              aria-hidden
              className={cn(
                "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-scic-green-energy bg-bg-panel transition-transform duration-200",
                i === shown && "scale-[1.9] bg-scic-green-energy"
              )}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            />
          ))}
          {model.targetX !== null && (
            <span aria-hidden className="absolute top-0 -translate-x-full whitespace-nowrap pr-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-scic-amber" style={{ left: `${model.targetX * 100}%` }}>
              Target COD
            </span>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-9 font-mono text-[10px] text-text-muted" aria-hidden>
        <span>{shortDay(readings[0].date)}</span>
        {targetDate && <span>{shortDay(targetDate)}</span>}
      </div>
    </div>
  );
}

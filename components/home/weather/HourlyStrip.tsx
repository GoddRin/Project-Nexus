"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherGlance } from "@/lib/home/types";
import { WeatherGlyph } from "./WeatherGlyph";

const COL = 60; // width of one hour, px
const GAP = 6;
const STEP = COL + GAP;
const CURVE_H = 44;

const hourOf = (iso: string) => Number(iso.slice(11, 13));
const hourLabel = (iso: string, first: boolean) => {
  if (first) return "Now";
  const h = hourOf(iso);
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
};
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** A smooth line through the points (Catmull-Rom, as cubic Béziers) */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * The next twenty-four hours, as a strip that slides sideways. Each hour has its glyph, the
 * chance of rain as a bar, and its temperature riding on one curve drawn across the whole day,
 * with a marker where the date changes.
 *
 * Every way of moving it works: the arrow buttons, dragging with the mouse, a swipe on a touch
 * screen, a trackpad or shift-wheel, and the arrow keys when it has focus (Home and End jump to
 * the ends). The ends fade out while there is more to see on that side.
 */
export function HourlyStrip({ hours }: { hours: WeatherGlance["hours"] }) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: true });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  }, []);
  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, hours.length]);

  const slide = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // most of a screenful, so one hour of overlap stays for orientation
    const by = Math.max(STEP * 2, Math.floor((el.clientWidth - STEP) / STEP) * STEP);
    el.scrollBy({ left: direction * by, behavior: reduce ? "auto" : "smooth" });
  };

  // drag with the mouse (touch and pen use the browser's own scrolling)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.setAttribute("data-dragging", "true");
    }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.moved) e.currentTarget.removeAttribute("data-dragging");
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") slide(1);
    else if (e.key === "ArrowLeft") slide(-1);
    else if (e.key === "Home") e.currentTarget.scrollTo({ left: 0 });
    else if (e.key === "End") e.currentTarget.scrollTo({ left: e.currentTarget.scrollWidth });
    else return;
    e.preventDefault();
  };

  const curve = useMemo(() => {
    if (!hours.length) return null;
    const temps = hours.map((h) => h.tempC);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = Math.max(1, max - min);
    const points = hours.map((h, i): [number, number] => [i * STEP + COL / 2, 8 + (1 - (h.tempC - min) / span) * (CURVE_H - 18)]);
    const line = smoothPath(points);
    const width = hours.length * STEP - GAP;
    return { points, line, area: `${line} L ${points[points.length - 1][0]} ${CURVE_H} L ${points[0][0]} ${CURVE_H} Z`, width };
  }, [hours]);
  if (!hours.length || !curve) return null;

  const arrow =
    "absolute top-1/2 z-[2] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-bg-panel text-text-primary shadow-md transition-all hover:scale-105 hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40 disabled:pointer-events-none disabled:opacity-0 sm:flex";
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <p id={`${id}-label`} className="home-eyebrow">
          Next 24 hours
        </p>
        <p className="font-mono text-[10px] text-text-muted sm:hidden">Swipe for more →</p>
      </div>
      <div className="relative">
        <button type="button" onClick={() => slide(-1)} disabled={!more.left} aria-label="Earlier hours" className={cn(arrow, "-left-3")}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => slide(1)} disabled={!more.right} aria-label="Later hours" className={cn(arrow, "-right-3")}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>

        <div
          ref={scroller}
          role="group"
          aria-labelledby={`${id}-label`}
          tabIndex={0}
          data-more-left={more.left}
          data-more-right={more.right}
          onScroll={update}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="home-hours"
        >
          <div className="relative" style={{ width: curve.width }}>
            {/* temperature across the day: one curve, with a dot and the figure at each hour */}
            <svg width={curve.width} height={CURVE_H} viewBox={`0 0 ${curve.width} ${CURVE_H}`} className="block" aria-hidden>
              <defs>
                <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--scic-amber)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--scic-amber)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={curve.area} fill={`url(#${id}-area)`} />
              <path d={curve.line} fill="none" stroke="var(--scic-amber)" strokeWidth="2" strokeLinecap="round" />
              {curve.points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i === 0 ? 3.5 : 2.5} fill="var(--bg-panel)" stroke="var(--scic-amber)" strokeWidth="1.6" />
              ))}
            </svg>

            <ol className="mt-1 flex" style={{ gap: GAP }}>
              {hours.map((h, i) => {
                const newDay = i > 0 && hourOf(h.time) === 0;
                return (
                  <li
                    key={h.time}
                    data-now={i === 0}
                    className="home-hour relative flex shrink-0 flex-col items-center gap-1 rounded-xl border border-border-hairline bg-bg-panel px-1 pb-2 pt-1.5"
                    style={{ width: COL }}
                    title={`${hourLabel(h.time, i === 0)}: ${h.tempC}°C, ${h.rainChance}% chance of rain${h.rainMm > 0 ? `, ${h.rainMm} mm` : ""}, wind ${h.windKph} km/h`}
                  >
                    <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">{h.tempC}°</span>
                    <WeatherGlyph kind={h.icon} size={28} title="" />
                    <span className="relative block h-7 w-2 overflow-hidden rounded-full bg-[var(--home-ring-track)]" aria-hidden>
                      <span
                        className="absolute inset-x-0 bottom-0 rounded-full bg-scic-cyan transition-[height] duration-700"
                        style={{ height: `${Math.max(6, h.rainChance)}%`, opacity: h.rainChance < 5 ? 0.3 : 1 }}
                      />
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-scic-cyan">{h.rainChance}%</span>
                    <span className={cn("font-mono text-[10px] uppercase", i === 0 ? "font-bold text-scic-green dark:text-scic-green-bright" : "text-text-muted")}>
                      {hourLabel(h.time, i === 0)}
                    </span>
                    {newDay && (
                      <span className="absolute -left-[4px] -top-1 bottom-0 w-px bg-border-subtle" aria-hidden>
                        <span className="absolute -top-3 left-1 whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-wider text-text-muted">{dayLabel(h.time)}</span>
                      </span>
                    )}
                    <span className="sr-only">
                      {hourLabel(h.time, i === 0)}: {h.tempC} degrees, {h.rainChance} percent chance of rain
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-4 font-mono text-[10px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-scic-amber" aria-hidden /> Temperature
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-1.5 rounded-full bg-scic-cyan" aria-hidden /> Chance of rain
        </span>
      </p>
    </div>
  );
}

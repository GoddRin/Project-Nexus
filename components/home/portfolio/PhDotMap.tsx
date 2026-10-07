"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_EASE } from "@/components/shared/motion";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { useSeenOnce } from "@/components/home/useSeenOnce";
import { atlasHref } from "@/lib/home/links";
import { STATUS_GROUPS, sectorLabel, statusGroup, statusLabel, type StatusGroup } from "@/lib/home/sectors";
import type { PortfolioStats } from "@/lib/home/types";

export interface DotMapGrid {
  cols: number;
  rows: number;
  bounds: { west: number; east: number; south: number; north: number };
  latStep: number;
  lonStep: number;
  /** one path per grid row that has land (see components/home/PortfolioRow.tsx) */
  rowPaths: { row: number; d: string }[];
}

type Point = PortfolioStats["mapPoints"][number];
const TONE: Record<StatusGroup, string> = { ONGOING: "bg-scic-green-energy", COMPLETED: "bg-scic-cyan", UPCOMING: "bg-scic-amber" };
const TOUR_MS = 3600;

/**
 * The Philippines as a field of dots, with every project in the Atlas marked on it by status.
 * Pointing at a marker (or reaching it with the arrow keys) shows the project; choosing it opens
 * the Atlas on that project. The chips filter by status. Left alone, the map walks through the
 * ongoing sites one at a time; any interaction takes over, and it never moves under reduced
 * motion.
 */
export function PhDotMap({ grid, points }: { grid: DotMapGrid; points: Point[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const seen = useSeenOnce(wrap, 0.2);
  usePauseOffscreen(wrap);
  const [filter, setFilter] = useState<StatusGroup | "ALL">("ALL");
  const [active, setActive] = useState<string | null>(null);
  const [touring, setTouring] = useState(true);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const shownBeforePress = useRef<string | null>(null);

  // north to south, then west to east: the order the arrow keys walk in
  const placed = useMemo(
    () =>
      points
        .map((p) => ({
          ...p,
          group: statusGroup(p.status),
          left: ((p.lon - grid.bounds.west) / grid.lonStep / grid.cols) * 100,
          top: ((grid.bounds.north - p.lat) / grid.latStep / grid.rows) * 100,
        }))
        .filter((p) => p.left >= 0 && p.left <= 100 && p.top >= 0 && p.top <= 100)
        .sort((a, b) => a.top - b.top || a.left - b.left),
    [points, grid]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: placed.length };
    for (const p of placed) c[p.group] = (c[p.group] ?? 0) + 1;
    return c;
  }, [placed]);
  const visible = useMemo(() => (filter === "ALL" ? placed : placed.filter((p) => p.group === filter)), [placed, filter]);
  const current = active ? placed.find((p) => p.slug === active) ?? null : null;

  // idle tour of the ongoing sites (stops for good once someone takes over with the keyboard or a tap)
  useEffect(() => {
    if (!seen || !touring) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stops = (filter === "ALL" ? placed.filter((p) => p.group === "ONGOING") : visible).map((p) => p.slug);
    if (!stops.length) return;
    let i = -1;
    const step = () => {
      if (document.visibilityState !== "visible" || wrap.current?.getAttribute("data-paused") === "true") return;
      i = (i + 1) % stops.length;
      setActive(stops[i]);
    };
    const first = window.setTimeout(step, 1900);
    const id = window.setInterval(step, TOUR_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [seen, touring, placed, visible, filter]);

  const focusMarker = useCallback((slug: string) => {
    setActive(slug);
    markerRefs.current.get(slug)?.focus();
  }, []);
  const onMarkerKey = (e: React.KeyboardEvent, slug: string) => {
    const i = visible.findIndex((p) => p.slug === slug);
    let next = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % visible.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + visible.length) % visible.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = visible.length - 1;
    else if (e.key === "Escape") {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    focusMarker(visible[next].slug);
  };
  // the one marker that takes part in the tab order
  const tabStop = current && visible.some((p) => p.slug === current.slug) ? current.slug : visible[0]?.slug;

  return (
    <div className="flex h-full flex-col">
      <div role="group" aria-label="Show projects by status" className="flex flex-wrap gap-2">
        {[{ key: "ALL" as const, label: "All" }, ...STATUS_GROUPS].map((g) => {
          const selected = filter === g.key;
          return (
            <button
              key={g.key}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setFilter(g.key);
                setActive(null);
                setTouring(true);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
                selected ? "border-[var(--home-solid)] bg-[var(--home-solid)] text-white" : "border-border-subtle text-text-secondary hover:border-scic-green/40 hover:text-text-primary"
              )}
            >
              {g.key !== "ALL" && <span className={cn("h-2 w-2 rounded-full", selected ? "bg-white" : TONE[g.key])} aria-hidden />}
              {g.label}
              <span className={cn("font-mono tabular-nums", selected ? "text-white/75" : "text-text-muted")}>{counts[g.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 items-center justify-center py-4">
        <div
          ref={wrap}
          data-inview={seen ? "true" : undefined}
          className="home-dotmap relative w-full max-w-[400px]"
          style={{ aspectRatio: `${grid.cols} / ${grid.rows}` }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setTouring(false);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return;
            setActive(null);
            setTouring(true);
          }}
        >
          <svg viewBox={`0 0 ${grid.cols} ${grid.rows}`} className="absolute inset-0 h-full w-full" aria-hidden>
            {grid.rowPaths.map((r) => (
              <path key={r.row} d={r.d} strokeWidth={0.62} className="home-dotmap-row" style={{ ["--i" as string]: r.row }} />
            ))}
          </svg>

          <ul aria-label={`Projects on the map: ${visible.length}. Use the arrow keys to move between them.`}>
            {placed.map((p, i) => {
              const dim = filter !== "ALL" && p.group !== filter;
              const isActive = current?.slug === p.slug;
              return (
                <li key={p.slug}>
                  <button
                    ref={(el) => {
                      if (el) markerRefs.current.set(p.slug, el);
                      else markerRefs.current.delete(p.slug);
                    }}
                    type="button"
                    tabIndex={!dim && p.slug === tabStop ? 0 : -1}
                    aria-hidden={dim || undefined}
                    aria-label={`${p.name}${p.location ? `, ${p.location}` : ""}. ${statusLabel(p.status)}. Open on the Atlas.`}
                    data-status={p.group}
                    data-pulse={p.group === "ONGOING" ? "true" : undefined}
                    data-dim={dim ? "true" : undefined}
                    data-active={isActive ? "true" : undefined}
                    className="home-marker"
                    style={{ left: `${p.left}%`, top: `${p.top}%`, ["--pop" as string]: `${900 + i * 14}ms`, ["--ping" as string]: `${-(i % 7) * 0.37}s`, pointerEvents: dim ? "none" : undefined }}
                    onPointerEnter={(e) => {
                      // (touch screens send their own hover just before the tap: only a real pointer previews)
                      if (e.pointerType === "mouse") setActive(p.slug);
                    }}
                    onFocus={() => {
                      setTouring(false);
                      setActive(p.slug);
                    }}
                    onPointerDown={() => {
                      shownBeforePress.current = isActive ? p.slug : null;
                    }}
                    onKeyDown={(e) => onMarkerKey(e, p.slug)}
                    onClick={(e) => {
                      // a first tap on a touch screen shows the project; a click on the one already shown opens it
                      // (the press itself focuses the marker, so what counts is whether it was shown before the press)
                      setTouring(false);
                      if (shownBeforePress.current === p.slug || e.detail === 0) router.push(atlasHref(p.slug));
                      else setActive(p.slug);
                    }}
                  >
                    <i />
                  </button>
                </li>
              );
            })}
          </ul>

          <AnimatePresence>
            {current && (
              <motion.div
                key={current.slug}
                initial={{ opacity: 0, y: current.top < 34 ? -6 : 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: BRAND_EASE }}
                className="pointer-events-none absolute z-[4] w-[min(250px,78vw)]"
                style={{
                  left: `${current.left}%`,
                  top: `${current.top}%`,
                  translate: `${current.left < 38 ? "-14%" : current.left > 62 ? "-86%" : "-50%"} ${current.top < 34 ? "18px" : "calc(-100% - 18px)"}`,
                }}
              >
                <div className="pointer-events-auto rounded-2xl border border-border-subtle bg-bg-panel p-3 shadow-xl">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    <span className={cn("h-2 w-2 rounded-full", TONE[current.group])} aria-hidden />
                    {statusLabel(current.status)} · {sectorLabel(current.category)}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-text-primary">{current.name}</p>
                  {current.location && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-text-secondary">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {current.location}
                    </p>
                  )}
                  {current.capacity && <p className="mt-1 font-mono text-[11px] text-text-muted">{current.capacity}</p>}
                  <Link
                    href={atlasHref(current.slug)}
                    tabIndex={-1}
                    className="group mt-1 inline-flex items-center gap-1 py-1.5 text-xs font-medium text-scic-green hover:text-scic-green-energy dark:text-scic-green-bright"
                  >
                    Open on the Atlas
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-text-muted">
        Every project in the Atlas, at its recorded position. Point at a marker, or use the arrow keys, to see it.
      </p>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_TILT_DEG } from "@/components/home/motionPresets";
import { ProgressRing } from "@/components/home/primitives/ProgressRing";
import { atlasHref, projectHref } from "@/lib/home/links";
import { sectorLabel, statusGroup, statusLabel } from "@/lib/home/sectors";
import type { PortfolioStats } from "@/lib/home/types";

type Featured = PortfolioStats["featured"][number];
const STATUS_CHIP = {
  ONGOING: "bg-[var(--home-solid)] text-white",
  COMPLETED: "bg-scic-blue text-white",
  UPCOMING: "bg-scic-amber text-white",
} as const;

/** One project: its photograph, status, name, place and rating. It leans toward the pointer. */
function ProjectCard({ item, progress, suppressClick }: { item: Featured; progress?: number; suppressClick: React.RefObject<boolean> }) {
  const card = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = card.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    el.setAttribute("data-tilting", "true");
  };
  const onLeave = () => {
    const el = card.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.removeAttribute("data-tilting");
  };
  const group = statusGroup(item.status);
  return (
    <div
      ref={card}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="home-tilt home-hour group relative h-[340px] w-[min(280px,78vw)] shrink-0 overflow-hidden rounded-2xl border border-border-hairline bg-bg-panel"
    >
      {item.image && (
        <Image
          src={item.image}
          alt=""
          fill
          sizes="280px"
          draggable={false}
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" aria-hidden />
      <div className="home-tilt-glare" aria-hidden />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]", STATUS_CHIP[group])}>{statusLabel(item.status)}</span>
        {typeof progress === "number" && (
          <span className="rounded-full bg-black/45 p-1 backdrop-blur-sm">
            <ProgressRing value={progress} size={46} thickness={4} label="Overall progress">
              <span className="font-mono text-[11px] font-semibold text-white">{Math.round(progress)}%</span>
            </ProgressRing>
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">{sectorLabel(item.category)}</p>
        <h3 className="mt-1 line-clamp-3 font-display text-lg font-bold leading-snug tracking-[-0.01em] text-white">
          {/* the whole card opens the Atlas on this project */}
          <Link
            href={atlasHref(item.slug)}
            draggable={false}
            onClick={(e) => {
              if (suppressClick.current) e.preventDefault();
            }}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-scic-green-energy"
          >
            {item.name}
          </Link>
        </h3>
        {item.location && (
          <p className="mt-1.5 flex items-start gap-1 text-xs text-white/80">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span className="line-clamp-1">{item.location}</span>
          </p>
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] text-white/75">{item.capacity ?? ""}</span>
          <Link
            href={projectHref(item.id)}
            draggable={false}
            onClick={(e) => {
              if (suppressClick.current) e.preventDefault();
            }}
            className="relative z-[1] inline-flex shrink-0 items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy"
          >
            Profile <ArrowUpRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Featured projects, as a row of photograph cards that slides sideways: arrow buttons, dragging
 * with the mouse, a swipe, a trackpad, or the arrow keys when the row has focus. A bar under the
 * row shows where you are in it. Each card opens the Atlas on its project; "Profile" opens the
 * project's own page.
 */
export function FeaturedCarousel({ items, progress }: { items: Featured[]; progress?: Record<string, number> }) {
  const scroller = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const [more, setMore] = useState({ left: false, right: true });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft < max - 4;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
    if (thumb.current) {
      const share = Math.min(1, el.clientWidth / Math.max(1, el.scrollWidth));
      thumb.current.style.width = `${share * 100}%`;
      thumb.current.style.transform = `translate3d(${max > 0 ? (el.scrollLeft / max) * ((1 - share) / share) * 100 : 0}%, 0, 0)`;
    }
  }, []);
  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, items.length]);

  const slide = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 280;
    const by = Math.max(step + 16, Math.floor(el.clientWidth / (step + 16)) * (step + 16));
    el.scrollBy({ left: direction * by, behavior: reduce ? "auto" : "smooth" });
  };
  // drag with the mouse (touch and pen use the browser's own scrolling)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    suppressClick.current = false;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      suppressClick.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.setAttribute("data-dragging", "true");
    }
    if (d.moved) e.currentTarget.scrollLeft = d.left - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.moved) {
      e.currentTarget.removeAttribute("data-dragging");
      // (the click that ends a drag arrives after this: let it be swallowed, then re-arm)
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") slide(1);
    else if (e.key === "ArrowLeft") slide(-1);
    else if (e.key === "Home") e.currentTarget.scrollTo({ left: 0 });
    else if (e.key === "End") e.currentTarget.scrollTo({ left: e.currentTarget.scrollWidth });
    else return;
    e.preventDefault();
  };

  const arrow =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-panel text-text-primary transition-all hover:scale-105 hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40 disabled:pointer-events-none disabled:opacity-35";
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p id="home-featured-label" className="home-eyebrow">
          Featured projects · {items.length}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => slide(-1)} disabled={!more.left} aria-label="Earlier projects" className={arrow}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => slide(1)} disabled={!more.right} aria-label="More projects" className={arrow}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        role="group"
        aria-labelledby="home-featured-label"
        tabIndex={0}
        data-more-left={more.left}
        data-more-right={more.right}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="home-hours flex gap-4 py-1"
      >
        {items.map((item) => (
          <ProjectCard key={item.slug} item={item} progress={progress?.[item.slug]} suppressClick={suppressClick} />
        ))}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--home-ring-track)]" aria-hidden>
        <span ref={thumb} className="block h-full rounded-full bg-scic-green-energy transition-transform duration-150 ease-out" style={{ width: "30%" }} />
      </div>
    </div>
  );
}

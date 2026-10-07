"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_EASE } from "@/components/shared/motion";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { useSeenOnce } from "@/components/home/useSeenOnce";
import { FiftyYearSeal, type FiftyYearSealProps } from "./FiftyYearSeal";

/** Scroll to the timeline without a page jump (shared by every design: each one is a link there) */
function jumpTo(targetId: string) {
  return (e: React.MouseEvent) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(history.state, "", `#${targetId}`);
  };
}
const spoken = (p: FiftyYearSealProps) => `Golden anniversary: ${p.years} years, ${p.founded} to ${p.anniversary}. See the company's timeline.`;

/**
 * Wordmark: a flat horizontal badge. The zero of "50" is a gold ring holding the company's
 * mark; beside it, the line and the years. Quieter and more corporate than the medal.
 */
function JubileeLockup(p: FiftyYearSealProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useSeenOnce(ref, 0.6);
  return (
    <a
      ref={ref}
      href={`#${p.targetId}`}
      onClick={jumpTo(p.targetId)}
      data-inview={seen ? "true" : undefined}
      aria-label={spoken(p)}
      className={cn("home-jubilee home-jubilee-plate home-seal-shine group items-center gap-3.5 !rounded-2xl py-3 pl-4 pr-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jubilee-mid)]", p.className)}
    >
      <span aria-hidden className="flex items-center font-display text-[3.4rem] font-extrabold leading-none tracking-[-0.05em]">
        <span className="home-jubilee-text">{String(p.years).slice(0, -1)}</span>
        {/* the zero: a ring of gold around the mark */}
        <span className="home-jubilee-ring ml-0.5 flex h-[2.9rem] w-[2.9rem] items-center justify-center rounded-full">
          <BrandLogo variant="mark" height={22} className="[&_img:first-child]:hidden [&_img:last-child]:block" />
        </span>
      </span>
      <span aria-hidden className="flex flex-col border-l border-[color-mix(in_srgb,var(--jubilee-mid)_45%,transparent)] pl-3.5 leading-tight">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--jubilee-hi)]">Years</span>
        <span className="mt-1 whitespace-nowrap font-display text-sm font-bold tracking-[0.02em] text-white">Building the nation</span>
        <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/70">
          {p.founded} — {p.anniversary}
        </span>
      </span>
    </a>
  );
}

/**
 * Rising numeral: a large outlined "50" that fills with gold from the bottom, like a reservoir
 * filling, with a slow wave on the surface. The fill rises once, the first time it is seen.
 */
function JubileeNumeral(p: FiftyYearSealProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useSeenOnce(ref, 0.6);
  usePauseOffscreen(ref);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gold = `numeral-gold-${uid}`;
  const clip = `numeral-clip-${uid}`;
  const numeral = { fontFamily: "var(--font-display)", fontSize: 118, fontWeight: 800, letterSpacing: "-0.05em" } as const;
  return (
    <a
      ref={ref}
      href={`#${p.targetId}`}
      onClick={jumpTo(p.targetId)}
      data-inview={seen ? "true" : undefined}
      aria-label={spoken(p)}
      className={cn("home-jubilee home-jubilee-numeral flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jubilee-mid)]", p.className)}
    >
      <svg viewBox="0 0 190 112" width={p.size ? p.size * 1.25 : 190} aria-hidden className="overflow-visible">
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--jubilee-hi)" />
            <stop offset="0.5" stopColor="var(--jubilee-mid)" />
            <stop offset="1" stopColor="var(--jubilee-lo)" />
          </linearGradient>
          <clipPath id={clip}>
            <text x="95" y="98" textAnchor="middle" style={numeral}>
              {p.years}
            </text>
          </clipPath>
        </defs>
        {/* the gold, clipped to the figure: a block that rises, with a wave riding its top edge */}
        <g clipPath={`url(#${clip})`}>
          <g className="home-jubilee-level">
            <path className="home-jubilee-wave" fill={`url(#${gold})`} d="M-190 14q23.75-9 47.5 0t47.5 0 47.5 0 47.5 0 47.5 0 47.5 0 47.5 0 47.5 0V130H-190Z" />
          </g>
        </g>
        <text x="95" y="98" textAnchor="middle" fill="none" stroke={`url(#${gold})`} strokeWidth="1.6" strokeLinejoin="round" style={numeral}>
          {p.years}
        </text>
      </svg>
      <span aria-hidden className="home-jubilee-plate -mt-1 !rounded-full px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--jubilee-hi)]">
        Years · {p.founded} — {p.anniversary}
      </span>
    </a>
  );
}

/** The designs that take turns on the hero, in order */
const DESIGNS = [FiftyYearSeal, JubileeLockup, JubileeNumeral] as const;
/** how long each design stays */
export const JUBILEE_TURN_MS = 60_000;

/**
 * The anniversary emblem. Three designs take turns, one minute each: the medal, the wordmark and
 * the rising numeral. One leaves by sinking back out of focus and the next arrives the same way
 * in reverse, then plays its own entrance (the wreath grows, the gold rises). They share one
 * fixed box, so nothing else on the hero moves when they change. The turn rests while the hero
 * is off-screen or the tab is hidden, and under reduced motion the medal simply stays.
 */
export function JubileeRotator({ className, ...props }: FiftyYearSealProps) {
  const box = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let onScreen = true;
    let timer = 0;
    const start = () => {
      window.clearInterval(timer);
      if (onScreen && document.visibilityState === "visible") timer = window.setInterval(() => setTurn((t) => (t + 1) % DESIGNS.length), JUBILEE_TURN_MS);
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  const Design = DESIGNS[turn];
  return (
    <div ref={box} data-jubilee-slot className={cn("relative h-[152px] w-[272px] shrink-0 items-end justify-end", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={turn}
          initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.94, y: -8, filter: "blur(8px)" }}
          transition={{ duration: 0.7, ease: BRAND_EASE }}
          className="flex origin-bottom-right items-end justify-end"
        >
          <Design {...props} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useId, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { useSeenOnce } from "@/components/home/useSeenOnce";
import { JUBILEE_VARIANTS, type JubileeVariant } from "@/lib/home/jubilee";
import { FiftyYearSeal, type FiftyYearSealProps } from "./FiftyYearSeal";

const LABEL: Record<JubileeVariant, string> = { medal: "Medal", lockup: "Wordmark", ribbon: "Corner ribbon", numeral: "Rising numeral" };

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
 * Corner ribbon: a gold band laid diagonally across the hero's top-right corner. It is placed by
 * the hero itself (absolutely, in the corner), not in the emblem's usual slot.
 */
function JubileeRibbon(p: FiftyYearSealProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useSeenOnce(ref, 0.3);
  return (
    <div className={cn("pointer-events-none absolute right-0 top-0 z-[3] h-44 w-44 overflow-hidden rounded-tr-3xl md:h-52 md:w-52", p.className)}>
      <a
        ref={ref}
        href={`#${p.targetId}`}
        onClick={jumpTo(p.targetId)}
        data-inview={seen ? "true" : undefined}
        aria-label={spoken(p)}
        className="home-jubilee-band home-seal-shine pointer-events-auto absolute left-1/2 top-1/2 flex w-[150%] -translate-x-[38%] -translate-y-[62%] rotate-45 flex-col items-center !rounded-none py-2 text-center focus-visible:outline-none"
      >
        <span aria-hidden className="font-display text-xl font-extrabold leading-none tracking-[-0.01em] text-[var(--jubilee-ink)] md:text-2xl">
          {p.years} YEARS
        </span>
        <span aria-hidden className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--jubilee-ink)]/80">
          {p.founded} — {p.anniversary}
        </span>
      </a>
    </div>
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

/** The anniversary emblem in the chosen design (the ribbon is the one the hero places in its corner) */
export function JubileeEmblem({ variant, ...props }: FiftyYearSealProps & { variant: JubileeVariant }) {
  if (variant === "lockup") return <JubileeLockup {...props} />;
  if (variant === "ribbon") return <JubileeRibbon {...props} />;
  if (variant === "numeral") return <JubileeNumeral {...props} />;
  return <FiftyYearSeal {...props} />;
}

/**
 * TEMPORARY (development only): chips on the hero for trying each emblem design. They set
 * `?seal=` in the address, so a design can be compared and shared. Removed once one is chosen.
 */
export function JubileePicker({ current }: { current: JubileeVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div role="group" aria-label="Try an anniversary emblem design" className="home-chip absolute left-4 top-4 z-[4] hidden flex-wrap items-center gap-1 rounded-full p-1 md:flex">
      <span className="px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">Emblem</span>
      {JUBILEE_VARIANTS.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === current}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set("seal", v);
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
          }}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
            v === current ? "bg-scic-green text-white" : "text-text-secondary hover:text-text-primary"
          )}
        >
          {LABEL[v]}
        </button>
      ))}
    </div>
  );
}

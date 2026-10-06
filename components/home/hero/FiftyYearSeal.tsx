"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";

export interface FiftyYearSealProps {
  years: number;
  founded: number;
  anniversary: number;
  /** id of the section the seal scrolls to */
  targetId: string;
  size?: number;
  className?: string;
}

/**
 * The anniversary seal: "50 YEARS · 1976-2026 · STA. CLARA INTERNATIONAL" set on a circle that
 * turns slowly around the figure, inside a green ring, with one reflective sweep the first time
 * it is seen. It is a link to the legacy timeline. The text stands still under reduced motion and
 * while off-screen.
 */
export function FiftyYearSeal({ years, founded, anniversary, targetId, size = 132, className }: FiftyYearSealProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [seen, setSeen] = useState(false);
  usePauseOffscreen(ref);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ring = `${years} YEARS · ${founded}–${anniversary} · STA. CLARA INTERNATIONAL · `;
  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      data-inview={seen ? "true" : undefined}
      aria-label={`${years} years, ${founded} to ${anniversary}: see the company's timeline`}
      onClick={(e) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(history.state, "", `#${targetId}`);
      }}
      className={cn(
        "home-seal-shine home-chip group relative inline-flex shrink-0 items-center justify-center transition-transform duration-300 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 132 132" width={size} height={size} aria-hidden className="absolute inset-0">
        <defs>
          <path id="home-seal-circle" d="M66 66m-50 0a50 50 0 1 1 100 0a50 50 0 1 1 -100 0" />
        </defs>
        <circle cx="66" cy="66" r="63" fill="none" stroke="var(--scic-green-energy)" strokeWidth="2" />
        <circle cx="66" cy="66" r="37" fill="none" stroke="var(--scic-green-energy)" strokeWidth="1" strokeOpacity="0.45" />
        <g className="home-seal-rotate">
          <text fill="currentColor" className="text-text-primary" style={{ fontFamily: "var(--font-mono)", fontSize: 8.6, letterSpacing: "0.2em", fontWeight: 600 }}>
            <textPath href="#home-seal-circle" startOffset="0" textLength="308" lengthAdjust="spacing">
              {ring}
            </textPath>
          </text>
        </g>
      </svg>
      <span className="relative flex flex-col items-center leading-none">
        <span className="home-hero-accent font-display text-[34px] font-extrabold tracking-[-0.03em]">{years}</span>
        <span className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.3em] text-text-muted">years</span>
      </span>
    </a>
  );
}

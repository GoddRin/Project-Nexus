"use client";

import React, { useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { useSeenOnce } from "@/components/home/useSeenOnce";

export interface FiftyYearSealProps {
  years: number;
  founded: number;
  anniversary: number;
  /** id of the section the emblem scrolls to */
  targetId: string;
  size?: number;
  className?: string;
}

const C = 80; // centre of the 160-unit drawing
const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (r: number, deg: number): [number, number] => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];

/** A leaf, drawn pointing right from its stem end */
const LEAF = "M0 0C3.2-3.6 8.4-3.9 12.5 0C8.4 3.9 3.2 3.6 0 0Z";

/**
 * One laurel branch: leaves in pairs along an arc, rising from the bottom of the emblem.
 * `side` is -1 for the left branch and 1 for the right (angles are in SVG degrees: 90 is down).
 */
function laurel(side: -1 | 1) {
  const leaves: { x: number; y: number; rot: number; i: number }[] = [];
  const steps = 8;
  for (let n = 0; n < steps; n++) {
    const sweep = 16 + n * 12.4; // degrees away from straight down
    const deg = 90 + side * sweep;
    const [x, y] = at(47, deg);
    // the direction the branch is growing in at this point
    const tangent = deg + side * 90;
    leaves.push({ x, y, rot: tangent - side * 30, i: n * 2 }); // outer leaf
    leaves.push({ x, y, rot: tangent + side * 34, i: n * 2 + 1 }); // inner leaf
  }
  // the tip
  const [tx, ty] = at(47, 90 + side * (16 + steps * 12.4 - 3));
  leaves.push({ x: tx, y: ty, rot: 90 + side * (16 + steps * 12.4) + side * 90, i: steps * 2 });
  return leaves;
}
const LEAVES = [...laurel(-1), ...laurel(1)];
const STEMS = ([-1, 1] as const).map((side) => {
  const [x0, y0] = at(47, 90 + side * 10);
  const [x1, y1] = at(47, 90 + side * 112);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A47 47 0 0 ${side === -1 ? 0 : 1} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
});
/** The engraved edge: seventy-two ticks, every sixth one longer */
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5;
  const [x0, y0] = at(i % 6 === 0 ? 67.5 : 69.5, deg);
  const [x1, y1] = at(73, deg);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`;
}).join("");

/**
 * The Golden Jubilee emblem: a struck medal in the company's fiftieth year. A dark face ringed
 * in gold, an engraved edge that turns slowly, "GOLDEN ANNIVERSARY" arched over the figure, a
 * laurel wreath that grows leaf by leaf the first time it is seen, and the years on a ribbon.
 * One sheen crosses it on arrival. It is a link to the company's timeline. The edge stands
 * still, and the wreath is simply there, under reduced motion and while off-screen.
 */
export function FiftyYearSeal({ years, founded, anniversary, targetId, size = 148, className }: FiftyYearSealProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useSeenOnce(ref, 0.6);
  usePauseOffscreen(ref);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gold = `jubilee-gold-${uid}`;
  const face = `jubilee-face-${uid}`;
  const arc = `jubilee-arc-${uid}`;
  const goldFill = `url(#${gold})`;

  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      data-inview={seen ? "true" : undefined}
      aria-label={`Golden anniversary: ${years} years, ${founded} to ${anniversary}. See the company's timeline.`}
      onClick={(e) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(history.state, "", `#${targetId}`);
      }}
      className={cn("home-jubilee home-seal-shine relative inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jubilee-mid)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--jubilee-hi)" />
            <stop offset="0.45" stopColor="var(--jubilee-mid)" />
            <stop offset="1" stopColor="var(--jubilee-lo)" />
          </linearGradient>
          <radialGradient id={face} cx="0.38" cy="0.3" r="0.9">
            <stop offset="0" stopColor="var(--jubilee-face-a)" />
            <stop offset="1" stopColor="var(--jubilee-face-b)" />
          </radialGradient>
          {/* the arch the lettering sits on (left to right over the top) */}
          <path id={arc} d={`M${at(57, 208).join(" ")}A57 57 0 0 1 ${at(57, 332).join(" ")}`} />
        </defs>

        {/* the medal */}
        <circle cx={C} cy={C} r="78" fill={`url(#${face})`} />
        <circle cx={C} cy={C} r="77" fill="none" stroke={goldFill} strokeWidth="2.2" />
        <path d={TICKS} stroke={goldFill} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" className="home-jubilee-ticks" />
        <circle cx={C} cy={C} r="65" fill="none" stroke={goldFill} strokeWidth="0.7" opacity="0.8" />

        <text fill="var(--jubilee-hi)" style={{ fontFamily: "var(--font-mono)", fontSize: 6.6, fontWeight: 700, letterSpacing: "0.22em" }}>
          <textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">
            GOLDEN ANNIVERSARY
          </textPath>
        </text>

        {/* the wreath */}
        {STEMS.map((d) => (
          <path key={d} d={d} fill="none" stroke={goldFill} strokeWidth="0.8" opacity="0.85" />
        ))}
        {LEAVES.map((l, n) => (
          <g key={n} transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.rot.toFixed(1)}) scale(0.78)`}>
            <path d={LEAF} fill={goldFill} className="home-jubilee-leaf" style={{ ["--i" as string]: l.i }} />
          </g>
        ))}

        {/* the figure */}
        <text x={C} y="93" textAnchor="middle" fill={goldFill} style={{ fontFamily: "var(--font-display)", fontSize: 47, fontWeight: 800, letterSpacing: "-0.04em" }}>
          {years}
        </text>
        <text x={C + 1.2} y="105.5" textAnchor="middle" fill="var(--jubilee-hi)" style={{ fontFamily: "var(--font-mono)", fontSize: 6.4, fontWeight: 700, letterSpacing: "0.42em" }}>
          YEARS
        </text>

        {/* the ribbon, with its folded ends */}
        <path d="M27 121l-9 2.5 5 6-5 6 9 2.5z" fill="var(--jubilee-lo)" />
        <path d="M133 121l9 2.5-5 6 5 6-9 2.5z" fill="var(--jubilee-lo)" />
        <path d="M25 118.5Q80 126.5 135 118.5V135Q80 143 25 135Z" fill={goldFill} />
        <path id={`${arc}-r`} d="M25 130.6Q80 138.6 135 130.6" fill="none" />
        <text fill="var(--jubilee-ink)" style={{ fontFamily: "var(--font-mono)", fontSize: 8.4, fontWeight: 800, letterSpacing: "0.16em" }}>
          <textPath href={`#${arc}-r`} startOffset="50%" textAnchor="middle">
            {founded} — {anniversary}
          </textPath>
        </text>
      </svg>
    </a>
  );
}

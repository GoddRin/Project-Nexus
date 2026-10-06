"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BRAND_EASE } from "@/components/shared/motion";

export type RingTone = "green" | "blue" | "cyan" | "amber" | "red";
const STROKE: Record<RingTone, string> = {
  green: "var(--scic-green-energy)",
  blue: "var(--scic-blue)",
  cyan: "var(--scic-cyan)",
  amber: "var(--scic-amber)",
  red: "var(--scic-red)",
};

export interface ProgressRingProps {
  /** 0 to 100 */
  value: number;
  size?: number;
  thickness?: number;
  tone?: RingTone;
  /** what the ring measures, for screen readers ("Overall progress") */
  label: string;
  /** centre content; defaults to the percentage */
  children?: React.ReactNode;
  className?: string;
}

/**
 * A progress ring that draws itself the first time it is seen (pathLength 0 -> value).
 * Under reduced motion it is simply shown at its value.
 */
export function ProgressRing({ value, size = 96, thickness = 8, tone = "green", label, children, className }: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const r = (size - thickness) / 2;
  const c = size / 2;
  return (
    <div
      role="img"
      aria-label={`${label}: ${pct.toFixed(pct % 1 ? 1 : 0)} percent`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--home-ring-track)" strokeWidth={thickness} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: pct / 100 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.2, ease: BRAND_EASE, delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono tabular-nums text-text-primary">
        {children ?? (
          <span className="font-semibold leading-none" style={{ fontSize: Math.max(12, size * 0.22) }}>
            {pct.toFixed(pct % 1 ? 1 : 0)}
            <span className="text-text-muted" style={{ fontSize: Math.max(9, size * 0.12) }}>
              %
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

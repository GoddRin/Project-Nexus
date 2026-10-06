"use client";

import React, { useRef } from "react";
import { useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/CountUp";

export type StatTone = "green" | "blue" | "cyan" | "amber" | "red";

const TONE: Record<StatTone, { icon: string; accent: string }> = {
  green: { icon: "text-scic-green bg-scic-green/10 dark:text-scic-green-bright", accent: "scic-card-accent-green" },
  blue: { icon: "text-scic-blue bg-scic-blue/10", accent: "scic-card-accent-blue" },
  cyan: { icon: "text-scic-cyan bg-scic-cyan/10", accent: "scic-card-accent-cyan" },
  amber: { icon: "text-scic-amber bg-scic-amber/10", accent: "scic-card-accent-amber" },
  red: { icon: "text-scic-red bg-scic-red/10", accent: "scic-card-accent-red" },
};

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  /** change since the previous reading; shown with an arrow, never invented */
  delta?: { value: number; decimals?: number; unit?: string; label?: string };
  tone?: StatTone;
  className?: string;
}

/** One figure with its icon, counted up the first time the tile scrolls into view. */
export function StatTile({ icon: Icon, label, value, decimals = 0, unit, delta, tone = "green", className }: StatTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const t = TONE[tone];
  const up = (delta?.value ?? 0) >= 0;
  return (
    <div ref={ref} className={cn("glass-scic-card spotlight p-4 md:p-5", t.accent, className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="home-eyebrow truncate">{label}</p>
        <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", t.icon)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 font-mono tabular-nums text-text-primary">
        {/* (the final figure is always in the markup for screen readers and no-JS) */}
        <span className="sr-only">
          {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          {unit ? ` ${unit}` : ""}
        </span>
        <span aria-hidden className="text-2xl font-semibold leading-none sm:text-3xl md:text-4xl">
          {seen ? <CountUp value={value} decimals={decimals} /> : (0).toFixed(decimals)}
        </span>
        {unit && (
          <span aria-hidden className="text-sm font-medium text-text-muted">
            {unit}
          </span>
        )}
      </p>
      {delta && (
        <p className={cn("mt-2 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums", up ? "text-scic-green dark:text-scic-green-bright" : "text-scic-red")}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
          {up ? "+" : ""}
          {delta.value.toFixed(delta.decimals ?? 0)}
          {delta.unit ?? ""}
          {delta.label && <span className="text-text-muted">{delta.label}</span>}
        </p>
      )}
    </div>
  );
}

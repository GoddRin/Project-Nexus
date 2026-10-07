"use client";

import React, { useRef } from "react";
import { useInView } from "framer-motion";
import { Building2, CheckCircle2, HardHat, Leaf, MapPinned, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/CountUp";

const oneDecimalIfNeeded = (n: number) => (n % 1 ? 1 : 0);
const TONE = {
  green: "text-scic-green dark:text-scic-green-bright",
  amber: "text-scic-amber",
  blue: "text-scic-blue",
  cyan: "text-scic-cyan",
} as const;

interface Figure {
  icon: LucideIcon;
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  tone: keyof typeof TONE;
}

/**
 * The portfolio's six figures in one band (three across on a phone, six on a wide screen), each
 * counted up the first time the band is seen. One card, not six: the numbers read as a line.
 */
export function PortfolioFigures({ total, ongoing, completed, totalMw, renewableMw, provinces }: { total: number; ongoing: number; completed: number; totalMw: number; renewableMw: number; provinces: number }) {
  const ref = useRef<HTMLDListElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const figures: Figure[] = [
    { icon: Building2, label: "Projects", value: total, tone: "green" },
    { icon: HardHat, label: "Ongoing", value: ongoing, tone: "amber" },
    { icon: CheckCircle2, label: "Completed", value: completed, tone: "blue" },
    { icon: Zap, label: "Plant capacity", value: totalMw, decimals: oneDecimalIfNeeded(totalMw), unit: "MW", tone: "cyan" },
    { icon: Leaf, label: "Renewable", value: renewableMw, decimals: oneDecimalIfNeeded(renewableMw), unit: "MW", tone: "green" },
    { icon: MapPinned, label: "Provinces", value: provinces, tone: "blue" },
  ];
  return (
    // (.glass-scic-card is a flex column by its own rule: the grid sits in an inner element)
    <div className="glass-scic-card overflow-hidden p-0">
      <dl ref={ref} className="grid grid-cols-2 gap-px bg-border-hairline sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1.5 bg-bg-panel px-4 py-3.5">
          <dt className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            <f.icon className={cn("h-3.5 w-3.5 shrink-0", TONE[f.tone])} aria-hidden />
            <span className="truncate">{f.label}</span>
          </dt>
          <dd className="flex items-baseline gap-1 font-mono tabular-nums text-text-primary">
            <span className="sr-only">
              {f.value.toLocaleString("en-US", { minimumFractionDigits: f.decimals ?? 0, maximumFractionDigits: f.decimals ?? 0 })}
              {f.unit ? ` ${f.unit}` : ""}
            </span>
            <span aria-hidden className="text-2xl font-semibold leading-none md:text-[1.7rem]">
              {seen ? <CountUp value={f.value} decimals={f.decimals ?? 0} /> : (0).toFixed(f.decimals ?? 0)}
            </span>
            {f.unit && (
              <span aria-hidden className="text-xs font-medium text-text-muted">
                {f.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
      </dl>
    </div>
  );
}

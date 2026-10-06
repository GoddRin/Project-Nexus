import React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders for Nexus Home. Each one has the outer size of the section it stands in
 * for (same card padding, same row heights), so nothing shifts when the content streams in.
 * They are server components: no JS is shipped for them.
 */

function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("home-shimmer", className)} style={style} />;
}

function Card({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-label={`Loading ${label}`} className={cn("glass-scic-card p-4 md:p-5", className)}>
      {children}
      <span className="sr-only">Loading {label}…</span>
    </div>
  );
}

/** Hero: same min-height as the real one */
export function HeroSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="relative overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel md:min-h-[min(76vh,720px)]">
      <div className="relative flex min-h-[420px] flex-col justify-end gap-4 p-6 md:min-h-[min(76vh,720px)] md:p-10">
        <Bar className="h-4 w-56" />
        <Bar className="h-14 w-[min(560px,80%)] md:h-20" />
        <Bar className="h-4 w-[min(420px,70%)]" />
        <div className="mt-2 flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-12 w-40 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Live ticker strip */
export function TickerSkeleton() {
  return <Bar className="h-11 w-full rounded-2xl" />;
}

/** Weather glance card */
export function WeatherSkeleton() {
  return (
    <Card label="weather" className="min-h-[340px]">
      <div className="flex items-center justify-between">
        <Bar className="h-3 w-32" />
        <Bar className="h-7 w-44 rounded-full" />
      </div>
      <div className="mt-5 flex items-center gap-5">
        <Bar className="h-24 w-24 rounded-3xl" />
        <div className="flex-1 space-y-3">
          <Bar className="h-12 w-32" />
          <Bar className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} className="h-20" />
        ))}
      </div>
      <Bar className="mt-5 h-10 w-full rounded-xl" />
    </Card>
  );
}

/** AI daily brief card */
export function BriefSkeleton() {
  return (
    <Card label="daily brief" className="min-h-[340px]">
      <Bar className="h-3 w-48" />
      <Bar className="mt-4 h-7 w-[85%]" />
      <Bar className="mt-2 h-7 w-[60%]" />
      <div className="mt-6 space-y-4">
        {[92, 84, 76].map((w) => (
          <div key={w} className="flex gap-3">
            <Bar className="mt-1 h-2 w-2 shrink-0 rounded-full" />
            <Bar className="h-4" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <Bar className="mt-8 h-3 w-56" />
    </Card>
  );
}

/** Rows of a list (ops snapshot, trending, feed) */
export function ListSkeleton({ rows = 5, label = "list", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <Card label={label} className={className}>
      <Bar className="h-3 w-32" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bar className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3.5" style={{ width: `${88 - (i % 3) * 14}%` }} />
              <Bar className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Newsroom: featured story beside a feed */
export function NewsroomSkeleton() {
  return (
    <div role="status" aria-label="Loading newsroom" className="grid gap-4 md:grid-cols-2">
      <Bar className="aspect-[16/11] w-full rounded-2xl" />
      <ListSkeleton rows={5} label="news feed" />
    </div>
  );
}

/** Row of stat tiles */
export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading figures" className={cn("grid grid-cols-2 gap-4", count === 6 ? "md:grid-cols-3" : "lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-scic-card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-8 rounded-lg" />
          </div>
          <Bar className="mt-3 h-9 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Portfolio: dot map beside the carousel */
export function PortfolioSkeleton() {
  return (
    <div role="status" aria-label="Loading portfolio" className="grid gap-6 lg:grid-cols-2">
      <Bar className="aspect-[4/5] max-h-[560px] w-full rounded-2xl" />
      <div className="flex gap-4 overflow-hidden">
        {[0, 1].map((i) => (
          <Bar key={i} className="h-[360px] w-[280px] shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** A wide card (flagship spotlight, timeline) */
export function WideCardSkeleton({ height = 320, label = "section" }: { height?: number; label?: string }) {
  return (
    <div role="status" aria-label={`Loading ${label}`}>
      <Bar className="w-full rounded-2xl" style={{ height }} />
    </div>
  );
}

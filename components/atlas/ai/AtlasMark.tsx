"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The Atlas mark: a surveyor's benchmark seen through an instrument.
 *
 * An outer ring with four tick marks (the reticle of a total station), two contour lines crossing
 * the field (the map), and a solid survey point at the centre. It says "engineering and
 * geography" instead of the generic AI sparkle.
 *
 * States: "idle" (still), "working" (the reticle turns slowly while he looks something up),
 * "speaking" (the point pulses). Colour comes from `currentColor`, so it follows the theme.
 */
export type AtlasMarkState = "idle" | "working" | "speaking";

export function AtlasMark({
  size = 20,
  state = "idle",
  className,
  title = "Atlas",
}: {
  size?: number;
  state?: AtlasMarkState;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      {/* reticle: ring and ticks (turns while working) */}
      <g
        className={cn(state === "working" && "origin-center animate-[spin_3.2s_linear_infinite] motion-reduce:animate-none")}
        style={{ transformOrigin: "16px 16px" }}
      >
        <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
        <path d="M16 1.5v4.5M16 26v4.5M1.5 16h4.5M26 16h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* contour lines: the ground */}
      <path
        d="M6.4 19.6c3.1-2.6 6.2-2.9 9.3-.9 3.2 2 6.3 1.8 9.9-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M8.2 13.4c2.6-1.9 5.1-2 7.6-.4 2.6 1.6 5.2 1.5 8.1-.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* the survey point */}
      <circle
        cx="16"
        cy="16"
        r="2.6"
        fill="currentColor"
        className={cn(state === "speaking" && "animate-pulse motion-reduce:animate-none")}
      />
    </svg>
  );
}

/** The mark on a tile, as used for his avatar in the chat and the panel header. */
export function AtlasMarkTile({
  size = 28,
  state = "idle",
  className,
}: {
  size?: number;
  state?: AtlasMarkState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-[10px] bg-[#007B3E] text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <AtlasMark size={Math.round(size * 0.68)} state={state} />
    </span>
  );
}

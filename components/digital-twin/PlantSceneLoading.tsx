"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function PlantSceneLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--bg-base,#0B1013)] text-text-primary">
      <div className="relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.2] dark:bg-white/[0.02] p-8 shell-blur shadow-2xl backdrop-blur-md">
        {/* Subtle glowing ring background */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full bg-flow-teal/20 blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-flow-teal drop-shadow-[0_0_12px_rgba(31,182,166,0.6)]" />
        </div>

        {/* Control-room aesthetic text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-flow-teal">
            DIGITAL TWIN ENGINE
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            INITIALIZING ARCHITECTURAL MODEL…
          </span>
        </div>

        {/* Status indicator bar */}
        <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-black/40 dark:bg-white/10">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] rounded-full bg-gradient-to-r from-flow-teal/40 via-flow-teal to-flow-teal/40" />
        </div>
      </div>
    </div>
  );
}

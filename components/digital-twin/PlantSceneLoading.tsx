"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function PlantSceneLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-bg-base text-text-primary">
      <div className="relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-border-hairline bg-card/95 dark:bg-[#0B1013]/90 p-8 shell-blur shadow-2xl backdrop-blur-md">
        {/* Subtle glowing ring background */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full bg-scic-green/20 dark:bg-flow-teal/20 blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-scic-green dark:text-flow-teal drop-shadow-[0_0_12px_rgba(16,165,29,0.5)]" />
        </div>

        {/* Control-room aesthetic text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-scic-green dark:text-flow-teal">
            DIGITAL TWIN ENGINE
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            INITIALIZING ARCHITECTURAL MODEL…
          </span>
        </div>

        {/* Status indicator bar */}
        <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] rounded-full bg-gradient-to-r from-scic-green/40 via-scic-green to-scic-green/40 dark:from-flow-teal/40 dark:via-flow-teal dark:to-flow-teal/40" />
        </div>
      </div>
    </div>
  );
}

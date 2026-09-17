"use client";

import dynamic from "next/dynamic";
import { PlantSceneLoading } from "@/components/digital-twin/PlantSceneLoading";
import { Box, ShieldCheck, Video } from "lucide-react";

// Dynamically import PlantScene with ssr disabled for WebGL hydration safety
const PlantScene = dynamic(
  () => import("@/components/digital-twin/PlantScene"),
  {
    ssr: false,
    loading: () => <PlantSceneLoading />,
  }
);

export const dynamicMode = "force-dynamic";

export default function DigitalTwinPage() {
  return (
    <div className="-m-3.5 sm:-m-5 md:-m-6 -mb-24 md:-mb-6 flex h-[calc(100vh-3.5rem)] flex-col relative overflow-hidden bg-[var(--bg-base,#0B1013)] text-text-primary">
      {/* Floating Control Room HUD Header */}
      <header className="absolute top-2 sm:top-4 left-2.5 sm:left-6 right-2.5 sm:right-6 z-20 flex flex-wrap items-center justify-between gap-2 sm:gap-4 rounded-xl border border-border-hairline bg-card/90 dark:bg-[#0B1013]/80 px-3 sm:px-4 py-2 sm:py-3 shell-blur shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20 text-flow-teal shrink-0">
            <Box className="h-4 sm:h-5 w-4 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm sm:text-base font-semibold tracking-tight text-text-primary dark:text-white truncate">
                Digital Twin
              </h1>
              <span className="flex items-center gap-1 rounded-md bg-emerald-50/90 dark:bg-flow-teal/10 px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-medium text-scic-green dark:text-flow-teal border border-emerald-200/70 dark:border-flow-teal/20 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-scic-green dark:bg-flow-teal animate-pulse" />
                <span className="hidden xs:inline">ARCHITECTURAL</span> MODEL
              </span>
            </div>
            <p className="font-mono text-[10px] sm:text-xs text-text-muted truncate max-w-[220px] sm:max-w-none">
              Tumauini HEPP — 3D Spatial Inspection
            </p>
          </div>
        </div>

        {/* HUD Toolbar & Inspection Controls Guidance */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-muted shrink-0">
          <div className="hidden lg:flex items-center gap-2 rounded-lg bg-slate-100/80 dark:bg-white/[0.04] px-3 py-1.5 border border-slate-200/60 dark:border-white/[0.06] font-mono text-[11px] text-text-secondary dark:text-text-muted">
            <Video className="h-3.5 w-3.5 text-scic-green dark:text-flow-teal" />
            <span>Orbit: Drag · Zoom: Pinch/Scroll</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-emerald-50/80 dark:bg-flow-teal/10 px-2.5 sm:px-3 py-1 sm:py-1.5 border border-emerald-200/60 dark:border-flow-teal/20 font-mono text-[10px] sm:text-[11px] text-scic-green dark:text-flow-teal font-medium">
            <ShieldCheck className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            <span>Active Control</span>
          </div>
        </div>
      </header>

      {/* Main 3D Canvas Viewport */}
      <main className="relative flex-1 w-full h-full">
        <PlantScene />
      </main>
    </div>
  );
}

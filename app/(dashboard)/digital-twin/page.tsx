"use client";

import dynamic from "next/dynamic";
import { PlantSceneLoading } from "@/components/digital-twin/PlantSceneLoading";
import { Box, Layers, ShieldCheck, Video } from "lucide-react";

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
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col relative overflow-hidden bg-[var(--bg-base,#0B1013)] text-text-primary">
      {/* Floating Control Room HUD Header */}
      <header className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/60 dark:bg-[#0B1013]/80 px-4 py-3 shell-blur shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20 text-flow-teal">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-semibold tracking-tight text-white">
                Digital Twin
              </h1>
              <span className="flex items-center gap-1 rounded-md bg-flow-teal/10 px-2 py-0.5 font-mono text-[10px] font-medium text-flow-teal border border-flow-teal/20">
                <span className="h-1.5 w-1.5 rounded-full bg-flow-teal animate-pulse" />
                ARCHITECTURAL MODEL
              </span>
            </div>
            <p className="font-mono text-xs text-text-muted">
              Tumauini Hydroelectric Power Plant — 3D Spatial Inspection
            </p>
          </div>
        </div>

        {/* HUD Toolbar & Inspection Controls Guidance */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 border border-white/[0.06] font-mono text-[11px]">
            <Video className="h-3.5 w-3.5 text-flow-teal" />
            <span>Orbit: Drag · Pan: Shift+Drag · Zoom: Scroll</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 border border-white/[0.06] font-mono text-[11px] text-flow-teal">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Controlled Inspection Angle</span>
          </div>
        </div>
      </header>

      {/* Main 3D Canvas Viewport */}
      <main className="relative flex-1 w-full h-full">
        <PlantScene />
      </main>

      {/* Floating HUD Footer Status */}
      <footer className="absolute bottom-4 left-6 z-20 pointer-events-none select-none">
        <div className="flex items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-black/60 dark:bg-[#0B1013]/80 px-3 py-1.5 font-mono text-[10px] text-text-muted backdrop-blur-md">
          <Layers className="h-3.5 w-3.5 text-flow-teal" />
          <span>11.3 MW HEPP · Powerhouse Architectural Model</span>
        </div>
      </footer>
    </div>
  );
}

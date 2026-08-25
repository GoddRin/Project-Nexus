"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sierraMadreSoundEngine } from "./SierraMadreSoundEngine";
import type { AtmosphereTimeMode } from "./RealisticSkyAtmosphere";
import { cn } from "@/lib/utils";

interface SiteAudioControlsProps {
  timeMode: AtmosphereTimeMode;
  isStormActive?: boolean;
}

export function SiteAudioControls({ timeMode, isStormActive = false }: SiteAudioControlsProps) {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  useEffect(() => {
    sierraMadreSoundEngine.updateAtmosphere(timeMode, isStormActive);
  }, [timeMode, isStormActive]);

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setHasInteracted(true);
    sierraMadreSoundEngine.setMuted(nextMuted);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        variant={isMuted ? "outline" : "default"}
        size="sm"
        onClick={handleToggleSound}
        className={cn(
          "h-7 px-2.5 font-mono text-[11px] font-semibold rounded-lg shadow-xl backdrop-blur-md transition-all flex items-center gap-1.5",
          isMuted
            ? "border-white/10 bg-black/85 text-text-muted hover:text-white hover:border-white/20"
            : "border-flow-teal/50 bg-flow-teal/20 text-flow-teal ring-1 ring-flow-teal/40 hover:bg-flow-teal/30"
        )}
        title={isMuted ? "Unmute Sierra Madre 3D Soundscape" : "Mute Soundscape"}
      >
        {isMuted ? (
          <>
            <VolumeX className="h-3.5 w-3.5 text-text-muted" />
            <span className="hidden sm:inline">SOUND: OFF</span>
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 text-flow-teal animate-pulse" />
            <span className="hidden sm:inline">
              {isStormActive
                ? "STORM AUDIO"
                : timeMode === "MORNING"
                ? "DAWN CHORUS"
                : timeMode === "AFTERNOON"
                ? "CICADAS & RAPTOR"
                : timeMode === "SUNSET"
                ? "DUSK FROGS"
                : "NIGHT SOUNDS"}
            </span>
            {/* Animated Equalizer Waves */}
            <span className="flex items-end gap-0.5 h-3 px-0.5">
              <span className="w-0.5 h-2 bg-flow-teal animate-pulse" />
              <span className="w-0.5 h-3 bg-flow-teal animate-bounce" />
              <span className="w-0.5 h-1.5 bg-flow-teal animate-pulse" />
            </span>
          </>
        )}
      </Button>
    </div>
  );
}

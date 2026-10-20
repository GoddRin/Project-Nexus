"use client";

import React from "react";
import { StormThreatLevel } from "@/lib/weather/news/tvNewsTypes";
import { CycloneGlyph } from "./CycloneGlyph";

interface BroadcastSatelliteIconProps {
  className?: string;
  size?: number;
  threatLevel?: StormThreatLevel;
  animated?: boolean;
  showReticle?: boolean;
}

const THREAT_PALETTE: Record<StormThreatLevel, { eye: string; glow: string }> = {
  RED: { eye: "#EF4444", glow: "rgba(239, 68, 68, 0.9)" },
  ORANGE: { eye: "#F59E0B", glow: "rgba(245, 158, 11, 0.8)" },
  YELLOW: { eye: "#EAB308", glow: "rgba(234, 179, 8, 0.7)" },
  FAIR_DISTANT: { eye: "#0EA5E9", glow: "rgba(14, 165, 233, 0.65)" },
  NORMAL: { eye: "#10B981", glow: "rgba(16, 185, 129, 0.6)" },
};

/**
 * Philippine Weather Broadcast Desk Emblem.
 *
 * Powered by the dynamic CycloneGlyph. Motion and eyewall indicators react directly
 * to active Philippine tropical cyclone status:
 * - RED / ORANGE: Active cyclone within PAR -> active vortex spin, eyewall beacon, severe radar ring
 * - YELLOW: Distant / Monsoon watch -> gentle eye glow
 * - NORMAL / FAIR: Static, clean precision vector
 */
export default function BroadcastSatelliteIcon({
  className,
  size = 24,
  threatLevel = "NORMAL",
  animated = true,
  showReticle,
}: BroadcastSatelliteIconProps) {
  const tone = THREAT_PALETTE[threatLevel] ?? THREAT_PALETTE.NORMAL;
  const isParActive = threatLevel === "RED" || threatLevel === "ORANGE";
  const isElevated = isParActive || threatLevel === "YELLOW";
  const isSevere = threatLevel === "RED";

  return (
    <CycloneGlyph
      size={size}
      className={className}
      eyeColor={tone.eye}
      glow={animated ? tone.glow : undefined}
      spin={animated && isParActive}
      pulse={animated && isElevated}
      isSevere={isSevere}
      showReticle={showReticle ?? size >= 20}
    />
  );
}

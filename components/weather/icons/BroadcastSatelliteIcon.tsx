"use client";

import React from "react";
import { StormThreatLevel } from "@/lib/weather/news/tvNewsTypes";
import { CycloneGlyph } from "./CycloneGlyph";

interface BroadcastSatelliteIconProps {
  className?: string;
  size?: number;
  threatLevel?: StormThreatLevel;
  animated?: boolean;
}

/** Eye colour + halo per threat level. */
const THREAT_EYE: Record<StormThreatLevel, { eye: string; glow: string }> = {
  RED: { eye: "#F4524D", glow: "rgba(244, 82, 77, 0.75)" },
  ORANGE: { eye: "#F5A524", glow: "rgba(245, 165, 36, 0.7)" },
  YELLOW: { eye: "#EAC435", glow: "rgba(234, 196, 53, 0.65)" },
  FAIR_DISTANT: { eye: "#4E9DC2", glow: "rgba(78, 157, 194, 0.6)" },
  NORMAL: { eye: "#23B26D", glow: "rgba(35, 178, 109, 0.6)" },
};

/**
 * Weather Broadcast Desk emblem.
 *
 * A tropical-cyclone glyph whose eye carries the live threat colour. Motion is deliberate:
 * the arms only rotate when a cyclone is inside PAR (ORANGE / RED), and the eye only pulses
 * at elevated levels, so a calm desk stays calm. Everything honours prefers-reduced-motion.
 *
 * Kept under its original name so the Atlas header, news modal and announcement widget
 * pick up the new mark without further changes.
 */
export default function BroadcastSatelliteIcon({
  className,
  size = 24,
  threatLevel = "NORMAL",
  animated = true,
}: BroadcastSatelliteIconProps) {
  const tone = THREAT_EYE[threatLevel] ?? THREAT_EYE.NORMAL;
  const active = threatLevel === "RED" || threatLevel === "ORANGE";
  const elevated = active || threatLevel === "YELLOW";

  return (
    <CycloneGlyph
      size={size}
      className={className}
      eyeColor={tone.eye}
      glow={animated ? tone.glow : undefined}
      spin={animated && active}
      pulse={animated && elevated}
    />
  );
}

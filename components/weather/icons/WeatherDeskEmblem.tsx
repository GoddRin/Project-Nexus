"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StormThreatLevel } from "@/lib/weather/news/tvNewsTypes";

interface WeatherDeskEmblemProps {
  className?: string;
  size?: number;
  threatLevel?: StormThreatLevel;
  /** Networks currently synced (PAGASA, GMA, ABS-CBN, TV5); each lights one ring. */
  syncedNetworks?: number;
  animated?: boolean;
}

const THREAT_COLOR: Record<StormThreatLevel, string> = {
  RED: "#EF4444",
  ORANGE: "#F59E0B",
  YELLOW: "#EAB308",
  FAIR_DISTANT: "#38BDF8",
  NORMAL: "#36AD69",
};

const RING_RADII = [5, 8.6, 12.2, 15.8];
const SWEEP_DEG = 250;
const CENTER = 20;

function arcPath(radius: number, startDeg: number, sweepDeg: number) {
  const toPoint = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(CENTER + radius * Math.cos(rad)).toFixed(2)} ${(CENTER + radius * Math.sin(rad)).toFixed(2)}`;
  };
  return `M${toPoint(startDeg)} A${radius} ${radius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${toPoint(startDeg + sweepDeg)}`;
}

/**
 * Four broken rings read as a cyclone vortex and as broadcast waves. Each ring
 * is one synced news network; the centre is the live beacon.
 */
export default function WeatherDeskEmblem({
  className,
  size = 32,
  threatLevel = "NORMAL",
  syncedNetworks = 4,
  animated = true,
}: WeatherDeskEmblemProps) {
  const color = THREAT_COLOR[threatLevel] ?? THREAT_COLOR.NORMAL;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Weather broadcast desk"
      className={cn("shrink-0 overflow-visible", className)}
      style={{ filter: animated ? `drop-shadow(0 0 5px ${color}66)` : undefined }}
    >
      <title>Weather broadcast desk</title>
      <style>{`@media (prefers-reduced-motion: reduce){.desk-emblem-motion{display:none}}`}</style>

      {/* Outer graticule ring with cardinal ticks */}
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.8" />
      <path
        d="M20 0.5V3M20 37V39.5M0.5 20H3M37 20H39.5"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Vortex rings: each offset 70deg so the gaps spiral outward */}
      <g>
        {animated && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 20 20"
            to="360 20 20"
            dur="24s"
            repeatCount="indefinite"
          />
        )}
        {RING_RADII.map((radius, i) => (
          <path
            key={radius}
            d={arcPath(radius, i * 70, SWEEP_DEG)}
            stroke={i < syncedNetworks ? color : "currentColor"}
            strokeOpacity={i < syncedNetworks ? 0.95 - i * 0.12 : 0.25}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Live beacon */}
      <circle cx="20" cy="20" r="2.2" fill={color} />
      {animated && (
        <circle cx="20" cy="20" r="2.2" stroke={color} strokeWidth="0.9" className="desk-emblem-motion">
          <animate attributeName="r" values="2.2;4.2;2.2" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface TacticalAlertOctagonProps {
  /** Hoisted PAGASA Wind Signal number (1, 2, 3, 4, 5) or 0 for site advisory */
  signalNumber?: number;
  size?: number;
  className?: string;
  isSevere?: boolean;
}

/**
 * Tactical Alert Octagon (!)
 *
 * An elevated, mission-critical meteorological warning insignia:
 * - Faithful to the classic Alert Octagon (!) requested by operations
 * - Pure SVG & CSS: zero AI slop, no 3D coin clutter, completely clean & authoritative
 * - Chamfered dual-ring octagonal hazard geometry with inner tactical calibration reticle
 * - Deep obsidian command housing with specular glass bevel and top sheen
 * - High-luminance exclamation mark (!) with neon phosphor core filament
 * - Threat-reactive radar pulse wave and ambient warning breathing glow
 * - Full `prefers-reduced-motion` compliance
 */
export function TacticalAlertOctagon({
  signalNumber = 1,
  size = 48,
  className,
  isSevere = false,
}: TacticalAlertOctagonProps) {
  const uid = useId().replace(/:/g, "");

  const isHighThreat = signalNumber >= 3 || isSevere;
  const isModerateThreat = signalNumber >= 1 && !isHighThreat;

  const accentColor = isHighThreat
    ? "#EF4444" // Crimson (Signal 3+)
    : isModerateThreat
    ? "#F59E0B" // Solar Amber (Signal 1-2)
    : "#14B8A6"; // Atmospheric Teal (Site Advisory)

  const housingFill = isHighThreat
    ? `url(#housing-high-${uid})`
    : isModerateThreat
    ? `url(#housing-mod-${uid})`
    : `url(#housing-calm-${uid})`;

  const borderColor = isHighThreat
    ? "rgba(239, 68, 68, 0.55)"
    : isModerateThreat
    ? "rgba(245, 158, 11, 0.45)"
    : "rgba(20, 184, 166, 0.45)";

  const glowShadow = isHighThreat
    ? "0 0 18px -2px rgba(239, 68, 68, 0.45)"
    : isModerateThreat
    ? "0 0 14px -2px rgba(245, 158, 11, 0.35)"
    : "0 0 12px -3px rgba(20, 184, 166, 0.25)";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center select-none group transition-transform duration-200 hover:scale-[1.04]",
        className
      )}
      style={{
        width: size,
        height: size,
        filter: glowShadow,
      }}
      aria-label={`PAGASA TCWS Signal Alert #${signalNumber}`}
      role="img"
    >
      {/* 1. Outer Pulsing Radar Wave (Sonar Hazard Ping) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-ping motion-reduce:animate-none"
        style={{
          transformOrigin: "center center",
          animationDuration: isHighThreat ? "2s" : "3s",
        }}
        aria-hidden="true"
      >
        <polygon
          points="15.72 4 32.28 4 44 15.72 44 32.28 32.28 44 15.72 44 4 32.28 4 15.72"
          stroke={accentColor}
          strokeWidth="1.6"
          strokeOpacity="0.45"
        />
      </svg>

      {/* 2. Main High-Precision Tactical Octagon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Housing Background Gradients */}
          <radialGradient id={`housing-high-${uid}`} cx="50%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#2D0A0E" />
            <stop offset="100%" stopColor="#0E0204" />
          </radialGradient>
          <radialGradient id={`housing-mod-${uid}`} cx="50%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#2A1604" />
            <stop offset="100%" stopColor="#0A0602" />
          </radialGradient>
          <radialGradient id={`housing-calm-${uid}`} cx="50%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#062220" />
            <stop offset="100%" stopColor="#020E0D" />
          </radialGradient>

          {/* Specular Top Bevel Gradient */}
          <linearGradient id={`bevel-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>

          {/* Core Glow Filter */}
          <filter id={`core-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={accentColor} floodOpacity="0.8" />
          </filter>
        </defs>

        {/* 1. Base Obsidian Rounded Tile Housing */}
        <rect width="48" height="48" rx="14" fill={housingFill} />
        <rect width="48" height="48" rx="14" fill={`url(#bevel-${uid})`} />
        <rect
          x="0.5"
          y="0.5"
          width="47"
          height="47"
          rx="13.5"
          stroke={borderColor}
          strokeWidth="1"
        />

        {/* 2. Top Specular Glass Highlight */}
        <path
          d="M2 14C2 7.37 7.37 2 14 2H34C40.63 2 46 7.37 46 14V16H2V14Z"
          fill="#FFFFFF"
          fillOpacity="0.1"
        />

        {/* 3. Primary Chamfered Alert Octagon */}
        <polygon
          points="15.72 4.5 32.28 4.5 43.5 15.72 43.5 32.28 32.28 43.5 15.72 43.5 4.5 32.28 4.5 15.72"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* 4. Inset Tactical Calibration Reticle Ring */}
        <polygon
          points="17 9 31 9 39 17 39 31 31 39 17 39 9 31 9 17"
          stroke={accentColor}
          strokeWidth="0.8"
          strokeDasharray="2.5 2.5"
          strokeOpacity="0.4"
        />

        {/* 5. Hero Exclamation Mark (!) */}
        <g filter={`url(#core-glow-${uid})`}>
          {/* Main Warning Stem with Rounded Terminals */}
          <line
            x1="24"
            y1="16"
            x2="24"
            y2="26"
            stroke={accentColor}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          {/* Inner High-Luminance Phosphor Filament */}
          <line
            x1="24"
            y1="17"
            x2="24"
            y2="25"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />

          {/* Lower Pip Dot */}
          <circle cx="24" cy="32.5" r="2.1" fill={accentColor} />
          <circle cx="24" cy="32.5" r="1.0" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

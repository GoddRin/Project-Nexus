"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TcwsSignalPlateProps {
  /** Hoisted PAGASA Wind Signal number (1, 2, 3, 4, 5, or 0) */
  signalNumber?: number;
  size?: number;
  className?: string;
  isSevere?: boolean;
}

/**
 * Tactical TCWS Signal Plate.
 *
 * A clean, minimalist, typographic operations badge.
 * Designed to completely avoid "AI slop" and 3D coin clutter:
 * - Micro-monospace eyebrow header (TCWS)
 * - High-contrast, tabular numeral in Space Grotesk
 * - Aerodynamic horizontal wind velocity barbs
 * - Dynamic threat-reactive live beacon dot
 */
export function TcwsSignalPlate({
  signalNumber = 1,
  size = 46,
  className,
  isSevere = false,
}: TcwsSignalPlateProps) {
  const isHighThreat = signalNumber >= 3 || isSevere;
  const isModerateThreat = signalNumber >= 1 && !isHighThreat;

  const accentColor = isHighThreat
    ? "#EF4444" // Crimson
    : isModerateThreat
    ? "#F59E0B" // Solar Amber
    : "#10B981"; // Emerald

  const borderColor = isHighThreat
    ? "rgba(239, 68, 68, 0.55)"
    : isModerateThreat
    ? "rgba(245, 158, 11, 0.5)"
    : "rgba(16, 185, 129, 0.4)";

  const glowShadow = isHighThreat
    ? "0 0 16px -2px rgba(239, 68, 68, 0.3)"
    : isModerateThreat
    ? "0 0 14px -3px rgba(245, 158, 11, 0.2)"
    : "none";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none overflow-visible", className)}
      style={{ filter: glowShadow }}
      aria-label={`PAGASA TCWS Signal #${signalNumber}`}
      role="img"
    >
      {/* 1. Dark Obsidian Precision Rounded Tile */}
      <rect
        width="48"
        height="48"
        rx="14"
        fill="#0A101D"
      />

      {/* 2. Hairline Perimeter Border Tinted by Signal Tier */}
      <rect
        x="0.5"
        y="0.5"
        width="47"
        height="47"
        rx="13.5"
        stroke={borderColor}
        strokeWidth="1"
      />

      {signalNumber > 0 ? (
        <>
          {/* 3. Micro Eyebrow Monospace Header */}
          <text
            x="24"
            y="14.5"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="800"
            fontFamily="var(--font-mono), monospace"
            fill={accentColor}
            letterSpacing="0.12em"
          >
            TCWS
          </text>

          {/* 4. Hero Tabular Signal Numeral */}
          <text
            x="24"
            y="32.5"
            textAnchor="middle"
            fontSize="19"
            fontWeight="900"
            fontFamily="var(--font-display), ui-sans-serif, system-ui, sans-serif"
            fill="#FFFFFF"
            letterSpacing="-0.04em"
          >
            {signalNumber}
          </text>

          {/* 5. Aerodynamic Wind Velocity Barbs */}
          <path
            d="M13 39H35"
            stroke={accentColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M18 42.5H30"
            stroke={accentColor}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* 6. Live Telemetry Pulsing Beacon */}
          <circle
            cx="40"
            cy="8"
            r="2"
            fill={accentColor}
            className="animate-pulse motion-reduce:animate-none"
          />
        </>
      ) : (
        /* Calm Weather / PAR Clear State */
        <>
          <text
            x="24"
            y="20"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fontFamily="var(--font-mono), monospace"
            fill={accentColor}
            letterSpacing="0.1em"
          >
            PAR
          </text>
          <text
            x="24"
            y="32"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fontFamily="var(--font-display), ui-sans-serif, system-ui, sans-serif"
            fill="#FFFFFF"
            letterSpacing="0.05em"
          >
            CLEAR
          </text>
          <circle
            cx="24"
            cy="39"
            r="2"
            fill={accentColor}
          />
        </>
      )}
    </svg>
  );
}

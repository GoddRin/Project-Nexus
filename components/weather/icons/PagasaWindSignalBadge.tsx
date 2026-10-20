"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PagasaWindSignalBadgeProps {
  /** Hoisted PAGASA Wind Signal level (1, 2, 3, 4, 5, or 0 for no hoisted signal) */
  signalNumber?: number;
  size?: number;
  className?: string;
  isSevere?: boolean;
}

/**
 * Official DOST-PAGASA Tropical Cyclone Wind Signal (TCWS) Warning Badge.
 *
 * Distinct from general cyclone symbols and internal plant safety notices:
 * Focuses specifically on public storm wind warning tiers with aerodynamic
 * gale streamlines and high-visibility signal tier typography.
 */
export function PagasaWindSignalBadge({
  signalNumber = 1,
  size = 32,
  className,
  isSevere = false,
}: PagasaWindSignalBadgeProps) {
  const isHighSignal = signalNumber >= 3 || isSevere;
  const isModerateSignal = signalNumber >= 1 && !isHighSignal;

  // Signal-specific color palette
  const plateBg = isHighSignal
    ? "linear-gradient(135deg, #2D080C 0%, #150204 100%)"
    : isModerateSignal
    ? "linear-gradient(135deg, #2D1A04 0%, #140A01 100%)"
    : "linear-gradient(135deg, #061B24 0%, #020B0F 100%)";

  const borderColor = isHighSignal
    ? "rgba(239, 68, 68, 0.7)"
    : isModerateSignal
    ? "rgba(245, 158, 11, 0.7)"
    : "rgba(14, 165, 233, 0.5)";

  const accentColor = isHighSignal ? "#EF4444" : isModerateSignal ? "#F59E0B" : "#38BDF8";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Specular Top Bevel */}
        <linearGradient id="tcws-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>

        {/* Ambient Glow Filter for High Warning Signals */}
        <filter id="tcws-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={accentColor} floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 1. Tactical Hexagonal Warning Shield Plate */}
      <path
        d="M16 1.8 L29 6.8 V16.2 C29 23.5 23.4 28.8 16 30.5 C8.6 28.8 3 23.5 3 16.2 V6.8 L16 1.8 Z"
        fill={plateBg}
      />

      {/* 2. Glass Specular Layer */}
      <path
        d="M16 1.8 L29 6.8 V16.2 C29 23.5 23.4 28.8 16 30.5 C8.6 28.8 3 23.5 3 16.2 V6.8 L16 1.8 Z"
        fill="url(#tcws-bevel)"
      />

      {/* 3. Hairline Warning Perimeter */}
      <path
        d="M16 1.8 L29 6.8 V16.2 C29 23.5 23.4 28.8 16 30.5 C8.6 28.8 3 23.5 3 16.2 V6.8 L16 1.8 Z"
        stroke={borderColor}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* 4. Aerodynamic Gale Streamlines (Horizontal High-Velocity Wind Arcs) */}
      <g stroke={accentColor} strokeWidth="1" strokeLinecap="round" opacity="0.65">
        {/* Top Wind Arc */}
        <path d="M7 11 H11 M21 11 H25" />
        {/* Mid Wind Flow */}
        <path d="M5.5 16.5 H9.5 M22.5 16.5 H26.5" />
        {/* Lower Convergent Streamline */}
        <path d="M8 22 H12 M20 22 H24" />
      </g>

      {/* 5. Central Warning Mast / Flagstaff */}
      <line x1="16" y1="6.5" x2="16" y2="8" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />

      {/* 6. Hoisted Signal Typography or Calibrated Gale Pennant */}
      {signalNumber > 0 ? (
        <g filter={isHighSignal ? "url(#tcws-glow)" : undefined}>
          {/* Signal Level Number */}
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="#FFFFFF"
            style={{
              fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
              letterSpacing: "-0.04em",
            }}
          >
            {signalNumber}
          </text>

          {/* Micro "TCWS" Eyebrow */}
          <text
            x="16"
            y="9.5"
            textAnchor="middle"
            fontSize="5.5"
            fontWeight="800"
            fill={accentColor}
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.08em",
            }}
          >
            SIGNAL
          </text>
        </g>
      ) : (
        /* Calm Weather / PAR Clear Wind Vane */
        <g stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="4" fill="none" strokeDasharray="2 2" />
          <path d="M16 12 V20 M12 16 H20" />
        </g>
      )}

      {/* 7. Active Warning Flasher Beacon (Pulsing Dot at apex) */}
      {signalNumber > 0 && (
        <circle
          cx="16"
          cy="4.5"
          r="1.2"
          fill={accentColor}
          className={isHighSignal ? "animate-ping motion-reduce:animate-none" : undefined}
        />
      )}
    </svg>
  );
}

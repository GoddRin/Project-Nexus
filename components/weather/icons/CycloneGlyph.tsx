"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Aerodynamic 3-arm spiral vortex on a 24x24 grid.
 * Mathematically plotted point-symmetric curves at 120-degree intervals,
 * reflecting authentic cyclonic circulation observed in satellite & Doppler radar.
 */
export const CYCLONE_ARM_PATHS = [
  "M15.06 13.06L15.13 13.15L15.32 13.56L15.43 14.07L15.43 14.66L15.33 15.29L15.10 15.94L14.75 16.58L14.26 17.20L13.65 17.76L12.92 18.24L12.09 18.62L11.16 18.89L10.16 19.01L9.11 18.98L8.04 18.79L6.96 18.43L5.92 17.89L4.93 17.19L4.02 16.31L3.23 15.28L2.57 14.11L2.08 12.83L1.60 12.95L2.02 14.35L2.63 15.65L3.41 16.82L4.32 17.85L5.36 18.73L6.49 19.42L7.69 19.94L8.92 20.27L10.16 20.41L11.38 20.37L12.56 20.15L13.66 19.77L14.68 19.24L15.57 18.57L16.34 17.79L16.95 16.93L17.41 15.99L17.71 15.02L17.83 14.02L17.76 13.03L17.49 12.06L16.74 10.94Z",
  "M9.55 14.12L9.44 14.14L8.99 14.10L8.49 13.93L7.98 13.65L7.49 13.24L7.04 12.72L6.66 12.09L6.37 11.36L6.19 10.55L6.14 9.68L6.22 8.76L6.46 7.83L6.85 6.90L7.40 6.01L8.10 5.17L8.95 4.42L9.94 3.78L11.04 3.28L12.25 2.93L13.54 2.76L14.88 2.78L16.24 3.00L16.38 2.51L14.95 2.18L13.53 2.06L12.12 2.15L10.77 2.42L9.49 2.89L8.32 3.52L7.28 4.30L6.38 5.20L5.63 6.20L5.06 7.28L4.66 8.41L4.44 9.56L4.40 10.70L4.52 11.81L4.81 12.86L5.26 13.83L5.84 14.69L6.53 15.43L7.34 16.03L8.23 16.47L9.20 16.73L10.55 16.63Z",
  "M11.39 8.82L11.43 8.72L11.69 8.35L12.08 8.00L12.58 7.70L13.18 7.47L13.86 7.35L14.59 7.33L15.37 7.44L16.16 7.69L16.94 8.08L17.69 8.61L18.38 9.28L18.99 10.09L19.49 11.01L19.86 12.04L20.09 13.15L20.15 14.32L20.03 15.53L19.72 16.75L19.23 17.95L18.54 19.11L17.67 20.18L18.03 20.53L19.02 19.47L19.84 18.29L20.47 17.03L20.91 15.72L21.14 14.39L21.18 13.06L21.03 11.76L20.70 10.53L20.20 9.39L19.56 8.35L18.78 7.44L17.90 6.67L16.93 6.07L15.91 5.62L14.85 5.35L13.79 5.25L12.75 5.32L11.76 5.55L10.84 5.94L10.01 6.49L9.30 7.21L8.71 8.43Z",
] as const;

interface CycloneGlyphProps {
  className?: string;
  size?: number;
  /** Primary eye color, reactive to PAGASA / storm threat levels */
  eyeColor?: string;
  /** Glow halo applied to the eye */
  glow?: string;
  /** Continuous clockwise vortex rotation */
  spin?: boolean;
  /** Active beacon pulse animation */
  pulse?: boolean;
  /** When true (e.g. Super Typhoon / TCWS #1+ inside PAR), renders a concentric eyewall radar boundary */
  isSevere?: boolean;
  /** When true, renders cardinal geodetic compass reticle ticks (N, E, S, W) */
  showReticle?: boolean;
  title?: string;
}

const VIEW_BOX_ORIGIN: React.CSSProperties = {
  transformOrigin: "12px 12px",
  transformBox: "view-box",
};

export function CycloneGlyph({
  className,
  size = 24,
  eyeColor = "currentColor",
  glow,
  spin = false,
  pulse = false,
  isSevere = false,
  showReticle = false,
  title,
}: CycloneGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      {/* Geodetic Cardinal Compass Reticle (N, E, S, W) */}
      {showReticle && (
        <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.8" strokeLinecap="round">
          <line x1="12" y1="0.6" x2="12" y2="2.2" />
          <line x1="12" y1="21.8" x2="12" y2="23.4" />
          <line x1="0.6" y1="12" x2="2.2" y2="12" />
          <line x1="21.8" y1="12" x2="23.4" y2="12" />
          <circle cx="12" cy="12" r="11" stroke="currentColor" strokeOpacity="0.12" fill="none" />
        </g>
      )}

      {/* Severe / Super Typhoon Eyewall Radar Boundary Ring */}
      {isSevere && (
        <g>
          <circle
            cx="12"
            cy="12"
            r="10.8"
            stroke={eyeColor}
            strokeWidth="0.8"
            strokeOpacity="0.45"
            strokeDasharray="2.5 3"
            className="animate-spin motion-reduce:animate-none"
            style={{ ...VIEW_BOX_ORIGIN, animationDuration: "25s" }}
          />
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke={eyeColor}
            strokeWidth="0.6"
            strokeOpacity="0.3"
            strokeDasharray="1.5 2.5"
            className="animate-spin motion-reduce:animate-none"
            style={{ ...VIEW_BOX_ORIGIN, animationDuration: "18s", animationDirection: "reverse" }}
          />
        </g>
      )}

      {/* Cyclonic Vortex Arms */}
      <g
        className={cn(spin && "animate-spin motion-reduce:animate-none")}
        style={{
          ...VIEW_BOX_ORIGIN,
          animationDuration: spin ? (isSevere ? "7s" : "11s") : undefined,
        }}
      >
        {CYCLONE_ARM_PATHS.map((d, i) => (
          <path key={i} d={d} fill="currentColor" />
        ))}
      </g>

      {/* Active Eyewall Radar Pulse */}
      {pulse && (
        <circle
          cx="12"
          cy="12"
          r={3.6}
          stroke={eyeColor}
          strokeWidth="0.9"
          strokeOpacity="0.85"
          className="animate-ping motion-reduce:animate-none"
          style={{ ...VIEW_BOX_ORIGIN, animationDuration: "2.2s" }}
        />
      )}

      {/* Solid Eyewall Core */}
      <circle
        cx="12"
        cy="12"
        r={1.8}
        fill={eyeColor}
        style={{
          filter: glow ? `drop-shadow(0 0 4px ${glow})` : undefined,
        }}
      />
    </svg>
  );
}

/**
 * Drop-in icon replacement for Lucide icon slots in navigation pillars and tabs.
 */
export function CycloneIcon({ className }: { className?: string }) {
  return (
    <CycloneGlyph
      size={16}
      className={cn("shrink-0", className)}
      eyeColor="currentColor"
      spin={false}
      pulse={false}
    />
  );
}

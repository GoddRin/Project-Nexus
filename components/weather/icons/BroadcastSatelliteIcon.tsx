"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StormThreatLevel } from "@/lib/weather/news/tvNewsTypes";

interface BroadcastSatelliteIconProps {
  className?: string;
  size?: number;
  threatLevel?: StormThreatLevel;
  animated?: boolean;
}

export default function BroadcastSatelliteIcon({
  className,
  size = 24,
  threatLevel = "NORMAL",
  animated = true,
}: BroadcastSatelliteIconProps) {
  // Threat color mapping
  const colors = {
    RED: {
      primary: "#EF4444", // Red-500
      glow: "rgba(239, 68, 68, 0.4)",
      beam: "#FCA5A5",
      ring: "stroke-red-500/50",
    },
    ORANGE: {
      primary: "#F59E0B", // Amber-500
      glow: "rgba(245, 158, 11, 0.4)",
      beam: "#FDE68A",
      ring: "stroke-amber-500/50",
    },
    YELLOW: {
      primary: "#EAB308", // Yellow-500
      glow: "rgba(234, 179, 8, 0.35)",
      beam: "#FEF08A",
      ring: "stroke-yellow-500/50",
    },
    FAIR_DISTANT: {
      primary: "#0EA5E9", // Sky-500
      glow: "rgba(14, 165, 233, 0.35)",
      beam: "#BAE6FD",
      ring: "stroke-sky-500/50",
    },
    NORMAL: {
      primary: "#10B981", // Emerald-500
      glow: "rgba(16, 185, 129, 0.35)",
      beam: "#A7F3D0",
      ring: "stroke-emerald-500/50",
    },
  }[threatLevel] || {
    primary: "#10B981",
    glow: "rgba(16, 185, 129, 0.35)",
    beam: "#A7F3D0",
    ring: "stroke-emerald-500/50",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 overflow-visible", className)}
      style={{
        filter: animated ? `drop-shadow(0 0 6px ${colors.glow})` : undefined,
      }}
    >
      {/* 1. Outer Azimuth Coordinate Ring */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="2 4"
      />

      {/* 2. Cardinal Compass Ticks */}
      <path
        d="M16 1.5V3.5M16 28.5V30.5M1.5 16H3.5M28.5 16H30.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />

      {/* 3. Concentric Doppler Radar Pulse Rings */}
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke={colors.primary}
        strokeWidth="1"
        strokeOpacity={animated ? "0.45" : "0.3"}
        className={cn(animated && "animate-pulse")}
      />
      <circle
        cx="16"
        cy="16"
        r="6.5"
        stroke={colors.primary}
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />

      {/* 4. Rotating / Sweeping Radar Arc (when active threat) */}
      {animated && (threatLevel === "RED" || threatLevel === "ORANGE") && (
        <path
          d="M16 6 A 10 10 0 0 1 26 16 L 16 16 Z"
          fill={colors.primary}
          fillOpacity="0.18"
          className="origin-center animate-spin"
          style={{ animationDuration: "3s" }}
        />
      )}

      {/* 5. Orbital Satellite Wings (Left & Right Photovoltaic Arrays) */}
      {/* Left Wing */}
      <rect
        x="3"
        y="13.5"
        width="6"
        height="5"
        rx="1"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <line x1="6" y1="13.5" x2="6" y2="18.5" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="9" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" />

      {/* Right Wing */}
      <rect
        x="23"
        y="13.5"
        width="6"
        height="5"
        rx="1"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <line x1="26" y1="13.5" x2="26" y2="18.5" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5" />
      <line x1="20" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" />

      {/* 6. Satellite Core Chassis & Transceiver Dish */}
      <rect
        x="12"
        y="12"
        width="8"
        height="8"
        rx="2"
        fill="#08121E"
        stroke={colors.primary}
        strokeWidth="1.5"
      />

      {/* 7. Center Telemetry Beacon Dot */}
      <circle cx="16" cy="16" r="2.2" fill={colors.primary} />
      <circle
        cx="16"
        cy="16"
        r="3.5"
        stroke={colors.primary}
        strokeWidth="0.8"
        strokeOpacity="0.7"
        className={cn(animated && "animate-ping")}
      />

      {/* 8. Downlink Transceiver Horn / Antenna */}
      <path
        d="M16 12V8.5M14 8.5H18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
      <circle cx="16" cy="8.5" r="1" fill={colors.primary} />
    </svg>
  );
}

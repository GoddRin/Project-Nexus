"use client";

import React from "react";
import { StormThreatLevel } from "@/lib/weather/news/tvNewsTypes";
import { cn } from "@/lib/utils";

interface PlantSafetyDispatchBadgeProps {
  threatLevel?: StormThreatLevel;
  size?: number;
  className?: string;
  isSpeaking?: boolean;
}

/**
 * SCIC Tumauini HEPP Worksite Safety & HSE Communications Dispatch Badge.
 *
 * Distinct from government wind signal warnings (TCWS) and media telecasts:
 * Focuses on industrial plant safety protocols, Viber workforce broadcasts,
 * and hydroelectric site operations advisories.
 */
export function PlantSafetyDispatchBadge({
  threatLevel = "NORMAL",
  size = 28,
  className,
  isSpeaking = false,
}: PlantSafetyDispatchBadgeProps) {
  const isRed = threatLevel === "RED";
  const isOrange = threatLevel === "ORANGE";
  const isYellow = threatLevel === "YELLOW";

  // Industrial HSE color scheme
  const plateBg = isRed
    ? "linear-gradient(135deg, #2D080C 0%, #150204 100%)"
    : isOrange || isYellow
    ? "linear-gradient(135deg, #2A1703 0%, #130A01 100%)"
    : "linear-gradient(135deg, #062316 0%, #02120B 100%)";

  const borderColor = isRed
    ? "rgba(239, 68, 68, 0.7)"
    : isOrange || isYellow
    ? "rgba(245, 158, 11, 0.7)"
    : "rgba(16, 185, 129, 0.65)";

  const accentColor = isRed ? "#EF4444" : isOrange || isYellow ? "#F59E0B" : "#10B981";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Specular Bevel Highlight */}
        <linearGradient id="hse-bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* 1. Base Industrial Beveled Tile */}
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="7"
        fill={plateBg}
      />
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="7"
        fill="url(#hse-bevel)"
      />
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="7"
        stroke={borderColor}
        strokeWidth="1"
      />

      {/* 2. Top Specular Rim */}
      <path
        d="M2 7.75C2 4.57 4.57 2 7.75 2H20.25C23.43 2 26 4.57 26 7.75V10.5H2V7.75Z"
        fill="#ffffff"
        fillOpacity="0.12"
      />

      {/* 3. Central Plant HSE Safety Shield Silhouette */}
      <path
        d="M14 6 L20 8.5 V14 C20 17.5 17.5 20.2 14 21.5 C10.5 20.2 8 17.5 8 14 V8.5 L14 6 Z"
        stroke={accentColor}
        strokeWidth="1.2"
        fill={accentColor}
        fillOpacity="0.16"
        strokeLinejoin="round"
      />

      {/* 4. Concentric Audio / Radio Dispatch Waves (Communications Dispatch) */}
      <g stroke={accentColor} strokeWidth="1" strokeLinecap="round" opacity="0.8">
        {/* Outward Acoustic / Radio Waves */}
        <path d="M22 10.5 C23.2 11.8 23.8 13.5 23.8 14.5 C23.8 15.5 23.2 17.2 22 18.5" />
        <path d="M6 10.5 C4.8 11.8 4.2 13.5 4.2 14.5 C4.2 15.5 4.8 17.2 6 18.5" />
      </g>

      {/* 5. Central Safety Cross / Megaphone Core */}
      <g fill={accentColor}>
        {/* Safety Medical / HSE Cross */}
        <rect x="13.2" y="10" width="1.6" height="6" rx="0.5" />
        <rect x="11" y="12.2" width="6" height="1.6" rx="0.5" />
      </g>

      {/* 6. Active TTS / Radio Voice Pulse Indicator */}
      {(isSpeaking || isRed) && (
        <circle
          cx="14"
          cy="4"
          r="1.2"
          fill={accentColor}
          className="animate-ping motion-reduce:animate-none"
        />
      )}
    </svg>
  );
}

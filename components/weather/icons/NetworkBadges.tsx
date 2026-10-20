"use client";

import React from "react";
import { NewsChannelId } from "@/lib/weather/news/tvNewsTypes";
import { cn } from "@/lib/utils";

interface NetworkBadgeIconProps {
  channelId: NewsChannelId;
  size?: number;
  className?: string;
}

const TILE_PALETTE: Record<NewsChannelId, string> = {
  pagasa: "#1D6C99",
  gma: "#C62A3D",
  abscbn: "#0C8A57",
  tv5: "#D26D17",
  all: "#4A4DC0",
};

const MONOGRAMS: Partial<Record<NewsChannelId, string>> = {
  gma: "G",
  abscbn: "A",
  tv5: "5",
};

export function NetworkBadgeIcon({
  channelId,
  size = 18,
  className,
}: NetworkBadgeIconProps) {
  const id: NewsChannelId = channelId in TILE_PALETTE ? channelId : "all";
  const letter = MONOGRAMS[id];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Background Plate */}
      <rect width="24" height="24" rx="6.5" fill={TILE_PALETTE[id]} />

      {/* Glass Top Specular Highlight */}
      <path
        d="M0 6.5C0 2.9 2.9 0 6.5 0H17.5C21.1 0 24 2.9 24 6.5V11H0V6.5Z"
        fill="#ffffff"
        fillOpacity="0.16"
      />

      {/* Hairline Rim Border */}
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        rx="6"
        stroke="#ffffff"
        strokeOpacity="0.25"
      />

      {/* DOST-PAGASA: Atmospheric Doppler Radar Scope with Azimuth Vector */}
      {id === "pagasa" && (
        <g>
          <circle cx="12" cy="12" r="7.8" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="4.2" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" />
          <path d="M12 12V4.2A7.8 7.8 0 0 1 18.8 8.1Z" fill="#ffffff" fillOpacity="0.38" />
          <path d="M12 12V4.2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.6" fill="#ffffff" />
        </g>
      )}

      {/* ALL BULLETINS: Unified Multi-Layer Data Stack */}
      {id === "all" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5.2L19 8.9L12 12.6L5 8.9L12 5.2Z" fill="#ffffff" />
          <path d="M5 12.4L12 16.1L19 12.4" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.6" />
          <path d="M5 15.9L12 19.6L19 15.9" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.6" />
        </g>
      )}

      {/* GMA (G), ABS-CBN (A), TV5 (5): Crisp Geometric Monograms */}
      {letter && (
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="#ffffff"
          style={{
            fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {letter}
        </text>
      )}
    </svg>
  );
}

export default NetworkBadgeIcon;

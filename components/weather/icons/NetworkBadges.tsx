"use client";

import React from "react";
import { NewsChannelId } from "@/lib/weather/news/tvNewsTypes";
import { cn } from "@/lib/utils";

interface NetworkBadgeIconProps {
  channelId: NewsChannelId;
  size?: number;
  className?: string;
}

/**
 * Source badges for the Broadcast Desk.
 *
 * One consistent tile system: a rounded-square on a deep hue, a soft top highlight and a hairline
 * inner edge, carrying a single bold glyph. They are deliberately monograms rather than redrawn
 * network logos (no imitation of third-party marks), and stay legible from 12px up.
 * DOST-PAGASA, as the authoritative source, gets its own radar-sweep mark; "All" gets a layer stack.
 */
const TILE: Record<NewsChannelId, string> = {
  pagasa: "#1D6C99",
  gma: "#C62A3D",
  abscbn: "#0C8A57",
  tv5: "#D26D17",
  all: "#4A4DC0",
};

const LETTER: Partial<Record<NewsChannelId, string>> = {
  gma: "G",
  abscbn: "A",
  tv5: "5",
};

export function NetworkBadgeIcon({ channelId, size = 18, className }: NetworkBadgeIconProps) {
  const id: NewsChannelId = channelId in TILE ? channelId : "all";
  const letter = LETTER[id];

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
      {/* Tile body */}
      <rect width="24" height="24" rx="6.5" fill={TILE[id]} />
      {/* Soft top highlight */}
      <path d="M0 6.5C0 2.9 2.9 0 6.5 0H17.5C21.1 0 24 2.9 24 6.5V11H0V6.5Z" fill="#fff" fillOpacity="0.14" />
      {/* Hairline inner edge */}
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" stroke="#fff" strokeOpacity="0.22" />

      {id === "pagasa" && (
        <g>
          {/* Radar scope: range rings, sweep wedge, contact */}
          <circle cx="12" cy="12" r="7.6" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="3.9" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.1" />
          <path d="M12 12V4.4A7.6 7.6 0 0 1 18.6 8.2Z" fill="#fff" fillOpacity="0.38" />
          <path d="M12 12V4.4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="#fff" />
        </g>
      )}

      {id === "all" && (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Layer stack: every bulletin, one feed */}
          <path d="M12 5.2L19 8.9L12 12.6L5 8.9L12 5.2Z" fill="#fff" />
          <path d="M5 12.4L12 16.1L19 12.4" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.6" />
          <path d="M5 15.9L12 19.6L19 15.9" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" />
        </g>
      )}

      {letter && (
        <text
          x="12"
          y="16.9"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="#fff"
          style={{ fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.02em" }}
        >
          {letter}
        </text>
      )}
    </svg>
  );
}

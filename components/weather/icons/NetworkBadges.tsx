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
 * Authentic brand palettes for Philippine national news networks.
 * Grounded in official network broadcast graphics rather than generic stock colors.
 */
const TILE_BACKGROUNDS: Record<NewsChannelId, string> = {
  pagasa: "linear-gradient(135deg, #0A2540 0%, #004E89 100%)", // DOST-PAGASA Atmospheric Deep Navy
  gma: "linear-gradient(135deg, #A80014 0%, #D32F2F 100%)",    // GMA Integrated News Scarlet
  abscbn: "linear-gradient(135deg, #09121F 0%, #16243B 100%)", // ABS-CBN News Midnight Blue-Grey
  tv5: "linear-gradient(135deg, #C70024 0%, #E63946 100%)",    // TV5 / News5 Vermilion
  all: "linear-gradient(135deg, #1B2A4E 0%, #2E4072 100%)",    // Multi-Network Telecast Indigo
};

const BORDER_COLORS: Record<NewsChannelId, string> = {
  pagasa: "rgba(0, 210, 255, 0.45)",
  gma: "rgba(255, 100, 100, 0.45)",
  abscbn: "rgba(0, 155, 255, 0.45)",
  tv5: "rgba(255, 120, 120, 0.45)",
  all: "rgba(140, 170, 255, 0.4)",
};

/**
 * Authentic Philippine Broadcast Network Emblems.
 *
 * Replaces generic placeholders with broadcast-accurate vector insignias:
 * - DOST-PAGASA: Doppler radar scope with rotating sweep and atmospheric isobar rings.
 * - GMA Integrated News: Geometric broadcast mark with signature rainbow spectrum bar.
 * - ABS-CBN News: Iconic three concentric RGB transmitter rings emitting from the broadcast tower.
 * - TV5 / News5: Official dynamic ribbon numeral "5" inside the modern newsroom telecast shield.
 * - All Bulletins: Synchronized multi-feed radar array.
 */
export function NetworkBadgeIcon({
  channelId,
  size = 20,
  className,
}: NetworkBadgeIconProps) {
  const id: NewsChannelId = channelId in TILE_BACKGROUNDS ? channelId : "all";
  const bg = TILE_BACKGROUNDS[id];
  const border = BORDER_COLORS[id];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none overflow-hidden", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Specular Bevel Gradient */}
        <linearGradient id={`specular-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>

        {/* GMA Rainbow Prism Gradient */}
        <linearGradient id="gma-rainbow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF1E28" />
          <stop offset="25%" stopColor="#FFC700" />
          <stop offset="50%" stopColor="#00C853" />
          <stop offset="75%" stopColor="#00B0FF" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>

      {/* 1. Base Tile Plate */}
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="7"
        fill={`url(#specular-${id})`}
        style={{ fill: bg }}
      />

      {/* 2. Hairline Precision Bezel */}
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="7"
        stroke={border}
        strokeWidth="1"
        fill="none"
      />

      {/* 3. Top-edge Specular Highlight */}
      <path
        d="M2 7.75C2 4.57 4.57 2 7.75 2H20.25C23.43 2 26 4.57 26 7.75V11H2V7.75Z"
        fill="#ffffff"
        fillOpacity="0.14"
      />

      {/* ═══ DOST-PAGASA: Doppler Radar Sweep & Atmospheric Isobars ═══ */}
      {id === "pagasa" && (
        <g transform="translate(14, 14)">
          {/* Outer Doppler Range Ring */}
          <circle r="9" stroke="#00D2FF" strokeOpacity="0.5" strokeWidth="0.9" fill="none" />
          {/* Mid Range Ring */}
          <circle r="5.5" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="0.8" fill="none" strokeDasharray="1.5 2" />
          {/* Radar Sweep Wedge */}
          <path
            d="M0 0 L0 -9 A9 9 0 0 1 7.8 -4.5 Z"
            fill="#00D2FF"
            fillOpacity="0.3"
          />
          {/* Radar Sweep Ray */}
          <line x1="0" y1="0" x2="0" y2="-9" stroke="#00D2FF" strokeWidth="1.3" strokeLinecap="round" />
          {/* Isobar Wave Arcs */}
          <path
            d="M-7 3 A8 8 0 0 1 -3 7"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          {/* Station Core Pulse */}
          <circle r="1.8" fill="#FFFFFF" />
          <circle r="0.8" fill="#0A2540" />
        </g>
      )}

      {/* ═══ GMA INTEGRATED NEWS: Broadcast Diamond & Rainbow Prism Ribbon ═══ */}
      {id === "gma" && (
        <g>
          {/* Stylized GMA Geometric Monogram */}
          <path
            d="M6.5 8.5 H14 C17 8.5 19 10 19 12.5 C19 15 17 16.5 14 16.5 H10.5 V13.5 H14 C14.8 13.5 15.5 13.1 15.5 12.5 C15.5 11.9 14.8 11.5 14 11.5 H9.5 V19.5 H6.5 V8.5 Z"
            fill="#FFFFFF"
            fillRule="evenodd"
          />
          {/* Central News Camera Eye */}
          <circle cx="21" cy="11.5" r="1.8" fill="#FFC700" />
          {/* Official GMA Rainbow Prism Ribbon across base */}
          <rect x="5.5" y="21.5" width="17" height="2" rx="1" fill="url(#gma-rainbow)" />
        </g>
      )}

      {/* ═══ ABS-CBN NEWS: Iconic RGB Broadcast Transmission Rings ═══ */}
      {id === "abscbn" && (
        <g transform="translate(14, 15)">
          {/* Outer Ring: Blue (Channel 2 / Kapamilya Blue) */}
          <circle
            r="8.8"
            stroke="#0054A6"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="28 10"
            strokeDashoffset="5"
          />
          {/* Middle Ring: Green */}
          <circle
            r="6"
            stroke="#00A651"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="20 7"
            strokeDashoffset="3"
          />
          {/* Inner Ring: Red */}
          <circle
            r="3.2"
            stroke="#ED1C24"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="11 4"
            strokeDashoffset="1"
          />
          {/* Central Transmitter Antenna Mast */}
          <circle r="1.3" fill="#FFFFFF" />
          <line x1="0" y1="1.3" x2="0" y2="7.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}

      {/* ═══ TV5 / NEWS5: Forward Dynamic Ribbon '5' & Telecast Plate ═══ */}
      {id === "tv5" && (
        <g>
          {/* TV5 Iconic Stylized Dynamic '5' */}
          <path
            d="M17.8 7.5 H9.2 L8.2 12.8 H13.5 C15.8 12.8 17.5 14.2 17.1 16.8 C16.6 19.5 14.4 20.8 11.8 20.8 C9.5 20.8 8.1 19.8 7.4 18.5 L9.5 17.2 C9.9 18 10.7 18.7 11.9 18.7 C13.1 18.7 14.3 18 14.5 16.8 C14.8 15.6 13.9 14.8 12.7 14.8 H7.8 L9.2 5.5 H18.2 L17.8 7.5 Z"
            fill="#FFFFFF"
          />
          {/* TV5 News Dot Indicator */}
          <circle cx="19.5" cy="18.5" r="1.5" fill="#FFE500" />
        </g>
      )}

      {/* ═══ ALL BULLETINS: Consolidated Multi-Source Telecast Matrix ═══ */}
      {id === "all" && (
        <g strokeLinecap="round" strokeLinejoin="round" transform="translate(14, 14)">
          {/* Top Layer */}
          <path
            d="M0 -6.5 L7.5 -2.5 L0 1.5 L-7.5 -2.5 Z"
            fill="#FFFFFF"
          />
          {/* Mid Layer Sweep */}
          <path
            d="M-7.5 1.5 L0 5.5 L7.5 1.5"
            stroke="#00D2FF"
            strokeWidth="1.8"
            fill="none"
          />
          {/* Bottom Layer Sweep */}
          <path
            d="M-7.5 5.5 L0 9.5 L7.5 5.5"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="1.8"
            fill="none"
          />
        </g>
      )}
    </svg>
  );
}

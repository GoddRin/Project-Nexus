"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export type ParStatus = "clear" | "monitoring" | "inside";

interface ParStatusEmblemProps {
  status?: ParStatus;
  /** Rendered height in px; width follows the 56:48 viewBox. */
  size?: number;
  animated?: boolean;
  className?: string;
}

const PALETTE: Record<ParStatus, { main: string; soft: string; label: string }> = {
  clear: { main: "#36AD69", soft: "rgba(54,173,105,0.16)", label: "PAR clear" },
  monitoring: { main: "#38BDF8", soft: "rgba(56,189,248,0.16)", label: "Storm outside PAR" },
  inside: { main: "#F59E0B", soft: "rgba(245,158,11,0.2)", label: "Storm inside PAR" },
};

// Real PAR vertices (25N120E, 25N135E, 5N135E, 5N115E, 15N115E, 21N120E)
// projected at 2px per degree, origin 115E / 25N.
const PAR_POLYGON = "14,4 44,4 44,44 4,44 4,24 14,12";

export default function ParStatusEmblem({
  status = "clear",
  size = 40,
  animated = true,
  className,
}: ParStatusEmblemProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `par-clip-${uid}`;
  const sweepId = `par-sweep-${uid}`;
  const { main, soft, label } = PALETTE[status];
  const spiralCx = status === "inside" ? 32 : 49;
  const spiralCy = status === "inside" ? 18 : 13;

  return (
    <svg
      width={(size * 56) / 48}
      height={size}
      viewBox="0 0 56 48"
      fill="none"
      role="img"
      aria-label={label}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <title>{label}</title>
      <defs>
        <clipPath id={clipId}>
          <polygon points={PAR_POLYGON} />
        </clipPath>
        <linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={main} stopOpacity="0" />
          <stop offset="1" stopColor={main} stopOpacity="0.45" />
        </linearGradient>
        <style>{`@media (prefers-reduced-motion: reduce){.par-emblem-motion{display:none}}`}</style>
      </defs>

      {/* PAR boundary */}
      <polygon points={PAR_POLYGON} fill={soft} stroke={main} strokeWidth="1.4" strokeLinejoin="round" />

      {/* Graticule: every 5 degrees */}
      <g clipPath={`url(#${clipId})`} stroke={main} strokeOpacity="0.22" strokeWidth="0.6">
        <path d="M4 14H44M4 24H44M4 34H44M14 4V44M24 4V44M34 4V44" />

        {/* Radar sweep centred on the archipelago */}
        {animated && (
          <g className="par-emblem-motion">
            <path d="M24 24 L24 -6 A30 30 0 0 1 45 3 Z" fill={`url(#${sweepId})`} stroke="none">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 24 24"
                to="360 24 24"
                dur="6s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}
      </g>

      {/* Philippine archipelago, stylised: Luzon, Palawan, Visayas, Mindanao */}
      <g fill={main} stroke="none">
        <path d="M16.4 12.8 L19.6 14.6 L21.4 17.8 L20.2 20.4 L22 23.2 L20.6 26.4 L18 27.8 L16.8 24.6 L14.6 22.4 L15.2 18.6 L14.4 15.6 Z" />
        <path d="M13.2 29.4 L14 29.2 L11 36 L10.2 35.6 Z" />
        <circle cx="19" cy="30" r="1.35" />
        <circle cx="22" cy="31.2" r="1.6" />
        <circle cx="25.2" cy="30" r="1.3" />
        <circle cx="24" cy="33.4" r="1" />
        <path d="M20.4 36 L25.6 35 L28.2 37.4 L26.8 41 L23.4 42.2 L21 39.8 Z" />
      </g>

      {/* Cyclone: outside the boundary when monitoring, inside when threatening */}
      {status !== "clear" && (
        <g transform={`translate(${spiralCx} ${spiralCy}) scale(0.85)`}>
          <g>
            {animated && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur={status === "inside" ? "3s" : "9s"}
                repeatCount="indefinite"
              />
            )}
            <g stroke={main} strokeWidth="1.5" strokeLinecap="round" fill="none">
              <path d="M0 -3.5 C4 -3.5 7 -0.5 6 3 C5 6.5 0.5 7.5 -2.5 5" />
              <path d="M0 3.5 C-4 3.5 -7 0.5 -6 -3 C-5 -6.5 -0.5 -7.5 2.5 -5" />
            </g>
          </g>
          <circle r="1.7" fill={main} />
          {animated && (
            <circle r="1.7" stroke={main} strokeWidth="0.8" fill="none" className="par-emblem-motion">
              <animate attributeName="r" values="1.7;5;1.7" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}
    </svg>
  );
}

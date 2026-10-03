"use client";

import React from "react";
import { NewsChannelId } from "@/lib/weather/news/tvNewsTypes";
import { cn } from "@/lib/utils";

interface NetworkBadgeIconProps {
  channelId: NewsChannelId;
  size?: number;
  className?: string;
}

export function NetworkBadgeIcon({
  channelId,
  size = 18,
  className,
}: NetworkBadgeIconProps) {
  switch (channelId) {
    case "pagasa":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
        >
          {/* DOST-PAGASA: Meteorological Radar + Isobar Shield */}
          <circle cx="12" cy="12" r="10" stroke="#2F82AB" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="12" cy="12" r="6" stroke="#2F82AB" strokeWidth="1.2" strokeOpacity="0.6" />
          <circle cx="12" cy="12" r="2.5" fill="#4E9DC2" />
          {/* Radar Sweep & Crosshairs */}
          <path d="M12 2V22M2 12H22" stroke="#2F82AB" strokeWidth="0.8" strokeOpacity="0.4" />
          <path d="M12 12L19 5" stroke="#4E9DC2" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "gma":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
        >
          {/* GMA: Broadcast Transmitter Heart / Rainbow Signal */}
          <rect x="2" y="3" width="20" height="18" rx="4" fill="#DC2626" fillOpacity="0.15" stroke="#EF4444" strokeWidth="1.5" />
          <path
            d="M7 14C7 10.5 9 8 12 8C15 8 17 10.5 17 14"
            stroke="#F59E0B"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M9 15C9 13 10.2 11 12 11C13.8 11 15 13 15 15"
            stroke="#129450"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.5" fill="#EF4444" />
        </svg>
      );

    case "abscbn":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
        >
          {/* ABS-CBN: RGB Broadcast Rings */}
          <rect x="2" y="3" width="20" height="18" rx="4" fill="#08121E" stroke="#4E9DC2" strokeWidth="1.2" strokeOpacity="0.5" />
          <circle cx="12" cy="12" r="7" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="12" cy="12" r="4.5" stroke="#129450" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="12" cy="12" r="2" fill="#3B82F6" />
        </svg>
      );

    case "tv5":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
        >
          {/* TV5 / News5: Frontline Pentagon Crest */}
          <path
            d="M12 2L21 8.5V17L12 22L3 17V8.5L12 2Z"
            fill="#EA580C"
            fillOpacity="0.2"
            stroke="#F97316"
            strokeWidth="1.5"
          />
          <path
            d="M8 8H16L12 14L15 14C15.5 14 16 14.5 16 15V17C16 17.5 15.5 18 15 18H9"
            stroke="#FDBA74"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "all":
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
        >
          {/* Unified All Bulletins Constellation */}
          <circle cx="12" cy="12" r="9.5" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="5" stroke="#6366F1" strokeWidth="1.2" />
          <circle cx="12" cy="6" r="1.5" fill="#A5B4FC" />
          <circle cx="18" cy="14" r="1.5" fill="#A5B4FC" />
          <circle cx="6" cy="14" r="1.5" fill="#A5B4FC" />
          <circle cx="12" cy="12" r="2" fill="#4F46E5" />
        </svg>
      );
  }
}

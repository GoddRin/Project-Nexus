"use client";

import React from "react";
import { AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TacticalAlertOctagonProps {
  /** Hoisted PAGASA Wind Signal number (1, 2, 3, 4, 5) or 0 for site advisory */
  signalNumber?: number;
  size?: number;
  className?: string;
  isSevere?: boolean;
}

/**
 * Minimalist Alert Octagon (!)
 *
 * Clean, modern meteorological warning insignia:
 * - Minimalist dark rounded squircle tile matching dashboard theme
 * - Crisp Lucide AlertOctagon (!) warning mark
 * - Smooth, suitable pulsating effects (breathing ambient glow + soft sonar pulse)
 * - Threat-reactive color palettes: Amber (Signal 1-2), Red (Signal 3+), Teal (Site Advisory)
 * - Full `prefers-reduced-motion` compliance
 */
export function TacticalAlertOctagon({
  signalNumber = 1,
  size = 48,
  className,
  isSevere = false,
}: TacticalAlertOctagonProps) {
  const isHighThreat = signalNumber >= 3 || isSevere;
  const isModerateThreat = signalNumber >= 1 && !isHighThreat;

  // Threat colors
  const colorClasses = isHighThreat
    ? "bg-red-500/15 border-red-500/40 text-red-500 shadow-[0_0_16px_rgba(239,68,68,0.25)]"
    : isModerateThreat
    ? "bg-amber-500/12 border-amber-500/35 text-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
    : "bg-teal-500/12 border-teal-500/35 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.18)]";

  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl border select-none transition-transform duration-200 hover:scale-[1.04]",
        colorClasses,
        className
      )}
      style={{
        width: size,
        height: size,
      }}
      aria-label={`PAGASA TCWS Signal Alert #${signalNumber}`}
      role="img"
    >
      {/* 1. Soft Outward Sonar Pulse Ring */}
      <div
        className={cn(
          "absolute inset-[-1px] rounded-xl border border-current pointer-events-none animate-ping motion-reduce:animate-none opacity-40",
          isHighThreat ? "duration-1000" : "duration-1000"
        )}
        style={{
          animationDuration: isHighThreat ? "2s" : "2.8s",
        }}
        aria-hidden="true"
      />

      {/* 2. Ambient Breathing Glow Layer */}
      <div
        className="absolute inset-0 rounded-xl bg-current opacity-10 animate-pulse motion-reduce:animate-none pointer-events-none"
        style={{
          animationDuration: isHighThreat ? "1.8s" : "2.6s",
        }}
        aria-hidden="true"
      />

      {/* 3. Pure Minimalist Alert Octagon Icon */}
      <AlertOctagon
        size={iconSize}
        strokeWidth={2}
        className={cn(
          "relative z-10 transition-transform",
          "animate-pulse motion-reduce:animate-none",
          isHighThreat
            ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
            : isModerateThreat
            ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
            : "drop-shadow-[0_0_6px_rgba(20,184,166,0.4)]"
        )}
        style={{
          animationDuration: isHighThreat ? "1.8s" : "2.6s",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

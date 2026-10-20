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
 * Clean, razor-sharp meteorological warning insignia:
 * - Minimalist dark rounded squircle tile matching dashboard theme
 * - Crisp, unblurred Lucide AlertOctagon (!) vector mark (zero filters, zero blur)
 * - Gentle, suitable pulsating effect (animate-pulse) on the container
 * - Threat-reactive color palettes:
 *   - Signal 1-2: Solar Amber (bg-signal-amber/20, border-signal-amber/40, text-signal-amber)
 *   - Signal 3+: Emergency Red (bg-signal-red/20, border-signal-red/40, text-signal-red)
 *   - Site Advisory: Atmospheric Teal (bg-flow-teal/20, border-flow-teal/40, text-flow-teal)
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

  const colorClasses = isHighThreat
    ? "bg-signal-red/20 border-signal-red/40 text-signal-red"
    : isModerateThreat
    ? "bg-signal-amber/20 border-signal-amber/40 text-signal-amber"
    : "bg-flow-teal/20 border-flow-teal/40 text-flow-teal";

  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl border select-none animate-pulse motion-reduce:animate-none transition-transform duration-200 hover:scale-[1.04]",
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
      <AlertOctagon
        size={iconSize}
        strokeWidth={2}
        className="shrink-0"
        aria-hidden="true"
      />
    </div>
  );
}

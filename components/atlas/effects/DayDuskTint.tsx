"use client";

import React, { useEffect, useState } from "react";

/** [hour (Philippine time), r, g, b, alpha] keyframes; values are interpolated between them. */
const KEYS: Array<[number, number, number, number, number]> = [
  [0, 28, 52, 110, 0.16],   // deep night: cool blue
  [4.5, 28, 52, 110, 0.16],
  [5.75, 255, 170, 120, 0.12], // dawn: peach
  [7.5, 255, 236, 200, 0.0],   // morning: clear
  [16, 255, 236, 200, 0.0],
  [17.5, 255, 150, 70, 0.13],  // golden hour
  [18.75, 150, 90, 170, 0.14], // dusk: violet
  [20, 28, 52, 110, 0.16],
  [24, 28, 52, 110, 0.16],
];

function tintForHour(h: number): { rgb: string; a: number } {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (h >= a[0] && h <= b[0]) {
      const t = (h - a[0]) / Math.max(0.0001, b[0] - a[0]);
      const mix = (x: number, y: number) => x + (y - x) * t;
      return { rgb: `${Math.round(mix(a[1], b[1]))}, ${Math.round(mix(a[2], b[2]))}, ${Math.round(mix(a[3], b[3]))}`, a: mix(a[4], b[4]) };
    }
  }
  return { rgb: "28, 52, 110", a: 0.16 };
}

/** Hour of day in the Philippines (UTC+8), regardless of the viewer's own timezone. */
function philippineHour(): number {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/**
 * A barely-there colour wash over the base map that follows the time of day in the Philippines:
 * peach at dawn, clear by day, amber then violet at dusk, cool blue at night.
 * Purely decorative: it ignores pointer events and sits under every control.
 */
export function DayDuskTint({ satellite = false, dark = false }: { satellite?: boolean; dark?: boolean }) {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setHour(philippineHour());
    update();
    const id = window.setInterval(update, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  if (hour === null) return null;
  const { rgb, a } = tintForHour(hour);
  // Warm washes turn a dark basemap muddy brown, so they are held far back there
  const alpha = a * (satellite ? 0.6 : 1) * (dark ? 0.4 : 1);
  if (alpha < 0.005) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] transition-[background] duration-[2000ms]"
      style={{
        background: `linear-gradient(200deg, rgba(${rgb}, ${alpha.toFixed(3)}) 0%, rgba(${rgb}, ${(alpha * 0.45).toFixed(3)}) 70%)`,
      }}
    />
  );
}

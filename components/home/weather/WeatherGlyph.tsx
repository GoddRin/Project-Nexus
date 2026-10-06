"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import type { WeatherGlyphKind } from "@/lib/home/types";

export type { WeatherGlyphKind } from "@/lib/home/types";
export { glyphForWmo } from "@/lib/home/weatherCodes";

const LABEL: Record<WeatherGlyphKind, string> = {
  "clear-day": "Clear sky",
  "clear-night": "Clear night",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  "heavy-rain": "Heavy rain",
  thunderstorm: "Thunderstorm",
  fog: "Fog",
  wind: "Windy",
};

const SUN = "var(--scic-amber)";
const CLOUD = "var(--home-glyph-cloud)";
const CLOUD_DARK = "var(--home-glyph-cloud-dark)";
const WATER = "var(--scic-cyan)";
const MOON = "var(--home-glyph-moon)";

/** A cloud, about 40 wide, with its flat base on y */
function Cloud({ x, y, scale = 1, fill, part }: { x: number; y: number; scale?: number; fill: string; part: "cloud" | "cloud-back" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        data-part={part}
        fill={fill}
        d="M9 0a9 9 0 0 1-1.2-17.9A12 12 0 0 1 30.6-21 10.5 10.5 0 0 1 33 0Z"
      />
    </g>
  );
}

function Sun({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <g data-part="rays" stroke={SUN} strokeWidth={2.6} strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = cx + Math.cos(a) * (r + 4.5);
          const y1 = cy + Math.sin(a) * (r + 4.5);
          const x2 = cx + Math.cos(a) * (r + 9.5);
          const y2 = cy + Math.sin(a) * (r + 9.5);
          return <line key={i} x1={x1.toFixed(2)} y1={y1.toFixed(2)} x2={x2.toFixed(2)} y2={y2.toFixed(2)} />;
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  );
}

function Drops({ count, heavy }: { count: number; heavy?: boolean }) {
  const xs = count === 3 ? [22, 32, 42] : [17, 25, 33, 41, 49];
  return (
    <g stroke={WATER} strokeWidth={heavy ? 2.8 : 2.4} strokeLinecap="round">
      {xs.map((x, i) => (
        <line key={x} data-part="drop" data-n={i + 1} x1={x} y1={45} x2={x - 2.5} y2={heavy ? 53 : 51} />
      ))}
    </g>
  );
}

export interface WeatherGlyphProps {
  kind: WeatherGlyphKind;
  size?: number;
  /** overrides the default spoken name; pass "" for a decorative glyph next to its own label */
  title?: string;
  className?: string;
}

/**
 * Animated weather glyph: plain SVG, moved by the CSS in the Nexus Home block of globals.css
 * (sun rays turn, clouds drift, rain falls, lightning flickers, fog and wind slide).
 * Colours are tokens, so it reads in both themes. It rests while off-screen or in a hidden tab,
 * and is a still picture under reduced motion.
 */
export function WeatherGlyph({ kind, size = 64, title, className }: WeatherGlyphProps) {
  const ref = useRef<SVGSVGElement>(null);
  usePauseOffscreen(ref);
  const name = title ?? LABEL[kind];
  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      data-kind={kind}
      className={cn("home-glyph shrink-0", className)}
      {...(name ? { role: "img", "aria-label": name } : { "aria-hidden": true })}
    >
      {kind === "clear-day" && <Sun cx={32} cy={32} r={11} />}

      {kind === "clear-night" && (
        <g>
          <path fill={MOON} d="M40 46.5A16 16 0 0 1 27.2 17a13.2 13.2 0 1 0 17.6 21.6 16 16 0 0 1-4.8 7.9Z" />
          <circle data-part="star" data-n={1} cx={45} cy={18} r={1.8} fill={MOON} />
          <circle data-part="star" data-n={2} cx={51} cy={30} r={1.3} fill={MOON} />
        </g>
      )}

      {kind === "partly-cloudy" && (
        <g>
          <Sun cx={23} cy={23} r={8.5} />
          <Cloud x={17} y={49} fill={CLOUD} part="cloud" />
        </g>
      )}

      {kind === "cloudy" && (
        <g>
          <Cloud x={24} y={36} scale={0.8} fill={CLOUD_DARK} part="cloud-back" />
          <Cloud x={11} y={49} fill={CLOUD} part="cloud" />
        </g>
      )}

      {kind === "rain" && (
        <g>
          <Cloud x={12} y={40} fill={CLOUD} part="cloud" />
          <Drops count={3} />
        </g>
      )}

      {kind === "heavy-rain" && (
        <g>
          <Cloud x={24} y={30} scale={0.8} fill={CLOUD_DARK} part="cloud-back" />
          <Cloud x={11} y={40} fill={CLOUD_DARK} part="cloud" />
          <Drops count={5} heavy />
        </g>
      )}

      {kind === "thunderstorm" && (
        <g>
          <Cloud x={12} y={38} fill={CLOUD_DARK} part="cloud" />
          <path data-part="bolt" fill={SUN} d="M33 36l-9 12h6.2l-3 10.5L38 45h-6.4l3.2-9Z" />
          <g stroke={WATER} strokeWidth={2.4} strokeLinecap="round">
            <line data-part="drop" data-n={1} x1={19} y1={44} x2={16.5} y2={50} />
            <line data-part="drop" data-n={3} x1={46} y1={44} x2={43.5} y2={50} />
          </g>
        </g>
      )}

      {kind === "fog" && (
        <g>
          <Cloud x={12} y={34} fill={CLOUD} part="cloud" />
          <g stroke={CLOUD_DARK} strokeWidth={2.6} strokeLinecap="round">
            <line data-part="fog" data-n={1} x1={12} y1={42} x2={52} y2={42} />
            <line data-part="fog" data-n={2} x1={17} y1={49} x2={47} y2={49} />
            <line data-part="fog" data-n={1} x1={22} y1={56} x2={42} y2={56} />
          </g>
        </g>
      )}

      {kind === "wind" && (
        <g fill="none" stroke={CLOUD_DARK} strokeWidth={2.8} strokeLinecap="round">
          <path data-part="gust" data-n={1} d="M10 24h27a6 6 0 1 0-6-6" />
          <path data-part="gust" data-n={2} d="M8 34h38a6.5 6.5 0 1 1-6.5 6.5" />
          <path data-part="gust" data-n={3} d="M14 44h15a5 5 0 1 1-5 5" />
        </g>
      )}
    </svg>
  );
}

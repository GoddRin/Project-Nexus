"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useAtlasMap } from "@/components/atlas/AtlasMapContext";
import { prefersReducedMotionNow } from "@/components/shared/motion";

const SESSION_KEY = "scic.atlas.intro.seen";
/** Island groups revealed in order: [lng, lat, final radius as a fraction of the map's diagonal] */
const ISLANDS: Array<[number, number, number]> = [
  [121.0, 16.2, 0.62], // Luzon
  [123.6, 11.0, 0.62], // Visayas
  [125.0, 7.8, 0.75],  // Mindanao
];
const LOGO_MS = 950;
const REVEAL_MS = 1050;
const STAGGER_MS = 170;

/**
 * Two-second brand intro, once per browser session:
 * the Sta. Clara logo draws itself, then the cover opens over Luzon, Visayas and Mindanao in turn.
 * Any click, key press or map interaction skips it instantly (the map underneath is already live).
 */
export function AtlasIntro() {
  const { mapInstance: map } = useAtlasMap();
  const [phase, setPhase] = useState<"off" | "logo" | "reveal">("off");
  const coverRef = useRef<HTMLDivElement>(null);

  // Survives React StrictMode's double effect run in development (the second run must not
  // read the "seen" flag the first run just wrote and leave the cover up forever)
  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      try {
        if (window.sessionStorage.getItem(SESSION_KEY) === "1" || prefersReducedMotionNow()) return;
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        return;
      }
      startedRef.current = true;
    }
    setPhase("logo");
    const t = window.setTimeout(() => setPhase("reveal"), LOGO_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === "off") return;
    const t = window.setTimeout(() => setPhase("off"), LOGO_MS + REVEAL_MS + STAGGER_MS * ISLANDS.length + 600);
    return () => window.clearTimeout(t);
  }, [phase === "off"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Skip on any interaction
  useEffect(() => {
    if (phase === "off") return;
    const skip = () => setPhase("off");
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("wheel", skip, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
    };
  }, [phase]);

  // Island-by-island reveal: three growing holes in the cover
  useEffect(() => {
    if (phase !== "reveal") return;
    const el = coverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const diag = Math.hypot(rect.width, rect.height);
    const centers = ISLANDS.map(([lng, lat], i) => {
      try {
        if (map) {
          const p = map.project([lng, lat]);
          return { x: p.x, y: p.y };
        }
      } catch {}
      // fallback: rough positions if the map is not ready
      return { x: rect.width * 0.55, y: rect.height * (0.3 + i * 0.22) };
    });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const masks: string[] = [];
      let done = true;
      ISLANDS.forEach(([, , size], i) => {
        const p = Math.min(1, Math.max(0, (now - start - i * STAGGER_MS) / REVEAL_MS));
        if (p < 1) done = false;
        const eased = 1 - Math.pow(1 - p, 3);
        const r = eased * diag * size;
        masks.push(
          `radial-gradient(circle ${r.toFixed(1)}px at ${centers[i].x.toFixed(1)}px ${centers[i].y.toFixed(1)}px, transparent 0, transparent 72%, #000 100%)`
        );
      });
      const value = masks.join(", ");
      el.style.maskImage = value;
      el.style.webkitMaskImage = value;
      el.style.maskComposite = "intersect";
      // Safari / older Chromium spelling
      el.style.setProperty("-webkit-mask-composite", "source-in");
      if (done) setPhase("off");
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, map]);

  if (phase === "off") return null;

  return (
    <div
      ref={coverRef}
      aria-hidden
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-bg-base"
    >
      <div
        className="atlas-intro-logo"
        style={{ opacity: phase === "reveal" ? 0 : 1, transition: "opacity 320ms var(--ease-brand)" }}
      >
        <BrandLogo variant="wordmark" height={44} priority />
      </div>
      <div
        className="energy-line draw-x w-40"
        style={{ opacity: phase === "reveal" ? 0 : 1, transition: "opacity 320ms var(--ease-brand)" }}
      />
      <p
        className="text-[11px] uppercase tracking-[0.3em] text-text-muted"
        style={{ opacity: phase === "reveal" ? 0 : 1, transition: "opacity 320ms var(--ease-brand)" }}
      >
        Renew Your Energy
      </p>
    </div>
  );
}

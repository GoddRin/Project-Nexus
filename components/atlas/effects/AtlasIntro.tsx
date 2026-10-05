"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useAtlasMap } from "@/components/atlas/AtlasMapContext";
import { prefersReducedMotionNow } from "@/components/shared/motion";

/** Longest wait for the map to finish loading before the intro plays over whatever is there */
const MAP_WAIT_MS = 4000;
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
 * Two-second brand intro each time the national map is opened: the Sta. Clara logo draws itself,
 * then the cover opens over Luzon, Visayas and Mindanao in turn. It waits for the map to load (so
 * the reveal opens onto real map, not a blank canvas) and for the tab to be visible. With reduced
 * motion it is a short, still logo that fades. Any click, key press or wheel skips it instantly.
 */
/** True once the opening has finished (or was skipped). The navigator waits for this to greet. */
let introFinished = false;
export const ATLAS_INTRO_DONE_EVENT = "atlas:intro-done";
export function atlasIntroFinished(): boolean {
  return introFinished;
}

export function AtlasIntro() {
  const { mapInstance: map } = useAtlasMap();
  // "waiting": cover up (logo hidden) until the map has loaded; it never shows a blank map
  const [phase, setPhase] = useState<"waiting" | "off" | "logo" | "reveal" | "fade">("waiting");
  const coverRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (phase !== "waiting" || startedRef.current) return;
    let cancelled = false;
    const begin = () => {
      if (cancelled || startedRef.current) return;
      startedRef.current = true;
      // opened in a background tab: nobody would see it, so the map is simply there when they look
      if (document.visibilityState !== "visible") return setPhase("off");
      setPhase(prefersReducedMotionNow() ? "fade" : "logo");
    };
    const giveUp = window.setTimeout(begin, MAP_WAIT_MS);
    if (map) {
      if (map.loaded()) begin();
      else map.once("load", begin);
    }
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      map?.off("load", begin);
    };
  }, [map, phase]);

  useEffect(() => {
    if (phase === "logo") {
      const t = window.setTimeout(() => setPhase("reveal"), LOGO_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === "fade") {
      const t = window.setTimeout(() => setPhase("off"), 1100);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "logo") return;
    const t = window.setTimeout(() => setPhase("off"), LOGO_MS + REVEAL_MS + STAGGER_MS * ISLANDS.length + 600);
    return () => window.clearTimeout(t);
  }, [phase === "logo"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the page when the opening is over (the navigator greets only after it)
  useEffect(() => {
    if (phase === "waiting") introFinished = false;
    if (phase !== "off") return;
    introFinished = true;
    window.dispatchEvent(new Event(ATLAS_INTRO_DONE_EVENT));
  }, [phase]);

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
  const logoOpacity = phase === "logo" ? 1 : phase === "fade" ? 1 : 0;

  return (
    <div
      ref={coverRef}
      aria-hidden
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-bg-base"
      style={phase === "fade" ? { animation: "atlas-intro-fade 1100ms ease-in forwards" } : undefined}
    >
      <style>{"@keyframes atlas-intro-fade{0%,55%{opacity:1}100%{opacity:0}}"}</style>
      <div
        className="atlas-intro-logo"
        style={{ opacity: logoOpacity, transition: "opacity 320ms var(--ease-brand)" }}
      >
        <BrandLogo variant="wordmark" height={44} priority />
      </div>
      <div
        className="energy-line draw-x w-40"
        style={{ opacity: logoOpacity, transition: "opacity 320ms var(--ease-brand)" }}
      />
      <p
        className="text-[11px] uppercase tracking-[0.3em] text-text-muted"
        style={{ opacity: logoOpacity, transition: "opacity 320ms var(--ease-brand)" }}
      >
        Renew Your Energy
      </p>
    </div>
  );
}

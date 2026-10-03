"use client";

import { useEffect, useState } from "react";

/**
 * One spring for every sliding panel in the product, so the whole interface moves the same way.
 * Mirrors --ease-brand / --dur-* in globals.css for CSS-driven motion.
 */
export const BRAND_SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
export const BRAND_EASE = [0.22, 1, 0.36, 1] as const;
export const BRAND_FADE = { duration: 0.24, ease: BRAND_EASE } as const;

/** True when the visitor asked the OS for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function prefersReducedMotionNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

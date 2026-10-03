"use client";

import { useEffect } from "react";

/**
 * Cursor-following highlight for any element with the `spotlight` class (see globals.css).
 * One passive listener for the whole app; it only writes two CSS variables on the hovered card.
 */
export function SpotlightProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const e = lastEvent;
      if (!e) return;
      const target = (e.target as Element | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${e.clientX - r.left}px`);
      target.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

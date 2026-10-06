"use client";

import { useEffect, type RefObject } from "react";

/**
 * Rests every infinite CSS animation inside an element while nobody can see it: sets
 * data-paused="true" when the element is off-screen or the tab is hidden (the Nexus Home block
 * in globals.css pauses on that attribute), and clears it when it is back in view.
 */
export function usePauseOffscreen(ref: RefObject<HTMLElement | SVGElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let onScreen = true;
    const apply = () => {
      const paused = !onScreen || document.visibilityState !== "visible";
      if (paused) el.setAttribute("data-paused", "true");
      else el.removeAttribute("data-paused");
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        apply();
      },
      { rootMargin: "80px" }
    );
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, [ref]);
}

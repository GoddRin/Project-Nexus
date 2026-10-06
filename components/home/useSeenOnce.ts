"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True from the first time enough of an element is on screen, and from then on. Used to start
 * the one-time CSS animations of Nexus Home (they are keyed on data-inview="true").
 */
export function useSeenOnce(ref: RefObject<HTMLElement | SVGElement | null>, amount = 0.25): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no observer in this browser: show at once
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: amount }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, amount, seen]);
  return seen;
}

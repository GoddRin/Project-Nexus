"use client";

import React, { useEffect, useRef, useState } from "react";
import { prefersReducedMotionNow } from "./motion";

interface CountUpProps {
  value: number;
  /** ms */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Number that counts up once on first paint and rolls to the new value whenever it changes
 * (e.g. when filters change). Renders the final value immediately under reduced motion.
 */
export function CountUp({ value, duration = 900, decimals = 0, prefix = "", suffix = "", className }: CountUpProps) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotionNow() || !Number.isFinite(value)) {
      fromRef.current = value;
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (value - from) * eased;
      fromRef.current = v;
      setShown(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const text = shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

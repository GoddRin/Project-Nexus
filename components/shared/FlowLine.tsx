"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * FlowLine — animated SVG sine wave representing river flow / generation curve.
 * GPU-only CSS animation for the idle float; one-shot draw-in via stroke-dashoffset.
 */
export function FlowLine({ className = "" }: { className?: string }) {
 const shouldReduceMotion = useReducedMotion();
 const pathRef = useRef<SVGPathElement>(null);

 // Generate a loose sine-wave path across the full width
 const points: string[] = [];
 const width = 1200;
 const height = 120;
 const amplitude = 30;
 const frequency = 3;

 for (let x = 0; x <= width; x += 4) {
 const y =
 height / 2 +
 Math.sin((x / width) * Math.PI * frequency * 2) * amplitude +
 Math.sin((x / width) * Math.PI * 1.3) * (amplitude * 0.4);
 points.push(`${x === 0 ? "M" : "L"} ${x} ${y.toFixed(2)}`);
 }

 const pathD = points.join(" ");
 const pathLength = 2400;

 useEffect(() => {
 if (!pathRef.current || shouldReduceMotion) return;
 const el = pathRef.current;
 // Draw-in via JS then hand off to CSS animation
 el.style.strokeDasharray = String(pathLength);
 el.style.strokeDashoffset = String(pathLength);
 el.style.opacity = "0.2";

 const start = performance.now();
 const duration = 2500;

 function step(now: number) {
 const t = Math.min((now - start) / duration, 1);
 const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
 el.style.strokeDashoffset = String(pathLength * (1 - ease));
 el.style.opacity = String(0.2 + 0.8 * ease);
 if (t < 1) requestAnimationFrame(step);
 }

 requestAnimationFrame(step);
 }, [shouldReduceMotion, pathLength]);

 if (shouldReduceMotion) {
 return (
 <div
 className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
 aria-hidden="true"
 >
 <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full opacity-60">
 <defs>
 <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor="transparent" />
 <stop offset="20%" stopColor="var(--color-brand-green)" />
 <stop offset="80%" stopColor="var(--color-flow-teal)" />
 <stop offset="100%" stopColor="transparent" />
 </linearGradient>
 </defs>
 <path d={pathD} fill="none" stroke="url(#flow-gradient)" strokeWidth={2.5} strokeLinecap="round" />
 </svg>
 </div>
 );
 }

 return (
 <div
 className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
 aria-hidden="true"
 style={{ animation: "flowline-float 14s ease-in-out infinite" }}
 >
 <style>{`
 @keyframes flowline-float {
 0%, 100% { transform: translate3d(0, 0px, 0); }
 50% { transform: translate3d(0, -7px, 0); }
 }
 `}</style>
 <svg
 viewBox={`0 0 ${width} ${height}`}
 preserveAspectRatio="none"
 className="h-full w-full opacity-60"
 style={{ filter: "drop-shadow(0 0 4px rgba(31,182,166,0.5))" }}
 >
 <defs>
 <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor="transparent" />
 <stop offset="20%" stopColor="var(--color-brand-green)" />
 <stop offset="80%" stopColor="var(--color-flow-teal)" />
 <stop offset="100%" stopColor="transparent" />
 </linearGradient>
 </defs>
 <path
 ref={pathRef}
 d={pathD}
 fill="none"
 stroke="url(#flow-gradient)"
 strokeWidth={2.5}
 strokeLinecap="round"
 style={{ strokeDasharray: pathLength, strokeDashoffset: pathLength, opacity: 0.2 }}
 />
 </svg>
 </div>
 );
}

"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

interface AnimatedSectionProps {
 children: React.ReactNode;
 className?: string;
 /** Delay before animation starts, in seconds */
 delay?: number;
}

/**
 * AnimatedSection — fades + slides up 12px on first scroll into viewport.
 * Uses only compositor-accelerated properties (opacity + transform).
 * Triggers ONCE. Respects prefers-reduced-motion.
 */
export function AnimatedSection({
 children,
 className = "",
 delay = 0,
}: AnimatedSectionProps) {
 const ref = useRef<HTMLDivElement>(null);
 const isInView = useInView(ref, { once: true, margin: "-32px" });
 const shouldReduceMotion = useReducedMotion();

 return (
 <motion.div
 ref={ref}
 className={className}
 style={{ willChange: "transform, opacity" }}
 initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
 animate={
 shouldReduceMotion
 ? { opacity: 1, y: 0 }
 : isInView
 ? { opacity: 1, y: 0 }
 : { opacity: 0, y: 12 }
 }
 transition={{
 duration: shouldReduceMotion ? 0 : 0.3,
 delay: shouldReduceMotion ? 0 : delay,
 ease: [0.22, 1, 0.36, 1], // ease-out-quint — snappier feel
 }}
 >
 {children}
 </motion.div>
 );
}


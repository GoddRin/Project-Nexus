import type { Transition, Variants } from "framer-motion";
import { BRAND_EASE, BRAND_SPRING } from "@/components/shared/motion";

/**
 * Motion vocabulary of Nexus Home, built on the brand's ease and spring.
 * (`MotionConfig reducedMotion="user"` is global: with reduced motion framer-motion keeps the
 * opacity part of each preset and drops the movement and blur.)
 */

const RISE: Transition = { duration: 0.6, ease: BRAND_EASE };

/** A block rises 16 px out of a slight blur */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: RISE },
};

/** Parent of staggered children (each child uses `fadeUp` or `wordRevealWord`) */
export function stagger(ms = 60, delayMs = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: ms / 1000, delayChildren: delayMs / 1000 } },
  };
}

/** Headline revealed word by word: 40 ms apart, each word rising 12 px */
export const wordRevealContainer: Variants = stagger(40, 120);
export const wordRevealWord: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: BRAND_EASE } },
};

/** Spread onto a motion element to play its variants once, when 15% of it is on screen */
export const inView = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.15 },
} as const;

/** Largest tilt of a card under the pointer, in degrees (pointer devices only) */
export const MAX_TILT_DEG = 4;
/** Farthest a magnetic tile follows the cursor, in px */
export const MAGNET_PX = 6;
export const SPRING_BACK = BRAND_SPRING;

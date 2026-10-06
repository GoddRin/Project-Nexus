"use client";

import React from "react";
import { motion } from "framer-motion";
import { wordRevealContainer, wordRevealWord } from "@/components/home/motionPresets";

/**
 * The display line, revealed word by word (each rises 12 px, 40 ms apart). The last word takes
 * the brand accent. With reduced motion the words simply fade in.
 */
export function HeroHeadline({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <motion.p variants={wordRevealContainer} initial="hidden" animate="show" className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span key={`${word}-${i}`} variants={wordRevealWord} aria-hidden className={i === words.length - 1 ? "home-hero-accent inline-block" : "mr-[0.24em] inline-block"}>
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

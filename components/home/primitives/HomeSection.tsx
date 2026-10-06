"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeUp, inView } from "@/components/home/motionPresets";

export interface HomeSectionProps {
  /** used for the heading id (aria-labelledby) and for in-page links (#id) */
  id: string;
  eyebrow?: string;
  title: string;
  /** "View all" style link on the right of the header */
  action?: { href: string; label: string; external?: boolean };
  /** extra controls on the right of the header (filters, live pulse, buttons) */
  aside?: React.ReactNode;
  /** hide the heading visually (it stays for screen readers and the outline) */
  titleHidden?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * A landmark section of Nexus Home: mono eyebrow, display title (h2), optional action, and a
 * rise-in the first time it scrolls into view.
 */
export function HomeSection({ id, eyebrow, title, action, aside, titleHidden, className, children }: HomeSectionProps) {
  const headingId = `${id}-title`;
  return (
    <motion.section id={id} aria-labelledby={headingId} variants={fadeUp} {...inView} className={cn("scroll-mt-24", className)}>
      <header className={cn("mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", titleHidden && !aside && !action && "sr-only")}>
        <div className={cn("min-w-0", titleHidden && "sr-only")}>
          {eyebrow && <p className="home-eyebrow">{eyebrow}</p>}
          <h2 id={headingId} className="home-section-title mt-1">
            {title}
          </h2>
        </div>
        {(aside || action) && (
          <div className="flex flex-wrap items-center gap-3">
            {aside}
            {action && (
              <Link
                href={action.href}
                {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group inline-flex items-center gap-1 text-sm font-medium text-scic-green hover:text-scic-green-energy dark:text-scic-green-bright"
              >
                {action.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </header>
      {children}
    </motion.section>
  );
}

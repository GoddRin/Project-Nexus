"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { CloudSun, Newspaper, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeUp, stagger } from "@/components/home/motionPresets";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import type { DailyBrief } from "@/lib/home/types";

const EDITION: Record<DailyBrief["slot"], string> = { MORNING: "Morning edition", MIDDAY: "Midday edition", EVENING: "Evening edition" };
const MOOD = {
  CALM: { label: "All clear", cls: "border-scic-green/35 bg-scic-green/10 text-scic-green dark:text-scic-green-bright", dot: "bg-scic-green-energy" },
  WATCH: { label: "Watch", cls: "border-scic-amber/45 bg-scic-amber/12 text-scic-amber", dot: "bg-scic-amber" },
  ALERT: { label: "Alert", cls: "border-scic-red/45 bg-scic-red/12 text-scic-red", dot: "bg-scic-red" },
} as const;
/** The three items always come in this order (see lib/home/dailyBrief.ts) */
const SECTIONS = [
  { label: "On site", Icon: CloudSun, tone: "text-scic-cyan bg-scic-cyan/10" },
  { label: "Flagship", Icon: TrendingUp, tone: "text-scic-green bg-scic-green/10 dark:text-scic-green-bright" },
  { label: "In the news", Icon: Newspaper, tone: "text-scic-amber bg-scic-amber/10" },
] as const;

const manilaDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const manilaShortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const manilaTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/**
 * Types a line out once, the first time it is seen (about fifty characters a second), and shows
 * it whole under reduced motion. The whole line is always in the markup for screen readers, and
 * the part not yet typed keeps its space, so the card never changes height. If the effect is
 * interrupted (a new edition arrives, or React re-runs it), the line is simply shown in full:
 * it can never be left empty.
 */
function Typewriter({ text, play }: { text: string; play: boolean }) {
  const [shown, setShown] = useState(text.length);
  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the animation starts from empty
    setShown(0);
    const id = window.setInterval(() => {
      n += 2;
      setShown(Math.min(text.length, n));
      if (n >= text.length) window.clearInterval(id);
    }, 40);
    return () => {
      window.clearInterval(id);
      setShown(text.length);
    };
  }, [play, text]);
  const typing = shown < text.length;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        {typing && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-scic-green-energy" />}
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </>
  );
}

/**
 * The Daily Brief: three editions a day (morning, midday, evening), each a headline and three
 * items in a fixed order: the site today, the flagship project, and the news. It is set like the
 * front of a small newspaper: masthead with the date and edition, a rule, the lead, then the
 * numbered items. It checks for a new edition every ten minutes.
 */
export function DailyBriefCard({ initial }: { initial: DailyBrief }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const { data: brief } = useLiveFeed<DailyBrief>("/api/home/brief", CLIENT_REFRESH.brief, initial, {
    initialUpdatedAt: initial.generatedAt,
    updatedAtOf: (d) => d.generatedAt,
  });
  const mood = MOOD[brief.mood];
  return (
    <section ref={ref} aria-labelledby="home-brief-title" className="glass-scic-card spotlight h-full min-h-[340px] min-w-0 p-4 md:p-5">
      {/* masthead */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold leading-none tracking-[-0.03em] text-text-primary">Daily Brief</p>
          <p className="home-eyebrow mt-1.5 truncate" suppressHydrationWarning>
            <span className="hidden sm:inline">{manilaDate(brief.generatedAt)}</span>
            <span className="sm:hidden">{manilaShortDate(brief.generatedAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]", mood.cls)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", mood.dot)} aria-hidden />
            {mood.label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{EDITION[brief.slot]}</span>
        </div>
      </div>
      <div className="home-masthead-rule mt-3" aria-hidden />

      {/* keyed by edition: a new one animates in like the first */}
      <motion.div key={`${brief.slot}-${brief.generatedAt}`} variants={stagger(120, 80)} initial="hidden" animate={seen ? "show" : "hidden"} className="mt-4 flex flex-1 flex-col">
        <motion.h2 id="home-brief-title" variants={fadeUp} className="font-display text-xl font-bold leading-snug tracking-[-0.02em] text-text-primary md:text-[1.4rem]">
          {brief.headline}
        </motion.h2>
        <ol className="mt-4 space-y-3.5">
          {brief.bullets.map((text, i) => {
            const section = SECTIONS[i] ?? SECTIONS[2];
            return (
              <motion.li key={i} variants={fadeUp} className="flex gap-3">
                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", section.tone)}>
                  <section.Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] font-semibold tabular-nums text-text-muted">0{i + 1}</span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">{section.label}</span>
                  </span>
                  <span className="mt-0.5 block text-sm leading-6 text-text-secondary">{i === 0 ? <Typewriter text={text} play={seen} /> : text}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>
      </motion.div>

      <footer className="mt-4 border-t border-border-hairline pt-3">
        <p className="font-mono text-[11px] text-text-muted" suppressHydrationWarning>
          {EDITION[brief.slot]} · prepared {manilaTime(brief.generatedAt)} PHT · next edition at {brief.slot === "MORNING" ? "12:00" : brief.slot === "MIDDAY" ? "18:00" : "06:00"}
        </p>
      </footer>
    </section>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Box, CalendarClock, Droplets, HardHat, LayoutDashboard, MapPin, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { ProgressRing } from "@/components/home/primitives/ProgressRing";
import { atlasHref, COMMAND_CENTER_HREF } from "@/lib/home/links";
import { FlipCountdown } from "./FlipCountdown";
import { ProgressChart } from "./ProgressChart";

export interface FlagshipSpotlightProps {
  slug: string;
  name: string;
  /** the record's status is ongoing */
  ongoing: boolean;
  facts: { capacity: string; type: string; river: string; location: string; client: string };
  photos: string[];
  progress: { percent: number; asOf: string | null } | null;
  readings: { date: string; percent: number }[];
  targetCodDate: string | null;
  /** the latest daily log; `stale` when it is more than three days old */
  dailyLog: { date: string; headcount: number; zones: number; stale: boolean } | null;
}

const SLIDE_MS = 6500;
const longDay = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const shortDay = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/**
 * The flagship site, from its own records: photographs from the site, overall progress as last
 * logged (with its date), a countdown to the target commercial operation date, the logged
 * readings over time, and the latest daily log. Every figure is a record; where a record is
 * missing, its part is left out.
 */
export function FlagshipSpotlight({ slug, name, ongoing, facts, photos, progress, readings, targetCodDate, dailyLog }: FlagshipSpotlightProps) {
  const root = useRef<HTMLDivElement>(null);
  usePauseOffscreen(root);
  const [slide, setSlide] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (photos.length < 2 || held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (root.current?.getAttribute("data-paused") === "true") return;
      setSlide((s) => (s + 1) % photos.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [photos.length, held]);

  const chips = [
    { Icon: Zap, text: facts.capacity },
    { Icon: Droplets, text: `${facts.type} · ${facts.river}` },
    { Icon: MapPin, text: facts.location },
  ];
  return (
    <div ref={root} className="glass-scic-card overflow-hidden p-0">
      <div className="grid lg:grid-cols-12">
        {/* photographs */}
        <div
          className="relative min-h-[260px] overflow-hidden lg:col-span-5 lg:min-h-full"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHeld(false)}
        >
          <AnimatePresence initial={false}>
            {photos.length > 0 && (
              <motion.div key={photos[slide]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, ease: "easeInOut" }} className="absolute inset-0">
                <Image src={photos[slide]} alt="" fill sizes="(max-width: 1024px) 100vw, 520px" quality={90} className="home-kenburns object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/25" aria-hidden />
          {ongoing && (
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[var(--home-solid)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              <span className="home-heartbeat" aria-hidden />
              Under construction
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <p className="text-xs text-white/85">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/65">Site photographs</span>
              {facts.location}
            </p>
            {photos.length > 1 && (
              <div className="flex gap-1.5" role="group" aria-label="Choose a photograph">
                {photos.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Photograph ${i + 1} of ${photos.length}`}
                    aria-pressed={i === slide}
                    onClick={() => setSlide(i)}
                    className="flex h-6 w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <span className={cn("h-1.5 rounded-full bg-white transition-all duration-300", i === slide ? "w-5 opacity-100" : "w-1.5 opacity-50")} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* figures */}
        <div className="min-w-0 p-5 md:p-7 lg:col-span-7">
          <p className="home-eyebrow">Flagship project</p>
          <h2 id="flagship-title" className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] text-text-primary md:text-[2rem]">
            {name}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">For {facts.client}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {chips.map(({ Icon, text }) => (
              <li key={text} className="home-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-text-primary">
                <Icon className="h-3.5 w-3.5 text-scic-green dark:text-scic-green-bright" aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex min-w-0 flex-wrap items-center gap-x-8 gap-y-6">
            {progress && (
              <div className="flex items-center gap-4">
                <ProgressRing value={progress.percent} size={132} thickness={11} label="Overall progress">
                  <span className="text-[2rem] font-semibold leading-none">
                    {progress.percent.toFixed(progress.percent % 1 ? 1 : 0)}
                    <span className="text-base text-text-muted">%</span>
                  </span>
                </ProgressRing>
                <div>
                  <p className="home-eyebrow">Overall progress</p>
                  <p className="mt-1 max-w-[11rem] text-sm leading-snug text-text-secondary">
                    {progress.asOf ? (
                      <>
                        Last logged reading, <span className="whitespace-nowrap font-medium text-text-primary">{shortDay(progress.asOf)}</span>
                      </>
                    ) : (
                      "From the project record"
                    )}
                  </p>
                </div>
              </div>
            )}
            {targetCodDate && (
              <div>
                <p className="home-eyebrow flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  <span>Target commercial operation</span>
                  <span className="text-text-primary">{longDay(targetCodDate)}</span>
                </p>
                <FlipCountdown target={targetCodDate} className="mt-2.5" />
              </div>
            )}
          </div>

          {readings.length > 1 && <ProgressChart readings={readings} targetDate={targetCodDate} className="mt-7" />}

          {dailyLog && (
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
              <Users className="h-4 w-4 text-scic-green dark:text-scic-green-bright" aria-hidden />
              {dailyLog.stale && <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Last log</span>}
              <span className={cn(dailyLog.stale && "text-text-muted")}>
                <span className="font-mono font-semibold tabular-nums text-text-primary">{dailyLog.headcount}</span> personnel on site ·{" "}
                <span className="font-mono tabular-nums">{dailyLog.zones}</span> work zone{dailyLog.zones === 1 ? "" : "s"} · {shortDay(dailyLog.date)}
              </span>
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href={atlasHref(slug)}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--home-solid)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--home-solid-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Open on the Atlas
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            {[
              { href: COMMAND_CENTER_HREF, label: "Command Center", Icon: LayoutDashboard },
              { href: "/digital-twin", label: "Digital twin", Icon: Box },
              { href: "/dashboard/daily-logs", label: "Daily logs", Icon: HardHat },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="home-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-scic-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
              >
                <Icon className="h-4 w-4 text-scic-green dark:text-scic-green-bright" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

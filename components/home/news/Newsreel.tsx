"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceBadge } from "@/components/home/primitives/SourceBadge";
import { timeAgo } from "@/lib/home/time";
import type { PhotoStory } from "@/lib/home/types";

/** how long each story is on show */
export const NEWSREEL_MS = 10_000;

export interface NewsreelProps {
  stories: PhotoStory[];
  /** which story is on show (the parent owns it, so the list below can mark the same one) */
  index: number;
  onIndex: (next: number) => void;
  /** the reader is pointing at, or has focus in, the list below: hold the story on show */
  held?: boolean;
  now: Date | null;
  label: string;
}

/**
 * The Headlines slideshow: one story at a time with the photograph its publisher chose for it,
 * the headline and the publisher over a dark fade, and a line that shows how long it has left.
 * It moves on by itself every ten seconds, and rests while the pointer or the keyboard is on it,
 * while it is off-screen and while the tab is hidden. The arrows and the dots step by hand, the
 * button stops and starts it, and under reduced motion it never moves on its own. A photograph
 * that cannot be loaded gives way to the publisher's name on the brand's backdrop.
 */
export function Newsreel({ stories, index, onIndex, held = false, now, label }: NewsreelProps) {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [away, setAway] = useState(false);
  const [still, setStill] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  // off-screen or a hidden tab: rest
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let onScreen = true;
    const apply = () => setAway(!onScreen || document.visibilityState !== "visible");
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      apply();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  const count = stories.length;
  const paused = hover || held || stopped || away || still || count < 2;
  // move on after ten seconds ON SHOW: time spent resting does not count, and the wait picks up
  // where it left off (the progress line pauses and resumes the same way)
  const shown = useRef({ index: -1, elapsed: 0 });
  useEffect(() => {
    if (shown.current.index !== index) shown.current = { index, elapsed: 0 };
    if (paused) return;
    const started = performance.now();
    const id = window.setTimeout(() => onIndex((index + 1) % count), Math.max(0, NEWSREEL_MS - shown.current.elapsed));
    return () => {
      window.clearTimeout(id);
      shown.current.elapsed += performance.now() - started;
    };
  }, [paused, index, count, onIndex]);

  const story = stories[Math.min(index, count - 1)];
  if (!story) return null;
  const step = (by: number) => onIndex((index + by + count) % count);
  const round =
    "flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
  const missing = broken.has(story.id);

  return (
    <div
      ref={root}
      role="group"
      aria-roledescription="slideshow"
      aria-label={`${label}: story ${index + 1} of ${count}`}
      data-newsreel-paused={paused ? "true" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
        else return;
        e.preventDefault();
      }}
      className="group/reel relative aspect-[16/10] overflow-hidden rounded-xl bg-scic-navy-dark"
    >
      <AnimatePresence initial={false}>
        <motion.div key={story.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeInOut" }} className="absolute inset-0">
          {missing ? (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--scic-navy-dark)_0%,color-mix(in_srgb,var(--scic-green)_42%,var(--scic-navy-dark))_70%,color-mix(in_srgb,var(--scic-green-energy)_60%,var(--scic-navy-dark))_100%)]">
              <div className="home-contours" aria-hidden />
              <p aria-hidden className="absolute right-4 top-4 max-w-[70%] text-right font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] text-white/25">
                {story.source}
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- the publisher's own picture, loaded from the publisher (any host)
            <img
              src={story.image}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBroken((b) => new Set(b).add(story.id))}
              className="home-newsreel-photo absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="home-newsreel-scrim absolute inset-0" aria-hidden />

          <a href={story.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex flex-col justify-end p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-scic-green-energy">
            <span className="flex items-center gap-2 text-white/85">
              <SourceBadge source={story.source} domain={story.sourceDomain || undefined} size={14} className="max-w-[65%] !text-white/85" />
              {now && story.publishedAt && (
                <span className="shrink-0 font-mono text-[10px] text-white/65" suppressHydrationWarning>
                  {timeAgo(story.publishedAt, now)}
                </span>
              )}
            </span>
            <span className="mt-1.5 line-clamp-3 font-display text-[1.05rem] font-bold leading-snug tracking-[-0.01em] text-white">{story.title}</span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
              Read at {story.source} <ArrowUpRight className="h-3 w-3" aria-hidden />
            </span>
          </a>
        </motion.div>
      </AnimatePresence>

      {/* controls: shown on a touch screen always, under a mouse when the panel is pointed at */}
      {count > 1 && (
        <>
          <div className="absolute right-2.5 top-2.5 z-[2] flex gap-1.5 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-focus-within/reel:opacity-100 md:group-hover/reel:opacity-100">
            <button type="button" onClick={() => step(-1)} aria-label="Previous story" className={round}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            {!still && (
              <button type="button" onClick={() => setStopped((v) => !v)} aria-label={stopped ? "Start the slideshow" : "Stop the slideshow"} aria-pressed={stopped} className={round}>
                {stopped ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
              </button>
            )}
            <button type="button" onClick={() => step(1)} aria-label="Next story" className={round}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <span className="absolute left-3 top-3 z-[2] rounded-full bg-black/45 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-sm" aria-hidden>
            {index + 1} / {count}
          </span>
          {/* one segment per story; the one on show fills over its ten seconds */}
          <div className="absolute inset-x-0 bottom-0 z-[2] flex gap-1 px-3 pb-1.5" aria-hidden>
            {stories.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                {i < index && <span className="block h-full w-full bg-white/70" />}
                {i === index && <span className={cn("block h-full w-full bg-scic-green-energy", !still && "home-newsreel-progress")} style={{ ["--newsreel-ms" as string]: `${NEWSREEL_MS}ms` }} />}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

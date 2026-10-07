"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_EASE, BRAND_SPRING } from "@/components/shared/motion";
import { HomeSection } from "@/components/home/primitives/HomeSection";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { SourceBadge } from "@/components/home/primitives/SourceBadge";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import { timeAgo } from "@/lib/home/time";
import type { NewsCategoryKey, TrendingResult } from "@/lib/home/types";
import { Newsreel } from "./Newsreel";

const TABS: { key: NewsCategoryKey; label: string }[] = [
  { key: "PH", label: "PH" },
  { key: "ENERGY", label: "Energy & Infra" },
  { key: "BUSINESS", label: "Business" },
  { key: "WORLD", label: "World" },
];
/** rows under the slideshow, and rows when a tab has no photographs */
const ROWS_WITH_REEL = 5;
const ROWS_PLAIN = 6;
/** a tab needs at least this many stories with photographs to run as a slideshow */
const MIN_REEL = 3;

interface Row {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
}

/**
 * Headlines, in four tabs (the Philippines, energy and infrastructure, business, the world).
 *
 * Each tab opens on a slideshow of stories with the photograph their publisher attached
 * (BusinessWorld, GMA News, The Manila Times, Rappler), and lists the same stories beneath it:
 * the one on show is marked in the list, and pointing at a row (or reaching it with the
 * keyboard) brings its photograph up and holds it. When a tab has too few stories with
 * photographs, or the publishers cannot be reached, it lists the day's headlines from Google
 * News instead, without pictures. Every story opens at its publisher in a new tab. The tabs are
 * a proper tab list (arrow keys move between them, Home and End jump to the ends).
 */
export function TrendingNow({ initial }: { initial: Record<NewsCategoryKey, TrendingResult> }) {
  const id = useId();
  const { data, isRefreshing, isStale } = useLiveFeed<Record<NewsCategoryKey, TrendingResult>>("/api/home/trending", CLIENT_REFRESH.trending, initial);
  const [tab, setTab] = useState<NewsCategoryKey>("PH");
  const [slide, setSlide] = useState(0);
  const [held, setHeld] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, CLIENT_REFRESH.agoTick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const choose = (key: NewsCategoryKey) => {
    setTab(key);
    setSlide(0);
    setHeld(false);
  };
  const onKey = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    choose(TABS[next].key);
    refs.current[next]?.focus();
  };
  const onIndex = useCallback((next: number) => setSlide(next), []);

  const current = data[tab];
  const photos = current?.photos ?? [];
  const reel = photos.length >= MIN_REEL;
  const rows: Row[] = reel ? photos.slice(0, ROWS_WITH_REEL) : (current?.items.slice(0, ROWS_PLAIN) ?? []);
  const label = TABS.find((t) => t.key === tab)?.label ?? "";
  // (a refresh can shorten the list under the slideshow's feet)
  const onShow = reel ? Math.min(slide, photos.length - 1) : -1;

  return (
    <HomeSection
      id="trending"
      eyebrow="Trending now"
      title="Headlines"
      aside={<LivePulse updatedAt={current?.status.updatedAt} isRefreshing={isRefreshing} isStale={isStale || current?.status.ok === false} />}
      className="flex h-full flex-col"
    >
      <div className="glass-scic-card flex-1 p-3">
        <div role="tablist" aria-label="News sections" className="relative flex border-b border-border-hairline">
          {TABS.map((t, i) => {
            const selected = t.key === tab;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${t.key}`}
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(t.key)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "relative flex-1 whitespace-nowrap px-2 pb-2.5 pt-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-scic-green/40",
                  selected ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
                )}
              >
                {t.label}
                {selected && <motion.span layoutId={`${id}-underline`} transition={BRAND_SPRING} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-scic-green-energy" />}
              </button>
            );
          })}
        </div>

        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="min-h-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: BRAND_EASE }} className="pt-3">
              {reel && <Newsreel stories={photos} index={onShow} onIndex={onIndex} held={held} now={now} label={`${label} stories`} />}
              <ol className={cn(reel && "mt-1.5")} onPointerLeave={() => setHeld(false)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHeld(false)}>
                {rows.map((h, i) => {
                  const active = reel && i === onShow;
                  return (
                    <li key={h.id}>
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-current={active ? "true" : undefined}
                        // pointing at a row (or focusing it) brings its photograph up and holds it there
                        onPointerEnter={(e) => {
                          if (!reel || e.pointerType !== "mouse") return;
                          setSlide(i);
                          setHeld(true);
                        }}
                        onFocus={() => {
                          if (!reel) return;
                          setSlide(i);
                          setHeld(true);
                        }}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-xl px-2 transition-colors hover:bg-bg-panel-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
                          reel ? "py-2" : "py-2.5",
                          active && "bg-bg-panel-subtle"
                        )}
                      >
                        {active && <motion.span layoutId={`${id}-onshow`} transition={BRAND_SPRING} className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-scic-green-energy" aria-hidden />}
                        <span
                          aria-hidden
                          className={cn(
                            "w-7 shrink-0 text-right font-mono font-semibold tabular-nums group-hover:text-scic-green-energy",
                            reel ? "text-xl leading-6" : "text-2xl leading-7",
                            active ? "text-scic-green-energy" : "text-text-muted/60"
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">{h.title}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <SourceBadge source={h.source} domain={h.sourceDomain || undefined} size={14} className="max-w-[60%]" />
                            {now && h.publishedAt && (
                              <span className="shrink-0 font-mono text-[11px] text-text-muted" suppressHydrationWarning>
                                {timeAgo(h.publishedAt, now)}
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                      </a>
                    </li>
                  );
                })}
                {rows.length === 0 && <li className="px-3 py-10 text-center text-sm text-text-muted">No headlines are available for this section right now.</li>}
              </ol>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="border-t border-border-hairline px-2 pt-2.5 font-mono text-[10px] leading-relaxed text-text-muted">
          {reel ? "Stories and photographs: BusinessWorld · GMA News · The Manila Times · Rappler" : "Headlines via Google News"} · refreshed every 30 min
        </p>
      </div>
    </HomeSection>
  );
}

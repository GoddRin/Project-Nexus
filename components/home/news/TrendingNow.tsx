"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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

const TABS: { key: NewsCategoryKey; label: string }[] = [
  { key: "PH", label: "PH" },
  { key: "ENERGY", label: "Energy & Infra" },
  { key: "BUSINESS", label: "Business" },
  { key: "WORLD", label: "World" },
];
const ROWS = 6;

/**
 * Trending Now: the day's headlines in four tabs (the Philippines, energy and infrastructure,
 * business, the world), each a ranked list with its publisher and how long ago. The tabs are a
 * proper tab list (arrow keys move between them, Home and End jump to the ends) with an
 * underline that slides to the chosen one; the list cross-fades. Every headline opens its
 * publisher in a new tab. If the news service cannot be reached, the last list stays, marked
 * stale.
 */
export function TrendingNow({ initial }: { initial: Record<NewsCategoryKey, TrendingResult> }) {
  const id = useId();
  const { data, isRefreshing, isStale } = useLiveFeed<Record<NewsCategoryKey, TrendingResult>>("/api/home/trending", CLIENT_REFRESH.trending, initial);
  const [tab, setTab] = useState<NewsCategoryKey>("PH");
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
  const onKey = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].key);
    refs.current[next]?.focus();
  };

  const current = data[tab];
  const items = current?.items.slice(0, ROWS) ?? [];
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
                onClick={() => setTab(t.key)}
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
            <motion.ol key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: BRAND_EASE }} className="pt-1.5">
              {items.map((h, i) => (
                <li key={h.id}>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-bg-panel-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
                  >
                    <span aria-hidden className="w-7 shrink-0 text-right font-mono text-2xl font-semibold leading-7 tabular-nums text-text-muted/60 group-hover:text-scic-green-energy">
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
              ))}
              {items.length === 0 && <li className="px-3 py-10 text-center text-sm text-text-muted">No headlines are available for this section right now.</li>}
            </motion.ol>
          </AnimatePresence>
        </div>
        <p className="border-t border-border-hairline px-2 pt-2.5 font-mono text-[10px] text-text-muted">Headlines via Google News · refreshed every 30 min</p>
      </div>
    </HomeSection>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { BRAND_EASE, BRAND_SPRING } from "@/components/shared/motion";
import { HomeSection } from "@/components/home/primitives/HomeSection";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import type { CompanyFeedItem, CompanyFeedResult } from "@/lib/home/types";
import { FeaturedStory } from "./FeaturedStory";
import { FeedRow } from "./FeedRow";

/** Filter chips, and which feed categories each one shows (project events sit with the posts of their kind) */
const FILTERS: { key: string; label: string; categories: string[] | null }[] = [
  { key: "ALL", label: "All", categories: null },
  { key: "ANNOUNCEMENT", label: "Announcements", categories: ["ANNOUNCEMENT", "CSR", "PEOPLE"] },
  { key: "PROJECT_UPDATE", label: "Project updates", categories: ["PROJECT_UPDATE", "PROGRESS", "REPORT"] },
  { key: "MILESTONE", label: "Milestones", categories: ["MILESTONE", "COD"] },
  { key: "SAFETY", label: "Safety", categories: ["SAFETY"] },
  { key: "PRESS", label: "Press", categories: ["PRESS"] },
];
const COLLAPSED_ROWS = 6;

/** The lead: the pinned post, else the newest item with a photograph, else the newest item */
function pickFeatured(items: CompanyFeedItem[]): CompanyFeedItem | null {
  return items.find((i) => i.pinned) ?? items.find((i) => !!i.coverImage) ?? items.find((i) => i.kind === "POST") ?? items[0] ?? null;
}

/**
 * The SCIC Newsroom: the company's own posts, events read from the project records, and press
 * mentions, in one feed. A lead story on the left and the feed on the right; chips filter by
 * kind; "Show all" opens the rest of the list in place (the page keeps its position and no
 * dialog takes over: it stays a section you can scroll past). It refreshes every five minutes,
 * and an item that arrives that way slides in at the top with a green wash that fades. The
 * composer button (publisher roles only) is passed in from the server.
 */
export function Newsroom({ initial, composer }: { initial: CompanyFeedResult; composer?: React.ReactNode }) {
  const feed = useLiveFeed<CompanyFeedResult>("/api/home/feed?limit=30", CLIENT_REFRESH.companyFeed, initial, {
    isStaleData: (d) => d.status.ok === false,
    updatedAtOf: (d) => d.status.updatedAt,
  });
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, CLIENT_REFRESH.agoTick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  // items that were not in the list the page was served with are "new" for one showing
  const [known, setKnown] = useState<Set<string>>(() => new Set(initial.items.map((i) => i.id)));
  const fresh = useMemo(() => new Set(feed.data.items.filter((i) => !known.has(i.id)).map((i) => i.id)), [feed.data.items, known]);
  useEffect(() => {
    if (!fresh.size) return;
    const id = window.setTimeout(() => setKnown((k) => new Set([...k, ...fresh])), 2600);
    return () => window.clearTimeout(id);
  }, [fresh]);

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const items = useMemo(
    () => (active.categories ? feed.data.items.filter((i) => active.categories!.includes(i.category)) : feed.data.items),
    [feed.data.items, active]
  );
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, f.categories ? feed.data.items.filter((i) => f.categories!.includes(i.category)).length : feed.data.items.length])),
    [feed.data.items]
  );
  const featured = pickFeatured(items);
  const rest = items.filter((i) => i.id !== featured?.id);
  const shown = expanded ? rest : rest.slice(0, COLLAPSED_ROWS);

  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onChipKey = (e: React.KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + FILTERS.length) % FILTERS.length;
    setFilter(FILTERS[next].key);
    chipRefs.current[next]?.focus();
  };

  return (
    <HomeSection
      id="newsroom"
      eyebrow="SCIC Newsroom"
      title="What is happening"
      aside={
        <>
          <LivePulse updatedAt={feed.updatedAt} isRefreshing={feed.isRefreshing} isStale={feed.isStale} />
          {composer}
        </>
      }
    >
      <div role="tablist" aria-label="Filter the newsroom" className="home-chip-row mb-4 gap-2" style={{ scrollPaddingInline: 0 }}>
        {FILTERS.map((f, i) => {
          const selected = f.key === filter;
          return (
            <button
              key={f.key}
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setFilter(f.key);
                setExpanded(false);
              }}
              onKeyDown={(e) => onChipKey(e, i)}
              className={cn(
                "relative rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
                selected ? "border-transparent text-white" : "border-border-subtle text-text-secondary hover:border-scic-green/40 hover:text-text-primary"
              )}
            >
              {selected && <motion.span layoutId="newsroom-filter" transition={BRAND_SPRING} className="absolute inset-0 -z-[1] rounded-full bg-scic-green" />}
              {f.label}
              <span className={cn("ml-1.5 font-mono tabular-nums", selected ? "text-white/75" : "text-text-muted")}>{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={filter}
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: BRAND_EASE }}
        >
          {featured ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <FeaturedStory item={featured} now={now} />
              </div>
              <div className="glass-scic-card min-w-0 p-2">
                {rest.length ? (
                  <>
                    <ul>
                      <AnimatePresence initial={false}>
                        {shown.map((item) => (
                          <motion.li
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: -14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: BRAND_EASE }}
                          >
                            <FeedRow item={item} now={now} isNew={fresh.has(item.id)} />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                    {rest.length > COLLAPSED_ROWS && (
                      <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-scic-green hover:bg-bg-panel-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40 dark:text-scic-green-bright"
                      >
                        {expanded ? "Show fewer" : `Show all ${rest.length + 1}`}
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", expanded && "rotate-180")} aria-hidden />
                      </button>
                    )}
                  </>
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-text-muted">This is the only item here for now.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Newspaper}
              title={filter === "ALL" ? "No news yet" : `Nothing under ${active.label.toLowerCase()} yet`}
              description={filter === "ALL" ? "Posts, project events and press mentions will appear here." : "Try another filter, or check back later."}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </HomeSection>
  );
}

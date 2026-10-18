"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BRAND_SPRING } from "@/components/shared/motion";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import { HOME_REFRESH_EVENT, type HomeRefreshDetail } from "./useLiveFeed";

/** how long "Up to date" stays before the button rests */
const DONE_MS = 2600;

/** The page's sections, in order (each id is an element on the page) */
const SECTIONS = [
  { id: "trending", label: "Headlines" },
  { id: "today", label: "Today" },
  { id: "launchpad", label: "Launchpad" },
  { id: "newsroom", label: "Newsroom" },
  { id: "flagship", label: "Flagship" },
  { id: "portfolio", label: "Portfolio" },
  { id: "legacy", label: "50 years" },
] as const;

/**
 * The bar that rides at the top of Nexus Home: one chip per section (the one in view is marked,
 * and a chip takes you to its section), and "Refresh all", which asks every live section for
 * new data at once and re-reads the rest of the page from the server. The button spins until
 * every one of them has answered, says "Up to date", then rests. Asked again within thirty
 * seconds it does not fetch again: it just confirms the page is fresh.
 *
 * The page is never locked to this bar: it only reports where you are and offers a jump.
 */
export function HomeToolbar() {
  const router = useRouter();
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [present, setPresent] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "refreshing" | "done">("idle");
  const [feedsDone, setFeedsDone] = useState(0);
  const lastRun = useRef(0);
  const restTimer = useRef(0);

  // which section is in view (the page scrolls inside the app's own panel, which is the default root's ancestor)
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- only sections that exist on this render get a chip
    setPresent(els.map((el) => el.id));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        // the first section (in page order) that crosses the band under the bar
        const first = SECTIONS.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.01] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // keep the marked chip in view inside the bar on a narrow screen
  useEffect(() => {
    const chip = bar.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    const row = chip?.parentElement;
    if (!chip || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: "smooth" });
  }, [active]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(history.state, "", `#${id}`);
    setActive(id);
  };

  const finish = () => {
    window.clearTimeout(restTimer.current);
    setPhase("done");
    restTimer.current = window.setTimeout(() => setPhase("idle"), DONE_MS);
  };
  const refreshAll = async () => {
    if (phase === "refreshing") return;
    // asked again within thirty seconds: the page is already fresh, so just say so
    if (Date.now() - lastRun.current < CLIENT_REFRESH.manualThrottle) {
      finish();
      return;
    }
    lastRun.current = Date.now();
    window.clearTimeout(restTimer.current);
    setPhase("refreshing");
    const work: Promise<unknown>[] = [];
    const detail: HomeRefreshDetail = { waitUntil: (w) => work.push(w) };
    window.dispatchEvent(new CustomEvent(HOME_REFRESH_EVENT, { detail }));
    // the sections with no live feed of their own are re-read from the server
    work.push(new Promise<void>((resolve) => startTransition(async () => {
      router.refresh();
      resolve();
    })));
    // (a floor, so the spin is seen even when everything answers at once)
    work.push(new Promise((resolve) => window.setTimeout(resolve, 700)));
    await Promise.allSettled(work);
    setFeedsDone((n) => n + 1);
  };
  // "up to date" only once the feeds have answered AND the server re-read has landed
  const waitingOnServer = phase === "refreshing" && pending;
  useEffect(() => {
    if (feedsDone === 0 || pending) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the refresh has finished: move the button on
    finish();
  }, [feedsDone, pending]);
  useEffect(() => () => window.clearTimeout(restTimer.current), []);
  const busy = phase === "refreshing" || waitingOnServer;
  const done = phase === "done" && !busy;
  const text = done ? "Up to date" : busy ? "Refreshing" : "Refresh all";

  const chips = SECTIONS.filter((s) => present.includes(s.id));
  // (a sticky bar rests inside the scrolling panel's padding, so it is pulled up by that padding to sit flush under the top bar)
  return (
    <div ref={bar} className="sticky -top-3.5 z-20 -mx-1 px-1 py-1 sm:-top-5 md:-top-6 select-none">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border-hairline bg-white/90 dark:bg-bg-panel/90 backdrop-blur-md px-3.5 py-1.5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="hidden md:inline-block shrink-0 border-r border-border-hairline pr-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
            On this page
          </span>
          <nav
            aria-label="Sections of this page"
            className="home-chip-row min-w-0 flex-1 gap-1 sm:gap-2 no-scrollbar"
            style={{ scrollPaddingInline: 0 }}
          >
            {chips.map((s, idx) => {
              const on = s.id === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-section={s.id}
                  aria-current={on ? "true" : undefined}
                  onClick={() => go(s.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-display text-xs tracking-tight whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
                    on
                      ? "text-text-primary font-semibold bg-scic-green/10 dark:bg-emerald-500/12"
                      : "text-text-muted hover:text-text-primary font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  )}
                >
                  <span className="hidden lg:inline font-mono text-[9px] text-text-muted/60">
                    0{idx + 1}
                  </span>
                  <span>{s.label}</span>
                  {on && (
                    <motion.span
                      layoutId="home-toolbar-active"
                      transition={BRAND_SPRING}
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-scic-green dark:bg-emerald-400"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => void refreshAll()}
          aria-disabled={busy}
          aria-label={text}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
            done
              ? "border-scic-green/45 text-scic-green dark:text-emerald-400"
              : "border-border-hairline hover:border-scic-green/45",
            busy && "cursor-default"
          )}
        >
          {done ? (
            <Check className="h-3.5 w-3.5 text-scic-green dark:text-emerald-400" aria-hidden />
          ) : (
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-text-muted",
                busy && "animate-spin motion-reduce:animate-none"
              )}
              aria-hidden
            />
          )}
          <span aria-live="polite" className="text-left max-sm:sr-only sm:min-w-[4.4rem]">
            {text}
          </span>
        </button>
      </div>
    </div>
  );
}

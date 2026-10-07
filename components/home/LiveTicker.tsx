"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import type { TickerItem } from "@/lib/home/ticker";

/** Seconds for one full pass: about a quarter-second per character, kept between 40 and 150 */
function durationFor(items: TickerItem[]): number {
  const chars = items.reduce((n, i) => n + i.title.length + (i.source?.length ?? 0) + 6, 0);
  return Math.min(150, Math.max(40, Math.round(chars * 0.22)));
}

function Entry({ item, tabbable }: { item: TickerItem; tabbable: boolean }) {
  const content = (
    <>
      {item.scic ? <BrandLogo variant="mark" height={13} className="mr-2 -translate-y-px" /> : <span className="mr-2 text-scic-green-energy">●</span>}
      <span className="text-text-primary">{item.title}</span>
      {item.source && <span className="ml-2 text-text-muted">{item.source}</span>}
    </>
  );
  const cls = "mx-5 inline-flex items-center whitespace-nowrap text-sm hover:underline focus-visible:underline focus-visible:outline-none py-2.5";
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" tabIndex={tabbable ? 0 : -1} className={cls}>
      {content}
    </a>
  ) : (
    <Link href={item.href} tabIndex={tabbable ? 0 : -1} className={cls}>
      {content}
    </Link>
  );
}

/**
 * The live ticker: the top mixed items (headlines, with SCIC posts and project events flagged by
 * the company mark) sliding right to left. It pauses under the pointer and while a link in it
 * has focus, rests off-screen and in a hidden tab, and under reduced motion becomes a strip you
 * scroll by hand. The moving track is decoration for assistive technology: the same links are
 * given once, as a plain list, to screen readers.
 */
export function LiveTicker({ items: initial, className }: { items: TickerItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePauseOffscreen(ref);
  const { data: items, isStale } = useLiveFeed<TickerItem[]>("/api/home/ticker", CLIENT_REFRESH.trending, initial);
  if (!items.length) return null;
  return (
    <div ref={ref} className={cn("home-chip flex items-center overflow-hidden rounded-2xl", className)}>
      <span className="z-[1] flex shrink-0 items-center gap-2 self-stretch border-r border-border-hairline px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary">
        <span className={cn("home-heartbeat", isStale ? "text-scic-amber" : "text-scic-red")} aria-hidden />
        Live
      </span>
      <div className="home-marquee min-w-0 flex-1" style={{ ["--marquee-duration" as string]: `${durationFor(items)}s` }} aria-hidden>
        <div className="home-marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {items.map((item) => (
                <Entry key={`${copy}-${item.id}`} item={item} tabbable={false} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="sr-only" aria-label="Latest headlines and company news">
        {items.map((item) => (
          <li key={item.id}>
            <Entry item={item} tabbable />
          </li>
        ))}
      </ul>
    </div>
  );
}

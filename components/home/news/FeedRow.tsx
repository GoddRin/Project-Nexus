"use client";

import React from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, Megaphone, Newspaper, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceBadge } from "@/components/home/primitives/SourceBadge";
import { timeAgo } from "@/lib/home/time";
import type { CompanyFeedItem } from "@/lib/home/types";

/** What each kind of item is called on the row, and its colour */
export const FEED_LABEL: Record<string, string> = {
  ANNOUNCEMENT: "Announcement", PROJECT_UPDATE: "Project update", MILESTONE: "Milestone", SAFETY: "Safety", CSR: "Community", PEOPLE: "People",
  PRESS: "Press", PROGRESS: "Progress", REPORT: "Report", COD: "COD milestone",
};

function KindIcon({ item }: { item: CompanyFeedItem }) {
  if (item.kind === "PRESS") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scic-amber/10">
        {item.sourceDomain ? <SourceBadge source={item.source || "Press"} domain={item.sourceDomain} size={18} iconOnly /> : <Newspaper className="h-4 w-4 text-scic-amber" aria-hidden />}
      </span>
    );
  }
  if (item.kind === "PULSE") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scic-cyan/10 text-scic-cyan">
        <Activity className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scic-green/10 text-scic-green dark:text-scic-green-bright">
      <Megaphone className="h-4 w-4" aria-hidden />
    </span>
  );
}

/**
 * One row of the Newsroom feed: an icon for its kind (a megaphone for a post, a pulse for an
 * event read from the project records, the publisher's favicon for a press mention), the title,
 * and a line with its category, project or publisher and how long ago. A row that has just
 * arrived by live refresh carries a green wash that fades.
 */
export function FeedRow({ item, now, isNew }: { item: CompanyFeedItem; now: Date | null; isNew?: boolean }) {
  const meta = [FEED_LABEL[item.category] ?? item.category, item.kind === "PRESS" ? item.source : item.projectName].filter(Boolean).join(" · ");
  const body = (
    <>
      <KindIcon item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-1.5 text-sm font-medium leading-snug text-text-primary group-hover:text-scic-green dark:group-hover:text-scic-green-bright">
          {item.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-scic-green dark:text-scic-green-bright" aria-label="Pinned" />}
          <span className="line-clamp-2">{item.title}</span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-text-muted">
          {meta}
          {now && item.publishedAt ? <span suppressHydrationWarning> · {timeAgo(item.publishedAt, now)}</span> : null}
        </span>
      </span>
      {item.external && <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />}
    </>
  );
  const cls = cn(
    "group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-bg-panel-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
    isNew && "home-new-item"
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={item.href} className={cls}>
      {body}
    </Link>
  );
}

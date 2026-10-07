"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowRight, ClipboardList, Package, ShieldCheck, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/CountUp";
import { BRAND_EASE } from "@/components/shared/motion";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { COMMAND_CENTER_HREF } from "@/lib/home/links";
import type { OpsActivity, OpsSnapshot, OpsTone } from "@/lib/home/ops";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import { timeAgo } from "@/lib/home/time";

const DOT: Record<OpsTone, string> = {
  green: "bg-scic-green-energy",
  amber: "bg-scic-amber",
  red: "bg-scic-red",
  blue: "bg-scic-cyan",
  muted: "bg-text-muted",
};
const manilaDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
const shortDay = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const KIND_ICON = { report: ClipboardList, transaction: Package, visitor: Users } as const;

function Figure({ href, icon: Icon, label, value, tone, seen }: { href: string; icon: typeof Ticket; label: string; value: number; tone: string; seen: boolean }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-border-hairline bg-bg-panel-subtle p-3 transition-colors hover:border-scic-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40"
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-2xl font-semibold leading-none tabular-nums text-text-primary">
          <span className="sr-only">{value}</span>
          <span aria-hidden>{seen ? <CountUp value={value} /> : 0}</span>
        </span>
        <span className="mt-1 block text-xs leading-tight text-text-secondary">{label}</span>
      </span>
      <ArrowRight className="hidden h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-scic-green sm:block" aria-hidden />
    </Link>
  );
}

function ActivityRow({ item, now, isNew }: { item: OpsActivity; now: Date | null; isNew: boolean }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-bg-panel-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
        isNew && "home-new-item"
      )}
    >
      <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-panel-subtle text-text-secondary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className={cn("absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-bg-panel", DOT[item.tone])} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[13px] font-medium leading-snug text-text-primary group-hover:text-scic-green dark:group-hover:text-scic-green-bright">{item.text}</span>
        <span className="mt-0.5 block truncate font-mono text-[10px] text-text-muted">
          {item.detail}
          {now ? <span suppressHydrationWarning> · {timeAgo(item.at, now)}</span> : null}
        </span>
      </span>
    </Link>
  );
}

/**
 * The site at this minute, from the same records the Command Center reads: helpdesk tickets
 * open, visitors signed in, and the latest activity (reports, approved inventory movements,
 * visitor entries). It refreshes every minute; a new entry slides in with a green wash. The
 * safety streak counts calendar days from the company's stated last lost-time accident, or from
 * a later entry in the Incidents module; with neither on record it is not shown.
 */
export function OpsSnapshotCard({ initial }: { initial: OpsSnapshot }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const feed = useLiveFeed<OpsSnapshot>("/api/home/ops", CLIENT_REFRESH.ops, initial, {
    isStaleData: (d) => d.status.ok === false,
    updatedAtOf: (d) => d.status.updatedAt,
  });
  const ops = feed.data;
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
  const [known] = useState(() => new Set(initial.activity.map((a) => a.id)));
  // whole calendar days in the Philippines since that day
  const incidentDays =
    ops.lastIncidentAt && now ? Math.max(0, Math.round((Date.parse(`${manilaDay(now)}T00:00:00Z`) - Date.parse(`${manilaDay(new Date(ops.lastIncidentAt))}T00:00:00Z`)) / 86_400_000)) : null;

  return (
    <section ref={ref} aria-labelledby="home-ops-title" className="glass-scic-card spotlight h-full min-h-[340px] min-w-0 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="home-eyebrow whitespace-nowrap">Tumauini site</p>
          <h2 id="home-ops-title" className="mt-1 whitespace-nowrap font-display text-xl font-extrabold leading-none tracking-[-0.02em] text-text-primary">
            On site now
          </h2>
        </div>
        <LivePulse updatedAt={feed.updatedAt} isRefreshing={feed.isRefreshing} isStale={feed.isStale} className="shrink-0" />
      </div>

      {/* (a row on a wide card, a column in the narrow desktop slot) */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <div className="grid grid-cols-2 content-start gap-2.5 sm:grid-cols-1">
          <Figure href="/dashboard/tickets" icon={Ticket} label="Open tickets" value={ops.openTickets} tone="bg-scic-cyan/10 text-scic-cyan" seen={seen} />
          <Figure href="/dashboard/visitors" icon={Users} label="Visitors on site" value={ops.onSiteVisitors} tone="bg-scic-green/10 text-scic-green dark:text-scic-green-bright" seen={seen} />
          {ops.lastIncidentAt && (
            <Link
              href="/dashboard/incidents"
              className="group col-span-2 flex items-center gap-3 rounded-xl border border-scic-green/30 bg-scic-green/[0.07] p-3 transition-colors hover:border-scic-green/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40 sm:col-span-1"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-scic-green/15 text-scic-green dark:text-scic-green-bright">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5 font-mono tabular-nums text-text-primary">
                  <span className="text-2xl font-semibold leading-none">{incidentDays === null ? "–" : seen ? <CountUp value={incidentDays} /> : 0}</span>
                  <span className="text-xs text-text-secondary">day{incidentDays === 1 ? "" : "s"}</span>
                </span>
                <span className="mt-1 block text-xs leading-tight text-text-secondary">
                  {ops.lastIncidentKind === "lta" ? "without a lost-time accident" : "since the last reported incident"}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-text-muted">since {shortDay(ops.lastIncidentAt)}</span>
              </span>
            </Link>
          )}
        </div>

        <div className="min-w-0">
          <p className="home-eyebrow mb-1.5">Latest activity</p>
          {ops.activity.length ? (
            <ul>
              <AnimatePresence initial={false}>
                {ops.activity.map((item) => (
                  <motion.li key={item.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: BRAND_EASE }}>
                    <ActivityRow item={item} now={now} isNew={!known.has(item.id)} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="px-2 py-6 text-sm text-text-muted">No reports, inventory movements or visitor entries yet.</p>
          )}
        </div>
      </div>

      <Link
        href={COMMAND_CENTER_HREF}
        className="group mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-scic-green hover:text-scic-green-energy focus-visible:outline-none focus-visible:underline dark:text-scic-green-bright"
      >
        Open the Command Center
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}

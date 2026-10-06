"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Building2, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { WeatherGlyph } from "@/components/home/weather/WeatherGlyph";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import type { WeatherGlance } from "@/lib/home/types";

function Chip({
  href, icon, label, value, tone, pulse, title,
}: { href: string; icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "amber" | "red"; pulse?: boolean; title?: string }) {
  return (
    <Link
      href={href}
      title={title}
      data-tone={tone}
      data-pulse={pulse ? "true" : undefined}
      className="home-chip group inline-flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</span>
        <span className="whitespace-nowrap text-sm font-semibold text-text-primary">{value}</span>
      </span>
    </Link>
  );
}

export interface HeroChipsProps {
  weather: WeatherGlance | null;
  activeProjects: number | null;
  /** latest logged overall progress of the flagship, and its name */
  flagship: { name: string; percent: number } | null;
}

/**
 * The hero's live chips: weather now at the Tumauini site, the PAGASA wind-signal status over it
 * (amber or red, pulsing, when a signal is up), projects under way, and the flagship's progress.
 * Each is a link to where that figure lives. A chip without real data behind it is not shown
 * (there is no safety chip: no incident has ever been logged, and no rows is not a record).
 * Weather and the signal refresh on their own; faster while a signal is up.
 */
export function HeroChips({ weather: initial, activeProjects, flagship }: HeroChipsProps) {
  const row = useRef<HTMLDivElement>(null);
  usePauseOffscreen(row);
  const signalUp = !!initial?.alert;
  const { data: weather } = useLiveFeed<WeatherGlance | null>(
    "/api/home/weather?site=tumauini",
    signalUp ? CLIENT_REFRESH.pagasaActive : CLIENT_REFRESH.pagasa,
    initial,
    { isStaleData: (d) => d?.status.ok === false, updatedAtOf: (d) => d?.status.updatedAt }
  );
  const alert = weather?.alert;
  const pagasa = alert
    ? { label: "PAGASA", value: `Signal No. ${alert.signal}${alert.stormName ? ` · ${alert.stormName}` : ""}`, tone: (alert.signal >= 2 ? "red" : "amber") as "red" | "amber" }
    : weather?.bulletin.available
      ? { label: "PAGASA", value: weather.bulletin.active ? `No signal here${weather.bulletin.stormName ? ` · ${weather.bulletin.stormName} in PAR` : ""}` : "No wind signal", tone: undefined }
      : null;

  return (
    <div ref={row} className="home-chip-row -mx-6 px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" aria-label="Live figures">
      {weather && (
        <Chip
          href="/dashboard/weather"
          icon={<WeatherGlyph kind={weather.now.icon} size={36} title="" />}
          label="Tumauini site"
          value={
            <>
              <span className="font-mono tabular-nums">{weather.now.tempC}°</span> {weather.now.label}
            </>
          }
          title="Weather at the Tumauini site now"
        />
      )}
      {pagasa && (
        <Chip
          href="/dashboard/weather/philippines"
          icon={
            alert ? (
              <ShieldAlert className={cn("h-6 w-6", alert.signal >= 2 ? "text-scic-red" : "text-scic-amber")} aria-hidden />
            ) : (
              <ShieldCheck className="h-6 w-6 text-scic-green dark:text-scic-green-bright" aria-hidden />
            )
          }
          label={pagasa.label}
          value={pagasa.value}
          tone={pagasa.tone}
          pulse={!!alert}
          title="Tropical cyclone wind signal over the Tumauini site (PAGASA)"
        />
      )}
      {typeof activeProjects === "number" && (
        <Chip
          href="/dashboard/projects-map"
          icon={<Building2 className="h-6 w-6 text-scic-blue" aria-hidden />}
          label="Under way"
          value={
            <>
              <span className="font-mono tabular-nums">{activeProjects}</span> active projects
            </>
          }
          title="Projects the Atlas lists as ongoing"
        />
      )}
      {flagship && (
        <Chip
          href="/dashboard/progress"
          icon={<TrendingUp className="h-6 w-6 text-scic-cyan" aria-hidden />}
          label={flagship.name}
          value={
            <>
              <span className="font-mono tabular-nums">{Number.isInteger(flagship.percent) ? flagship.percent : flagship.percent.toFixed(1)}%</span> complete
            </>
          }
          title="Latest logged overall progress"
        />
      )}
    </div>
  );
}

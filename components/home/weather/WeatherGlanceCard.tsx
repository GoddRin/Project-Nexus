"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CloudRain, Droplets, Moon, Navigation2, ShieldAlert, Sun, Thermometer, TriangleAlert, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/CountUp";
import { BRAND_EASE, BRAND_SPRING } from "@/components/shared/motion";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { useLiveFeed } from "@/components/home/useLiveFeed";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";
import type { WeatherGlance, WeatherSiteKey } from "@/lib/home/types";
import { HourlyStrip } from "./HourlyStrip";
import { WeatherGlyph } from "./WeatherGlyph";

const SITES: { key: WeatherSiteKey; label: string }[] = [
  { key: "tumauini", label: "Tumauini Site" },
  { key: "manila", label: "Manila HQ" },
];
const SITE_KEY = "nexus-home-weather-site";
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const VERDICT = {
  GO: { word: "Go", pill: "bg-scic-green text-white", ring: "border-scic-green/35 bg-scic-green/[0.07]" },
  CAUTION: { word: "Caution", pill: "bg-scic-amber text-scic-navy-dark", ring: "border-scic-amber/45 bg-scic-amber/[0.09]" },
  HOLD: { word: "Hold", pill: "bg-scic-red text-white", ring: "border-scic-red/45 bg-scic-red/[0.08]" },
} as const;
const ALERT = {
  YELLOW: "border-scic-amber/50 bg-scic-amber/15 text-text-primary",
  ORANGE: "border-scic-red/45 bg-scic-red/12 text-text-primary",
  RED: "border-scic-red/60 bg-scic-red/20 text-text-primary",
} as const;

function useSiteFeed(site: WeatherSiteKey, initial: WeatherGlance | null, active: boolean) {
  return useLiveFeed<WeatherGlance | null>(`/api/home/weather?site=${site}`, initial?.alert ? CLIENT_REFRESH.pagasaActive : CLIENT_REFRESH.weather, initial, {
    enabled: active || !!initial, // a site never loaded is fetched only once it is chosen
    isStaleData: (d) => d?.status.ok === false,
    updatedAtOf: (d) => d?.status.updatedAt,
  });
}

function ShiftChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-hairline bg-bg-panel px-2 py-0.5 font-mono text-[10px] text-text-secondary">
      {icon}
      {label} <span className="font-semibold tabular-nums text-text-primary">{value}</span>
    </span>
  );
}

/** Which sky the "now" panel wears */
function skyOf(w: WeatherGlance): "clear" | "cloud" | "rain" | "storm" | "night" {
  const k = w.now.icon;
  if (k === "thunderstorm") return "storm";
  if (k === "rain" || k === "heavy-rain") return "rain";
  if (w.now.isNight) return "night";
  if (k === "clear-day" || k === "partly-cloudy") return "clear";
  return "cloud";
}

/** One figure of the "now" panel: its label on top, the value beneath (four of them sit in a row) */
function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
        <span className="text-text-secondary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap font-mono text-sm font-semibold tabular-nums text-text-primary">{children}</p>
    </div>
  );
}

/**
 * Weather at a glance. A two-way switch between the Tumauini site and Manila HQ (remembered in
 * this browser); conditions now with an animated glyph; today's range, rain, wind (the arrow
 * points the way the wind is blowing) and humidity; the next twenty-four hours; and, for the
 * construction site only, the day's work verdict from the same evaluation the Weather page uses.
 * A wind signal over the chosen place shows as a banner on top, announced politely to screen
 * readers. The hourly strip slides sideways (arrows, drag, swipe, keys). Each site refreshes on its own (faster while a signal is up); a failed refresh keeps
 * the last reading and marks it stale.
 */
export function WeatherGlanceCard({ initial }: { initial: Record<WeatherSiteKey, WeatherGlance | null> }) {
  const tabsId = useId();
  const [site, setSite] = useState<WeatherSiteKey>("tumauini");
  // the remembered choice is applied after mount, so server and client render the same first frame
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SITE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a stored preference, readable only in the browser
      if (saved === "manila") setSite("manila");
    } catch {
      // storage unavailable: Tumauini it is
    }
  }, []);
  const choose = (next: WeatherSiteKey) => {
    setSite(next);
    try {
      window.localStorage.setItem(SITE_KEY, next);
    } catch {
      // not remembered this time
    }
  };

  const feeds = {
    tumauini: useSiteFeed("tumauini", initial.tumauini, site === "tumauini"),
    manila: useSiteFeed("manila", initial.manila, site === "manila"),
  };
  const feed = feeds[site];
  const w = feed.data;
  // Manila was not loaded with the page: fetch it the first time it is chosen
  const asked = useRef<Set<WeatherSiteKey>>(new Set());
  useEffect(() => {
    if (!w && !asked.current.has(site)) {
      asked.current.add(site);
      feed.refresh();
    }
  }, [site, w, feed]);

  const tabRefs = useRef<Record<WeatherSiteKey, HTMLButtonElement | null>>({ tumauini: null, manila: null });
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next: WeatherSiteKey = site === "tumauini" ? "manila" : "tumauini";
    choose(next);
    tabRefs.current[next]?.focus();
  };

  const verdict = w?.operational ? VERDICT[w.operational.verdict] : null;
  return (
    <section aria-labelledby={`${tabsId}-title`} className="glass-scic-card spotlight h-full min-h-[340px] min-w-0 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="home-eyebrow">Site weather</p>
          <p className="mt-0.5 font-display text-lg font-bold tracking-[-0.02em] text-text-primary">{w?.site.name ?? SITES.find((x) => x.key === site)?.label}</p>
          <h2 id={`${tabsId}-title`} className="sr-only">
            Weather at {SITES.find((s) => s.key === site)?.label}
          </h2>
        </div>
        <div role="tablist" aria-label="Weather site" onKeyDown={onKey} className="relative inline-flex rounded-full border border-border-subtle bg-bg-panel-subtle p-0.5">
          {SITES.map((s) => {
            const selected = s.key === site;
            return (
              <button
                key={s.key}
                ref={(el) => {
                  tabRefs.current[s.key] = el;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${s.key}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(s.key)}
                className={cn(
                  "relative z-[1] rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40",
                  selected ? "text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {selected && <motion.span layoutId={`${tabsId}-site`} transition={BRAND_SPRING} className="absolute inset-0 -z-[1] rounded-full bg-scic-green" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${site}`} className="mt-4 flex min-w-0 flex-1 flex-col">
        {/* a wind signal over this place: announced, and shown above everything else */}
        <div aria-live="polite">
          {w?.alert && (
            <Link
              href="/dashboard/weather/philippines"
              className={cn("mb-4 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors hover:brightness-105", ALERT[w.alert.level])}
            >
              <ShieldAlert className={cn("h-5 w-5 shrink-0", w.alert.level === "YELLOW" ? "text-scic-amber" : "text-scic-red")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">
                  Signal No. {w.alert.signal}
                  {w.alert.stormName ? ` · ${w.alert.stormName}` : ""}
                </span>
                <span className="block text-xs text-text-secondary">{w.alert.message}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {w ? (
            <motion.div
              key={site}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: BRAND_EASE }}
              className="flex min-w-0 flex-1 flex-col gap-4"
            >
              {/* now: a panel in the colour of the sky it reports */}
              <div className="home-sky @container px-4 py-4 md:px-5" data-sky={skyOf(w)}>
                <span className="home-sky-halo" aria-hidden />
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <WeatherGlyph kind={w.now.icon} size={96} title={w.now.label} />
                    <div>
                      <p className="flex items-start font-display font-bold leading-none tracking-[-0.03em] text-text-primary">
                        <span className="sr-only">{w.now.tempC} degrees Celsius</span>
                        <span aria-hidden className="font-mono text-6xl tabular-nums md:text-7xl">
                          <CountUp value={w.now.tempC} duration={700} />
                        </span>
                        <span aria-hidden className="mt-1.5 text-2xl text-text-muted">°C</span>
                      </p>
                      <p className="mt-1.5 text-base font-semibold text-text-primary">{w.now.label}</p>
                      <p className="text-xs text-text-secondary">
                        Feels like <span className="font-mono font-semibold tabular-nums">{w.now.feelsLikeC}°</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 border-t border-border-hairline pt-3 @md:grid-cols-4 @md:divide-x @md:divide-border-hairline [&>*:nth-child(odd)]:pl-0 @md:[&>*:nth-child(odd)]:pl-3 @md:[&>*:first-child]:pl-0">
                    <Fact icon={<Thermometer className="h-3.5 w-3.5" aria-hidden />} label="High / low">
                      {w.today.maxC}° / {w.today.minC}°
                    </Fact>
                    <Fact icon={<CloudRain className="h-3.5 w-3.5" aria-hidden />} label="Rain today">
                      {w.today.rainChance}% · {w.today.rainMm} mm
                    </Fact>
                    <Fact
                      icon={
                        w.now.windKph >= 1 ? (
                          <Navigation2
                            className="h-3.5 w-3.5 transition-transform duration-700"
                            // the forecast gives where the wind comes FROM: the arrow shows where it is going
                            style={{ transform: `rotate(${(w.now.windDir + 180) % 360}deg)` }}
                            aria-hidden
                          />
                        ) : (
                          <Wind className="h-3.5 w-3.5" aria-hidden />
                        )
                      }
                      label="Wind from"
                    >
                      {w.now.windKph} km/h{w.now.windKph >= 1 ? ` · ${compass(w.now.windDir)}` : ""}
                    </Fact>
                    <Fact icon={<Droplets className="h-3.5 w-3.5" aria-hidden />} label="Humidity">
                      {w.now.humidity}%
                    </Fact>
                  </div>
                </div>
              </div>

              <HourlyStrip hours={w.hours} />

              {w.operational && verdict ? (
                <div className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3", verdict.ring)}>
                  <span className={cn("mt-0.5 shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em]", verdict.pill)}>{verdict.word}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary">{w.operational.headline}</span>
                    <span className="block text-xs leading-5 text-text-secondary">{w.operational.detail}</span>
                    {/* what the verdict rests on: rain expected in each shift, the strongest wind, the wettest hours */}
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <ShiftChip icon={<Sun className="h-3 w-3" aria-hidden />} label="Day shift" value={`${w.operational.dayShiftMm} mm`} />
                      <ShiftChip icon={<Moon className="h-3 w-3" aria-hidden />} label="Night shift" value={`${w.operational.nightShiftMm} mm`} />
                      <ShiftChip icon={<Wind className="h-3 w-3" aria-hidden />} label="Max wind" value={`${w.operational.dayShiftMaxWindKph} km/h`} />
                      {w.operational.peakRainWindow && <ShiftChip icon={<CloudRain className="h-3 w-3" aria-hidden />} label="Peak rain" value={w.operational.peakRainWindow} />}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="rounded-xl border border-border-hairline px-3.5 py-2.5 text-xs text-text-muted">
                  Conditions only: the work verdict is given for construction sites.
                  {w.bulletin.available ? (w.bulletin.active ? ` PAGASA has a bulletin out${w.bulletin.stormName ? ` for ${w.bulletin.stormName}` : ""}; no signal is raised here.` : " No tropical cyclone bulletin is in effect.") : ""}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div key={`${site}-empty`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              {feed.isRefreshing ? (
                <div className="home-shimmer h-28 w-full max-w-sm" aria-label="Loading the forecast" role="status" />
              ) : (
                <>
                  <TriangleAlert className="h-6 w-6 text-scic-amber" aria-hidden />
                  <p className="text-sm font-medium text-text-primary">The forecast is not available right now.</p>
                  <button type="button" onClick={() => feed.refresh()} className="text-sm font-medium text-scic-green hover:underline dark:text-scic-green-bright">
                    Try again
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-hairline pt-3">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <LivePulse updatedAt={feed.updatedAt} isRefreshing={feed.isRefreshing} isStale={feed.isStale} />
        </span>
        <Link href="/dashboard/weather" className="group inline-flex items-center gap-1 text-sm font-medium text-scic-green hover:text-scic-green-energy dark:text-scic-green-bright">
          Full forecast <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </footer>
    </section>
  );
}

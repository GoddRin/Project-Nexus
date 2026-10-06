"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Building2, MapPinned, Zap, CalendarClock } from "lucide-react";
import { HomeSection } from "@/components/home/primitives/HomeSection";
import { LivePulse } from "@/components/home/primitives/LivePulse";
import { StatTile } from "@/components/home/primitives/StatTile";
import { ProgressRing } from "@/components/home/primitives/ProgressRing";
import { SourceBadge } from "@/components/home/primitives/SourceBadge";
import {
  BriefSkeleton, HeroSkeleton, ListSkeleton, NewsroomSkeleton, PortfolioSkeleton, StatRowSkeleton, TickerSkeleton, WeatherSkeleton, WideCardSkeleton,
} from "@/components/home/primitives/HomeSkeleton";
import { WeatherGlyph, type WeatherGlyphKind } from "@/components/home/weather/WeatherGlyph";
import { fadeUp, inView, stagger, wordRevealContainer, wordRevealWord } from "@/components/home/motionPresets";
import { usePauseOffscreen } from "@/components/home/usePauseOffscreen";
import { BRAND_LINE, yearsInService } from "@/lib/home/companyFacts";

const GLYPHS: WeatherGlyphKind[] = ["clear-day", "clear-night", "partly-cloudy", "cloudy", "rain", "heavy-rain", "thunderstorm", "fog", "wind"];
const TICKER = ["Marquee item one", "A second, longer marquee item to show spacing", "Third item", "Fourth item in the track", "Fifth"];

/** TEMPORARY (development only): every Nexus Home primitive, with sample values that are labelled as samples. */
export function HomeGallery() {
  const { resolvedTheme, setTheme } = useTheme();
  const stage = useRef<HTMLDivElement>(null);
  usePauseOffscreen(stage);
  const [sealKey, setSealKey] = useState(0);
  const [fiveMinAgo] = useState(() => new Date(Date.now() - 5 * 60_000).toISOString());

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pb-24 pt-6 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="home-eyebrow">Development only · sample values</p>
          <h1 className="home-section-title mt-1">Nexus Home primitives</h1>
        </div>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="home-chip rounded-full px-4 py-2 text-sm font-medium text-text-primary"
          data-testid="gallery-theme"
        >
          Theme: {resolvedTheme}
        </button>
      </div>

      {/* Hero treatments: aurora, contours, word reveal, chips, seal shine */}
      <div ref={stage} className="relative min-h-[320px] overflow-hidden rounded-3xl border border-border-hairline bg-bg-panel">
        <div className="home-aurora" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="home-contours" aria-hidden />
        <div className="relative flex min-h-[320px] flex-col justify-end gap-4 p-6 md:p-10">
          <p className="home-eyebrow">.home-aurora · .home-contours · wordReveal</p>
          <motion.p variants={wordRevealContainer} initial="hidden" animate="show" className="font-display text-4xl font-bold tracking-[-0.02em] text-text-primary md:text-6xl">
            {BRAND_LINE.split(" ").map((w) => (
              <motion.span key={w} variants={wordRevealWord} className="mr-[0.25em] inline-block">
                {w}
              </motion.span>
            ))}
          </motion.p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="home-chip inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-text-primary">
              <WeatherGlyph kind="partly-cloudy" size={28} title="" /> <span className="font-mono tabular-nums">31°</span> sample chip
            </span>
            <button
              type="button"
              key={sealKey}
              onClick={() => setSealKey((k) => k + 1)}
              data-inview="true"
              className="home-seal-shine inline-flex h-20 w-20 items-center justify-center border-2 border-scic-green-energy bg-bg-panel font-mono text-xs font-semibold text-scic-green dark:text-scic-green-bright"
              title="Click to replay the shine"
            >
              <span className="home-seal-rotate inline-block">{yearsInService()} YRS</span>
            </button>
            <LivePulse updatedAt={fiveMinAgo} />
            <LivePulse updatedAt={fiveMinAgo} isStale />
            <LivePulse isRefreshing />
          </div>
        </div>
      </div>

      <HomeSection id="g-glyphs" eyebrow="WeatherGlyph" title="Weather glyphs" aside={<LivePulse updatedAt={fiveMinAgo} />}>
        <motion.ul variants={stagger(60)} {...inView} className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {GLYPHS.map((k) => (
            <motion.li key={k} variants={fadeUp} className="glass-scic-card spotlight items-center gap-2 p-4">
              <WeatherGlyph kind={k} size={56} />
              <span className="font-mono text-[10px] text-text-muted">{k}</span>
            </motion.li>
          ))}
        </motion.ul>
      </HomeSection>

      <HomeSection id="g-stats" eyebrow="StatTile" title="Stat tiles" action={{ href: "#g-rings", label: "Next" }}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={Building2} label="Sample count" value={87} tone="green" />
          <StatTile icon={Zap} label="Sample MW" value={1067.4} decimals={1} unit="MW" tone="cyan" delta={{ value: 1.2, decimals: 1, unit: "%", label: "sample" }} />
          <StatTile icon={MapPinned} label="Sample provinces" value={38} tone="blue" delta={{ value: -2, label: "sample" }} />
          <StatTile icon={CalendarClock} label="Years of service" value={yearsInService()} tone="amber" />
        </div>
      </HomeSection>

      <HomeSection id="g-rings" eyebrow="ProgressRing · SourceBadge" title="Rings and badges">
        {/* (.glass-scic-card is a flex column by its own rule: lay rows out in an inner element) */}
        <div className="glass-scic-card p-5">
          <div className="flex flex-wrap items-center gap-6">
          <ProgressRing value={81.4} label="Sample progress" size={120} thickness={10} />
          <ProgressRing value={46} label="Sample" tone="cyan" />
          <ProgressRing value={100} label="Sample" tone="blue" size={72} />
          <ProgressRing value={22} label="Sample" tone="amber" size={72} />
          <ProgressRing value={8} label="Sample" tone="red" size={56} thickness={6} />
          <div className="flex flex-col gap-2">
            <SourceBadge source="Philippine Daily Inquirer" domain="inquirer.net" />
            <SourceBadge source="BusinessWorld" domain="bworldonline.com" />
            <SourceBadge source="No Favicon Source" />
          </div>
        </div>
        </div>
      </HomeSection>

      <HomeSection id="g-motion" eyebrow=".home-marquee · .home-kenburns · .home-new-item" title="Motion utilities">
        <div className="space-y-4">
          <div className="home-marquee home-chip rounded-2xl py-2.5" style={{ ["--marquee-duration" as string]: "28s" }}>
            <div className="home-marquee-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="mx-5 whitespace-nowrap text-sm text-text-secondary">
                  <span className="mr-2 text-scic-green-energy">●</span>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative h-44 overflow-hidden rounded-2xl border border-border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element -- gallery sample only */}
              <img src="/project-images/bakun-hydro-1.jpg" alt="" className="home-kenburns h-full w-full object-cover" />
            </div>
            <ul className="glass-scic-card p-2">
              {["A row that just arrived (highlight fades)", "An older row", "Another older row"].map((t, i) => (
                <li key={t} className={`rounded-lg px-3 py-2.5 text-sm text-text-secondary ${i === 0 ? "home-new-item" : ""}`}>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </HomeSection>

      <HomeSection id="g-skeletons" eyebrow="HomeSkeleton" title="Skeletons">
        <div className="space-y-6">
          <HeroSkeleton />
          <TickerSkeleton />
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <WeatherSkeleton />
            </div>
            <div className="lg:col-span-4">
              <BriefSkeleton />
            </div>
            <div className="lg:col-span-3">
              <ListSkeleton rows={4} label="operations" className="min-h-[340px]" />
            </div>
          </div>
          <NewsroomSkeleton />
          <StatRowSkeleton />
          <PortfolioSkeleton />
          <WideCardSkeleton height={280} label="flagship" />
        </div>
      </HomeSection>
    </div>
  );
}

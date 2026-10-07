import type { Metadata } from "next";
import { Suspense } from "react";
import { IntroOverlay } from "@/components/home/IntroOverlay";
import { LiveTicker } from "@/components/home/LiveTicker";
import { HomeHero } from "@/components/home/hero/HomeHero";
import { isJubileeVariant } from "@/lib/home/jubilee";
import { DailyBriefSection, OpsSection, WeatherGlanceSection } from "@/components/home/GlanceRow";
import { HomeFooterStrip } from "@/components/home/HomeFooterStrip";
import { HomeToolbar } from "@/components/home/HomeToolbar";
import { SectionBoundary } from "@/components/home/primitives/SectionBoundary";
import { Launchpad } from "@/components/home/launchpad/Launchpad";
import { NewsroomSection, TrendingSection } from "@/components/home/NewsRow";
import { FlagshipSection, LegacySection, PortfolioSection } from "@/components/home/PortfolioRow";
import {
  BriefSkeleton, HeroSkeleton, ListSkeleton, NewsroomSkeleton, PortfolioSkeleton, StatRowSkeleton, TickerSkeleton, WeatherSkeleton, WideCardSkeleton,
} from "@/components/home/primitives/HomeSkeleton";
import { getNewsViewer } from "@/lib/home/permissions";
import { getTickerItems } from "@/lib/home/ticker";

export const metadata: Metadata = {
  title: "Nexus Home — Sta. Clara International Corporation",
  description:
    "The front page of Project Nexus: live site weather, company news, the national project portfolio and the Tumauini flagship, for Sta. Clara International Corporation.",
};

async function Hero({ seal }: { seal?: string }) {
  const viewer = await getNewsViewer();
  return <HomeHero userName={viewer.user?.name} seal={isJubileeVariant(seal) ? seal : undefined} />;
}

async function Ticker() {
  return <LiveTicker items={await getTickerItems()} />;
}

/**
 * Nexus Home. Every section sits in its own Suspense boundary with a skeleton of its final size,
 * so the hero streams first and a slow source never holds the page; and in its own error
 * boundary, so a section that fails says so in its own place and the rest carries on.
 */
export default async function NexusHomePage({ searchParams }: { searchParams: Promise<{ mockAlert?: string; seal?: string }> }) {
  // (?mockAlert=1..3 forces a wind-signal state in development only: see lib/home/devMocks.ts)
  // (?seal=medal|lockup|ribbon|numeral tries an anniversary emblem design: see JubileeVariants.tsx)
  const { mockAlert, seal } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-6 md:px-6 lg:pb-10">
      <IntroOverlay />
      <SectionBoundary label="hero" className="min-h-[420px]">
        <Suspense fallback={<HeroSkeleton />}>
          <Hero seal={seal} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary label="news ticker" className="min-h-0 !p-3">
        <Suspense fallback={<TickerSkeleton />}>
          <Ticker />
        </Suspense>
      </SectionBoundary>

      {/* Weather, the daily brief and the site's operations (5 + 4 + 3 on a wide screen) */}
      <HomeToolbar />

      <div id="today" className="grid scroll-mt-24 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-5">
          <SectionBoundary label="weather card" className="h-full min-h-[340px]">
            <Suspense fallback={<WeatherSkeleton />}>
              <WeatherGlanceSection mockAlert={mockAlert} />
            </Suspense>
          </SectionBoundary>
        </div>
        <div className="min-w-0 lg:col-span-5 xl:col-span-4">
          <SectionBoundary label="daily brief" className="h-full min-h-[340px]">
            <Suspense fallback={<BriefSkeleton />}>
              <DailyBriefSection />
            </Suspense>
          </SectionBoundary>
        </div>
        <div className="min-w-0 lg:col-span-12 xl:col-span-3">
          <SectionBoundary label="site operations card" className="h-full min-h-[340px]">
            <Suspense fallback={<ListSkeleton rows={4} label="operations" className="min-h-[340px]" />}>
              <OpsSection />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>

      <SectionBoundary label="Launchpad">
        <Launchpad />
      </SectionBoundary>

      {/* The Newsroom beside the day's headlines */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <SectionBoundary label="Newsroom" className="min-h-[320px]">
            <Suspense fallback={<NewsroomSkeleton />}>
              <NewsroomSection />
            </Suspense>
          </SectionBoundary>
        </div>
        <div className="min-w-0 lg:col-span-4">
          <SectionBoundary label="headlines" className="h-full min-h-[320px]">
            <Suspense fallback={<ListSkeleton rows={7} label="headlines" />}>
              <TrendingSection />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>

      {/* The national portfolio, the flagship site and the 50-year timeline */}
      <SectionBoundary label="national portfolio" className="min-h-[320px]">
        <Suspense
          fallback={
            <div className="space-y-6">
              <StatRowSkeleton count={6} />
              <PortfolioSkeleton />
            </div>
          }
        >
          <PortfolioSection />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary label="flagship project" className="min-h-[320px]">
        <Suspense fallback={<WideCardSkeleton height={520} label="flagship project" />}>
          <FlagshipSection />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary label="company timeline">
        <LegacySection />
      </SectionBoundary>
      <SectionBoundary label="credits">
        <Suspense fallback={null}>
          <HomeFooterStrip />
        </Suspense>
      </SectionBoundary>
    </div>
  );
}

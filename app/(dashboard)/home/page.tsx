import type { Metadata } from "next";
import { Suspense } from "react";
import { IntroOverlay } from "@/components/home/IntroOverlay";
import { LiveTicker } from "@/components/home/LiveTicker";
import { HomeHero } from "@/components/home/hero/HomeHero";
import { DailyBriefSection, WeatherGlanceSection } from "@/components/home/GlanceRow";
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

async function Hero() {
  const viewer = await getNewsViewer();
  return <HomeHero userName={viewer.user?.name} />;
}

async function Ticker() {
  return <LiveTicker items={await getTickerItems()} />;
}

/**
 * Nexus Home (being assembled phase by phase). Every section sits in its own Suspense boundary
 * with a skeleton of its final size, so the hero streams first and a slow source never holds
 * the page.
 */
export default async function NexusHomePage({ searchParams }: { searchParams: Promise<{ mockAlert?: string }> }) {
  // (?mockAlert=1..3 forces a wind-signal state in development only: see lib/home/devMocks.ts)
  const { mockAlert } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-6 md:px-6 lg:pb-10">
      <IntroOverlay />
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <Suspense fallback={<TickerSkeleton />}>
        <Ticker />
      </Suspense>

      {/* Weather glance and the daily brief (the operations snapshot joins this row in Phase 9) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Suspense fallback={<WeatherSkeleton />}>
            <WeatherGlanceSection mockAlert={mockAlert} />
          </Suspense>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <Suspense fallback={<BriefSkeleton />}>
            <DailyBriefSection />
          </Suspense>
        </div>
      </div>

      {/* The Newsroom beside the day's headlines */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Suspense fallback={<NewsroomSkeleton />}>
            <NewsroomSection />
          </Suspense>
        </div>
        <div className="min-w-0 lg:col-span-4">
          <Suspense fallback={<ListSkeleton rows={7} label="headlines" />}>
            <TrendingSection />
          </Suspense>
        </div>
      </div>

      {/* The national portfolio, the flagship site and the 50-year timeline */}
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
      <Suspense fallback={<WideCardSkeleton height={520} label="flagship project" />}>
        <FlagshipSection />
      </Suspense>
      <LegacySection />
    </div>
  );
}

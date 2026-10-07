import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IntroOverlay } from "@/components/home/IntroOverlay";
import { LiveTicker } from "@/components/home/LiveTicker";
import { HomeHero } from "@/components/home/hero/HomeHero";
import { NewsroomSection, TrendingSection } from "@/components/home/NewsRow";
import { FlagshipSection, LegacySection, PortfolioSection } from "@/components/home/PortfolioRow";
import { DailyBriefSection, OpsSection, WeatherGlanceSection } from "@/components/home/GlanceRow";
import { HomeFooterStrip } from "@/components/home/HomeFooterStrip";
import { HomeToolbar } from "@/components/home/HomeToolbar";
import { SectionBoundary } from "@/components/home/primitives/SectionBoundary";
import { Launchpad } from "@/components/home/launchpad/Launchpad";
import { BriefSkeleton, HeroSkeleton, WeatherSkeleton } from "@/components/home/primitives/HomeSkeleton";
import { getTickerItems } from "@/lib/home/ticker";
import { HomeGallery } from "./HomeGallery";

/**
 * TEMPORARY, development only: every Nexus Home primitive on one page, for light/dark review
 * without signing in (this path falls under an existing public route pattern, so proxy.ts is
 * untouched). It does not exist in production builds, and is deleted before the final phase.
 */
export const metadata = { title: "Nexus Home gallery (dev)", robots: { index: false, follow: false } };

/** (?fail=1 shows what a section looks like when it throws) */
function Boom(): never {
  throw new Error("test failure for the section boundary");
}

export default async function HomeGalleryPage({ searchParams }: { searchParams: Promise<{ view?: string; mockAlert?: string; fail?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view, mockAlert, fail } = await searchParams;
  // ?view=home: the real sections as they are on /home (signed out, so the greeting says "Team")
  if (view === "home") {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-6 md:px-6">
        <IntroOverlay />
        <Suspense fallback={<HeroSkeleton />}>
          <HomeHero />
        </Suspense>
        <LiveTicker items={await getTickerItems()} />
        <HomeToolbar />
        {fail === "1" && (
          <SectionBoundary label="test section" className="min-h-[200px]">
            <Boom />
          </SectionBoundary>
        )}
        <div id="today" className="grid scroll-mt-24 gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7 xl:col-span-5">
            <Suspense fallback={<WeatherSkeleton />}>
              <WeatherGlanceSection mockAlert={mockAlert} />
            </Suspense>
          </div>
          <div className="min-w-0 lg:col-span-5 xl:col-span-4">
            <Suspense fallback={<BriefSkeleton />}>
              <DailyBriefSection />
            </Suspense>
          </div>
          <div className="min-w-0 lg:col-span-12 xl:col-span-3">
            <Suspense fallback={null}>
              <OpsSection />
            </Suspense>
          </div>
        </div>

        <Launchpad />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <NewsroomSection />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <TrendingSection />
          </div>
        </div>
        <PortfolioSection />
        <FlagshipSection />
        <LegacySection />
        <HomeFooterStrip />
      </div>
    );
  }
  return <HomeGallery />;
}

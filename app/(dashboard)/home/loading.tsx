import {
  BriefSkeleton, HeroSkeleton, ListSkeleton, NewsroomSkeleton, PortfolioSkeleton, StatRowSkeleton, TickerSkeleton, WeatherSkeleton,
} from "@/components/home/primitives/HomeSkeleton";

/** Shown while Nexus Home is on its way: the page's own outline, so nothing jumps when it arrives */
export default function NexusHomeLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-6 md:px-6 lg:pb-10">
      <HeroSkeleton />
      <TickerSkeleton />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-5">
          <WeatherSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-5 xl:col-span-4">
          <BriefSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-12 xl:col-span-3">
          <ListSkeleton rows={4} label="operations" className="min-h-[340px]" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <NewsroomSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <ListSkeleton rows={7} label="headlines" />
        </div>
      </div>
      <StatRowSkeleton count={6} />
      <PortfolioSkeleton />
    </div>
  );
}

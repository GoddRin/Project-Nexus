import {
  BriefSkeleton, HeadlinesSkeleton, HeroSkeleton, ListSkeleton, NewsroomSkeleton, PortfolioSkeleton, StatRowSkeleton, TickerSkeleton, WeatherSkeleton,
} from "@/components/home/primitives/HomeSkeleton";

/** Shown while Nexus Home is on its way: the page's own outline, so nothing jumps when it arrives */
export default function NexusHomeLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-2 sm:space-y-6 sm:px-4 sm:pt-6 md:px-6 lg:pb-10">
      <HeroSkeleton />
      <TickerSkeleton />
      <HeadlinesSkeleton />
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
      <NewsroomSkeleton />
      <StatRowSkeleton count={6} />
      <PortfolioSkeleton />
    </div>
  );
}

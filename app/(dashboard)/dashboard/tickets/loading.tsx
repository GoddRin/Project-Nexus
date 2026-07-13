import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function TicketsLoading() {
 return (
 <PageSkeleton>
 {/* Tab bar */}
 <SkeletonBlock className="h-10 w-72 rounded-xl" />

 {/* Table */}
 <div className="overflow-hidden rounded-xl border border-white/[0.05]">
 <div className="flex gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
 <SkeletonBlock className="h-4 w-16" />
 <SkeletonBlock className="h-4 w-48" />
 <SkeletonBlock className="h-4 w-20" />
 <SkeletonBlock className="h-4 w-20 ml-auto" />
 <SkeletonBlock className="h-4 w-24" />
 </div>
 {Array.from({ length: 8 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-3.5 last:border-0"
 >
 <SkeletonBlock className="h-5 w-16 rounded-full" />
 <SkeletonBlock className="h-4 w-56" />
 <SkeletonBlock className="h-5 w-14 rounded-full" />
 <SkeletonBlock className="ml-auto h-4 w-24" />
 <SkeletonBlock className="h-4 w-28" />
 </div>
 ))}
 </div>
 </PageSkeleton>
 );
}

import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function AssetsLoading() {
 return (
 <PageSkeleton>
 {/* Filter row */}
 <div className="flex gap-3">
 <SkeletonBlock className="h-9 w-48 rounded-lg" />
 <SkeletonBlock className="h-9 w-36 rounded-lg" />
 <SkeletonBlock className="ml-auto h-9 w-32 rounded-lg" />
 </div>

 {/* Asset table */}
 <div className="overflow-hidden rounded-xl border border-white/[0.05]">
 <div className="flex gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
 <SkeletonBlock className="h-4 w-8" />
 <SkeletonBlock className="h-4 w-40" />
 <SkeletonBlock className="h-4 w-24" />
 <SkeletonBlock className="h-4 w-20 ml-auto" />
 <SkeletonBlock className="h-4 w-20" />
 </div>
 {Array.from({ length: 8 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-3.5 last:border-0"
 >
 <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
 <SkeletonBlock className="h-4 w-48" />
 <SkeletonBlock className="h-4 w-28" />
 <SkeletonBlock className="ml-auto h-5 w-16 rounded-full" />
 <SkeletonBlock className="h-4 w-20" />
 </div>
 ))}
 </div>
 </PageSkeleton>
 );
}

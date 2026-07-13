import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function ReportsLoading() {
 return (
 <PageSkeleton>
 {/* Filter bar */}
 <SkeletonBlock className="h-16 w-full rounded-xl" />

 {/* Table header */}
 <div className="overflow-hidden rounded-xl border border-white/[0.05]">
 <div className="flex gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
 <SkeletonBlock className="h-4 w-24" />
 <SkeletonBlock className="h-4 w-32" />
 <SkeletonBlock className="h-4 w-20 ml-auto" />
 <SkeletonBlock className="h-4 w-20" />
 <SkeletonBlock className="h-4 w-16" />
 </div>
 {Array.from({ length: 7 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-3.5 last:border-0"
 >
 <SkeletonBlock className="h-4 w-20" />
 <SkeletonBlock className="h-4 w-36" />
 <SkeletonBlock className="h-4 w-24" />
 <SkeletonBlock className="ml-auto h-5 w-20 rounded-full" />
 <SkeletonBlock className="h-4 w-24" />
 <SkeletonBlock className="h-8 w-16 rounded-lg" />
 </div>
 ))}
 </div>
 </PageSkeleton>
 );
}

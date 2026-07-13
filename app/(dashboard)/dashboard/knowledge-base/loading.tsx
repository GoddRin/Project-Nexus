import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function KnowledgeBaseLoading() {
 return (
 <PageSkeleton>
 {/* Category tabs */}
 <SkeletonBlock className="h-10 w-full max-w-lg rounded-xl" />

 {/* Search bar */}
 <SkeletonBlock className="h-10 w-full rounded-xl" />

 {/* Article cards grid */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 9 }).map((_, i) => (
 <div
 key={i}
 className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 space-y-3"
 >
 <div className="flex items-center gap-2">
 <SkeletonBlock className="h-5 w-5 rounded" />
 <SkeletonBlock className="h-5 w-20 rounded-full" />
 </div>
 <SkeletonBlock className="h-5 w-full" />
 <SkeletonBlock className="h-4 w-5/6" />
 <SkeletonBlock className="h-4 w-3/4" />
 <SkeletonBlock className="h-3 w-24 mt-2" />
 </div>
 ))}
 </div>
 </PageSkeleton>
 );
}

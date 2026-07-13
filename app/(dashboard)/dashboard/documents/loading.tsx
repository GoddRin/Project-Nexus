import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function DocumentsLoading() {
 return (
 <PageSkeleton>
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
 {/* Folder tree sidebar */}
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2 lg:col-span-1">
 <SkeletonBlock className="h-4 w-24 mb-4" />
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="flex items-center gap-2 px-1">
 <SkeletonBlock className="h-4 w-4 shrink-0 rounded" />
 <SkeletonBlock className="h-4 flex-1" style={{ width: `${60 + i * 5}%` }} />
 </div>
 ))}
 </div>

 {/* File grid */}
 <div className="space-y-4 lg:col-span-3">
 <SkeletonBlock className="h-10 w-full rounded-xl" />
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
 {Array.from({ length: 8 }).map((_, i) => (
 <div
 key={i}
 className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3"
 >
 <SkeletonBlock className="h-10 w-10 rounded-lg" />
 <SkeletonBlock className="h-3 w-full" />
 <SkeletonBlock className="h-3 w-2/3" />
 </div>
 ))}
 </div>
 </div>
 </div>
 </PageSkeleton>
 );
}

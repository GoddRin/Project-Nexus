import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function ProgressLoading() {
 return (
 <PageSkeleton>
 {/* Top grid: chart + stat panel */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Chart panel */}
 <div className="lg:col-span-2 glass-card p-6 space-y-4">
 <SkeletonBlock className="h-5 w-56" />
 <SkeletonBlock className="h-56 w-full rounded-xl" />
 </div>
 {/* Stat panel */}
 <div className="glass-card p-6 space-y-4">
 <SkeletonBlock className="h-4 w-28" />
 <SkeletonBlock className="h-12 w-24 rounded-xl" />
 <SkeletonBlock className="h-4 w-40" />
 <div className="mt-auto space-y-2 pt-6">
 <SkeletonBlock className="h-4 w-full" />
 <SkeletonBlock className="h-4 w-3/4" />
 </div>
 </div>
 </div>

 {/* Milestones panel */}
 <div className="glass-card p-6 space-y-4">
 <div className="flex items-center justify-between">
 <SkeletonBlock className="h-5 w-36" />
 <SkeletonBlock className="h-8 w-32 rounded-lg" />
 </div>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="rounded-xl border border-white/[0.06] p-4 space-y-2">
 <SkeletonBlock className="h-4 w-3/4" />
 <SkeletonBlock className="h-3 w-1/2" />
 <SkeletonBlock className="h-5 w-20 rounded-full mt-2" />
 </div>
 ))}
 </div>
 </div>

 {/* Bottom: feed + photos */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 <div className="glass-card p-6 space-y-3">
 <SkeletonBlock className="h-5 w-44" />
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="flex gap-3 border-b border-white/[0.04] py-2 last:border-0">
 <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
 <div className="flex-1 space-y-2">
 <SkeletonBlock className="h-3 w-full" />
 <SkeletonBlock className="h-3 w-2/3" />
 </div>
 </div>
 ))}
 </div>
 <div className="glass-card p-6 space-y-3">
 <SkeletonBlock className="h-5 w-36" />
 <div className="grid grid-cols-3 gap-2">
 {Array.from({ length: 6 }).map((_, i) => (
 <SkeletonBlock key={i} className="aspect-square rounded-lg" />
 ))}
 </div>
 </div>
 </div>
 </PageSkeleton>
 );
}

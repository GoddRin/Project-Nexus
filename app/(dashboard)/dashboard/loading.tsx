import { SkeletonBlock } from "@/components/shared/SkeletonBlocks";

export default function DashboardLoading() {
 return (
 <div className="flex flex-col gap-6 p-6 md:p-8">
 {/* Page header */}
 <div className="space-y-2">
 <SkeletonBlock className="h-7 w-56" />
 <SkeletonBlock className="h-4 w-80" />
 </div>

 {/* FlowLine placeholder */}
 <SkeletonBlock className="h-16 w-full rounded-xl opacity-50" />

 {/* Top widget row */}
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="glass-card p-5 space-y-3 min-h-[120px]">
 <div className="flex items-center gap-2">
 <SkeletonBlock className="h-7 w-7 rounded-lg" />
 <SkeletonBlock className="h-4 w-28" />
 </div>
 <SkeletonBlock className="h-8 w-20" />
 <SkeletonBlock className="h-3 w-full" />
 </div>
 ))}
 </div>

 {/* Bottom row */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Completion widget */}
 <div className="glass-card p-6 space-y-4 min-h-[240px]">
 <SkeletonBlock className="h-5 w-36" />
 <div className="flex items-center justify-center pt-4">
 <SkeletonBlock className="h-32 w-32 rounded-full" />
 </div>
 </div>
 {/* Wide panels */}
 {Array.from({ length: 2 }).map((_, i) => (
 <div key={i} className="glass-card p-6 space-y-3 min-h-[240px]">
 <SkeletonBlock className="h-5 w-40" />
 {Array.from({ length: 4 }).map((_, j) => (
 <div key={j} className="flex items-center gap-3 border-b border-white/[0.04] py-2 last:border-0">
 <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
 <div className="flex-1 space-y-1.5">
 <SkeletonBlock className="h-3 w-3/4" />
 <SkeletonBlock className="h-3 w-1/2" />
 </div>
 </div>
 ))}
 </div>
 ))}
 </div>
 </div>
 );
}

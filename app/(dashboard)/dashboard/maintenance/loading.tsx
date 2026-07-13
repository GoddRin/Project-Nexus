import { SkeletonBlock, PageSkeleton } from "@/components/shared/SkeletonBlocks";

export default function MaintenanceLoading() {
 return (
  <PageSkeleton>
   <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
     <SkeletonBlock className="h-8 w-48" />
     <SkeletonBlock className="h-9 w-40 rounded-lg" />
   </div>

   <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
     {Array.from({ length: 4 }).map((_, i) => (
       <SkeletonBlock key={i} className="h-24 rounded-xl" />
     ))}
   </div>

   <div className="rounded-xl border border-white/[0.05]">
     <div className="flex gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
       <SkeletonBlock className="h-4 w-32" />
       <SkeletonBlock className="h-4 w-40" />
       <SkeletonBlock className="h-4 w-32 ml-auto" />
     </div>
     {Array.from({ length: 6 }).map((_, i) => (
       <div key={i} className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-4 last:border-0">
         <SkeletonBlock className="h-4 w-32" />
         <SkeletonBlock className="h-4 w-48" />
         <SkeletonBlock className="ml-auto h-5 w-20 rounded-full" />
       </div>
     ))}
   </div>
  </PageSkeleton>
 );
}

import { SkeletonBlock } from "@/components/shared/SkeletonBlocks";

export default function NewTicketLoading() {
 return (
 <div className="relative max-w-2xl space-y-6 p-6 md:p-8">
 {/* Header */}
 <div className="space-y-2">
 <SkeletonBlock className="h-7 w-36" />
 <SkeletonBlock className="h-4 w-64" />
 </div>

 {/* Form card */}
 <div className="glass-card p-6 space-y-6">
 {/* Title field */}
 <div className="space-y-2">
 <SkeletonBlock className="h-4 w-12" />
 <SkeletonBlock className="h-10 w-full rounded-lg" />
 </div>
 {/* Description field */}
 <div className="space-y-2">
 <SkeletonBlock className="h-4 w-20" />
 <SkeletonBlock className="h-28 w-full rounded-lg" />
 </div>
 {/* Priority field */}
 <div className="space-y-2">
 <SkeletonBlock className="h-4 w-14" />
 <SkeletonBlock className="h-10 w-48 rounded-lg" />
 </div>
 {/* Buttons */}
 <div className="flex gap-3 pt-2">
 <SkeletonBlock className="h-9 w-32 rounded-lg" />
 <SkeletonBlock className="h-9 w-20 rounded-lg" />
 </div>
 </div>
 </div>
 );
}

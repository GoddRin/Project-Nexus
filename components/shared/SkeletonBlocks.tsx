/* Shared pulsing skeleton atom */
export function SkeletonBlock({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
 return (
 <div
 className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`}
 style={style}
 aria-hidden="true"
 />
 );
}

/* Generic full-page skeleton used as a base */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
 return (
 <div className="flex flex-col gap-6 p-6 md:p-8">
 {/* Page header */}
 <div className="flex items-start justify-between">
 <div className="space-y-2">
 <SkeletonBlock className="h-7 w-48" />
 <SkeletonBlock className="h-4 w-72" />
 </div>
 <SkeletonBlock className="h-9 w-32" />
 </div>
 {children}
 </div>
 );
}

import React from "react";
import { Loader2 } from "lucide-react";

export default function ProjectProfileLoading() {
  return (
    <div className="min-h-full space-y-6 pb-16 animate-pulse">
      {/* Top Breadcrumb Skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
        <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="h-8 w-28 bg-slate-200 dark:bg-white/10 rounded-lg" />
        </div>
      </div>

      {/* Hero Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4">
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-md" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
        </div>
        <div className="h-8 w-3/4 max-w-xl bg-slate-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-1/2 max-w-md bg-slate-200 dark:bg-white/10 rounded" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <div className="h-5 w-40 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded" />
          </div>

          <div className="h-64 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 p-6 space-y-3">
            <div className="h-5 w-44 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-36 bg-slate-100 dark:bg-white/5 rounded-xl" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="h-56 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 p-5 space-y-3">
            <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-28 bg-slate-100 dark:bg-white/5 rounded-xl" />
          </div>

          <div className="h-48 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 p-5 space-y-3">
            <div className="h-5 w-36 bg-slate-200 dark:bg-white/10 rounded" />
            <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

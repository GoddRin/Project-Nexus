import { Suspense } from "react";
import { FlowLine } from "@/components/shared/FlowLine";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectCompletionWidget } from "@/components/dashboard/ProjectCompletionWidget";
import { ProjectCompletionSkeleton } from "@/components/dashboard/ProjectCompletionSkeleton";
import {
  OpenTicketsWidget,
  WeatherWidget,
  AnnouncementsWidget,
  RecentActivityWidget,
  QuickAccessWidget,
  OnSiteWidget,
} from "@/components/dashboard/DashboardWidgets";
import { Zap, ShieldCheck, HardHat, Waves, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="relative space-y-6">
      {/* Flow Line behind page header */}
      <FlowLine className="h-20 -mt-4 opacity-40 pointer-events-none" />

      <PageHeader
        title="Command & Operations Center"
        subtitle="Tumauini Hydroelectric Power Plant (11.3 MW Run-of-River EPC Construction Project)"
        actionLabel="Site Overview"
        actionHref="/dashboard/sitemap"
      />

      {/* SCIC Executive Quick Metric Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-blue">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20">
            <Zap className="h-5 w-5 text-scic-blue dark:text-scic-cyan" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Target Capacity</p>
            <p className="font-display text-lg font-bold text-text-primary">11.3 MW</p>
            <p className="text-[10px] text-scic-blue dark:text-scic-cyan font-medium">Clean Run-of-River</p>
          </div>
        </div>

        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-green">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Safety Milestone</p>
            <p className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">1.42M hrs</p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Zero Lost Time Injury</p>
          </div>
        </div>

        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-cyan">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scic-cyan/10 border border-scic-cyan/25">
            <Waves className="h-5 w-5 text-scic-cyan" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Hydrology Status</p>
            <p className="font-display text-lg font-bold text-text-primary">Normal Head</p>
            <p className="text-[10px] text-text-muted font-medium">Pinacanauan River</p>
          </div>
        </div>

        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-amber">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <HardHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Contractor</p>
            <p className="font-display text-lg font-bold text-text-primary">SCIC AAAA</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">General Engineering</p>
          </div>
        </div>
      </div>

      {/* Primary Widget Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2">
          <Suspense fallback={<ProjectCompletionSkeleton delay={0.08} />}>
            <ProjectCompletionWidget delay={0.08} />
          </Suspense>
        </div>

        <div className="col-span-1">
          <OpenTicketsWidget delay={0.16} />
        </div>

        <div className="col-span-1">
          <OnSiteWidget delay={0.20} />
        </div>

        <div className="col-span-1">
          <WeatherWidget delay={0.24} />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <RecentActivityWidget delay={0.4} />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <AnnouncementsWidget delay={0.32} />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <QuickAccessWidget delay={0.48} />
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-2">
          <Link href="/dashboard/analytics" className="inline-flex items-center gap-2 text-xs font-bold text-scic-blue dark:text-scic-cyan hover:underline transition-colors">
            Comprehensive Project Telemetry & Advanced S-Curve Analytics <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { requireProjectMember } from "@/lib/auth/index";
import {
  KPISummarySection,
  TicketTrendsSection,
  ReportActivitySection,
  AssetHealthSection,
  InventoryActivitySection,
  NetworkHealthSection,
  VisitorTrafficSection,
  ConstructionHeatmapSection,
  WeatherCorrelationSection,
} from "./components";

// Cache for 5 minutes
export const revalidate = 300;

export default async function AnalyticsPage() {
  const membership = await requireProjectMember();
  const projectId = membership.projectId;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Analytics & KPIs"
        subtitle="Aggregated metrics and trends across all operations."
      />

      {/* SECTION 1: KPI Summary Row */}
      <AnimatedSection delay={0.1}>
        <h2 className="mb-4 font-display text-xl font-bold text-text-primary">Overview</h2>
        <Suspense fallback={<KPISkeleton />}>
          <KPISummarySection projectId={projectId} />
        </Suspense>
      </AnimatedSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* SECTION 2: Ticket Trends */}
        <AnimatedSection delay={0.2} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Ticket Trends (90 days)</h2>
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <TicketTrendsSection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>

        {/* SECTION 3: Report Activity */}
        <AnimatedSection delay={0.3} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Report Activity (60 days)</h2>
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <ReportActivitySection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>

        {/* SECTION 4: Asset Health */}
        <AnimatedSection delay={0.4} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Asset Health</h2>
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <AssetHealthSection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>

        {/* SECTION 5: Inventory Activity */}
        <AnimatedSection delay={0.5} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Inventory Activity (30 days)</h2>
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <InventoryActivitySection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>

        {/* SECTION 6: Visitor Traffic */}
        <AnimatedSection delay={0.6} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Visitor Traffic (30 days)</h2>
          <div className="h-[calc(100%-2rem)] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <VisitorTrafficSection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>

        {/* SECTION 7: Network Health */}
        <AnimatedSection delay={0.7} className="h-96">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Network Health</h2>
          <div className="h-[calc(100%-2rem)]">
            <Suspense fallback={<ChartSkeleton />}>
              <NetworkHealthSection projectId={projectId} />
            </Suspense>
          </div>
        </AnimatedSection>
      </div>

      {/* SECTION 8: Construction Heatmap */}
      <AnimatedSection delay={0.8}>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-lg backdrop-blur-md">
          <Suspense fallback={<HeatmapSkeleton />}>
            <ConstructionHeatmapSection projectId={projectId} />
          </Suspense>
        </div>
      </AnimatedSection>

      {/* SECTION 9: Weather Correlation */}
      <AnimatedSection delay={0.9}>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-lg backdrop-blur-md">
          <Suspense fallback={<ChartSkeleton />}>
            <WeatherCorrelationSection projectId={projectId} />
          </Suspense>
        </div>
      </AnimatedSection>
    </div>
  );
}

// Skeletons

function HeatmapSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-5 w-48 rounded bg-white/[0.04]" />
        <div className="h-6 w-32 rounded bg-white/[0.04]" />
      </div>
      <div className="flex gap-4">
        <div className="w-36 space-y-2 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-24 rounded bg-white/[0.02]" />
          ))}
        </div>
        <div className="flex-1 space-y-2 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-full rounded bg-white/[0.02]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Skeletons --

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center animate-pulse">
      <div className="h-full w-full rounded-lg bg-white/[0.02]" />
    </div>
  );
}

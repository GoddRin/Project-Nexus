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
import LinkComponent from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
 return (
 <div className="relative">
 {/* Flow Line behind the page header, contained to not intersect widgets */}
 <FlowLine className="h-20 -mt-4 opacity-50" />

 <PageHeader
 title="Dashboard"
 subtitle="Tumauini Hydroelectric Power Plant — 11.3 MW Run-of-river"
 />

 {/* Widget grid */}
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

 <div className="col-span-1 lg:col-span-1">
 <AnnouncementsWidget delay={0.32} />
 </div>

 <div className="col-span-1 md:col-span-2 lg:col-span-3">
 <QuickAccessWidget delay={0.48} />
 </div>

 <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 text-center">
 <LinkComponent href="/dashboard/analytics" className="inline-flex items-center gap-2 text-sm font-medium text-flow-teal hover:underline hover:text-flow-teal/80 transition-colors">
 View Full Analytics <span aria-hidden="true">&rarr;</span>
 </LinkComponent>
 </div>
 </div>
 </div>
 );
}

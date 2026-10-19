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
import { RoleAwareDashboardContent } from "@/components/dashboard/VisitorOverviewBento";
import { Zap, ShieldCheck, HardHat, Waves } from "lucide-react";
import { SafetyStreakFigure } from "@/components/shared/SafetyStreak";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let role = "EMPLOYEE";
  try {
    const project = await getCachedProject("tumauini-hepp");
    if (project) {
      const { member } = await getOrCreateUser(project.id);
      if (member?.role) role = member.role;
    }
  } catch {
    // Safe fallback
  }

  return (
    <div className="relative mx-auto w-full max-w-[1680px] space-y-6">
      {/* Flow Line behind page header */}
      <FlowLine className="h-20 -mt-4 opacity-40 pointer-events-none" />

      <PageHeader
        title="Command & Operations Center"
        subtitle="Tumauini Hydroelectric Power Plant (11.3 MW Run-of-River EPC Project · Client: Philnew Hydro Power Corporation)"
        actionLabel="Site Overview"
        actionHref="/dashboard/sitemap"
      />

      {/* SCIC Executive Quick Metric Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        <div className="glass-scic-card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 scic-card-accent-blue">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20">
            <Zap className="h-4 sm:h-5 w-4 sm:h-5 text-scic-blue dark:text-scic-cyan" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted truncate">
              Target Capacity
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-text-primary">
              11.3 MW
            </p>
            <p className="text-[10px] text-scic-blue dark:text-scic-cyan font-medium truncate">
              Clean Run-of-River
            </p>
          </div>
        </div>

        <div className="glass-scic-card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 scic-card-accent-green">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-4 sm:h-5 w-4 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted truncate">
              Site Safety
            </p>
            <SafetyStreakFigure
              valueClassName="font-display text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400"
              captionClassName="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium truncate"
            />
          </div>
        </div>

        <div className="glass-scic-card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 scic-card-accent-cyan">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-scic-cyan/10 border border-scic-cyan/25">
            <Waves className="h-4 sm:h-5 w-4 sm:h-5 text-scic-cyan" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted truncate">
              Hydrology Status
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-text-primary truncate">
              Normal Head
            </p>
            <p className="text-[10px] text-text-muted font-medium truncate">
              Pinacanauan River
            </p>
          </div>
        </div>

        <div className="glass-scic-card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 scic-card-accent-amber">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <HardHat className="h-4 sm:h-5 w-4 sm:h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted truncate">
              Contractor
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-text-primary truncate">
              SCIC AAAA
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
              General Engineering
            </p>
          </div>
        </div>
      </div>

      {/* Role-Aware Primary Widget Grid:
          - In Visitor Mode: Shows Project Completion + Live Weather + 6-card Editorial Explorer Directory
          - In Admin Mode: Shows Full Operational Widgets (Tickets, On-Site Crew, Activity Stream, Bulletins, Quick Launcher) */}
      <RoleAwareDashboardContent
        role={role}
        completionWidget={
          <Suspense fallback={<ProjectCompletionSkeleton delay={0.08} />}>
            <ProjectCompletionWidget delay={0.08} />
          </Suspense>
        }
        weatherWidget={<WeatherWidget delay={0.16} />}
        adminTicketsWidget={<OpenTicketsWidget delay={0.16} />}
        adminOnSiteWidget={<OnSiteWidget delay={0.2} />}
        adminActivityWidget={<RecentActivityWidget delay={0.4} />}
        adminAnnouncementsWidget={<AnnouncementsWidget delay={0.32} />}
        adminQuickAccessWidget={<QuickAccessWidget delay={0.48} />}
      />
    </div>
  );
}

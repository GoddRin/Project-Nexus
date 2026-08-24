
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { ReportFilters } from "./ReportFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  ClipboardList,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { ReportStatus, WeatherCondition } from "@prisma/client";
import { getCachedProject, getCachedReports } from "@/lib/db/cachedQueries";

export const dynamic = "force-dynamic";

interface PageProps {
 searchParams: Promise<{
 status?: string;
 startDate?: string;
 endDate?: string;
 viewAll?: string;
 }>;
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    SUBMITTED:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    APPROVED:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    REJECTED:
      "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30",
  };
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] font-bold uppercase tracking-wider", styles[status])}>
      {status}
    </Badge>
  );
}

function WeatherBadge({ condition }: { condition: WeatherCondition }) {
  const icons = {
    SUNNY: Sun,
    CLOUDY: Cloud,
    RAINY: CloudRain,
    STORM: CloudLightning,
  };
  const Icon = icons[condition] || Cloud;
  const labels = {
    SUNNY: "Sunny",
    CLOUDY: "Cloudy",
    RAINY: "Rainy",
    STORM: "Stormy",
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-0.5 text-xs text-text-muted border border-border-hairline">
      <Icon className="h-3.5 w-3.5 text-scic-blue dark:text-scic-cyan" />
      <span className="font-medium">{labels[condition]}</span>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const statusFilter = params.status as ReportStatus | undefined;
 const startDateFilter = params.startDate;
 const endDateFilter = params.endDate;
 const viewAllFilter = params.viewAll === "true";

 // Fetch active project (cached)
 const project = await getCachedProject("tumauini-hepp");
 if (!project) return notFound();

 // Authentication and JIT User Provisioning
 const { dbUser, member } = await getOrCreateUser(project.id);
 if (!dbUser || !member) {
 return redirect("/sign-in");
 }

 // Determine role-based view permissions
 const isElevated = member.role === "ADMINISTRATOR" || member.role === "PROJECT_MANAGER";
 const showViewAllToggle = !isElevated && (member.role === "ENGINEER" || member.role === "SUPERVISOR");


 // Fetch all reports from cache then filter in-memory
 const allReports = await getCachedReports(project.id);

 const reports = allReports.filter((r) => {
 if (statusFilter && r.status !== statusFilter) return false;
 if (startDateFilter && new Date(r.reportDate) < new Date(startDateFilter)) return false;
 if (endDateFilter) {
 const end = new Date(endDateFilter);
 end.setHours(23, 59, 59, 999);
 if (new Date(r.reportDate) > end) return false;
 }
 if (!isElevated && !viewAllFilter && r.submittedById !== dbUser.id) return false;
 return true;
 });


 const canCreate = ["ENGINEER", "SUPERVISOR", "PROJECT_MANAGER", "ADMINISTRATOR"].includes(member.role);

 return (
 <div className="relative">
 <PageHeader
 title="Daily Accomplishment Reports"
 subtitle="Submit, review, and track daily site work and progress."
 >
 {canCreate && (
 <Link href="/dashboard/reports/new">
 <Button>
 Submit Daily Report
 </Button>
 </Link>
 )}
 </PageHeader>

 <ReportFilters
 showViewAllToggle={showViewAllToggle}
 currentUserRole={member.role}
 />

      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No daily reports found"
          description="Try adjusting your status or date filters, or submit a new accomplishment report."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl glass-scic-card">
          <div className="divide-y divide-border-hairline">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="block group"
              >
                <div className="flex flex-col gap-4 p-5 transition-all duration-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-base font-bold tracking-wide text-text-primary group-hover:text-scic-blue dark:group-hover:text-scic-cyan transition-colors">
                        {report.workArea}
                      </h3>
                      <WeatherBadge condition={report.weatherCondition} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted font-mono tracking-tight">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-scic-blue dark:text-scic-cyan" />
                        {new Date(report.reportDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="opacity-50 max-md:hidden">•</span>
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-text-muted" />
                        {report.submittedBy.name}
                      </span>
                      {report.photos.length > 0 && (
                        <>
                          <span className="opacity-50 max-md:hidden">•</span>
                          <span className="font-semibold text-scic-blue dark:text-scic-cyan">
                            {report.photos.length} Photo{report.photos.length > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-text-muted max-w-3xl font-sans leading-relaxed line-clamp-2">
                      {report.accomplishments}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-center shrink-0">
                    <StatusBadge status={report.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
 </div>
 );
}

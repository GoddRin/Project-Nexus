
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { ReportFilters } from "./ReportFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
 "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 APPROVED:
 "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 REJECTED:
 "bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30 shadow-[inset_0_1px_0_0_rgba(214,72,63,0.2)]",
 };
 return (
 <Badge variant="outline" className={styles[status]}>
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
 <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2.5 py-1 text-xs text-text-muted ring-1 ring-white/[0.08]">
 <Icon className="h-3.5 w-3.5 text-text-muted" />
 <span>{labels[condition]}</span>
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
 <div className="overflow-hidden rounded-xl border border-white/5 bg-bg-panel/40 shadow-lg">
 <div className="divide-y divide-white/5">
 {reports.map((report) => (
 <Link
 key={report.id}
 href={`/dashboard/reports/${report.id}`}
 className="block group"
 >
 <div className="flex flex-col gap-4 p-5 transition-colors duration-200 hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <h3 className="font-display text-base font-semibold tracking-wide text-text-primary group-hover:text-flow-teal transition-colors">
 {report.workArea}
 </h3>
 <WeatherBadge condition={report.weatherCondition} />
 </div>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted font-mono tracking-tight">
 <span className="flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-text-muted/60" />
 {new Date(report.reportDate).toLocaleDateString("en-US", {
 weekday: "short",
 year: "numeric",
 month: "short",
 day: "numeric",
 })}
 </span>
 <span className="opacity-50 max-md:hidden">•</span>
 <span className="flex items-center gap-1.5">
 <UserIcon className="h-3.5 w-3.5 text-text-muted/60" />
 {report.submittedBy.name}
 </span>
 {report.photos.length > 0 && (
 <>
 <span className="opacity-50 max-md:hidden">•</span>
 <span>
 {report.photos.length} Photo{report.photos.length > 1 ? "s" : ""}
 </span>
 </>
 )}
 </div>

 <p className="text-sm text-text-muted/80 line-clamp-2 max-w-2xl font-sans font-light leading-relaxed">
 {report.accomplishments}
 </p>
 </div>

 <div className="flex items-center gap-3 self-start md:self-center">
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

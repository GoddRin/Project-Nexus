import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import {
 Ticket,
 CloudLightning,
 Megaphone,
 History,
 Package,
 BookOpen,
 FileText,
 ClipboardList,
 Wrench,
 Shield,
 Wind,
 Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { fetchWeather, getWeatherInfo } from "@/lib/weather/fetchWeather";

/* Card uses the shared .glass-card CSS utility from globals.css */
const GLASS_CARD = "glass-card h-full";


/* Card header with icon dot indicator */
function CardHeader({ icon: Icon, title, glow = false }: { icon: React.ElementType; title: string; glow?: boolean }) {
 return (
 <div className="mb-5 flex items-center gap-3">
 <div className={cn(
 "flex h-8 w-8 items-center justify-center rounded-lg",
 glow
 ? "bg-flow-teal/15 ring-1 ring-flow-teal/30 shadow-[0_0_12px_rgba(31,182,166,0.25)]"
 : "bg-white/[0.06] ring-1 ring-white/[0.08]"
 )}>
 <Icon className={cn(
 "h-4 w-4",
 glow ? "text-flow-teal" : "text-text-muted"
 )} />
 </div>
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
 {title}
 </h3>
 </div>
 );
}

// Scaffold card that accepts custom border styles
function ScaffoldCard({
 title,
 icon: Icon,
 children,
 delay = 0,
 glow = false,
}: {
 title: string;
 icon: React.ElementType;
 children: React.ReactNode;
 delay?: number;
 glow?: boolean;
}) {
 return (
 <AnimatedSection delay={delay} className="h-full">
 <div className={GLASS_CARD} style={{ padding: "1.5rem" }}>
 <CardHeader icon={Icon} title={title} glow={glow} />
 <div className="flex-1 flex flex-col justify-center">
 {children}
 </div>
 </div>
 </AnimatedSection>
 );
}

export async function OpenTicketsWidget({ delay = 0 }: { delay?: number }) {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" }});
 
 const openTickets = await prisma.ticket.count({
 where: {
 projectId: project?.id,
 status: { in: ["OPEN", "IN_PROGRESS"] },
 }
 });

 return (
 <AnimatedSection delay={delay} className="h-full">
 <div className={GLASS_CARD} style={{ padding: "1.5rem" }}>
 <CardHeader icon={Ticket} title="Open IT Tickets" glow />

 {openTickets === 0 ? (
 <EmptyState
 icon={Ticket}
 title="No open tickets"
 description="There are currently no IT issues requiring attention."
 actionLabel="Create Ticket"
 actionHref="/dashboard/tickets/new"
 intent="warning"
 />
 ) : (
 <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-4">
 <span className="font-display text-6xl font-bold tabular-nums text-flow-teal drop-shadow-[0_0_20px_rgba(31,182,166,0.4)]">
 {openTickets}
 </span>
 <span className="text-sm font-medium tracking-wide text-text-muted">
 Active tickets in queue
 </span>
 <Link href="/dashboard/tickets" className="mt-2">
 <Button variant="outline" className="border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
 View All Tickets
 </Button>
 </Link>
 </div>
 )}
 </div>
 </AnimatedSection>
 );
}

export async function OnSiteWidget({ delay = 0 }: { delay?: number }) {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" }});
 
 const onSiteVisitors = await prisma.visitor.count({
 where: {
 projectId: project?.id,
 status: "CHECKED_IN",
 }
 });

 return (
 <AnimatedSection delay={delay} className="h-full">
 <div className={cn(GLASS_CARD, "border border-flow-teal/50 shadow-[inset_0_0_20px_rgba(31,182,166,0.1)]")} style={{ padding: "1.5rem" }}>
 <CardHeader icon={Shield} title="On Site Now" glow />

 {onSiteVisitors === 0 ? (
 <EmptyState
 icon={Shield}
 title="No visitors"
 description="There are currently no logged visitors on site."
 actionLabel="Log Visitor"
 actionHref="/dashboard/visitors/new"
 intent="primary"
 />
 ) : (
 <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-4">
 <span className="font-display text-6xl font-bold tabular-nums text-flow-teal drop-shadow-[0_0_20px_rgba(31,182,166,0.4)]">
 {onSiteVisitors}
 </span>
 <span className="text-sm font-medium tracking-wide text-text-muted">
 Active visitors on premises
 </span>
 <Link href="/dashboard/visitors" className="mt-2">
 <Button variant="outline" className="border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
 View Visitor Log
 </Button>
 </Link>
 </div>
 )}
 </div>
 </AnimatedSection>
 );
}

export async function WeatherWidget({ delay = 0 }: { delay?: number }) {
  const weather = await fetchWeather();

  if (!weather) {
    return (
      <ScaffoldCard title="Weather" icon={CloudLightning} delay={delay} glow>
        <EmptyState
          icon={CloudLightning}
          title="Weather data unavailable"
          description="Could not connect to the weather service."
          intent="warning"
        />
      </ScaffoldCard>
    );
  }

  const current = weather.current;
  const recommendation = getWeatherInfo(current.weather_code);
  const WeatherIcon = recommendation.icon;

  const intentStyles = {
    favorable: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30",
    caution: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30",
    suspend: "bg-signal-red/10 text-signal-red ring-signal-red/30",
  };

  return (
    <AnimatedSection delay={delay} className="h-full">
      {/* Real active state: top border matching intent */}
      <div 
        className={cn(
          GLASS_CARD, 
          "border-t-2 relative overflow-hidden",
          recommendation.intent === "favorable" && "border-t-flow-teal shadow-[inset_0_20px_20px_-20px_rgba(31,182,166,0.15)]",
          recommendation.intent === "caution" && "border-t-signal-amber shadow-[inset_0_20px_20px_-20px_rgba(232,163,61,0.15)]",
          recommendation.intent === "suspend" && "border-t-signal-red shadow-[inset_0_20px_20px_-20px_rgba(214,72,63,0.15)]"
        )} 
        style={{ padding: "1.5rem" }}
      >
        <CardHeader icon={WeatherIcon} title="Current Weather" glow={recommendation.intent === "favorable"} />
        
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <WeatherIcon className={cn(
                "h-12 w-12 drop-shadow-lg",
                recommendation.intent === "favorable" && "text-flow-teal",
                recommendation.intent === "caution" && "text-signal-amber",
                recommendation.intent === "suspend" && "text-signal-red"
              )} />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold tracking-tight text-white">
                    {Math.round(current.temperature_2m)}°
                  </span>
                  <span className="text-sm font-medium text-text-muted">C</span>
                </div>
                <p className="text-sm font-medium text-text-primary mt-1">
                  {recommendation.conditionLabel}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-text-muted">
                <span>{current.wind_speed_10m} km/h</span>
                <Wind className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-text-muted">
                <span>{current.relative_humidity_2m}%</span>
                <Droplets className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/10">
            <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider font-mono">Site Recommendation</p>
            <div className={cn(
              "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1",
              intentStyles[recommendation.intent]
            )}>
              {recommendation.label}
            </div>
          </div>

          <Link href="/dashboard/weather" className="mt-4 block">
            <Button variant="outline" className="w-full border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
              View Full Forecast
            </Button>
          </Link>
        </div>
      </div>
    </AnimatedSection>
  );
}

export function AnnouncementsWidget({ delay = 0 }: { delay?: number }) {
 return (
 <ScaffoldCard title="Announcements" icon={Megaphone} delay={delay}>
 <EmptyState
 icon={Megaphone}
 title="No announcements"
 description="Important site-wide messages will appear here."
 />
 </ScaffoldCard>
 );
}

export async function RecentActivityWidget({ delay = 0 }: { delay?: number }) {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" }});
 
 const reports = await prisma.accomplishmentReport.findMany({
 where: { projectId: project?.id },
 include: {
 submittedBy: true,
 reviewedBy: true,
 },
 orderBy: { updatedAt: "desc" },
 take: 4,
 });

 const transactions = await prisma.inventoryTransaction.findMany({
 where: { projectId: project?.id, status: "APPROVED" },
 include: {
 item: true,
 approvedBy: true,
 requestedBy: true
 },
 orderBy: { updatedAt: "desc" },
 take: 4,
 });

 const visitors = await prisma.visitor.findMany({
 where: { projectId: project?.id },
 include: { host: true, loggedBy: true },
 orderBy: { createdAt: "desc" },
 take: 4,
 });

 // Combine and sort by date
 type Activity = 
 | { type: 'report', date: Date, data: typeof reports[0] }
 | { type: 'transaction', date: Date, data: typeof transactions[0] }
 | { type: 'visitor', date: Date, data: typeof visitors[0] };
 
 const activities: Activity[] = [
 ...reports.map(r => ({ type: 'report' as const, date: r.updatedAt, data: r })),
 ...transactions.map(t => ({ type: 'transaction' as const, date: t.updatedAt, data: t })),
 ...visitors.map(v => ({ type: 'visitor' as const, date: v.createdAt, data: v }))
 ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

 return (
 <AnimatedSection delay={delay} className="h-full">
 <div className={GLASS_CARD} style={{ padding: "1.5rem" }}>
 <CardHeader icon={History} title="Recent Activity" glow />

 {activities.length === 0 ? (
 <EmptyState
 icon={History}
 title="No recent activity"
 description="Activity across all your modules will stream here."
 intent="primary"
 />
 ) : (
 <div className="flex-1 flex flex-col justify-start">
 <div className="relative border-l border-white/5 pl-4 ml-2 space-y-4 py-1">
 {activities.map((activity, i) => {
 let statusColor = "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]";
 let activityText = "";
 let href = "";
 let dateLabel = "";

 if (activity.type === 'report') {
 const report = activity.data;
 href = `/dashboard/reports/${report.id}`;
 dateLabel = `Work Date: ${new Date(report.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
 
 if (report.status === "APPROVED") {
 activityText = `${report.reviewedBy?.name || "Reviewer"} approved report for ${report.workArea}`;
 } else if (report.status === "REJECTED") {
 statusColor = "bg-signal-red shadow-[0_0_8px_rgba(214,72,63,0.5)]";
 activityText = `${report.reviewedBy?.name || "Reviewer"} rejected report for ${report.workArea}`;
 } else {
 statusColor = "bg-signal-amber shadow-[0_0_8px_rgba(232,163,61,0.5)]";
 activityText = `${report.submittedBy.name} submitted report for ${report.workArea}`;
 }
 } else if (activity.type === 'transaction') {
 const tx = activity.data;
 href = `/dashboard/inventory/${tx.itemId}`;
 dateLabel = `Item: ${tx.item.name}`;
 
 if (tx.type === "RESTOCK") {
 statusColor = "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]";
 activityText = `${tx.approvedBy?.name || "Admin"} restocked ${tx.quantity} ${tx.item.unit}`;
 } else if (tx.type === "ISSUE") {
 statusColor = "bg-signal-amber shadow-[0_0_8px_rgba(232,163,61,0.5)]";
 activityText = `${tx.approvedBy?.name || "Admin"} issued ${tx.quantity} ${tx.item.unit} to ${tx.requestedBy.name}`;
 } else if (tx.type === "BORROW") {
 statusColor = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
 activityText = `${tx.approvedBy?.name || "Admin"} approved borrow of ${tx.quantity} ${tx.item.unit} by ${tx.requestedBy.name}`;
 } else if (tx.type === "RETURN") {
 statusColor = "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]";
 activityText = `${tx.requestedBy.name} returned ${tx.quantity} ${tx.item.unit}`;
 }
 } else if (activity.type === 'visitor') {
 const visitor = activity.data;
 href = `/dashboard/visitors/${visitor.id}`;
 dateLabel = `Visitor: ${visitor.organization || visitor.fullName}`;
 
 if (visitor.status === "CHECKED_IN") {
 statusColor = "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]";
 activityText = `${visitor.loggedBy.name} logged visitor ${visitor.fullName} in to see ${visitor.host.name}`;
 } else {
 statusColor = "bg-text-muted shadow-[0_0_8px_rgba(156,163,175,0.5)]";
 activityText = `${visitor.fullName} checked out`;
 }
 }

 return (
 <div key={`${activity.type}-${i}`} className="relative group/item">
 {/* Status Dot */}
 <div className={cn(
 "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full",
 statusColor
 )} />
 
 <Link href={href} className="block">
 <div className="rounded-lg bg-white/[0.01] hover:bg-white/[0.04] border border-transparent hover:border-white/5 p-2 transition-all duration-200">
 <p className="text-xs text-text-primary leading-snug group-hover/item:text-flow-teal transition-colors">
 {activityText}
 </p>
 <p className="mt-1 font-mono text-[9px] text-text-muted/60 uppercase tracking-tight">
 {dateLabel}
 </p>
 </div>
 </Link>
 </div>
 );
 })}
 </div>
 
 <Link href="/dashboard/reports" className="mt-auto pt-4 text-center block">
 <Button variant="ghost" className="h-8 text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.04] w-full">
 View All Activity
 </Button>
 </Link>
 </div>
 )}
 </div>
 </AnimatedSection>
 );
}

const QUICK_LINKS = [
 { label: "Helpdesk", href: "/dashboard/tickets", icon: Ticket },
 { label: "Assets", href: "/dashboard/assets", icon: Package },
 { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
 { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
 { label: "Documents", href: "/dashboard/documents", icon: FileText },
 { label: "Daily Reports", href: "/dashboard/reports", icon: ClipboardList },
];

export function QuickAccessWidget({ delay = 0 }: { delay?: number }) {
 return (
 <AnimatedSection delay={delay} className="h-full">
 <div className={GLASS_CARD} style={{ padding: "1.5rem" }}>
 <CardHeader icon={Package} title="Quick Access" />
 <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-auto">
 {QUICK_LINKS.map((link) => (
 <Link
 key={link.href}
 href={link.href}
 className="group/link flex flex-col items-center justify-center gap-3 rounded-xl bg-white/[0.03] p-5 border border-white/[0.06] transition-all duration-300 hover:bg-flow-teal/10 hover:border-flow-teal/20 hover:shadow-[0_0_20px_rgba(31,182,166,0.15)]"
 >
 <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] transition-all duration-300 group-hover/link:bg-flow-teal/15 group-hover/link:ring-flow-teal/30 group-hover/link:shadow-[0_0_15px_rgba(31,182,166,0.2)]">
 <link.icon className="h-5 w-5 text-text-muted transition-colors duration-300 group-hover/link:text-flow-teal" />
 </div>
 <span className="text-center text-xs font-medium text-text-primary transition-colors duration-300 group-hover/link:text-flow-teal">
 {link.label}
 </span>
 </Link>
 ))}
 </div>
 </div>
 </AnimatedSection>
 );
}

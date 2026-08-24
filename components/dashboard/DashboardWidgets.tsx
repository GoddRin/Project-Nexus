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
/* Card uses the shared .glass-scic-card CSS utility from globals.css */
const GLASS_CARD = "glass-scic-card h-full";

/* Card header with icon dot indicator */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardHeader({ icon: Icon, title, glow = false, accent = "blue" }: { icon: any; title: string; glow?: boolean; accent?: "blue" | "cyan" | "green" | "amber" | "red" }) {
  const accentColors = {
    blue: "bg-scic-blue/10 text-scic-blue dark:bg-scic-blue/20 dark:text-scic-cyan border-scic-blue/20 dark:border-scic-cyan/30",
    cyan: "bg-scic-cyan/10 text-scic-cyan border-scic-cyan/25",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200",
          accentColors[accent] || accentColors.blue
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-bold tracking-tight text-text-primary">
          {title}
        </h3>
      </div>
      {glow && (
        <span className="flex h-2 w-2 rounded-full bg-scic-blue dark:bg-scic-cyan shadow-[0_0_8px_currentColor] animate-pulse" />
      )}
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
  accent = "blue",
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  children: React.ReactNode;
  delay?: number;
  glow?: boolean;
  accent?: "blue" | "cyan" | "green" | "amber" | "red";
}) {
  return (
    <AnimatedSection delay={delay} className="h-full">
      <div className={GLASS_CARD} style={{ padding: "1.5rem" }}>
        <CardHeader icon={Icon} title={title} glow={glow} accent={accent} />
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
      <div className={cn(GLASS_CARD, "scic-card-accent-blue p-6 flex flex-col justify-between")}>
        <CardHeader icon={Ticket} title="Open IT Helpdesk" glow accent="blue" />

        {openTickets === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No open tickets"
            description="There are currently no IT issues requiring attention."
            actionLabel="Create Ticket"
            actionHref="/dashboard/tickets/new"
            intent="primary"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-3">
            <span className="font-display text-5xl font-extrabold tabular-nums text-scic-blue dark:text-scic-cyan drop-shadow-sm">
              {openTickets}
            </span>
            <span className="text-xs font-semibold tracking-wide text-text-muted">
              Active tickets in queue
            </span>
            <Link href="/dashboard/tickets" className="mt-2 w-full">
              <Button variant="outline" className="w-full border-border-hairline bg-black/[0.02] dark:bg-white/[0.04] hover:bg-scic-blue/10 dark:hover:bg-scic-cyan/10 hover:text-scic-blue dark:hover:text-scic-cyan font-semibold text-xs">
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
      <div className={cn(GLASS_CARD, "scic-card-accent-green p-6 flex flex-col justify-between")}>
        <CardHeader icon={Shield} title="Site Personnel & Visitors" glow accent="green" />

        {onSiteVisitors === 0 ? (
          <EmptyState
            icon={Shield}
            title="No outside visitors"
            description="All active personnel are registered site crew."
            actionLabel="Log Visitor"
            actionHref="/dashboard/visitors/new"
            intent="primary"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-3">
            <span className="font-display text-5xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {onSiteVisitors}
            </span>
            <span className="text-xs font-semibold tracking-wide text-text-muted">
              Active visitors logged on site
            </span>
            <Link href="/dashboard/visitors" className="mt-2 w-full">
              <Button variant="outline" className="w-full border-border-hairline bg-black/[0.02] dark:bg-white/[0.04] hover:bg-emerald-500/10 hover:text-emerald-500 font-semibold text-xs">
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
      <ScaffoldCard title="Site Weather Telemetry" icon={CloudLightning} delay={delay} glow accent="amber">
        <EmptyState
          icon={CloudLightning}
          title="Weather data offline"
          description="Could not connect to the local meteorological station."
          intent="warning"
        />
      </ScaffoldCard>
    );
  }

  const current = weather.current;
  const recommendation = getWeatherInfo(current.weather_code);
  const WeatherIcon = recommendation.icon;

  const intentStyles = {
    favorable: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    caution: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    suspend: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  };

  return (
    <AnimatedSection delay={delay} className="h-full">
      <div 
        className={cn(
          GLASS_CARD, 
          "p-6 flex flex-col justify-between",
          recommendation.intent === "favorable" && "scic-card-accent-green",
          recommendation.intent === "caution" && "scic-card-accent-amber",
          recommendation.intent === "suspend" && "scic-card-accent-red"
        )} 
      >
        <CardHeader 
          icon={WeatherIcon} 
          title="Tumauini Site Meteorology" 
          glow={recommendation.intent === "favorable"}
          accent={recommendation.intent === "favorable" ? "green" : recommendation.intent === "caution" ? "amber" : "red"}
        />
        
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <WeatherIcon className={cn(
                "h-10 w-10 drop-shadow-md",
                recommendation.intent === "favorable" && "text-emerald-500 dark:text-emerald-400",
                recommendation.intent === "caution" && "text-amber-500 dark:text-amber-400",
                recommendation.intent === "suspend" && "text-red-500 dark:text-red-400"
              )} />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
                    {Math.round(current.temperature_2m)}°
                  </span>
                  <span className="text-xs font-semibold text-text-muted">C</span>
                </div>
                <p className="text-xs font-semibold text-text-primary mt-0.5">
                  {recommendation.conditionLabel}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 text-right">
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-medium text-text-muted">
                <span>{current.wind_speed_10m} km/h</span>
                <Wind className="h-3 w-3" />
              </div>
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-medium text-text-muted">
                <span>{current.relative_humidity_2m}% RH</span>
                <Droplets className="h-3 w-3" />
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-2.5 border border-border-hairline">
            <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider font-mono">Operations Directive</p>
            <div className={cn(
              "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold",
              intentStyles[recommendation.intent]
            )}>
              {recommendation.label}
            </div>
          </div>

          <Link href="/dashboard/weather" className="mt-3 block">
            <Button variant="outline" className="w-full border-border-hairline bg-black/[0.02] dark:bg-white/[0.04] hover:bg-scic-blue/10 dark:hover:bg-scic-cyan/10 hover:text-scic-blue dark:hover:text-scic-cyan font-semibold text-xs">
              Live Weather & Radar Forecast
            </Button>
          </Link>
        </div>
      </div>
    </AnimatedSection>
  );
}

export function AnnouncementsWidget({ delay = 0 }: { delay?: number }) {
  return (
    <ScaffoldCard title="Project Notices & Bulletins" icon={Megaphone} delay={delay} accent="amber">
      <EmptyState
        icon={Megaphone}
        title="No active bulletins"
        description="Official SCIC Project Management notices will be broadcast here."
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
      <div className={cn(GLASS_CARD, "scic-card-accent-blue p-6 flex flex-col justify-between")}>
        <CardHeader icon={History} title="Site Activity Stream" glow accent="blue" />

        {activities.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent operations"
            description="Operational transactions and site logs will stream here."
            intent="primary"
          />
        ) : (
          <div className="flex-1 flex flex-col justify-start">
            <div className="relative border-l border-border-hairline pl-3.5 ml-2 space-y-3 py-1">
              {activities.map((activity, i) => {
                let statusColor = "bg-scic-blue dark:bg-scic-cyan shadow-[0_0_8px_currentColor]";
                let activityText = "";
                let href = "";
                let dateLabel = "";

                if (activity.type === 'report') {
                  const report = activity.data;
                  href = `/dashboard/reports/${report.id}`;
                  dateLabel = `Work Area: ${report.workArea}`;
                  
                  if (report.status === "APPROVED") {
                    activityText = `${report.reviewedBy?.name || "PM"} approved report for ${report.workArea}`;
                  } else if (report.status === "REJECTED") {
                    statusColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                    activityText = `${report.reviewedBy?.name || "PM"} rejected report for ${report.workArea}`;
                  } else {
                    statusColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                    activityText = `${report.submittedBy.name} submitted accomplishment report`;
                  }
                } else if (activity.type === 'transaction') {
                  const tx = activity.data;
                  href = `/dashboard/inventory/${tx.itemId}`;
                  dateLabel = `Material: ${tx.item.name}`;
                  
                  if (tx.type === "RESTOCK") {
                    statusColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                    activityText = `${tx.approvedBy?.name || "Admin"} restocked ${tx.quantity} ${tx.item.unit}`;
                  } else if (tx.type === "ISSUE") {
                    statusColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                    activityText = `Issued ${tx.quantity} ${tx.item.unit} to ${tx.requestedBy.name}`;
                  } else {
                    statusColor = "bg-scic-blue shadow-[0_0_8px_rgba(0,119,204,0.5)]";
                    activityText = `${tx.type} ${tx.quantity} ${tx.item.unit} (${tx.item.name})`;
                  }
                } else if (activity.type === 'visitor') {
                  const visitor = activity.data;
                  href = `/dashboard/visitors/${visitor.id}`;
                  dateLabel = `Visitor: ${visitor.organization || visitor.fullName}`;
                  
                  if (visitor.status === "CHECKED_IN") {
                    statusColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                    activityText = `Visitor check-in: ${visitor.fullName}`;
                  } else {
                    statusColor = "bg-text-muted";
                    activityText = `Visitor check-out: ${visitor.fullName}`;
                  }
                }

                return (
                  <div key={`${activity.type}-${i}`} className="relative group/item">
                    <div className={cn(
                      "absolute -left-[19px] top-1.5 h-2 w-2 rounded-full",
                      statusColor
                    )} />
                    
                    <Link href={href} className="block">
                      <div className="rounded-lg bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-border-subtle p-2 transition-all duration-150">
                        <p className="text-xs font-semibold text-text-primary leading-snug group-hover/item:text-scic-blue dark:group-hover/item:text-scic-cyan transition-colors">
                          {activityText}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] font-medium text-text-muted">
                          {dateLabel}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
            
            <Link href="/dashboard/reports" className="mt-auto pt-3 text-center block">
              <Button variant="ghost" className="h-7 text-xs text-text-muted hover:text-text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.04] w-full font-medium">
                View All Activity Stream &rarr;
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}

const QUICK_LINKS = [
  { label: "Helpdesk", desc: "IT & Facilities", href: "/dashboard/tickets", icon: Ticket },
  { label: "Assets", desc: "Heavy Equipment", href: "/dashboard/assets", icon: Package },
  { label: "Maintenance", desc: "Preventive Schedule", href: "/dashboard/maintenance", icon: Wrench },
  { label: "Knowledge Base", desc: "SOPs & Standards", href: "/dashboard/knowledge-base", icon: BookOpen },
  { label: "Documents", desc: "QA/QC Vault", href: "/dashboard/documents", icon: FileText },
  { label: "Daily Reports", desc: "Accomplishment Logs", href: "/dashboard/reports", icon: ClipboardList },
];

export function QuickAccessWidget({ delay = 0 }: { delay?: number }) {
  return (
    <AnimatedSection delay={delay} className="h-full">
      <div className={cn(GLASS_CARD, "scic-card-accent-cyan p-6")}>
        <CardHeader icon={Package} title="Project Modules & Quick Action Launcher" accent="cyan" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group/link flex flex-col items-center justify-center text-center p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline transition-all duration-200 hover:bg-scic-blue/10 dark:hover:bg-scic-cyan/10 hover:border-scic-blue/30 dark:hover:border-scic-cyan/40 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20 mb-2 transition-all duration-200 group-hover/link:bg-scic-blue dark:group-hover/link:bg-scic-cyan group-hover/link:text-white dark:group-hover/link:text-slate-950">
                <link.icon className="h-4.5 w-4.5 text-scic-blue dark:text-scic-cyan group-hover/link:text-white dark:group-hover/link:text-slate-950 transition-colors" />
              </div>
              <span className="text-xs font-bold text-text-primary group-hover/link:text-scic-blue dark:group-hover/link:text-scic-cyan transition-colors">
                {link.label}
              </span>
              <span className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                {link.desc}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

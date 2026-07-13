import { prisma } from "@/lib/db/prisma";
import { TicketStatus, AssetStatus, MaintenanceStatus, ReportStatus, VisitorStatus, NetworkDeviceStatus } from "@prisma/client";
import {
  TicketTrendsChart,
  ReportActivityChart,
  AssetHealthChart,
  InventoryActivityChart,
  VisitorTrafficChart,
  ConstructionHeatmapClient,
  WeatherCorrelationClient,
} from "./charts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchHistoricalWeather } from "@/lib/weather/fetchWeather";

// --- Date Utils ---
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

function getWeekLabel(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDayLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// --- Sections ---

export async function KPISummarySection({ projectId }: { projectId: string }) {
  // Use Promise.all to fetch all 6 metrics in parallel
  const [
    openTickets,
    assetsCount,
    activeAssets,
    overdueMaintenance,
    reportsThisMonth,
    inventoryItems,
    visitorsThisWeek,
  ] = await Promise.all([
    // Open Tickets
    prisma.ticket.count({
      where: { projectId, status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
    }),
    // Total Assets
    prisma.asset.count({ where: { projectId } }),
    // Active Assets
    prisma.asset.count({ where: { projectId, status: AssetStatus.ACTIVE } }),
    // Overdue Maintenance
    prisma.maintenanceSchedule.count({
      where: { projectId, status: MaintenanceStatus.UPCOMING, nextDueDate: { lt: now } },
    }),
    // Reports This Month
    prisma.accomplishmentReport.count({
      where: { projectId, createdAt: { gte: thisMonthStart } },
    }),
    // Inventory Items (to filter low stock)
    prisma.inventoryItem.findMany({
      where: { projectId, lowStockThreshold: { gt: 0 } },
      select: { quantityOnHand: true, lowStockThreshold: true },
    }),
    // Visitors This Week
    prisma.visitor.count({
      where: {
        projectId,
        status: { in: [VisitorStatus.CHECKED_IN, VisitorStatus.CHECKED_OUT] },
        timeIn: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const lowStockCount = inventoryItems.filter((i) => i.quantityOnHand <= i.lowStockThreshold).length;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KPICard title="Open Tickets" value={openTickets} />
      <KPICard title="Assets Online" value={`${activeAssets} / ${assetsCount}`} />
      <KPICard title="Overdue Maint." value={overdueMaintenance} trend={overdueMaintenance > 0 ? "bad" : "neutral"} />
      <KPICard title="Reports This Month" value={reportsThisMonth} />
      <KPICard title="Low Stock Items" value={lowStockCount} trend={lowStockCount > 0 ? "bad" : "neutral"} />
      <KPICard title="Visitors This Week" value={visitorsThisWeek} />
    </div>
  );
}

function KPICard({ title, value, trend }: { title: string; value: string | number; trend?: "good" | "bad" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-lg">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">{title}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="font-display text-3xl font-bold tracking-tight text-text-primary">{value}</p>
        {trend && (
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-full",
            trend === "bad" ? "bg-signal-red/10 text-signal-red" :
            trend === "good" ? "bg-flow-teal/10 text-flow-teal" :
            "bg-white/[0.04] text-text-muted"
          )}>
            {trend === "bad" ? <TrendingUp className="h-3.5 w-3.5" /> : trend === "good" ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>
    </div>
  );
}

export async function TicketTrendsSection({ projectId }: { projectId: string }) {
  const tickets = await prisma.ticket.findMany({
    where: { projectId, createdAt: { gte: ninetyDaysAgo } },
    select: { status: true, createdAt: true },
  });

  const buckets: Record<string, { week: string; open: number; inProgress: number; resolvedClosed: number }> = {};
  for (const t of tickets) {
    const week = getWeekLabel(t.createdAt);
    if (!buckets[week]) buckets[week] = { week, open: 0, inProgress: 0, resolvedClosed: 0 };
    if (t.status === TicketStatus.OPEN) buckets[week].open++;
    else if (t.status === TicketStatus.IN_PROGRESS) buckets[week].inProgress++;
    else buckets[week].resolvedClosed++;
  }

  const data = Object.values(buckets).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  return <TicketTrendsChart data={data} />;
}

export async function ReportActivitySection({ projectId }: { projectId: string }) {
  const reports = await prisma.accomplishmentReport.findMany({
    where: { projectId, createdAt: { gte: sixtyDaysAgo } },
    select: { status: true, createdAt: true },
  });

  const buckets: Record<string, { week: string; approved: number; pending: number; rejected: number }> = {};
  for (const r of reports) {
    const week = getWeekLabel(r.createdAt);
    if (!buckets[week]) buckets[week] = { week, approved: 0, pending: 0, rejected: 0 };
    if (r.status === ReportStatus.APPROVED) buckets[week].approved++;
    else if (r.status === ReportStatus.SUBMITTED) buckets[week].pending++;
    else if (r.status === ReportStatus.REJECTED) buckets[week].rejected++;
  }

  const data = Object.values(buckets).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  return <ReportActivityChart data={data} />;
}

export async function AssetHealthSection({ projectId }: { projectId: string }) {
  const assetCounts = await prisma.asset.groupBy({
    by: ["status"],
    _count: true,
    where: { projectId },
  });

  const data = assetCounts.map(a => ({ name: a.status, value: a._count }));
  return <AssetHealthChart data={data} />;
}

export async function InventoryActivitySection({ projectId }: { projectId: string }) {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { projectId, createdAt: { gte: thirtyDaysAgo } },
    select: { type: true, createdAt: true },
  });

  const buckets: Record<string, { week: string; RESTOCK: number; ISSUE: number; BORROW: number; RETURN: number }> = {};
  for (const tx of transactions) {
    const week = getWeekLabel(tx.createdAt);
    if (!buckets[week]) buckets[week] = { week, RESTOCK: 0, ISSUE: 0, BORROW: 0, RETURN: 0 };
    buckets[week][tx.type]++;
  }

  const data = Object.values(buckets).sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

  return <InventoryActivityChart data={data} />;
}

export async function NetworkHealthSection({ projectId }: { projectId: string }) {
  const [counts, latest] = await Promise.all([
    prisma.networkDevice.groupBy({
      by: ["status"],
      _count: true,
      where: { projectId },
    }),
    prisma.networkDevice.aggregate({
      _max: { updatedAt: true },
      where: { projectId },
    }),
  ]);

  let total = 0, online = 0, offline = 0, maint = 0;
  for (const c of counts) {
    total += c._count;
    if (c.status === NetworkDeviceStatus.ONLINE) online += c._count;
    if (c.status === NetworkDeviceStatus.OFFLINE) offline += c._count;
    if (c.status === NetworkDeviceStatus.MAINTENANCE) maint += c._count;
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">Total Devices</p>
        <p className="mt-1 font-display text-4xl font-bold text-text-primary">{total}</p>
      </div>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-flow-teal" />
            <span className="text-sm font-medium text-text-muted">Online</span>
          </div>
          <span className="text-sm font-semibold text-flow-teal">{online}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-signal-red" />
            <span className="text-sm font-medium text-text-muted">Offline</span>
          </div>
          <span className="text-sm font-semibold text-signal-red">{offline}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-signal-amber" />
            <span className="text-sm font-medium text-text-muted">In Maintenance</span>
          </div>
          <span className="text-sm font-semibold text-signal-amber">{maint}</span>
        </div>
      </div>
      <div className="mt-6 border-t border-white/5 pt-4">
        <p className="text-xs text-text-muted">
          Last updated: {latest._max.updatedAt ? new Date(latest._max.updatedAt).toLocaleString() : "Never"}
        </p>
      </div>
    </div>
  );
}

export async function VisitorTrafficSection({ projectId }: { projectId: string }) {
  const visitors = await prisma.visitor.findMany({
    where: { projectId, timeIn: { gte: thirtyDaysAgo } },
    select: { timeIn: true },
  });

  const buckets: Record<string, { day: string; count: number }> = {};
  // Pre-fill last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets[getDayLabel(d)] = { day: getDayLabel(d), count: 0 };
  }

  for (const v of visitors) {
    const day = getDayLabel(v.timeIn);
    if (buckets[day]) buckets[day].count++;
  }

  const data = Object.values(buckets);
  return <VisitorTrafficChart data={data} />;
}

// --- Section 8: Construction Activity Heatmap Server Container ---

export async function ConstructionHeatmapSection({ projectId }: { projectId: string }) {
  // eslint-disable-next-line react-hooks/purity
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    siteLocations,
    accomplishmentReports,
    tickets,
    maintenanceTasks,
    siteLocationPhotos,
  ] = await Promise.all([
    prisma.siteLocation.findMany({
      where: { projectId },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.accomplishmentReport.findMany({
      where: { projectId, reportDate: { gte: ninetyDaysAgo } },
      select: { reportDate: true, workArea: true },
    }),
    prisma.ticket.findMany({
      where: { projectId, createdAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true, title: true, description: true },
    }),
    prisma.maintenanceTask.findMany({
      where: {
        schedule: { projectId },
        completedAt: { gte: ninetyDaysAgo, not: null },
      },
      select: {
        completedAt: true,
        schedule: {
          select: {
            asset: {
              select: { location: true },
            },
          },
        },
      },
    }),
    prisma.siteLocationPhoto.findMany({
      where: {
        location: { projectId },
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { createdAt: true, locationId: true },
    }),
  ]);

  const serializedLocations = siteLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
  }));

  const serializedReports = accomplishmentReports.map((r) => ({
    reportDate: r.reportDate.toISOString(),
    workArea: r.workArea,
  }));

  const serializedTickets = tickets.map((t) => ({
    createdAt: t.createdAt.toISOString(),
    title: t.title,
    description: t.description,
  }));

  const serializedTasks = maintenanceTasks.map((t) => ({
    completedAt: t.completedAt!.toISOString(),
    assetLocation: t.schedule.asset.location,
  }));

  const serializedPhotos = siteLocationPhotos.map((p) => ({
    createdAt: p.createdAt.toISOString(),
    locationId: p.locationId,
  }));

  return (
    <ConstructionHeatmapClient
      siteLocations={serializedLocations}
      accomplishmentReports={serializedReports}
      tickets={serializedTickets}
      maintenanceTasks={serializedTasks}
      siteLocationPhotos={serializedPhotos}
    />
  );
}

// --- Section 9: Weather-Construction Correlation Server Container ---

export async function WeatherCorrelationSection({ projectId }: { projectId: string }) {
  // eslint-disable-next-line react-hooks/purity
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [reports, weatherData] = await Promise.all([
    prisma.accomplishmentReport.findMany({
      where: { projectId, reportDate: { gte: ninetyDaysAgo } },
      select: { reportDate: true },
    }),
    fetchHistoricalWeather(),
  ]);

  const serializedReports = reports.map((r) => ({
    reportDate: r.reportDate.toISOString(),
  }));

  return (
    <WeatherCorrelationClient
      reports={serializedReports}
      weatherData={weatherData}
    />
  );
}

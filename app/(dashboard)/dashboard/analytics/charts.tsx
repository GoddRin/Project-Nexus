"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 shadow-xl backdrop-blur-md">
        <p className="mb-1 text-sm font-semibold text-text-primary">{label}</p>
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-text-muted capitalize">{entry.name}:</span>
              <span className="font-medium text-text-primary">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function TicketTrendsChart({ data }: { data: Record<string, string | number>[] }) {
  if (data.length === 0) return <EmptyChartState message="No tickets in the last 90 days" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar dataKey="open" name="Open" stackId="a" fill="var(--flow-teal)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="var(--signal-amber)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="resolvedClosed" name="Resolved/Closed" stackId="a" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportActivityChart({ data }: { data: Record<string, string | number>[] }) {
  if (data.length === 0) return <EmptyChartState message="No reports in the last 60 days" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="approved" name="Approved" stackId="1" stroke="var(--flow-teal)" fill="var(--flow-teal)" fillOpacity={0.4} />
        <Area type="monotone" dataKey="pending" name="Pending" stackId="1" stroke="var(--signal-amber)" fill="var(--signal-amber)" fillOpacity={0.4} />
        <Area type="monotone" dataKey="rejected" name="Rejected" stackId="1" stroke="var(--signal-red)" fill="var(--signal-red)" fillOpacity={0.4} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const ASSET_COLORS = {
  ACTIVE: "var(--flow-teal)",
  IN_MAINTENANCE: "var(--signal-amber)",
  RETIRED: "var(--text-muted)",
};

export function AssetHealthChart({ data }: { data: Record<string, string | number>[] }) {
  if (data.length === 0) return <EmptyChartState message="No assets registered" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={ASSET_COLORS[entry.name as keyof typeof ASSET_COLORS] || "var(--text-muted)"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function InventoryActivityChart({ data }: { data: Record<string, string | number>[] }) {
  if (data.length === 0) return <EmptyChartState message="No inventory transactions in the last 30 days" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar dataKey="RESTOCK" name="Restock" fill="var(--flow-teal)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="ISSUE" name="Issue" fill="var(--signal-amber)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="BORROW" name="Borrow" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="RETURN" name="Return" fill="var(--text-muted)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VisitorTrafficChart({ data }: { data: Record<string, string | number>[] }) {
  if (data.length === 0) return <EmptyChartState message="No visitors in the last 30 days" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="count" name="Visitors" stroke="var(--flow-teal)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--flow-teal)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
      <p className="text-sm font-medium text-text-muted">{message}</p>
    </div>
  );
}

// --- Section 8: Construction Activity Heatmap ---

interface HeatmapClientProps {
  siteLocations: { id: string; name: string; slug: string }[];
  accomplishmentReports: { reportDate: string; workArea: string }[];
  tickets: { createdAt: string; title: string; description: string }[];
  maintenanceTasks: { completedAt: string; assetLocation: string | null }[];
  siteLocationPhotos: { createdAt: string; locationId: string }[];
}

import { useState, useMemo } from "react";
import { HelpCircle } from "lucide-react";

export function ConstructionHeatmapClient({
  siteLocations,
  accomplishmentReports,
  tickets,
  maintenanceTasks,
  siteLocationPhotos,
}: HeatmapClientProps) {
  const [daysRange, setDaysRange] = useState(30);

  const { dateArray, rows } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: Date[] = [];
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d);
    }

    const formatDateString = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const getZoneKeywords = (locName: string, locSlug: string) => {
      const nameParts = locName.toLowerCase().split(/[/\s\-,]+/).filter(p => p.length > 2);
      const slugParts = locSlug.toLowerCase().split(/[/\s\-,]+/).filter(p => p.length > 2);
      return Array.from(new Set([...nameParts, ...slugParts, locSlug.toLowerCase()]));
    };

    const matchZone = (keywords: string[], locName: string, locSlug: string, text: string) => {
      const t = text.toLowerCase();
      if (t.includes(locName.toLowerCase()) || t.includes(locSlug.toLowerCase())) return true;
      return keywords.some(kw => t.includes(kw));
    };

    const calculatedRows = siteLocations.map(loc => {
      const keywords = getZoneKeywords(loc.name, loc.slug);

      const zoneReports = accomplishmentReports.filter(r => matchZone(keywords, loc.name, loc.slug, r.workArea));
      const zoneTickets = tickets.filter(t => matchZone(keywords, loc.name, loc.slug, t.title + " " + t.description));
      const zoneTasks = maintenanceTasks.filter(t => t.assetLocation && matchZone(keywords, loc.name, loc.slug, t.assetLocation));
      const zonePhotos = siteLocationPhotos.filter(p => p.locationId === loc.id);

      const scoresByDate: Record<string, { total: number; reports: number; tickets: number; tasks: number; photos: number }> = {};

      zoneReports.forEach(r => {
        const key = formatDateString(new Date(r.reportDate));
        if (!scoresByDate[key]) scoresByDate[key] = { total: 0, reports: 0, tickets: 0, tasks: 0, photos: 0 };
        scoresByDate[key].reports++;
        scoresByDate[key].total += 3;
      });

      zoneTickets.forEach(t => {
        const key = formatDateString(new Date(t.createdAt));
        if (!scoresByDate[key]) scoresByDate[key] = { total: 0, reports: 0, tickets: 0, tasks: 0, photos: 0 };
        scoresByDate[key].tickets++;
        scoresByDate[key].total += 2;
      });

      zoneTasks.forEach(t => {
        const key = formatDateString(new Date(t.completedAt));
        if (!scoresByDate[key]) scoresByDate[key] = { total: 0, reports: 0, tickets: 0, tasks: 0, photos: 0 };
        scoresByDate[key].tasks++;
        scoresByDate[key].total += 1;
      });

      zonePhotos.forEach(p => {
        const key = formatDateString(new Date(p.createdAt));
        if (!scoresByDate[key]) scoresByDate[key] = { total: 0, reports: 0, tickets: 0, tasks: 0, photos: 0 };
        scoresByDate[key].photos++;
        scoresByDate[key].total += 1;
      });

      const cols = dates.map(date => {
        const key = formatDateString(date);
        const scoreData = scoresByDate[key] || { total: 0, reports: 0, tickets: 0, tasks: 0, photos: 0 };
        return {
          date,
          dateStr: key,
          ...scoreData,
        };
      });

      return {
        location: loc,
        cols,
      };
    });

    return { dateArray: dates, rows: calculatedRows };
  }, [daysRange, siteLocations, accomplishmentReports, tickets, maintenanceTasks, siteLocationPhotos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-text-primary">Construction Activity Heatmap</h3>
            <div className="relative group/info">
              <HelpCircle className="h-4.5 w-4.5 text-text-muted hover:text-text-primary cursor-help transition-colors" />
              <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 w-64 p-3 rounded-xl border border-white/10 bg-black/95 text-xs text-text-muted shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity duration-150 z-50 leading-relaxed">
                <p className="font-bold text-text-primary mb-1 text-[11px]">How is activity measured?</p>
                <p className="mb-1 text-[10px]">Points are aggregated daily per zone:</p>
                <ul className="space-y-1 font-mono text-[10px] list-none">
                  <li>• Accomplishment Report: <span className="text-flow-teal font-semibold">+3 pts</span></li>
                  <li>• Ticket Created: <span className="text-flow-teal font-semibold">+2 pts</span></li>
                  <li>• Completed Maintenance: <span className="text-flow-teal font-semibold">+1 pt</span></li>
                  <li>• Photo Uploaded: <span className="text-flow-teal font-semibold">+1 pt</span></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-1">Daily activity intensity by site zone</p>
        </div>

        <div className="flex flex-col gap-1.5 w-full sm:w-64">
          <div className="flex justify-between text-[10px] font-mono text-text-muted">
            <span>7d</span>
            <span className="text-flow-teal font-semibold">Last {daysRange} Days</span>
            <span>90d</span>
          </div>
          <input
            type="range"
            min="7"
            max="90"
            value={daysRange}
            onChange={(e) => setDaysRange(parseInt(e.target.value))}
            className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-flow-teal outline-none"
          />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <div className="flex flex-col gap-1 pr-2 pt-6 w-36 shrink-0 justify-between">
          {rows.map((row, idx) => (
            <div key={idx} className="h-7 flex items-center text-xs font-mono text-text-muted truncate animate-fade-in" title={row.location.name}>
              {row.location.name}
            </div>
          ))}
        </div>

        <div className="flex-grow min-w-[650px] space-y-1">
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${daysRange}, minmax(0, 1fr))` }}>
            {dateArray.map((date, idx) => {
              const isEvery5th = idx % 5 === 0;
              const showLabel = daysRange > 45 ? (idx % 15 === 0) : isEvery5th;
              const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={idx} className="text-[9px] font-mono text-text-muted text-center truncate h-5">
                  {showLabel ? label : ""}
                </div>
              );
            })}
          </div>

          <div className="space-y-1">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${daysRange}, minmax(0, 1fr))` }}>
                {row.cols.map((col, colIdx) => {
                  const score = col.total;
                  let bgColor = "bg-white/[0.02]";
                  if (score >= 10) bgColor = "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]";
                  else if (score >= 6) bgColor = "bg-flow-teal/70";
                  else if (score >= 3) bgColor = "bg-flow-teal/45";
                  else if (score >= 1) bgColor = "bg-flow-teal/20";

                  return (
                    <div
                      key={colIdx}
                      className={cn(
                        "h-7 rounded-sm transition-all duration-100 cursor-pointer hover:scale-130 relative group",
                        bgColor
                      )}
                      style={{ willChange: "transform" }}
                    >
                      <div
                        className={cn(
                          "absolute left-1/2 -translate-x-1/2 w-48 p-3 rounded-lg border border-white/10 bg-black/90 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 text-[11px] space-y-1.5 text-left font-sans",
                          rowIdx < 3 ? "top-full mt-2" : "bottom-full mb-2"
                        )}
                      >
                        <p className="font-bold text-text-primary text-xs truncate">{row.location.name}</p>
                        <p className="font-mono text-text-muted text-[10px]">
                          {col.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        <div className="space-y-0.5 font-mono text-[10px] text-text-muted">
                          <p>• {col.reports} reports</p>
                          <p>• {col.tickets} tickets</p>
                          <p>• {col.tasks} tasks</p>
                          <p>• {col.photos} photos</p>
                        </div>
                        <p className="pt-1.5 border-t border-white/10 font-bold text-flow-teal flex justify-between">
                          <span>Total Score:</span>
                          <span>{score} pts</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-text-muted flex-wrap">
        <span>Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-white/[0.02] border border-white/[0.04] rounded-sm" />
          <span>No activity (0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-flow-teal/20 rounded-sm" />
          <span>Low (1-2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-flow-teal/45 rounded-sm" />
          <span>Medium (3-5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-flow-teal/70 rounded-sm" />
          <span>High (6-9)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 bg-flow-teal rounded-sm shadow-[0_0_8px_rgba(31,182,166,0.3)]" />
          <span>Very High (10+)</span>
        </div>
      </div>
    </div>
  );
}

// --- Section 9: Weather-Construction Correlation ---

interface WeatherCorrelationClientProps {
  reports: { reportDate: string }[];
  weatherData: {
    daily?: {
      time: string[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
    };
  } | null | undefined;
}

export function WeatherCorrelationClient({ reports, weatherData }: WeatherCorrelationClientProps) {
  const { chartData, stats, typhoonDays, hasData } = useMemo(() => {
    if (!weatherData || !weatherData.daily) {
      return { chartData: [], stats: null, typhoonDays: [], hasData: false };
    }
    const daily = weatherData.daily;
    const times: string[] = daily.time.slice(-90);
    const rainList: number[] = daily.precipitation_sum.slice(-90);
    const windList: number[] = daily.wind_speed_10m_max.slice(-90);

    const reportCountMap: Record<string, number> = {};
    reports.forEach((r) => {
      const dateKey = r.reportDate.substring(0, 10);
      reportCountMap[dateKey] = (reportCountMap[dateKey] || 0) + 1;
    });

    const items = times.map((t, idx) => {
      const rain = rainList[idx] ?? 0;
      const reportsCount = reportCountMap[t] ?? 0;
      const maxWind = windList[idx] ?? 0;
      const isTyphoon = maxWind > 60;

      return {
        date: t,
        formattedDate: new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: new Date(t).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        rain,
        reports: reportsCount,
        isTyphoon,
        wind: maxWind,
      };
    });

    const lostDaysCount = items.filter((d) => d.rain > 25 && d.reports === 0).length;

    const calcPearson = (x: number[], y: number[]) => {
      const n = x.length;
      if (n === 0) return 0;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
      }
      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      return den === 0 ? 0 : num / den;
    };

    const corr = calcPearson(items.map((d) => d.rain), items.map((d) => d.reports));
    const corrPct = Math.round(Math.abs(corr) * 100);
    let corrLabel = "Weak Relationship";
    const absCorr = Math.abs(corr);
    if (absCorr >= 0.7) corrLabel = "Strong Negative";
    else if (absCorr >= 0.4) corrLabel = "Moderate Negative";
    else if (absCorr > 0) corrLabel = "Weak Negative";

    if (corr > 0) {
      corrLabel = corrLabel.replace("Negative", "Positive");
    }

    let wettestActive = { date: "N/A", rain: 0, reports: 0 };
    items.forEach((d) => {
      if (d.reports > 0 && d.rain > wettestActive.rain) {
        wettestActive = {
          date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          rain: Math.round(d.rain * 10) / 10,
          reports: d.reports,
        };
      }
    });

    let currentStreak = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const d = items[i];
      if (d.rain < 10 && d.reports > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    const tDays = items.filter((d) => d.isTyphoon);

    return {
      chartData: items,
      stats: {
        lostDays: lostDaysCount,
        correlation: {
          val: corr,
          pct: corrPct,
          label: corrLabel,
        },
        wettestActive,
        streak: currentStreak,
      },
      typhoonDays: tDays,
      hasData: true,
    };
  }, [reports, weatherData]);

  if (!hasData || !stats) {
    return <EmptyChartState message="Weather data archive is currently unavailable." />;
  }

  const customTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{
      payload?: {
        fullDate: string;
        rain: number;
        reports: number;
        wind: number;
      };
    }>;
  }) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload;
      let status = "Normal Operations";
      let statusColor = "text-flow-teal";
      if (data.rain > 50) {
        status = "Work Suspended";
        statusColor = "text-signal-red";
      } else if (data.rain > 25) {
        status = "Operations Caution";
        statusColor = "text-signal-amber";
      }

      return (
        <div className="rounded-lg border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-md space-y-1.5 text-xs font-sans">
          <p className="font-bold text-text-primary">{data.fullDate}</p>
          <p className="text-signal-amber font-mono">• Rainfall: <span className="font-semibold">{Math.round(data.rain * 10) / 10} mm</span></p>
          <p className="text-flow-teal font-mono">• Reports filed: <span className="font-semibold">{data.reports}</span></p>
          {data.wind > 0 && (
            <p className="text-text-muted font-mono">• Max Wind: <span className="font-semibold">{Math.round(data.wind)} kph</span></p>
          )}
          <p className={`pt-1.5 border-t border-white/10 font-bold ${statusColor}`}>
            Status: {status}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-text-primary">Weather vs Construction Activity</h3>
        <p className="text-xs text-text-muted mt-1">90-day correlation — rainfall impact on daily progress (Open-Meteo Archive + Report Logs)</p>
      </div>

      <div className="h-80 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 25, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(t) => {
                const date = new Date(t);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={14}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--signal-amber)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              label={{ value: "Rainfall (mm)", angle: -90, position: "insideLeft", offset: 10, fill: "var(--signal-amber)", fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--flow-teal)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              label={{ value: "Reports Filed", angle: -90, position: "insideRight", offset: 15, fill: "var(--flow-teal)", fontSize: 10, fontFamily: "monospace" }}
            />
            <Tooltip content={customTooltip} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
            />

            {chartData
              .filter((d) => d.rain > 50 && d.reports === 0)
              .map((d) => (
                <ReferenceArea
                  key={`band-${d.date}`}
                  yAxisId="left"
                  x1={d.date}
                  x2={d.date}
                  fill="var(--signal-red)"
                  fillOpacity={0.12}
                />
              ))}

            {typhoonDays.map((d) => (
              <ReferenceLine
                key={`typhoon-${d.date}`}
                yAxisId="left"
                x={d.date}
                stroke="var(--signal-red)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: "🌀 Signal 1",
                  position: "top",
                  fill: "var(--signal-red)",
                  fontSize: 9,
                  fontWeight: "bold",
                }}
              />
            ))}

            <ReferenceLine
              yAxisId="left"
              y={25}
              stroke="var(--signal-amber)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: "Caution threshold (25mm)", position: "insideBottomLeft", fill: "var(--signal-amber)", fontSize: 9, fontFamily: "monospace" }}
            />
            <ReferenceLine
              yAxisId="left"
              y={50}
              stroke="var(--signal-red)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: "Work suspension (50mm)", position: "insideBottomLeft", fill: "var(--signal-red)", fontSize: 9, fontFamily: "monospace" }}
            />

            <Bar
              yAxisId="left"
              dataKey="rain"
              name="Rainfall (mm)"
              fill="var(--signal-amber)"
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => {
                const color = entry.rain > 50 ? "var(--signal-red)" : "var(--signal-amber)";
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="reports"
              name="Reports Filed"
              stroke="var(--flow-teal)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--flow-teal)", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "var(--flow-teal)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Estimated Lost Days</span>
            <p className="text-xs text-text-muted">Weather-affected work days</p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className={cn(
              "text-3xl font-display font-bold",
              stats.lostDays > 10 ? "text-signal-red" : stats.lostDays >= 5 ? "text-signal-amber" : "text-flow-teal"
            )}>
              {stats.lostDays}
            </p>
            <span className="text-[10px] font-mono text-text-muted">days (Rain &gt; 25mm & no reports)</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Correlation Score</span>
            <p className="text-xs text-text-muted">Rain-Activity Relationship</p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-display font-bold text-text-primary">
              {stats.correlation.pct}%
            </p>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-text-muted uppercase">Negative Correlation</span>
              <span className="text-[9px] font-bold text-flow-teal font-sans">{stats.correlation.label}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Wettest Active Day</span>
            <p className="text-xs text-text-muted">Team resilience indicator</p>
          </div>
          <div className="mt-3">
            {stats.wettestActive.rain > 0 ? (
              <div className="space-y-0.5">
                <p className="text-md font-bold text-text-primary">{stats.wettestActive.date}</p>
                <p className="text-xs text-text-muted">
                  <span className="text-signal-amber font-mono font-semibold">{stats.wettestActive.rain} mm</span> rain,{" "}
                  <span className="text-flow-teal font-mono font-semibold">{stats.wettestActive.reports} reports</span> filed
                </p>
              </div>
            ) : (
              <p className="text-xs text-text-muted">No rainy work days logged</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Consecutive Dry Work Days</span>
            <p className="text-xs text-text-muted">Current progress momentum</p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-display font-bold text-flow-teal">
              {stats.streak}
            </p>
            <span className="text-[10px] font-mono text-text-muted">days current streak</span>
          </div>
        </div>
      </div>
    </div>
  );
}

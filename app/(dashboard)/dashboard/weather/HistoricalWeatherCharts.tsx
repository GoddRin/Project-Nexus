"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
  TooltipContentProps,
} from "recharts";
import { HistoricalWeatherData } from "@/lib/weather/fetchWeather";
import { cn } from "@/lib/utils";

interface Props {
  data: HistoricalWeatherData;
}

const CustomRainfallTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border-hairline bg-surface-base/95 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-1 font-semibold text-text-primary">{label}</p>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-flow-teal">
            Rainfall: {payload[0].value} mm
          </span>
          <span className="text-text-muted">
            Rainy days: {payload[0].payload.rainyDaysCount}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTempTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (active && payload && payload.length >= 2) {
    return (
      <div className="rounded-lg border border-border-hairline bg-surface-base/95 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-1 font-semibold text-text-primary">{label}</p>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-signal-red">
            Avg High: {payload[1].value}°C
          </span>
          <span className="text-flow-teal">
            Avg Low: {payload[0].value}°C
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function HistoricalWeatherCharts({ data }: Props) {
  const stats = useMemo(() => {
    if (!data || !data.daily || !data.daily.time) return null;

    const { time, precipitation_sum, temperature_2m_max, temperature_2m_min } = data.daily;
    const monthlyGroups: Record<string, {
      totalPrecipitation: number;
      rainyDaysCount: number;
      tempMaxSum: number;
      tempMinSum: number;
      days: number;
    }> = {};

    let hottestDayIndex = 0;
    let maxTemp = -Infinity;

    for (let i = 0; i < time.length; i++) {
      const date = new Date(time[i]);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          totalPrecipitation: 0,
          rainyDaysCount: 0,
          tempMaxSum: 0,
          tempMinSum: 0,
          days: 0,
        };
      }

      const p = precipitation_sum[i] || 0;
      const tMax = temperature_2m_max[i] || 0;
      const tMin = temperature_2m_min[i] || 0;

      monthlyGroups[monthKey].totalPrecipitation += p;
      if (p > 1.0) {
        monthlyGroups[monthKey].rainyDaysCount += 1;
      }
      monthlyGroups[monthKey].tempMaxSum += tMax;
      monthlyGroups[monthKey].tempMinSum += tMin;
      monthlyGroups[monthKey].days += 1;

      if (tMax > maxTemp) {
        maxTemp = tMax;
        hottestDayIndex = i;
      }
    }

    const months = Object.keys(monthlyGroups).sort();
    // take the last 12 months if there are more
    const last12Months = months.slice(-12);

    const chartData = last12Months.map(key => {
      const g = monthlyGroups[key];
      // Note: "YYYY-MM" + "-01T00:00:00" ensures local time doesn't shift the month
      const date = new Date(`${key}-01T00:00:00`);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      return {
        key,
        monthName,
        totalPrecipitation: Number(g.totalPrecipitation.toFixed(1)),
        rainyDaysCount: g.rainyDaysCount,
        avgTempMax: Number((g.tempMaxSum / g.days).toFixed(1)),
        avgTempMin: Number((g.tempMinSum / g.days).toFixed(1)),
      };
    });

    if (chartData.length === 0) return null;

    let wettestMonth = chartData[0];
    let driestMonth = chartData[0];
    let totalRainyDays = 0;

    chartData.forEach(d => {
      if (d.totalPrecipitation > wettestMonth.totalPrecipitation) wettestMonth = d;
      if (d.totalPrecipitation < driestMonth.totalPrecipitation) driestMonth = d;
      totalRainyDays += d.rainyDaysCount;
    });

    const last30DaysRainfall = precipitation_sum.slice(-30).reduce((a, b) => a + (b || 0), 0);
    const yoyRainfall = precipitation_sum.slice(0, 30).reduce((a, b) => a + (b || 0), 0);

    return {
      chartData,
      wettestMonth,
      driestMonth,
      avgRainyDays: Math.round(totalRainyDays / chartData.length),
      hottestDay: {
        temp: maxTemp,
        date: new Date(time[hottestDayIndex]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
      last30DaysRainfall: Number(last30DaysRainfall.toFixed(1)),
      yoyRainfall: Number(yoyRainfall.toFixed(1))
    };
  }, [data]);

  if (!stats) return null;

  const { chartData, wettestMonth, driestMonth, avgRainyDays, hottestDay, last30DaysRainfall, yoyRainfall } = stats;

  return (
    <div className="space-y-8">
      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-card p-5 hover:dark:bg-white/[0.04] bg-black/[0.04] transition-colors">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted font-mono mb-2">Wettest Month</p>
          <p className="font-display text-2xl font-bold text-text-primary">{wettestMonth.monthName}</p>
          <p className="text-sm text-flow-teal mt-1">{wettestMonth.totalPrecipitation} mm</p>
        </div>
        <div className="glass-card p-5 hover:dark:bg-white/[0.04] bg-black/[0.04] transition-colors">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted font-mono mb-2">Driest Month</p>
          <p className="font-display text-2xl font-bold text-text-primary">{driestMonth.monthName}</p>
          <p className="text-sm text-signal-amber mt-1">{driestMonth.totalPrecipitation} mm</p>
        </div>
        <div className="glass-card p-5 hover:dark:bg-white/[0.04] bg-black/[0.04] transition-colors">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted font-mono mb-2">Hottest Day</p>
          <p className="font-display text-2xl font-bold text-text-primary">{hottestDay.temp}°C</p>
          <p className="text-sm text-signal-red mt-1">{hottestDay.date}</p>
        </div>
        <div className="glass-card p-5 hover:dark:bg-white/[0.04] bg-black/[0.04] transition-colors">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted font-mono mb-2">Recent Rainfall (30d)</p>
          <p className="font-display text-2xl font-bold text-text-primary">{last30DaysRainfall} mm</p>
          <p className="text-sm text-text-muted mt-1">YoY: {yoyRainfall} mm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Rainfall Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold tracking-wide text-text-primary mb-6">Monthly Rainfall</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="monthName" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <RechartsTooltip content={CustomRainfallTooltip} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <ReferenceLine y={200} stroke="#E8A33D" strokeDasharray="3 3" label={{ position: 'top', value: 'Heavy', fill: '#E8A33D', fontSize: 10 }} />
                <Bar dataKey="totalPrecipitation" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.totalPrecipitation > 200 ? '#E8A33D' : '#1FB6A6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Envelope */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold tracking-wide text-text-primary mb-6">Temperature Range</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="monthName" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <RechartsTooltip content={CustomTempTooltip} />
                <Area type="monotone" dataKey="avgTempMin" stroke="#1FB6A6" fill="#1FB6A6" fillOpacity={0.1} />
                <Area type="monotone" dataKey="avgTempMax" stroke="#D6483F" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rainy Days Grid */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold tracking-wide text-text-primary">Rainy Days Distribution</h3>
          <span className="text-sm text-text-muted">Avg: {avgRainyDays} days/month</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {chartData.map(d => {
            const ratio = Math.min(d.rainyDaysCount / 31, 1);
            return (
              <div key={d.key} className="dark:bg-white/[0.02] bg-black/[0.02] border border-white/[0.05] rounded-lg p-3">
                <p className="text-xs text-text-muted text-center mb-2">{d.monthName}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className={cn(
                    "text-lg font-bold",
                    d.rainyDaysCount > 20 ? "text-signal-red" : d.rainyDaysCount > 10 ? "text-signal-amber" : "text-flow-teal"
                  )}>
                    {d.rainyDaysCount}
                  </span>
                </div>
                <div className="h-1.5 w-full dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      d.rainyDaysCount > 20 ? "bg-signal-red" : d.rainyDaysCount > 10 ? "bg-signal-amber" : "bg-flow-teal"
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attribution */}
      <div className="text-right">
        <p className="text-xs text-text-muted font-mono">Data source: Open-Meteo Archive API (ERA5)</p>
      </div>
    </div>
  );
}

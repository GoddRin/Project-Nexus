"use client";

import { useEffect, useState, useCallback } from "react";
import { Waves, Activity, AlertTriangle, ShieldCheck, Droplets, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiverStation {
  site_id: string;
  site_name: string;
  basin: string;
  lat: number;
  lon: number;
  distKm: number;
  value: string;
  numericValue?: number | null;
  readable_unit: string;
  metric_label: string;
  status_badge: string;
  status_label: string;
  observed_at: string;
  source: string;
  alertLevel: "normal" | "watch" | "warning" | "critical";
  isLive: boolean;
}

interface DamStatus {
  name: string;
  fullName: string;
  observationTime: string;
  rwl: number;
  deviation24h: number;
  nhwl: number;
  deviationNhwl: number;
  gatesOpen: number;
  outflowCms: number;
}

interface RiverBasinData {
  success: boolean;
  source: string;
  cagayanStatus: string;
  magatSubbasinStatus: string;
  stations: RiverStation[];
  allDams?: DamStatus[];
  updatedAt: string;
  isStale?: boolean;
}

export default function RiverBasinTelemetryWidget() {
  const [data, setData] = useState<RiverBasinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showAllDams, setShowAllDams] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const loadRiverBasinData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else if (!data) setIsLoading(true);
      setIsError(false);

      const res = await fetch(`/api/weather/riverbasin?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json: RiverBasinData = await res.json();
      if (json.success && json.stations && json.stations.length > 0) {
        setData(json);
        setLastSyncTime(new Date());
      } else {
        if (!data) setIsError(true);
      }
    } catch (err) {
      console.error("Failed to load river basin telemetry:", err);
      if (!data) {
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    loadRiverBasinData(false);

    // 60-second real-time auto-refresh interval for hydrological telemetry
    const interval = setInterval(() => {
      loadRiverBasinData(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadRiverBasinData]);

  if (isLoading && !data) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-4 shadow-lg flex items-center justify-center h-[120px]">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Activity className="h-4 w-4 text-cyan-400 animate-spin" />
          <span>Fetching live DOST-PAGASA & Copernicus GloFAS hydrological telemetry...</span>
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-text-muted">River Basin Hydrological Telemetry Offline</span>
        </div>
        <button
          onClick={() => loadRiverBasinData(true)}
          className="text-[10px] text-amber-400 font-mono px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/20 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry Connection
        </button>
      </div>
    );
  }

  const stations = data?.stations || [];
  const isWatch = data?.cagayanStatus.toLowerCase().includes("flood watch") && !data?.cagayanStatus.toLowerCase().includes("non-flood");

  return (
    <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-hairline/60 pb-3 mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Waves className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Cagayan River Basin & Tailrace Outflow Telemetry
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            {data?.cagayanStatus || "Non-Flood Watch"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://bagong.pagasa.dost.gov.ph/flood"
            target="_blank"
            rel="noopener noreferrer"
            title="Cross-check official DOST-PAGASA Flood Forecasting Portal"
            className="text-[10px] font-mono text-text-muted hover:text-cyan-400 bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded border border-border-hairline/60 flex items-center gap-1 transition-colors"
          >
            <span>Verify PAGASA</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          {data?.allDams && data.allDams.length > 0 && (
            <button
              onClick={() => setShowAllDams((prev) => !prev)}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-800/40 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{showAllDams ? "Hide Dams Table" : "Regional Dams (Luzon)"}</span>
              {showAllDams ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <button
            onClick={() => loadRiverBasinData(true)}
            disabled={isRefreshing}
            title="Trigger instant live refresh of hydrological feeds"
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          <span
            className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1",
              isWatch
                ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isWatch ? "bg-amber-400 animate-ping" : data?.isStale ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
              )}
            />
            {data?.isStale ? "Cached Feed" : "Live DOST-PAGASA & GloFAS"}
          </span>
        </div>
      </div>

      {/* 4 Primary Telemetry Stations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stations.map((g) => {
          const isNormal = g.alertLevel === "normal";

          return (
            <div
              key={`station-${g.site_id}`}
              className="bg-black/30 hover:bg-black/40 transition-colors p-3.5 rounded-xl border border-border-hairline/40 flex flex-col justify-between"
            >
              {/* Station Header */}
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-primary line-clamp-1 pr-1" title={g.site_name}>
                  {g.site_name}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                  {g.distKm === 0 ? "Site Outflow" : `${g.distKm} km`}
                </span>
              </div>

              {/* Main Metric Value */}
              <div className="my-1.5">
                <div className="text-[10px] text-text-muted flex items-center justify-between">
                  <span>{g.metric_label}:</span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold px-1.5 py-0.2 rounded border",
                      isNormal
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                    )}
                  >
                    {g.status_label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold font-mono tracking-tight text-cyan-300">
                    {g.value}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted truncate">
                    {g.readable_unit}
                  </span>
                </div>
              </div>

              {/* Station Footer / Observation Meta */}
              <div className="text-[9px] text-text-muted pt-1.5 border-t border-border-hairline/30 font-mono flex items-center justify-between">
                <span
                  className={cn(
                    "font-semibold text-[8px] uppercase tracking-wider",
                    g.isLive ? "text-emerald-400" : "text-cyan-400/80"
                  )}
                >
                  {g.status_badge}
                </span>
                <span className="truncate" title={g.observed_at}>
                  {g.observed_at}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional Regional Dams Table Drawer */}
      {showAllDams && data?.allDams && data.allDams.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-hairline/60 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-text-primary font-semibold">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>DOST-PAGASA Major Luzon Reservoirs Telemetry</span>
            </div>
            <span className="text-[9px] font-mono text-text-muted">
              Source: bagong.pagasa.dost.gov.ph/flood • Synced: {lastSyncTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} PHT
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-border-hairline/50 text-text-muted text-[10px]">
                  <th className="py-1.5 px-2">Dam Name</th>
                  <th className="py-1.5 px-2 text-right">Water Level (RWL)</th>
                  <th className="py-1.5 px-2 text-right">Normal High (NHWL)</th>
                  <th className="py-1.5 px-2 text-right">Buffer Margin</th>
                  <th className="py-1.5 px-2 text-right">24h Dev</th>
                  <th className="py-1.5 px-2 text-center">Spillway Gates</th>
                  <th className="py-1.5 px-2 text-right">Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline/30 text-text-secondary">
                {data.allDams.map((dam) => {
                  const isMagat = dam.name.toLowerCase().includes("magat");
                  const hasGates = dam.gatesOpen > 0;

                  return (
                    <tr
                      key={dam.name}
                      className={cn(
                        "hover:bg-white/[0.02] transition-colors",
                        isMagat && "bg-cyan-950/20 text-cyan-200 font-semibold"
                      )}
                    >
                      <td className="py-1.5 px-2">
                        {dam.fullName} {isMagat && "(Nearest / Isabela)"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-text-primary">
                        {dam.rwl ? `${dam.rwl.toFixed(2)} m` : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-text-muted">
                        {dam.nhwl ? `${dam.nhwl.toFixed(2)} m` : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-1.5 px-2 text-right",
                          dam.deviationNhwl < 0 ? "text-emerald-400" : "text-amber-400"
                        )}
                      >
                        {dam.deviationNhwl !== 0 ? `${dam.deviationNhwl.toFixed(2)} m` : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-text-muted">
                        {dam.deviation24h !== 0 ? `${dam.deviation24h > 0 ? "+" : ""}${dam.deviation24h.toFixed(2)} m` : "0.00 m"}
                      </td>
                      <td
                        className={cn(
                          "py-1.5 px-2 text-center",
                          hasGates ? "text-amber-400 font-bold" : "text-text-muted"
                        )}
                      >
                        {hasGates ? `${dam.gatesOpen} Open` : "Closed"}
                      </td>
                      <td className="py-1.5 px-2 text-right text-text-muted">
                        {dam.outflowCms > 0 ? `${dam.outflowCms.toFixed(1)} cms` : "0.0 cms"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

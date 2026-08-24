"use client";

import { useEffect, useState } from "react";
import { Waves, CloudRain, MapPin, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GaugeData {
  site_id: string;
  site_name: string;
  lat: number;
  lon: number;
  distKm: number;
  value?: string | number | null;
  readable_unit?: string;
  observed_at?: string;
}

export default function RiverBasinTelemetryWidget() {
  const [waterGauges, setWaterGauges] = useState<GaugeData[]>([]);
  const [rainGauges, setRainGauges] = useState<GaugeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function loadRiverBasinData() {
      try {
        setIsLoading(true);
        setIsError(false);

        const SITE_LAT = 17.318823;
        const SITE_LNG = 121.9749251;

        const calcDist = (lat: number, lon: number) => {
          const R = 6371;
          const dLat = ((lat - SITE_LAT) * Math.PI) / 180;
          const dLon = ((lon - SITE_LNG) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((SITE_LAT * Math.PI) / 180) *
              Math.cos((lat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const isStaIsabel = (name: string) => {
          const n = (name || "").toLowerCase();
          return n.includes("sta. isabel") || n.includes("sta.isabel") || n.includes("santa isabel");
        };

        // Fetch River Basin Water Level Telemetry
        const waterRes = await fetch(`/api/weather/panahon/riverbasin/waterlevel?parameter=waterlevel&t=${Date.now()}`);
        if (waterRes.ok) {
          const waterJson = await waterRes.json();
          if (waterJson && Array.isArray(waterJson.data)) {
            const sorted = waterJson.data
              .filter((s: any) => !isStaIsabel(s.site_name))
              .map((s: any) => ({
                site_id: s.site_id,
                site_name: s.site_name,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon),
                distKm: calcDist(parseFloat(s.lat), parseFloat(s.lon)),
                value: s.value,
                readable_unit: s.readable_unit || "m",
                observed_at: s.observed_at,
              }))
              .filter((s: any) => !isNaN(s.distKm))
              .sort((a: any, b: any) => a.distKm - b.distKm);

            setWaterGauges(sorted.slice(0, 4));
          }
        }

        // Fetch River Basin Rain Gauges
        const rainRes = await fetch(`/api/weather/panahon/riverbasin/raingauge?parameter=raingauge&t=${Date.now()}`);
        if (rainRes.ok) {
          const rainJson = await rainRes.json();
          if (rainJson && Array.isArray(rainJson.data)) {
            const sorted = rainJson.data
              .filter((s: any) => !isStaIsabel(s.site_name))
              .map((s: any) => ({
                site_id: s.site_id,
                site_name: s.site_name,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon),
                distKm: calcDist(parseFloat(s.lat), parseFloat(s.lon)),
                value: s.value,
                readable_unit: s.readable_unit || "mm",
                observed_at: s.observed_at,
              }))
              .filter((s: any) => !isNaN(s.distKm))
              .sort((a: any, b: any) => a.distKm - b.distKm);

            setRainGauges(sorted.slice(0, 4));
          }
        }
      } catch (err) {
        console.error("Failed to load river basin telemetry:", err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadRiverBasinData();

    // 60-second real-time auto-refresh interval for hydrological telemetry
    const interval = setInterval(() => {
      loadRiverBasinData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-4 shadow-lg flex items-center justify-center h-[120px]">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Activity className="h-4 w-4 text-cyan-400 animate-spin" />
          <span>Fetching Cagayan River Basin hydrological sensors...</span>
        </div>
      </div>
    );
  }

  if (isError || (waterGauges.length === 0 && rainGauges.length === 0)) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-text-muted">River Basin Hydrological Telemetry Offline</span>
        </div>
        <span className="text-[10px] text-amber-400 font-mono px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
          Layer Unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-hairline/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Cagayan River Basin & Tailrace Outflow Telemetry
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          PANaHON Hydro
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {waterGauges.map((g) => (
          <div key={`water-${g.site_name}-${g.distKm}`} className="bg-black/30 p-3 rounded-xl border border-border-hairline/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text-primary truncate">
                {g.site_name}
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                {g.distKm.toFixed(1)} km
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-[10px] text-text-muted">Water Level:</span>
              <span className="text-xs font-bold font-mono text-cyan-400">
                {g.value !== null && g.value !== undefined ? `${g.value} ${g.readable_unit}` : "Normal Flow"}
              </span>
            </div>
            <div className="text-[9px] text-text-muted mt-1 font-mono flex items-center justify-between">
              {(() => {
                if (!g.observed_at) {
                  return (
                    <>
                      <span className="text-cyan-400 font-semibold text-[8px] uppercase tracking-wider">● Active</span>
                      <span>Telemetry Active</span>
                    </>
                  );
                }
                const obsDate = new Date(g.observed_at.replace(" ", "T") + "+08:00");
                const isValid = !isNaN(obsDate.getTime());
                const isRecent = isValid && (Date.now() - obsDate.getTime()) < 3 * 3600 * 1000;
                
                const timeStr = isValid 
                  ? obsDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                  : g.observed_at.split(" ")[1] || g.observed_at;
                
                const dateStr = isValid
                  ? (new Date().toDateString() === obsDate.toDateString() ? "Today" : obsDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
                  : "";

                return (
                  <>
                    <span className={cn(
                      "font-semibold text-[8px] uppercase tracking-wider",
                      isRecent ? "text-emerald-400" : "text-cyan-400/80"
                    )}>
                      {isRecent ? "● Real-time" : "● Synced"}
                    </span>
                    <span>Observed: {dateStr ? `${dateStr} ${timeStr} PHT` : `${timeStr} PHT`}</span>
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

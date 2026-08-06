"use client";

import { useEffect, useState } from "react";
import { CloudRain, Thermometer, Wind, Droplets, MapPin, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StationData {
  site_id: string;
  site_name: string;
  lat: number;
  lon: number;
  distKm: number;
  parameter?: string;
  value?: string | number | null;
  val24hr?: string | number | null;
  observed_at?: string;
  icon?: string;
  desc?: string;
}

export default function NearestStationWidget() {
  const [nearestAws, setNearestAws] = useState<StationData | null>(null);
  const [nearestSynop, setNearestSynop] = useState<StationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function loadStationData() {
      try {
        setIsLoading(true);
        setIsError(false);

        // Site coords: Tumauini HEPP (17.3188°N, 121.9749°E)
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

        // Fetch AWS rainfall
        const awsRes = await fetch("/api/weather/panahon/aws?parameter=rainfall");
        if (awsRes.ok) {
          const awsJson = await awsRes.json();
          if (awsJson && Array.isArray(awsJson.data)) {
            const sorted = awsJson.data
              .map((s: any) => ({
                site_id: s.site_id,
                site_name: s.site_name,
                lat: parseFloat(s.lat),
                lon: parseFloat(s.lon),
                distKm: calcDist(parseFloat(s.lat), parseFloat(s.lon)),
                value: s.value,
                val24hr: s["24_hr_value"],
                observed_at: s.observed_at,
              }))
              .filter((s: any) => !isNaN(s.distKm))
              .sort((a: any, b: any) => a.distKm - b.distKm);

            if (sorted.length > 0) {
              setNearestAws(sorted[0]);
            }
          }
        }

        // Fetch SYNOP observed weather
        const synopRes = await fetch("/api/weather/panahon/synop?parameter=observed_weather");
        if (synopRes.ok) {
          const synopJson = await synopRes.json();
          if (synopJson && Array.isArray(synopJson.data)) {
            const sorted = synopJson.data
              .map((s: any) => {
                let parsedVal: any = {};
                try {
                  parsedVal = typeof s.value === "string" ? JSON.parse(s.value) : s.value;
                } catch {
                  parsedVal = {};
                }
                return {
                  site_id: s.site_id,
                  site_name: s.site_name,
                  lat: parseFloat(s.lat),
                  lon: parseFloat(s.lon),
                  distKm: calcDist(parseFloat(s.lat), parseFloat(s.lon)),
                  icon: parsedVal.icon,
                  desc: parsedVal.desc,
                  observed_at: s.observed_at,
                };
              })
              .filter((s: any) => !isNaN(s.distKm))
              .sort((a: any, b: any) => a.distKm - b.distKm);

            if (sorted.length > 0) {
              setNearestSynop(sorted[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load nearest station data:", err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadStationData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-5 shadow-lg flex items-center justify-center h-[140px]">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Activity className="h-4 w-4 text-flow-teal animate-spin" />
          <span>Locating nearest PAGASA weather station...</span>
        </div>
      </div>
    );
  }

  if (isError || (!nearestAws && !nearestSynop)) {
    return (
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-xs text-text-muted">PAGASA Station Data Unavailable</span>
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
          <MapPin className="h-4 w-4 text-flow-teal" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Nearest PAGASA Site Weather Station
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          PAGASA PANaHON Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nearest Automatic Weather Station (AWS) */}
        {nearestAws && (
          <div className="bg-black/30 rounded-xl p-3.5 border border-border-hairline/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-primary truncate max-w-[200px]">
                {nearestAws.site_name}
              </span>
              <span className="text-[10px] font-mono text-flow-teal">
                {nearestAws.distKm.toFixed(1)} km away
              </span>
            </div>
            <p className="text-[10px] text-text-muted mb-3 font-mono">
              AWS Station • ID: {nearestAws.site_id}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#131E24] p-2 rounded-lg border border-border-hairline/30 flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-text-muted">1-Hr Rain</div>
                  <div className="text-xs font-bold text-text-primary font-mono">
                    {nearestAws.value !== null ? `${nearestAws.value} mm` : "0.0 mm"}
                  </div>
                </div>
              </div>

              <div className="bg-[#131E24] p-2 rounded-lg border border-border-hairline/30 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-text-muted">24-Hr Accu.</div>
                  <div className="text-xs font-bold text-text-primary font-mono">
                    {nearestAws.val24hr !== null ? `${nearestAws.val24hr} mm` : "0.0 mm"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nearest Synoptic Station (SYNOP) */}
        {nearestSynop && (
          <div className="bg-black/30 rounded-xl p-3.5 border border-border-hairline/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-primary truncate max-w-[200px]">
                  {nearestSynop.site_name}
                </span>
                <span className="text-[10px] font-mono text-flow-teal">
                  {nearestSynop.distKm.toFixed(1)} km away
                </span>
              </div>
              <p className="text-[10px] text-text-muted mb-2 font-mono">
                Synoptic Observation • Station #{nearestSynop.site_id}
              </p>
            </div>

            <div className="bg-[#131E24] p-2.5 rounded-lg border border-border-hairline/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {nearestSynop.icon ? (
                  <img src={nearestSynop.icon} alt="Weather" className="w-7 h-7 object-contain" />
                ) : (
                  <CloudRain className="h-5 w-5 text-flow-teal" />
                )}
                <div>
                  <div className="text-xs font-medium text-text-primary">
                    {nearestSynop.desc || "Synoptic Sky Observation"}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono">
                    Observed: {nearestSynop.observed_at || "Recent"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

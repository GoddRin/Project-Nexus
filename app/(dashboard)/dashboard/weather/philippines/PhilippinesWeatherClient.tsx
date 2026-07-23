"use client";

import { useState, useEffect } from "react";
import type { PagasaSignalData } from "@/lib/weather/pagasa";
import dynamic from "next/dynamic";
import { 
  Wind, 
  Droplet, 
  CloudRain, 
  Compass, 
  Activity, 
  AlertOctagon, 
  Map, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Waves,
  Cloud,
  Thermometer,
  Zap,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import Leaflet map to avoid server-side window errors
const TyphoonMap = dynamic(() => import("@/components/weather/TyphoonMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] bg-[#0B1418] rounded-2xl border border-border-hairline flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Activity className="h-8 w-8 text-flow-teal animate-pulse" />
        <span className="text-xs text-text-muted">Loading satellite tracker...</span>
      </div>
    </div>
  ),
});

interface StormForecast {
  time: string;
  lat: number;
  lng: number;
  windKph: number;
}

interface Storm {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  windSpeedKnots: number;
  windSpeedKph: number;
  pressureHpa: number;
  direction: string;
  speedKph: number;
  distanceKm: number;
  closestApproach: {
    distanceKm: number;
    eta: string;
  };
  forecast: StormForecast[];
  pastTrack?: { lat: number; lng: number; hoursAgo: number }[];
  uncertaintyCone: { lat: number; lng: number }[];
  windRadii: {
    r34: number;
    r50: number;
    r64: number;
  };
  pubDate?: string;
}

interface PhilippinesWeatherClientProps {
  localWindSpeed: number;
  localPressure: number;
  initialStorms: Storm[];
  initialPagasaSignals: PagasaSignalData;
  apiKey: string;
}

type WindyLayer = "wind" | "rain" | "rainAccu" | "pressure" | "waves" | "cloudsRain" | "temp";

interface LayerButton {
  value: WindyLayer;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LAYER_BUTTONS: LayerButton[] = [
  { value: "wind", label: "Wind Flow", icon: Wind },
  { value: "rain", label: "Rain Forecast", icon: CloudRain },
  { value: "rainAccu", label: "Rain Accu.", icon: Droplet },
  { value: "pressure", label: "Baro. Pressure", icon: Compass },
  { value: "waves", label: "Sea Waves", icon: Waves },
  { value: "cloudsRain", label: "Clouds/Rain", icon: Cloud },
  { value: "temp", label: "Air Temp.", icon: Thermometer },
];

const formatPubDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const phtTime = date.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" });
    const phtDate = date.toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
    return `${phtDate} ${phtTime} PHT (${date.toUTCString().replace("GMT", "UTC")})`;
  } catch {
    return dateStr;
  }
};

export default function PhilippinesWeatherClient({
  localWindSpeed,
  localPressure,
  initialStorms,
  initialPagasaSignals,
  apiKey,
}: PhilippinesWeatherClientProps) {
  const [currentLayer, setCurrentLayer] = useState<WindyLayer>("wind");
  const [storms, setStorms] = useState<Storm[]>(initialStorms);
  const [pagasaSignals, setPagasaSignals] = useState<PagasaSignalData>(initialPagasaSignals);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedStormId, setExpandedStormId] = useState<string | null>(null);
  const [forceMock, setForceMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  // Live site conditions — initialized from SSR props, refreshed client-side
  const [windSpeed, setWindSpeed] = useState<number>(localWindSpeed);
  const [pressure, setPressure] = useState<number>(localPressure);
  const [conditionsSource, setConditionsSource] = useState<string>("open-meteo");
  const [conditionsUpdatedAt, setConditionsUpdatedAt] = useState<Date>(() => new Date());
  const [isConditionsRefreshing, setIsConditionsRefreshing] = useState(false);

  console.log("Client Render: storms =", storms.length, "| PAGASA signal =", pagasaSignals.siteSignalNumber, "| TC =", pagasaSignals.tcName);

  // Set first storm expanded by default if available
  useEffect(() => {
    if (storms.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedStormId(storms[0].id);
    }
  }, [storms]);

  // Fetch live site conditions (wind speed + pressure) from the API
  const refreshConditions = async () => {
    setIsConditionsRefreshing(true);
    try {
      const res = await fetch(`/api/weather/conditions?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wind_speed_10m !== null && data.wind_speed_10m !== undefined) {
          setWindSpeed(data.wind_speed_10m);
        }
        if (data.pressure_msl !== null && data.pressure_msl !== undefined) {
          setPressure(data.pressure_msl);
        }
        setConditionsSource(data.source ?? "open-meteo");
        setConditionsUpdatedAt(new Date());
      }
    } catch (err) {
      console.error("Error refreshing site conditions:", err);
    } finally {
      setIsConditionsRefreshing(false);
    }
  };

  const handleRefresh = async (useMock = false) => {
    setIsRefreshing(true);
    try {
      // Refresh storms, PAGASA signals, and live site conditions in parallel
      const [stormRes, pagasaRes] = await Promise.all([
        fetch(`/api/weather/typhoons?t=${Date.now()}${useMock ? "&mock=true" : ""}`, { cache: "no-store" }),
        fetch(`/api/weather/pagasa-signals?t=${Date.now()}`, { cache: "no-store" }),
      ]);
      if (stormRes.ok) {
        const data = await stormRes.json();
        setStorms(data.storms || []);
        setForceMock(useMock);
        setLastUpdated(new Date());
      }
      if (pagasaRes.ok) {
        const pData = await pagasaRes.json();
        setPagasaSignals(pData);
      }
      // Also refresh conditions on every manual refresh
      await refreshConditions();
    } catch (err) {
      console.error("Error refreshing weather data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // On mount: immediately fetch fresh conditions client-side
  // (the SSR value may be stale by the time the page hydrates)
  useEffect(() => {
    refreshConditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh site conditions every 10 minutes
  useEffect(() => {
    const conditionsInterval = setInterval(() => {
      refreshConditions();
    }, 600000); // 10 minutes
    return () => clearInterval(conditionsInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh JTWC storm data every 5 minutes
  useEffect(() => {
    const stormInterval = setInterval(() => {
      handleRefresh(forceMock);
    }, 300000); // 5 minutes for storms

    return () => clearInterval(stormInterval);
  }, [forceMock]);

  // Determine closest storm to Tumauini HEPP (within 1500km for alert banner)
  const siteAlertStorm = storms.find(s => s.distanceKm <= 1500) 
    || (pagasaSignals.hasActiveBulletin && storms.length > 0 ? storms[0] : undefined);

  // Use REAL PAGASA signal number from the official bulletin
  // Falls back to JTWC-derived estimate only if PAGASA scrape fails
  const signalNumber = pagasaSignals.source === "pagasa" 
    ? pagasaSignals.siteSignalNumber
    : (siteAlertStorm 
      ? (() => {
          const w = siteAlertStorm.windSpeedKph;
          if (w > 185) return 4;
          if (w >= 121) return 3;
          if (w >= 61) return 2;
          if (w >= 30) return 1;
          return 0;
        })()
      : 0);

  // Determine if we should show an alert (PAGASA has bulletin OR storm is close)
  const showAlert = pagasaSignals.hasActiveBulletin || (siteAlertStorm !== undefined);

  // Render Category colored tags
  const getCategoryClass = (category: string, knots: number) => {
    const cat = category.toLowerCase();
    if (cat.includes("depression")) {
      return "bg-flow-teal/15 text-flow-teal border-flow-teal/30";
    }
    if (cat.includes("storm")) {
      return "bg-signal-amber/15 text-signal-amber border-signal-amber/30";
    }
    if (cat.includes("super") || knots >= 130) {
      return "bg-red-600/20 text-[#FF2040] border-[#FF2040]/30 animate-pulse";
    }
    return "bg-signal-red/15 text-signal-red border-signal-red/30";
  };

  const getPAGASASignalLabel = (sigNum: number) => {
    if (sigNum === 0 && pagasaSignals.hasActiveBulletin) return "Monitoring";
    if (sigNum === 0) return "No Signal";
    if (sigNum >= 4) return `Signal #${sigNum} (Super Typhoon)`;
    return `Signal #${sigNum}`;
  };

  // Generate Windy Embed src URL
  const getWindyEmbedUrl = () => {
    return `https://embed.windy.com/embed2.html?lat=12&lon=122&zoom=5&level=surface&overlay=${currentLayer}&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&key=${apiKey}`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ALERT BANNER (Conditional, top of page — shows if PAGASA has bulletin OR storm within range) */}
      {showAlert && (
        <div className={cn(
          "w-full rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in",
          signalNumber >= 3 
            ? "bg-signal-red/10 border border-signal-red/30 shadow-[0_4px_24px_rgba(220,38,38,0.15)]" 
            : signalNumber >= 1 
              ? "bg-signal-amber/10 border border-signal-amber/30 shadow-[0_4px_24px_rgba(232,163,61,0.1)]" 
              : "bg-flow-teal/10 border border-flow-teal/30 shadow-[0_4px_24px_rgba(31,182,166,0.1)]"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border animate-pulse",
              signalNumber >= 3 ? "bg-signal-red/20 border-signal-red/40" : signalNumber >= 1 ? "bg-signal-amber/20 border-signal-amber/40" : "bg-flow-teal/20 border-flow-teal/40"
            )}>
              <AlertOctagon className={cn(
                "h-6 w-6",
                signalNumber >= 3 ? "text-signal-red" : signalNumber >= 1 ? "text-signal-amber" : "text-flow-teal"
              )} />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text-primary flex items-center gap-2">
                {pagasaSignals.hasActiveBulletin ? "PAGASA TROPICAL CYCLONE ALERT" : "ACTIVE SITE ALERT"}
                {signalNumber > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold text-white rounded uppercase tracking-wider",
                    signalNumber >= 3 ? "bg-signal-red" : "bg-signal-amber"
                  )}>
                    TCWS #{signalNumber}
                  </span>
                )}
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                {pagasaSignals.hasActiveBulletin ? (
                  <>
                    {pagasaSignals.tcCategory} <span className="font-semibold text-signal-red">{pagasaSignals.tcName}</span>
                    {pagasaSignals.position?.description && (
                      <> — {pagasaSignals.position.description}</>  
                    )}
                    {pagasaSignals.maxWindsKph > 0 && (
                      <>, max winds <span className="font-semibold text-text-primary">{pagasaSignals.maxWindsKph} kph</span></>
                    )}
                    {pagasaSignals.movement && (
                      <>, moving <span className="font-semibold text-text-primary">{pagasaSignals.movement}</span></>
                    )}.
                    {signalNumber > 0 && (
                      <> <span className="font-semibold text-signal-amber">TCWS #{signalNumber}</span> raised over Isabela.</>
                    )}
                  </>
                ) : siteAlertStorm ? (
                  <>
                    Typhoon <span className="font-semibold text-signal-red">{siteAlertStorm.name}</span> is currently{" "}
                    <span className="font-semibold text-text-primary">{siteAlertStorm.distanceKm}km</span> away from Tumauini HEPP with sustained winds of{" "}
                    <span className="font-semibold text-text-primary">{siteAlertStorm.windSpeedKph} kph</span>.
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {siteAlertStorm && (
              <span className="text-xs font-mono bg-bg-panel px-3 py-1.5 rounded-lg border border-border-hairline font-bold text-text-primary">
                CPA: {siteAlertStorm.closestApproach.distanceKm}km
              </span>
            )}
            {siteAlertStorm && (
              <button 
                onClick={() => {
                  if (siteAlertStorm) setExpandedStormId(siteAlertStorm.id);
                  document.getElementById("storm-details")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-md transition-all cursor-pointer",
                  signalNumber >= 3 ? "bg-signal-red hover:bg-signal-red/90 shadow-signal-red/20" : "bg-signal-amber hover:bg-signal-amber/90 shadow-signal-amber/20"
                )}
              >
                Analyze Track
              </button>
            )}
          </div>
        </div>
      )}

      {/* Developer helper toggle to preview mock/real data */}
      <div className="flex justify-between items-center bg-bg-panel/40 border border-border-hairline p-3 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-flow-teal animate-pulse"></div>
            <span className="text-xs text-text-muted">Storms: <span className="font-semibold text-text-primary uppercase">{forceMock ? "Demo Mock" : "JTWC Live"}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", pagasaSignals.source === "pagasa" ? "bg-green-500 animate-pulse" : "bg-signal-amber")}></div>
            <span className="text-xs text-text-muted">Signals: <span className={cn("font-semibold uppercase", pagasaSignals.source === "pagasa" ? "text-green-500" : "text-signal-amber")}>{pagasaSignals.source === "pagasa" ? "PAGASA Live" : "Unavailable"}</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRefresh(false)}
            disabled={isRefreshing}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
              !forceMock 
                ? "bg-flow-teal/10 border-flow-teal/30 text-flow-teal" 
                : "bg-transparent border-border-hairline text-text-muted hover:text-text-primary"
            )}
          >
            Live JTWC
          </button>
          <button
            onClick={() => handleRefresh(true)}
            disabled={isRefreshing}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
              forceMock 
                ? "bg-flow-teal/10 border-flow-teal/30 text-flow-teal" 
                : "bg-transparent border-border-hairline text-text-muted hover:text-text-primary"
            )}
          >
            Simulate Typhoon
          </button>
        </div>
      </div>

      {/* 2. KPI CARDS ROW (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Wind speed at Tumauini — live, client-refreshed */}
        <div className="p-5 rounded-2xl bg-bg-panel border border-border-hairline shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Site Wind Speed</span>
            <Wind className={cn("h-4 w-4 text-flow-teal", isConditionsRefreshing && "animate-spin")} />
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-text-primary">
              {windSpeed.toFixed(1)}
            </span>
            <span className="text-xs text-text-muted ml-1">km/h</span>
          </div>
          <span className="text-[9px] text-text-muted mt-1 font-mono">
            {conditionsUpdatedAt.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })} PHT
          </span>
        </div>

        {/* KPI 2: Atmos pressure at Tumauini — live, client-refreshed */}
        <div className="p-5 rounded-2xl bg-bg-panel border border-border-hairline shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Site Pressure (MSLP)</span>
            <Compass className={cn("h-4 w-4 text-flow-teal", isConditionsRefreshing && "animate-pulse")} />
          </div>
          <div className="mt-2">
            <span className="font-display text-2xl font-bold tracking-tight text-text-primary font-mono">
              {pressure.toFixed(0)}
            </span>
            <span className="text-xs text-text-muted ml-1">hPa</span>
          </div>
          <span className="text-[9px] text-text-muted mt-1 font-mono">
            {conditionsSource === "wttr" ? "wttr.in" : "Open-Meteo"} • live
          </span>
        </div>

        {/* KPI 3: Active Cyclones */}
        <div className="p-5 rounded-2xl bg-bg-panel border border-border-hairline shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Active storms (PAR)</span>
            <Activity className="h-4 w-4 text-signal-amber" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-text-primary">
              {storms.length}
            </span>
            {storms.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-signal-red animate-ping inline-block"></span>
            )}
          </div>
        </div>

        {/* KPI 4: PAGASA Signal — Now using real PAGASA bulletin data */}
        <div className={cn(
          "p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between h-28",
          signalNumber >= 3 ? "bg-signal-red/5 border-signal-red/30" :
          signalNumber >= 1 ? "bg-signal-amber/5 border-signal-amber/30" :
          "bg-bg-panel border-border-hairline"
        )}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Isabela Signal Alert</span>
            <AlertTriangle className={cn(
              "h-4 w-4",
              signalNumber >= 3 ? "text-signal-red animate-bounce" :
              signalNumber >= 1 ? "text-signal-amber animate-bounce" : "text-text-muted"
            )} />
          </div>
          <div className="mt-1">
            <span className={cn(
              "font-display text-lg font-bold tracking-tight block",
              signalNumber >= 3 ? "text-signal-red" :
              signalNumber >= 1 ? "text-signal-amber" : "text-text-primary"
            )}>
              {getPAGASASignalLabel(signalNumber)}
            </span>
            {pagasaSignals.hasActiveBulletin && pagasaSignals.tcName && (
              <span className="text-[10px] text-text-muted">
                TC {pagasaSignals.tcName} • <span className="text-green-500">PAGASA Live</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN MAP AREA (two-panel layout side by side) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT PANEL — Windy Embed (65% width equivalent) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold tracking-wide text-text-primary text-sm flex items-center gap-2">
              <Map className="h-4 w-4 text-flow-teal" /> Interactive Weather Satellite Overlay
            </h3>
            
            {/* Custom layer buttons */}
            <div className="flex flex-wrap gap-1 bg-black/[0.04] dark:bg-white/[0.04] p-1 rounded-xl border border-border-hairline">
              {LAYER_BUTTONS.map(btn => {
                const BtnIcon = btn.icon;
                const isActive = currentLayer === btn.value;
                return (
                  <button
                    key={btn.value}
                    onClick={() => setCurrentLayer(btn.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      isActive 
                        ? "bg-flow-teal/10 text-flow-teal border border-flow-teal/20" 
                        : "bg-transparent border border-transparent text-text-muted hover:text-text-primary"
                    )}
                  >
                    <BtnIcon className="h-3.5 w-3.5" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iframe element (cropped to hide watermarks) */}
          <div className="relative w-full h-[550px] rounded-2xl overflow-hidden border border-border-hairline shadow-lg bg-[#0B1418]">
            <iframe
              key={currentLayer} // Force iframe reload when overlay parameter updates
              src={getWindyEmbedUrl()}
              className="absolute w-full border-none"
              style={{
                top: "-40px",
                height: "calc(100% + 40px)", /* Crops 40px from top to hide watermark but keeps bottom timeline visible */
                left: 0,
              }}
              title="Interactive Weather Map Embed"
              allowFullScreen
            ></iframe>
            
            {/* Watermark Obfuscator: Hides the Windy text watermark above the color scale on the right, without blocking the timeline on the left */}
            <div className="absolute bottom-[16px] right-0 w-[400px] h-[24px] bg-gradient-to-r from-transparent via-[#0B1418]/80 to-[#0B1418] backdrop-blur-[2px] pointer-events-none z-10" />
          </div>
        </div>

        {/* RIGHT PANEL — Leaflet Typhoon Tracker (35% width equivalent) */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="font-display font-semibold tracking-wide text-text-primary text-sm flex items-center gap-2">
            <Compass className="h-4 w-4 text-flow-teal" /> Storm Track & uncertainty Cone
          </h3>
          <TyphoonMap storms={storms} lastUpdated={lastUpdated} />
        </div>
      </div>

      {/* 4. STORM DETAILS PANEL */}
      <div id="storm-details" className="glass-card p-6 scroll-mt-6">
        <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2 mb-6">
          <AlertOctagon className="h-4 w-4 text-flow-teal" /> Tropical Cyclone Analysis Briefing
        </h3>

        {storms.length > 0 ? (
          <div className="space-y-4">
            {storms.map((storm) => {
              const isExpanded = expandedStormId === storm.id;
              return (
                <div 
                  key={storm.id} 
                  className="border border-border-hairline rounded-2xl overflow-hidden transition-all bg-black/[0.01] dark:bg-white/[0.01]"
                >
                  {/* Card Header Accordion Trigger */}
                  <div 
                    onClick={() => setExpandedStormId(isExpanded ? null : storm.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0",
                        getCategoryClass(storm.category, storm.windSpeedKnots)
                      )}>
                        {storm.category}
                      </span>
                      <div className="flex flex-col">
                        <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-1.5 leading-tight">
                          {storm.name} <span className="font-mono text-xs font-semibold text-text-muted">({storm.id})</span>
                        </h4>
                        {storm.pubDate && (
                          <span className="text-[10px] text-text-muted font-medium mt-0.5">
                            Warning: {formatPubDate(storm.pubDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase font-bold text-text-muted tracking-wider leading-none">Distance</p>
                        <p className="text-sm font-semibold text-text-primary mt-1 font-mono">{storm.distanceKm} km</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border-hairline bg-black/[0.02] dark:bg-white/[0.02] space-y-6">
                      
                      {/* Metric Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-bg-panel border border-border-hairline rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Position</span>
                          <span className="text-sm font-semibold text-text-primary font-mono mt-1 block">
                            {storm.lat.toFixed(2)}&deg;N, {storm.lng.toFixed(2)}&deg;E
                          </span>
                        </div>
                        <div className="p-3 bg-bg-panel border border-border-hairline rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Max Winds</span>
                          <span className="text-sm font-semibold text-text-primary mt-1 block">
                            {storm.windSpeedKph} kph <span className="text-xs text-text-muted font-mono">({storm.windSpeedKnots} kts)</span>
                          </span>
                        </div>
                        <div className="p-3 bg-bg-panel border border-border-hairline rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Central Pressure</span>
                          <span className="text-sm font-semibold text-text-primary font-mono mt-1 block">
                            {storm.pressureHpa} hPa
                          </span>
                        </div>
                        <div className="p-3 bg-bg-panel border border-border-hairline rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Move Direction & Speed</span>
                          <span className="text-sm font-semibold text-text-primary mt-1 block">
                            {storm.direction} @ {storm.speedKph} kph
                          </span>
                        </div>
                      </div>

                      {/* Distance / ETA Analysis Banner */}
                      <div className="p-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Info className="h-5 w-5 text-flow-teal shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-text-primary">Closest Point of Approach (CPA) forecast to Tumauini HEPP</p>
                            <p className="text-xs text-text-muted mt-0.5">Calculated based on storm coordinates and projected speed vectors.</p>
                          </div>
                        </div>
                        <div className="flex gap-4 shrink-0 font-mono text-sm">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-sans">Min Distance</span>
                            <span className="font-bold text-text-primary">{storm.closestApproach.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-sans">ETA (Est. Arrival)</span>
                            <span className="font-bold text-text-primary">
                              {new Date(storm.closestApproach.eta).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Forecast track table */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                          Official Tropical Cyclone Forecast Profile
                        </h5>
                        <div className="overflow-x-auto border border-border-hairline rounded-xl bg-bg-panel">
                          <table className="min-w-full divide-y divide-border-hairline">
                            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
                              <tr>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase font-sans">Forecast Interval</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase font-sans">Coordinates</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase font-sans">Max Wind Speed</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase font-sans">Classification</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-hairline font-mono text-xs text-text-primary">
                              {storm.forecast.map((fc, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2.5 font-sans font-semibold text-text-muted">{fc.time}</td>
                                  <td className="px-4 py-2.5">{fc.lat.toFixed(1)}&deg;N, {fc.lng.toFixed(1)}&deg;E</td>
                                  <td className="px-4 py-2.5">{fc.windKph} kph</td>
                                  <td className="px-4 py-2.5 font-sans">
                                    <span className={cn(
                                      "inline-block px-2 py-0.5 rounded text-[10px] font-bold border",
                                      fc.windKph > 185 ? "bg-red-600/10 text-red-500 border-red-500/20" :
                                      fc.windKph >= 121 ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                      fc.windKph >= 61 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                      "bg-teal-500/10 text-teal-500 border-teal-500/20"
                                    )}>
                                      {fc.windKph > 185 ? "Super Typhoon" :
                                       fc.windKph >= 121 ? "Typhoon" :
                                       fc.windKph >= 61 ? "Tropical Storm" : "Tropical Depression"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : pagasaSignals.hasActiveBulletin ? (
          <div className="flex flex-col items-center justify-center py-12 bg-signal-amber/5 border border-signal-amber/20 rounded-2xl text-center">
            <AlertTriangle className="h-10 w-10 text-signal-amber mb-3" />
            <h4 className="font-display font-bold text-sm text-text-primary">PAGASA Active Bulletin — No JTWC Track Available</h4>
            <p className="text-xs text-text-muted max-w-sm mt-1">
              PAGASA has issued bulletins for {pagasaSignals.tcCategory} <strong>{pagasaSignals.tcName}</strong>
              {pagasaSignals.siteSignalNumber > 0 && <> with <strong className="text-signal-amber">TCWS #{pagasaSignals.siteSignalNumber}</strong> raised over Isabela</>}.
              JTWC storm tracking data is currently unavailable. Signal data sourced directly from PAGASA.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-black/[0.01] dark:bg-white/[0.01] border border-dashed border-border-hairline rounded-2xl text-center">
            <CheckCircle className="h-10 w-10 text-flow-teal mb-3" />
            <h4 className="font-display font-bold text-sm text-text-primary">Philippine Area of Responsibility (PAR) Clear</h4>
            <p className="text-xs text-text-muted max-w-sm mt-1">
              There is currently no active tropical depression, storm, or typhoon activity within warning range of Tumauini HEPP operations.
            </p>
          </div>
        )}
      </div>

      {/* 5. HISTORICAL TYPHOON CONTEXT */}
      <div className="glass-card p-6">
        <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2 mb-6">
          <Info className="h-4 w-4 text-flow-teal" /> Operations Regional Climatology Context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-flow-teal" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Typhoon Exposure</h4>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Isabela and the Cagayan Valley region are situated along the northeast seaboard of Luzon. This region is highly exposed to Pacific tropical cyclones, which typically track West-Northwest (WNW) towards landfall. Peak typhoon activity is observed from <strong>June to November</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-flow-teal" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">PAGASA Warning System</h4>
            </div>
            <ul className="text-xs text-text-muted space-y-1.5">
              <li>• <span className="font-semibold text-text-primary">Signal 1:</span> 30-60 kph winds. Secure light structures.</li>
              <li>• <span className="font-semibold text-text-primary">Signal 2:</span> 61-120 kph winds. Secure scaffolding and high assets.</li>
              <li>• <span className="font-semibold text-text-primary">Signal 3:</span> 121-185 kph winds. Halt all tower & elevated works.</li>
              <li>• <span className="font-semibold text-text-primary">Signal 4+:</span> &gt;185 kph winds. Secure powerhouse, evacuations.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-flow-teal" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">PAGASA Site Station</h4>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              The nearest PAGASA meteorological monitoring station is located at <strong>Cabarroguis, Quirino</strong>, and the regional forecasting radar is at <strong>Basco, Batanes</strong>. In-situ wind sensors at Tumauini HEPP feed live alerts directly into the Project Nexus dashboard.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

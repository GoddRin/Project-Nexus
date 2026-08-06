"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, ImageOverlay, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

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
  pastTrack?: { lat: number; lng: number; hoursAgo: number; time?: string; type?: string }[];
  uncertaintyCone: { lat: number; lng: number }[];
  windRadii: {
    r34: number;
    r50: number;
    r64: number;
  };
  pubDate?: string;
}

/**
 * Creates custom PAGASA letter-badge markers (L for LPA, D for TD, TS, STS, TY, STY)
 * with control-room gradients, glowing halos, and dynamic ripple animations.
 */
function createLetterBadgeIcon(
  type: string = "TD",
  timeLabel?: string,
  isFirst: boolean = false,
  isLatest: boolean = false
) {
  const t = (type || "TD").toUpperCase();
  let badgeLetter = "D";
  let bgGradient = "bg-gradient-to-br from-sky-400 to-cyan-700 text-white border-sky-300 shadow-[0_0_12px_rgba(2,132,199,0.7)]";

  if (t === "LPA" || t === "L") {
    badgeLetter = "L";
    bgGradient = "bg-gradient-to-br from-blue-500 to-indigo-700 text-white border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.75)]";
  } else if (t === "TD" || t === "D") {
    badgeLetter = "D";
    bgGradient = "bg-gradient-to-br from-sky-400 to-cyan-700 text-white border-sky-300 shadow-[0_0_12px_rgba(2,132,199,0.75)]";
  } else if (t === "TS" || t === "S") {
    badgeLetter = "TS";
    bgGradient = "bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 font-black border-yellow-200 shadow-[0_0_14px_rgba(234,179,8,0.85)]";
  } else if (t === "STS") {
    badgeLetter = "STS";
    bgGradient = "bg-gradient-to-br from-orange-400 to-amber-600 text-white border-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.85)]";
  } else if (t === "TY" || t === "T") {
    badgeLetter = "TY";
    bgGradient = "bg-gradient-to-br from-red-500 to-rose-700 text-white border-red-200 shadow-[0_0_16px_rgba(239,68,68,0.9)]";
  } else if (t === "STY" || t === "ST") {
    badgeLetter = "STY";
    bgGradient = "bg-gradient-to-br from-pink-500 to-purple-800 text-white border-pink-200 shadow-[0_0_18px_rgba(236,72,153,0.95)]";
  }

  // Format timestamp label (e.g. "08-01 20:00")
  let formattedTime = "";
  if (timeLabel) {
    const m = timeLabel.match(/\d{4}-(\d{2}-\d{2}\s+\d{2}:\d{2})/);
    formattedTime = m ? m[1] : timeLabel;
  }

  const html = `
    <div class="relative flex items-center justify-center pointer-events-auto group">
      ${
        isLatest
          ? `<div class="absolute w-7 h-7 rounded-full border border-teal-400/80 animate-ping pointer-events-none"></div>`
          : ""
      }
      <div class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border ${bgGradient} transition-transform duration-200 group-hover:scale-125">
        ${badgeLetter}
      </div>
      ${
        formattedTime && (isFirst || isLatest)
          ? `<div class="absolute left-6 whitespace-nowrap bg-slate-950/95 text-flow-teal font-mono text-[9px] px-2 py-0.5 rounded-md border border-flow-teal/40 shadow-xl flex items-center gap-1.5 backdrop-blur-md">
              <span class="w-1.5 h-1.5 rounded-full bg-flow-teal animate-pulse"></span>
              <span>${formattedTime} PHT</span>
            </div>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: "cyclone-letter-badge",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export interface PanahonStation {
  site_id: string;
  site_name: string;
  lat: number;
  lon: number;
  value?: string | number | null;
  parameter?: string;
  readable_parameter?: string;
  readable_unit?: string;
  observed_at?: string;
  icon?: string;
  desc?: string;
}

export interface PanahonLightning {
  lat: number;
  lon: number;
  amplitude: number;
  observed_at: string;
  readable_parameter: string;
}

interface TyphoonMapProps {
  storms: Storm[];
  lastUpdated?: string | Date;
  panahonSynop?: PanahonStation[];
  panahonAws?: PanahonStation[];
  panahonLightning?: PanahonLightning[];
  panahonRiverBasin?: PanahonStation[];
  panahonOverlayUrl?: string | null;
  panahonOverlayBounds?: [[number, number], [number, number]];
  panahonSourceStatus?: "live" | "cached" | "unavailable";
}

// Map controller — default centered on entire Philippines (Luzon, Visayas, Mindanao)
function MapRecenter() {
  const map = useMap();

  useEffect(() => {
    try {
      if (!map || !map.getContainer()) return;
      map.setView([12.8, 121.8], 5);
    } catch {
      // Ignore transient setView errors during unmount/Fast Refresh
    }
  }, [map]);

  return null;
}

export default function TyphoonMap({
  storms,
  lastUpdated,
  panahonSynop = [],
  panahonAws = [],
  panahonLightning = [],
  panahonRiverBasin = [],
  panahonOverlayUrl,
  panahonOverlayBounds = [[-10, 90], [31.8, 160]],
  panahonSourceStatus = "live",
}: TyphoonMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const container = mapContainerRef.current;
    return () => {
      if (container) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  // Station Icons
  const synopIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "panahon-synop-pin",
      html: `<div class="w-3 h-3 rounded-full bg-sky-500 border border-white shadow-md"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }, []);

  const awsIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "panahon-aws-pin",
      html: `<div class="w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-md"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }, []);

  // Dynamic Time-Decayed Lightning Strike Icon Factory
  const getLightningIcon = useMemo(() => {
    const iconCache: Record<string, L.DivIcon> = {};
    return (ageMinutes: number) => {
      let opacity = 1.0;
      let colorClass = "bg-amber-400 text-slate-900 border-white animate-pulse shadow-amber-400/50";
      if (ageMinutes > 60) {
        opacity = 0.3;
        colorClass = "bg-amber-700/60 text-slate-300 border-slate-500";
      } else if (ageMinutes > 30) {
        opacity = 0.6;
        colorClass = "bg-amber-500/80 text-slate-900 border-amber-200";
      }

      const key = `${opacity}-${colorClass}`;
      if (!iconCache[key]) {
        iconCache[key] = L.divIcon({
          className: "panahon-lightning-pin",
          html: `<div style="opacity: ${opacity};" class="flex items-center justify-center w-4 h-4 rounded-full border text-[9px] font-bold shadow-lg ${colorClass}">⚡</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
      }
      return iconCache[key];
    };
  }, []);

  const riverIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "panahon-river-pin",
      html: `<div class="w-3 h-3 rounded-full bg-cyan-400 border border-white shadow-md"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }, []);

  // Custom DivIcon for Tumauini HEPP Site Pin
  const siteIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return L.divIcon({
      className: "custom-site-pin",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-teal-500/20 animate-ping"></div>
          <div class="absolute w-5 h-5 rounded-full bg-teal-500/40 animate-pulse"></div>
          <div class="w-3.5 h-3.5 rounded-full bg-[#1FB6A6] border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  // Memoized storm icon factory to keep icon references stable across re-renders
  const getStormIcon = useMemo(() => {
    const iconCache: Record<string, L.DivIcon> = {};
    return (stormColor: string) => {
      if (!iconCache[stormColor]) {
        iconCache[stormColor] = L.divIcon({
          className: "custom-storm-pin",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 rounded-full animate-ping" style="background-color: ${stormColor}; opacity: 0.18;"></div>
              <div class="absolute w-7 h-7 rounded-full animate-pulse" style="background-color: ${stormColor}; opacity: 0.35;"></div>
              <div class="w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-[9px] font-bold" style="background-color: ${stormColor};">
                🌀
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      }
      return iconCache[stormColor];
    };
  }, []);

  if (!isMounted) return null;

  // Helper to get category-based colors
  const getCategoryColor = (category: string, windKnots: number) => {
    const cat = category.toLowerCase();
    if (cat.includes("depression")) return "#1FB6A6";
    if (cat.includes("storm")) return "#E8A33D";
    if (cat.includes("super") || windKnots >= 130) return "#FF2040";
    return "#D6483F";
  };

  // Format last update time
  const getLastUpdateLabel = () => {
    const dateToFormat = lastUpdated || (storms.length > 0 ? storms[0].pubDate : null);
    if (!dateToFormat) return null;
    try {
      const d = new Date(dateToFormat);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " PHT " + d.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      });
    } catch { return null; }
  };

  const lastUpdate = getLastUpdateLabel();

  return (
    <div ref={mapContainerRef} className="relative w-full h-[550px] rounded-2xl overflow-hidden border border-border-hairline shadow-inner">
      <MapContainer
        center={[12.8, 121.8]}
        zoom={5}
        scrollWheelZoom={false}
        className="w-full h-full"
        style={{ background: "#0B1418" }}
        attributionControl={false}
      >
        {/* Premium Satellite Base Layer */}
        <TileLayer
          attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          className="satellite-base-tiles"
        />
        {/* Transparent Country & City Labels Overlay */}
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          className="satellite-label-tiles"
        />

        {/* PANaHON Image Overlay (Radar / Satellite) */}
        {panahonOverlayUrl && (
          <ImageOverlay
            url={panahonOverlayUrl}
            bounds={panahonOverlayBounds}
            opacity={0.68}
          />
        )}

        {/* PANaHON Lightning Strike Markers (with Time-Decay & Valid LatLng check) */}
        {panahonLightning.map((strike, idx) => {
          const lat = parseFloat(strike.lat as any);
          const lon = parseFloat(strike.lon as any);
          if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) return null;

          const obsTime = strike.observed_at ? Date.parse(strike.observed_at) : Date.now();
          const ageMinutes = Math.max(0, Math.round((Date.now() - obsTime) / 60000));
          if (ageMinutes > 120) return null; // hide strikes older than 2 hours
          const icon = getLightningIcon(ageMinutes);
          return (
            <Marker
              key={`lightning-${lat}-${lon}-${idx}`}
              position={[lat, lon]}
              icon={icon}
            >
              <Popup>
                <div className="p-1.5 text-slate-900 font-sans text-xs">
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <span>⚡ Lightning Strike</span>
                  </div>
                  <p className="mt-0.5">Type: <span className="font-semibold">{strike.readable_parameter || "Strike"}</span></p>
                  <p>Amplitude: <span className="font-semibold font-mono">{strike.amplitude} kA</span></p>
                  <p className="text-[10px] text-slate-400 font-mono">Observed: {strike.observed_at || "Recent"}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* PANaHON SYNOP Weather Station Markers (Valid LatLng Check) */}
        {synopIcon &&
          panahonSynop
            .filter((s) => !isNaN(s.lat) && !isNaN(s.lon) && isFinite(s.lat) && isFinite(s.lon))
            .map((s) => (
              <Marker key={`synop-${s.site_id}-${s.lat}-${s.lon}`} position={[s.lat, s.lon]} icon={synopIcon}>
                <Popup>
                  <div className="p-1.5 text-slate-900 font-sans text-xs">
                    <h4 className="font-bold text-sky-600">{s.site_name}</h4>
                    <p className="text-slate-600">{s.desc || "Synoptic Station"}</p>
                    <p className="text-[10px] font-mono text-slate-400">PAGASA SYNOP #{s.site_id}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* PANaHON AWS Weather Station Markers (Valid LatLng Check) */}
        {awsIcon &&
          panahonAws
            .filter((s) => !isNaN(s.lat) && !isNaN(s.lon) && isFinite(s.lat) && isFinite(s.lon))
            .map((s) => (
              <Marker key={`aws-${s.site_id}-${s.lat}-${s.lon}`} position={[s.lat, s.lon]} icon={awsIcon}>
                <Popup>
                  <div className="p-1.5 text-slate-900 font-sans text-xs">
                    <h4 className="font-bold text-emerald-600">{s.site_name}</h4>
                    <p className="text-slate-700">Rainfall: <span className="font-semibold">{s.value !== null ? `${s.value} mm` : "0.0 mm"}</span></p>
                    <p className="text-[10px] font-mono text-slate-400">AWS Station #{s.site_id}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* PANaHON River Basin Hydrological Gauge Markers (Valid LatLng Check) */}
        {riverIcon &&
          panahonRiverBasin
            .filter((s) => !isNaN(s.lat) && !isNaN(s.lon) && isFinite(s.lat) && isFinite(s.lon))
            .map((s) => (
              <Marker key={`river-${s.site_id}-${s.lat}-${s.lon}`} position={[s.lat, s.lon]} icon={riverIcon}>
                <Popup>
                  <div className="p-1.5 text-slate-900 font-sans text-xs">
                    <h4 className="font-bold text-cyan-600">{s.site_name}</h4>
                    <p className="text-slate-700">Water Level: <span className="font-semibold">{s.value !== null ? `${s.value} m` : "Normal Flow"}</span></p>
                    <p className="text-[10px] font-mono text-slate-400">River Basin Sensor #{s.site_id}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Site Pin */}
        {siteIcon && (
          <Marker position={[SITE_LAT, SITE_LNG]} icon={siteIcon}>
            <Popup>
              <div className="p-2 text-slate-900 font-sans">
                <h4 className="font-bold text-sm text-[#0D9488]">Tumauini HEPP</h4>
                <p className="text-xs text-slate-600">Project Operations Center</p>
                <p className="text-xs font-mono mt-1">16.9833&deg; N, 122.0833&deg; E</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Distance Rings around site (only if storms are active) */}
        {storms.length > 0 && (
          <>
            <Circle
              center={[SITE_LAT, SITE_LNG]}
              radius={250000}
              pathOptions={{ color: "#EF4444", weight: 1, dashArray: "5, 8", fill: false, opacity: 0.4 }}
            />
            <Circle
              center={[SITE_LAT, SITE_LNG]}
              radius={500000}
              pathOptions={{ color: "#E8A33D", weight: 1, dashArray: "5, 8", fill: false, opacity: 0.3 }}
            />
            <Circle
              center={[SITE_LAT, SITE_LNG]}
              radius={1000000}
              pathOptions={{ color: "#1FB6A6", weight: 1, dashArray: "5, 8", fill: false, opacity: 0.2 }}
            />
          </>
        )}

        {/* Active Storms Visuals */}
        {storms.map((storm) => {
          const stormColor = getCategoryColor(storm.category, storm.windSpeedKnots);
          const stormIcon = getStormIcon(stormColor);

          // Forecast track — skip index 0 ("Current") to avoid duplicating storm marker position
          const futureForecast = storm.forecast.filter(
            (f) => f.time.toLowerCase() !== "current"
          );
          const forecastPoints = futureForecast.map((f) => [f.lat, f.lng] as [number, number]);
          // Track line: from current storm position → through future forecast points
          const trackPoints = [[storm.lat, storm.lng], ...forecastPoints] as [number, number][];

          // Build past track points array
          const pastTrackPoints: [number, number][] = (storm.pastTrack || []).map(
            (p) => [p.lat, p.lng] as [number, number]
          );
          // Connect past track to current position
          const fullPastLine = [...pastTrackPoints, [storm.lat, storm.lng] as [number, number]];

          return (
            <div key={storm.id}>
              {/* ═══ PAST TRACK (emerald green line matching PAGASA track style) ═══ */}
              {fullPastLine.length > 1 && (
                <Polyline
                  positions={fullPastLine}
                  pathOptions={{
                    color: "#10B981", // emerald green line
                    weight: 3,
                    opacity: 0.9,
                    className: "past-track-line",
                  }}
                />
              )}

              {/* Past Track Point Markers (custom PAGASA letter badges L, D, TS, STS, TY, STY) */}
              {(storm.pastTrack || []).map((pt, idx) => (
                <Marker
                  key={`${storm.id}-past-${idx}`}
                  position={[pt.lat, pt.lng]}
                  icon={createLetterBadgeIcon(
                    pt.type || (storm.category.includes("Low") ? "LPA" : "TD"),
                    pt.time,
                    idx === 0,
                    idx === (storm.pastTrack?.length || 1) - 1
                  )}
                >
                  <Popup>
                    <div className="p-1.5 text-slate-900 font-sans text-xs">
                      <div className="flex items-center gap-1 font-bold mb-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-white font-mono">
                          {pt.type || "TD"}
                        </span>
                        <span>{storm.name}</span>
                      </div>
                      <p className="text-[11px]">{pt.time ? `Time: ${pt.time}` : `${pt.hoursAgo}h ago`}</p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {pt.lat.toFixed(1)}&deg;N, {pt.lng.toFixed(1)}&deg;E
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* ═══ UNCERTAINTY CONE (forecast probability area) ═══ */}
              {storm.uncertaintyCone && storm.uncertaintyCone.length > 2 && (
                <Polygon
                  positions={storm.uncertaintyCone.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    fillColor: stormColor,
                    fillOpacity: 0.08,
                    color: stormColor,
                    weight: 1,
                    dashArray: "4, 6",
                    opacity: 0.3,
                    className: "uncertainty-cone-poly",
                  }}
                />
              )}

              {/* ═══ FORECAST TRACK (single dashed line — where the storm IS GOING) ═══ */}
              <Polyline
                positions={trackPoints}
                pathOptions={{
                  color: stormColor,
                  weight: 3,
                  dashArray: "6, 8",
                  opacity: 0.9,
                  className: "typhoon-track-line",
                }}
              />

              {/* Forecast Point Markers with time labels */}
              {storm.forecast.map((fc, idx) => {
                if (idx === 0) return null; // skip "Current"
                return (
                  <Circle
                    key={`${storm.id}-fc-${idx}`}
                    center={[fc.lat, fc.lng]}
                    radius={12000}
                    pathOptions={{
                      color: stormColor,
                      fillColor: "#0B1418",
                      fillOpacity: 0.85,
                      weight: 2,
                      opacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-slate-900 font-sans text-xs">
                        <p className="font-bold">{storm.name} — {fc.time}</p>
                        <p className="mt-0.5">Winds: <span className="font-semibold">{fc.windKph} kph</span></p>
                        <p className="font-mono text-[10px] text-slate-500">{fc.lat.toFixed(1)}&deg;N, {fc.lng.toFixed(1)}&deg;E</p>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Storm Current Position Letter Badge Marker */}
              <Marker
                position={[storm.lat, storm.lng]}
                icon={createLetterBadgeIcon(
                  storm.category.toLowerCase().includes("low pressure") ? "LPA" : "TD",
                  storm.closestApproach?.eta,
                  false,
                  true
                )}
              >
                <Popup>
                  <div className="p-2 text-slate-900 font-sans">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🌀</span>
                      <h4 className="font-bold text-sm">{storm.category} {storm.name}</h4>
                    </div>
                    <p className="text-xs">Distance to Site: <span className="font-semibold text-red-600">{storm.distanceKm} km</span></p>
                    <p className="text-xs">Max Winds: <span className="font-semibold">{storm.windSpeedKph} kph</span></p>
                    <p className="text-xs">Central Pressure: <span className="font-semibold">{storm.pressureHpa} hPa</span></p>
                    <p className="text-xs font-mono mt-1">{storm.lat.toFixed(2)}&deg;N, {storm.lng.toFixed(2)}&deg;E</p>
                  </div>
                </Popup>
              </Marker>

              {/* Wind Radii Circles */}
              {storm.windRadii.r34 > 0 && (
                <Circle
                  center={[storm.lat, storm.lng]}
                  radius={storm.windRadii.r34 * 1000}
                  pathOptions={{ color: "#3B82F6", weight: 1, fill: true, fillOpacity: 0.03, opacity: 0.25 }}
                />
              )}
              {storm.windRadii.r50 > 0 && (
                <Circle
                  center={[storm.lat, storm.lng]}
                  radius={storm.windRadii.r50 * 1000}
                  pathOptions={{ color: "#E8A33D", weight: 1, fill: true, fillOpacity: 0.03, opacity: 0.25 }}
                />
              )}
              {storm.windRadii.r64 > 0 && (
                <Circle
                  center={[storm.lat, storm.lng]}
                  radius={storm.windRadii.r64 * 1000}
                  pathOptions={{ color: "#FF2040", weight: 1, fill: true, fillOpacity: 0.03, opacity: 0.25 }}
                />
              )}
            </div>
          );
        })}

        {/* Default map view centered on entire Philippines */}
        <MapRecenter />
      </MapContainer>

      {/* Status Badge Overlay — Top Left (above zoom buttons) */}
      {storms.length === 0 ? (
        <div className="absolute top-2.5 left-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-[#1FB6A6] animate-pulse"></div>
          <span className="text-[11px] font-bold text-text-primary tracking-wide">PAR Clear: No Active Cyclones</span>
        </div>
      ) : storms.every((s) => s.category.toLowerCase().includes("low pressure")) ? (
        <div className="absolute top-2.5 left-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl pointer-events-auto max-w-[calc(100%-20px)] truncate">
          <div className="w-2 h-2 rounded-full bg-[#E8A33D] animate-pulse shrink-0"></div>
          <span className="text-[11px] font-bold text-text-primary tracking-wide truncate">
            PAR Clear (24h LPA Track: {storms[0].name})
          </span>
        </div>
      ) : (
        <div className="absolute top-2.5 left-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-red-500/50 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0"></div>
          <span className="text-[11px] font-bold text-red-400 tracking-wide">
            WARNING: {storms[0].category} {storms[0].name}
          </span>
        </div>
      )}

      {/* PAGASA Official Intensity Legend Bar Overlay — Only visible when storms exist in PAR */}
      {storms.length > 0 && (
        <div className="absolute top-2.5 right-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-full hidden sm:flex items-center gap-2 text-[10px] font-sans shadow-xl pointer-events-auto">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">INTENSITY</span>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center font-bold text-[8px] border border-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.6)]">L</span> <span className="text-slate-300 font-semibold text-[10px]">LPA</span></span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-700 text-white flex items-center justify-center font-bold text-[8px] border border-sky-300 shadow-[0_0_6px_rgba(2,132,199,0.6)]">D</span> <span className="text-slate-300 font-semibold text-[10px]">TD</span></span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 flex items-center justify-center font-bold text-[8px] border border-yellow-200 shadow-[0_0_6px_rgba(234,179,8,0.6)]">TS</span> <span className="text-slate-300 font-semibold text-[10px]">TS</span></span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white flex items-center justify-center font-bold text-[8px] border border-orange-200 shadow-[0_0_6px_rgba(249,115,22,0.6)]">STS</span> <span className="text-slate-300 font-semibold text-[10px]">STS</span></span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-bold text-[8px] border border-red-200 shadow-[0_0_6px_rgba(239,68,68,0.6)]">TY</span> <span className="text-slate-300 font-semibold text-[10px]">TY</span></span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-pink-500 to-purple-800 text-white flex items-center justify-center font-bold text-[8px] border border-pink-200 shadow-[0_0_6px_rgba(236,72,153,0.6)]">STY</span> <span className="text-slate-300 font-semibold text-[10px]">STY</span></span>
            <span className="text-slate-500 font-mono text-[9px] ml-1">--- Forecast</span>
          </div>
        </div>
      )}

      {/* Last Updated + Legend overlay */}
      {storms.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md border border-border-hairline px-3 py-2 rounded-xl shadow-lg space-y-1.5">
          {lastUpdate && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-semibold text-green-400">Live Data</span>
              <span className="text-[10px] text-text-muted ml-1">{lastUpdate}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-[9px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-4 h-[2px] bg-slate-400 inline-block rounded"></span> Past Track
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-[2px] inline-block rounded" style={{ borderTop: "2px dashed #FF2040" }}></span> Forecast
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .leaflet-top.leaflet-left {
          top: 42px !important;
        }
        .satellite-base-tiles {
          filter: brightness(0.9) contrast(1.05) saturate(1.05);
        }
        .satellite-label-tiles {
          opacity: 0.95;
          filter: brightness(1.25) contrast(1.1) drop-shadow(0px 1px 2px rgba(0,0,0,0.85));
        }
        .typhoon-track-line {
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 5px rgba(255, 32, 64, 0.7));
        }
        .past-track-line {
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 3px rgba(148, 163, 184, 0.4));
        }
        .uncertainty-cone-poly {
          filter: drop-shadow(0 0 8px rgba(255, 32, 64, 0.35));
          animation: pulse-cone 4s ease-in-out infinite alternate;
        }
        @keyframes pulse-cone {
          0% { fill-opacity: 0.06; }
          100% { fill-opacity: 0.16; }
        }
        .leaflet-container {
          font-family: var(--font-body) !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid var(--border-hairline) !important;
          backdrop-filter: blur(8px) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-popup-content {
          color: var(--text-primary) !important;
          margin: 12px !important;
        }
        .leaflet-popup-content p {
          margin: 4px 0 !important;
          color: var(--text-muted) !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid var(--border-hairline) !important;
        }
      `}</style>
    </div>
  );
}

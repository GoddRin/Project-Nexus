"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, useMap } from "react-leaflet";
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
  pastTrack?: { lat: number; lng: number; hoursAgo: number }[];
  uncertaintyCone: { lat: number; lng: number }[];
  windRadii: {
    r34: number;
    r50: number;
    r64: number;
  };
  pubDate?: string;
}

interface TyphoonMapProps {
  storms: Storm[];
  lastUpdated?: string | Date;
}

// Map controller
function MapRecenter({ storms }: { storms: Storm[] }) {
  const map = useMap();

  useEffect(() => {
    if (storms.length > 0) {
      const storm = storms[0];
      // Center between the site and the storm for best view
      const midLat = (SITE_LAT + storm.lat) / 2;
      const midLng = (SITE_LNG + storm.lng) / 2;
      // Adjust zoom based on distance
      const dist = storm.distanceKm;
      let zoom = 5;
      if (dist > 2000) zoom = 4;
      else if (dist > 1000) zoom = 5;
      else if (dist > 500) zoom = 6;
      else zoom = 7;
      map.setView([midLat, midLng], zoom);
    } else {
      map.setView([12.8, 121.8], 5);
    }
  }, [storms, map]);

  return null;
}

export default function TyphoonMap({ storms, lastUpdated }: TyphoonMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Custom DivIcon for Tumauini HEPP Site Pin
  const siteIcon = L.divIcon({
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
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden border border-border-hairline shadow-inner">
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

        {/* Site Pin */}
        <Marker position={[SITE_LAT, SITE_LNG]} icon={siteIcon}>
          <Popup>
            <div className="p-2 text-slate-900 font-sans">
              <h4 className="font-bold text-sm text-[#0D9488]">Tumauini HEPP</h4>
              <p className="text-xs text-slate-600">Project Operations Center</p>
              <p className="text-xs font-mono mt-1">16.9833&deg; N, 122.0833&deg; E</p>
            </div>
          </Popup>
        </Marker>

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
          const forecastPoints = storm.forecast.map((f) => [f.lat, f.lng] as [number, number]);
          const trackPoints = [[storm.lat, storm.lng], ...forecastPoints] as [number, number][];

          // Build past track points array
          const pastTrackPoints: [number, number][] = (storm.pastTrack || []).map(
            (p) => [p.lat, p.lng] as [number, number]
          );
          // Connect past track to current position
          const fullPastLine = [...pastTrackPoints, [storm.lat, storm.lng] as [number, number]];

          // Custom DivIcon for Storm Center
          const stormIcon = L.divIcon({
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

          return (
            <div key={storm.id}>
              {/* ═══ PAST TRACK (solid line — where the storm HAS BEEN) ═══ */}
              {fullPastLine.length > 1 && (
                <Polyline
                  positions={fullPastLine}
                  pathOptions={{
                    color: "#94a3b8", // slate-400 (muted for past)
                    weight: 2.5,
                    opacity: 0.7,
                    className: "past-track-line",
                  }}
                />
              )}

              {/* Past Track Point Markers (small dots) */}
              {(storm.pastTrack || []).map((pt, idx) => (
                <Circle
                  key={`${storm.id}-past-${idx}`}
                  center={[pt.lat, pt.lng]}
                  radius={8000}
                  pathOptions={{
                    color: "#94a3b8",
                    fillColor: "#475569",
                    fillOpacity: 0.7,
                    weight: 1.5,
                    opacity: 0.6,
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 font-sans text-xs">
                      <p className="font-bold">{storm.name} — {pt.hoursAgo}h ago</p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {pt.lat.toFixed(1)}&deg;N, {pt.lng.toFixed(1)}&deg;E
                      </p>
                      <p className="text-[10px] text-slate-400 italic">Estimated position</p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* ═══ UNCERTAINTY CONE (forecast area) ═══ */}
              {storm.uncertaintyCone && storm.uncertaintyCone.length > 0 && (
                <Polygon
                  positions={storm.uncertaintyCone.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    fillColor: stormColor,
                    fillOpacity: 0.1,
                    color: stormColor,
                    weight: 1,
                    dashArray: "3, 5",
                    opacity: 0.3,
                    className: "uncertainty-cone-poly",
                  }}
                />
              )}

              {/* ═══ FORECAST TRACK (dashed line — where the storm IS GOING) ═══ */}
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
                if (idx === 0) return null; // skip "Current" (shown by storm icon)
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

              {/* Storm Current Position Marker */}
              <Marker position={[storm.lat, storm.lng]} icon={stormIcon}>
                <Popup>
                  <div className="p-2 text-slate-900 font-sans">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">🌀</span>
                      <h4 className="font-bold text-sm">{storm.category} {storm.name}</h4>
                    </div>
                    <p className="text-xs">Distance to Site: <span className="font-semibold text-red-600">{storm.distanceKm} km</span></p>
                    <p className="text-xs">Max Winds: <span className="font-semibold">{storm.windSpeedKph} kph</span></p>
                    <p className="text-xs">Central Pressure: <span className="font-semibold">{storm.pressureHpa} hPa</span></p>
                    <p className="text-xs">Moving: <span className="font-semibold">{storm.direction} @ {storm.speedKph} kph</span></p>
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

        {/* Dynamic zooming */}
        <MapRecenter storms={storms} />
      </MapContainer>

      {/* Status Overlays */}
      {storms.length === 0 && (
        <div className="absolute top-4 left-16 z-[1000] bg-slate-950/80 backdrop-blur-md border border-border-hairline px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-[#1FB6A6] animate-pulse"></div>
          <span className="text-xs font-bold text-text-primary tracking-wide">PAR Clear: No Active Tropical Cyclones</span>
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

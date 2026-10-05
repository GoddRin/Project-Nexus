"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as maplibregl from "maplibre-gl";
import { useAtlasMap } from "@/components/atlas/AtlasMapContext";
import { playUiTone } from "@/lib/ui/sounds";
import type { EraChapter } from "@/lib/atlas/projectFacts";

/**
 * Time travel: what the map itself does while the timeline holds a year.
 *
 *  - Era look: the further back the year, the more the basemap loses its colour and contrast
 *    (like an old survey sheet) under a warm vignette; it returns to full colour at Today.
 *  - Year and chapter: the year stands large and faint over the map, with the era it belongs to.
 *  - Arrivals: every project completed in the year on screen lands with an expanding ring and
 *    its name beside it, so the portfolio is seen being built, year by year.
 *  - Routes: the expressway, railway and transmission-line routes appear in the year they were
 *    finished (routes still being built appear at Today), with a glow in their arrival year.
 *  - Satellite imagery of the time: on the satellite basemap the picture is swapped for Esri's
 *    archived "Wayback" release nearest that year (the archive starts in 2014).
 *
 * Decoration only: nothing here takes pointer events or moves the camera, and everything is
 * undone the moment the timeline returns to "All years".
 */

export interface TimeArrival {
  id: string;
  name: string;
  lng: number;
  lat: number;
  color: string;
}

const BASE_LAYERS = ["esri-dark-base-layer", "esri-light-base-layer", "esri-imagery-layer"];
const SRC = "atlas-time-arrivals";
const LAYERS = ["atlas-time-ring", "atlas-time-ring-2", "atlas-time-dot", "atlas-time-label"];
const FLOW_SRC = "atlas-flowlines";
const FLOW_LAYERS = ["atlas-flowlines-base", "atlas-flowlines-flow", "atlas-flowlines-label"];
const ROUTE_GLOW = "atlas-time-route-glow";
const WAYBACK_SRC = "atlas-wayback";
const WAYBACK_LAYER = "atlas-wayback-layer";
const WAYBACK_CONFIG = "https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json";

type Paint = (layer: string, name: string, v: unknown) => void;
const paintOf = (map: maplibregl.Map) => map.setPaintProperty.bind(map) as Paint;

function setEra(map: maplibregl.Map, age: number) {
  for (const id of BASE_LAYERS) {
    if (!map.getLayer(id)) continue;
    map.setPaintProperty(id, "raster-saturation", -0.8 * age);
    map.setPaintProperty(id, "raster-contrast", -0.14 * age);
  }
}

function ensureLayers(map: maplibregl.Map) {
  if (!map.getSource(SRC)) map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const ring = (id: string, width: number) =>
    map.addLayer({
      id,
      type: "circle",
      source: SRC,
      paint: {
        "circle-radius": 4,
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-width": width,
        "circle-stroke-opacity": 0,
        "circle-pitch-alignment": "map",
      },
    });
  if (!map.getLayer("atlas-time-ring")) ring("atlas-time-ring", 2.5);
  if (!map.getLayer("atlas-time-ring-2")) ring("atlas-time-ring-2", 1.5);
  if (!map.getLayer("atlas-time-dot")) {
    map.addLayer({
      id: "atlas-time-dot",
      type: "circle",
      source: SRC,
      paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2, "circle-opacity": 0, "circle-stroke-opacity": 0 },
    });
  }
  if (!map.getLayer("atlas-time-label")) {
    map.addLayer({
      id: "atlas-time-label",
      type: "symbol",
      source: SRC,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
        "text-max-width": 13,
        "text-padding": 4,
        "text-variable-anchor": ["left", "right", "top", "bottom"],
        "text-radial-offset": 0.9,
      },
      paint: { "text-color": "#ffffff", "text-halo-color": "rgba(5, 20, 14, 0.94)", "text-halo-width": 1.8, "text-opacity": 0 },
    });
  }
}

function removeLayers(map: maplibregl.Map) {
  for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SRC)) map.removeSource(SRC);
}

/** Routes: only those finished by the year (a route still being built carries year 9999) */
function setRoutes(map: maplibregl.Map, year: number | null, maxYear: number) {
  const cutoff = year === null || year >= maxYear ? null : year;
  const filter = cutoff === null ? null : (["any", ["!", ["has", "project"]], ["<=", ["coalesce", ["get", "year"], 9999], cutoff]] as maplibregl.FilterSpecification);
  for (const id of FLOW_LAYERS) if (map.getLayer(id)) map.setFilter(id, filter);
  if (!map.getSource(FLOW_SRC)) return;
  if (year === null) {
    if (map.getLayer(ROUTE_GLOW)) map.removeLayer(ROUTE_GLOW);
    return;
  }
  if (!map.getLayer(ROUTE_GLOW)) {
    map.addLayer(
      {
        id: ROUTE_GLOW,
        type: "line",
        source: FLOW_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 9, "line-blur": 6, "line-opacity": 0 },
      },
      map.getLayer("atlas-flowlines-base") ? "atlas-flowlines-base" : undefined
    );
  }
  map.setFilter(ROUTE_GLOW, ["all", ["has", "project"], ["==", ["get", "year"], year]]);
  const paint = paintOf(map);
  paint(ROUTE_GLOW, "line-opacity-transition", { duration: 0, delay: 0 });
  paint(ROUTE_GLOW, "line-opacity", 0);
  window.setTimeout(() => {
    if (!map.getLayer(ROUTE_GLOW)) return;
    paint(ROUTE_GLOW, "line-opacity-transition", { duration: 900, delay: 0 });
    paint(ROUTE_GLOW, "line-opacity", 0.85);
    window.setTimeout(() => {
      if (!map.getLayer(ROUTE_GLOW)) return;
      paint(ROUTE_GLOW, "line-opacity-transition", { duration: 2400, delay: 0 });
      paint(ROUTE_GLOW, "line-opacity", 0.25);
    }, 1000);
  }, 60);
}

// Esri's archive of its World Imagery releases ("Wayback"): free, the same imagery the satellite
// basemap already uses, one dated release at a time. Loaded once, only when it is needed.
interface WaybackRelease {
  date: string; // YYYY-MM-DD
  tiles: string;
}
let waybackPromise: Promise<WaybackRelease[]> | null = null;
function loadWayback(): Promise<WaybackRelease[]> {
  waybackPromise ??= fetch(WAYBACK_CONFIG)
    .then((r) => (r.ok ? r.json() : {}))
    .then((json: Record<string, { itemTitle?: string; itemURL?: string }>) =>
      Object.values(json)
        .map((v) => ({
          date: v.itemTitle?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "",
          tiles: (v.itemURL || "").replace("{level}", "{z}").replace("{row}", "{y}").replace("{col}", "{x}"),
        }))
        .filter((r) => r.date && r.tiles)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
    )
    .catch(() => []);
  return waybackPromise;
}
function removeWayback(map: maplibregl.Map) {
  if (map.getLayer(WAYBACK_LAYER)) map.removeLayer(WAYBACK_LAYER);
  if (map.getSource(WAYBACK_SRC)) map.removeSource(WAYBACK_SRC);
}

export function AtlasTimeTravel({
  year, minYear, maxYear, arrivals, dark, satellite, chapter,
}: {
  year: number | null;
  minYear: number;
  maxYear: number;
  arrivals: TimeArrival[];
  dark: boolean;
  satellite: boolean;
  chapter: EraChapter | null;
}) {
  const { mapInstance: map } = useAtlasMap();
  const age = year === null ? 0 : Math.min(1, Math.max(0, (maxYear - year) / Math.max(1, maxYear - minYear)));
  const reduced = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  // A shared link can open with a year before the map's style has loaded: try again shortly
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    if (attempt < 20) window.setTimeout(() => setAttempt((n) => n + 1), 400);
  };

  // Era look on the basemap, and the routes of the time
  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getLayer(BASE_LAYERS[0])) throw new Error("style not ready");
      setEra(map, age);
      setRoutes(map, year, maxYear);
      // (the routes are fetched after the map loads: come back for them if they are not in yet)
      if (year !== null && !map.getLayer(FLOW_LAYERS[0])) retry();
    } catch {
      retry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retry only reads the attempt count
  }, [map, age, year, maxYear, attempt]);
  useEffect(() => {
    if (!map) return;
    return () => {
      try {
        setEra(map, 0);
        setRoutes(map, null, 0);
        removeLayers(map);
        removeWayback(map);
      } catch {
        // map already gone
      }
    };
  }, [map]);

  // Satellite imagery of the time (Esri Wayback), on the satellite basemap only
  const [imageryDate, setImageryDate] = useState<string | null>(null);
  const waybackShown = useRef<string | null>(null);
  const wantImagery = satellite && year !== null && year < maxYear;
  useEffect(() => {
    if (!map || !wantImagery || year === null) return;
    let cancelled = false;
    void loadWayback().then((releases) => {
      if (cancelled || !releases.length) return;
      // the last release of that year, or (before the archive begins) the first one there is
      const upTo = releases.filter((r) => Number(r.date.slice(0, 4)) <= year);
      const pick = upTo.length ? upTo[upTo.length - 1] : releases[0];
      if (waybackShown.current === pick.date) return;
      try {
        removeWayback(map);
        map.addSource(WAYBACK_SRC, { type: "raster", tiles: [pick.tiles], tileSize: 256, maxzoom: 19, attribution: "Imagery of the time: Esri World Imagery Wayback" });
        map.addLayer(
          { id: WAYBACK_LAYER, type: "raster", source: WAYBACK_SRC, paint: { "raster-opacity": 0, "raster-opacity-transition": { duration: 900, delay: 0 } } },
          map.getLayer("esri-labels-layer") ? "esri-labels-layer" : undefined
        );
        window.setTimeout(() => {
          if (map.getLayer(WAYBACK_LAYER)) map.setPaintProperty(WAYBACK_LAYER, "raster-opacity", 1);
        }, 60);
        waybackShown.current = pick.date;
        setImageryDate(pick.date);
      } catch {
        // style mid-swap: the next year change tries again
      }
    });
    return () => {
      cancelled = true;
    };
  }, [map, wantImagery, year]);
  useEffect(() => {
    if (!map || wantImagery) return;
    try {
      removeWayback(map);
    } catch {
      // style mid-swap
    }
    waybackShown.current = null;
  }, [map, wantImagery]);

  // Arrivals of the year on screen
  const timers = useRef<number[]>([]);
  const signature = `${year}|${arrivals.map((a) => a.id).join(",")}`;
  useEffect(() => {
    if (!map) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    try {
      if (year === null) {
        removeLayers(map);
        return;
      }
      ensureLayers(map);
      (map.getSource(SRC) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: arrivals.map((a) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [a.lng, a.lat] },
          properties: { id: a.id, name: a.name, color: a.color },
        })),
      });
      if (!arrivals.length) return;
      playUiTone("tap");
      const instant = { duration: 0, delay: 0 };
      const paint = paintOf(map);
      const set = (id: string, prop: string, value: number, transition = instant) => {
        if (!map.getLayer(id)) return;
        paint(id, `${prop}-transition`, transition);
        paint(id, prop, value);
      };
      set("atlas-time-dot", "circle-opacity", 0);
      set("atlas-time-dot", "circle-stroke-opacity", 0);
      set("atlas-time-label", "text-opacity", 0);
      // (timers, not animation frames: the result must be right even if the tab was in the background)
      const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
      const pulse = (delay: number) =>
        later(() => {
          if (reduced) return;
          for (const id of ["atlas-time-ring", "atlas-time-ring-2"]) {
            set(id, "circle-radius", 4);
            set(id, "circle-stroke-opacity", 0.9);
          }
          later(() => {
            set("atlas-time-ring", "circle-radius", 44, { duration: 1700, delay: 0 });
            set("atlas-time-ring", "circle-stroke-opacity", 0, { duration: 1700, delay: 0 });
            set("atlas-time-ring-2", "circle-radius", 28, { duration: 1400, delay: 320 });
            set("atlas-time-ring-2", "circle-stroke-opacity", 0, { duration: 1400, delay: 320 });
          }, 50);
        }, delay);
      // the rings beat three times while the year is on screen
      pulse(0);
      pulse(2200);
      pulse(4400);
      later(() => {
        set("atlas-time-dot", "circle-opacity", 1, { duration: 450, delay: 0 });
        set("atlas-time-dot", "circle-stroke-opacity", 1, { duration: 450, delay: 0 });
        set("atlas-time-label", "text-opacity", 1, { duration: 600, delay: 250 });
      }, 50);
    } catch {
      retry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature stands for year + arrivals
  }, [map, signature, reduced, attempt]);

  if (year === null) return null;
  const shownImagery = wantImagery ? imageryDate : null;
  return (
    <>
      {/* warm vignette of an older print, fading out towards Today */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-1000"
        style={{
          opacity: age * (dark ? 0.55 : 0.8),
          background:
            "radial-gradient(ellipse 85% 75% at 50% 45%, rgba(214,170,96,0.10) 0%, rgba(120,80,30,0.20) 62%, rgba(30,18,6,0.55) 100%)",
          mixBlendMode: dark ? "screen" : "multiply",
        }}
      />
      {/* the year, large and faint, and the era it belongs to */}
      <div aria-hidden className="pointer-events-none absolute left-5 top-16 lg:top-14 z-[2] select-none overflow-hidden">
        <div
          key={year}
          className="font-semibold tabular-nums leading-none tracking-tight text-slate-900/10 dark:text-white/[0.09] text-[92px] xl:text-[128px] animate-in fade-in slide-in-from-bottom-6 duration-700"
        >
          {year}
        </div>
        {chapter && (
          <div key={`${chapter.from}-${chapter.title}`} className="mt-1 pl-1 animate-in fade-in slide-in-from-left-4 duration-1000">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-600/80 dark:text-white/45">
              {chapter.from} to {chapter.to >= maxYear ? "today" : chapter.to}
            </p>
            <p className="text-[15px] font-semibold text-slate-800/80 dark:text-white/70">{chapter.title}</p>
          </div>
        )}
        {shownImagery && (
          <p className="mt-2 pl-1 text-[10px] font-mono text-slate-700/80 dark:text-white/55">
            Satellite imagery as of {shownImagery}
            {Number(shownImagery.slice(0, 4)) > year ? " (the archive begins in 2014)" : ""} · Esri Wayback
          </p>
        )}
      </div>
    </>
  );
}

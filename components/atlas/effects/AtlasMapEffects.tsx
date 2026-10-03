"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { useAtlasMap } from "@/components/atlas/AtlasMapContext";
import { prefersReducedMotionNow } from "@/components/shared/motion";

interface AtlasMapEffectsProps {
  /** [lng, lat] of the project currently highlighted in the list (pulse once) */
  activeCoords: [number, number] | null;
  /** Show the rain radar + typhoon track overlay */
  weatherLayerOn: boolean;
}

/** MapLibre "marching ants" dash sequence: stepping through it makes a line appear to flow. */
const DASH_SEQ: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

const FLOW_SOURCE = "atlas-flowlines";
const FLOW_BASE = "atlas-flowlines-base";
const FLOW_DASH = "atlas-flowlines-flow";
/** Layers whose dashes should flow (ours + the AI transit corridor drawn by ProjectAtlasMap) */
const FLOWING_LAYERS = [FLOW_DASH, "atlas-ai-transit-corridor-layer"];

const RAIN_SOURCE = "atlas-rain-radar";
const RAIN_LAYER = "atlas-rain-radar-layer";
const STORM_SOURCE = "atlas-storm-tracks";

function spawnPulse(map: maplibregl.Map, lngLat: [number, number], delayMs = 0, variant: "pulse" | "bloom" = "pulse") {
  // MapLibre positions a marker through its element's `transform`, and the ring's keyframes animate
  // `transform` too: the ring therefore lives on a child, so it cannot knock the marker off its spot.
  const el = document.createElement("div");
  el.style.pointerEvents = "none";
  const ring = document.createElement("div");
  ring.className = variant === "bloom" ? "atlas-bloom-once" : "atlas-pulse-once";
  ring.style.animationDelay = `${delayMs}ms`;
  el.appendChild(ring);
  const marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
  const done = () => marker.remove();
  ring.addEventListener("animationend", done, { once: true });
  // safety net if the animation never fires (tab hidden, reduced motion)
  window.setTimeout(done, delayMs + 1800);
}

/**
 * Presentation-only map effects. Everything here is additive and removable: it never changes
 * project data, selection or camera, and it stands down under prefers-reduced-motion.
 */
export function AtlasMapEffects({ activeCoords, weatherLayerOn }: AtlasMapEffectsProps) {
  const { mapInstance: map } = useAtlasMap();

  // Dev-only inspection hook: window.__atlasMap
  useEffect(() => {
    if (!map || process.env.NODE_ENV === "production") return;
    (window as unknown as { __atlasMap?: maplibregl.Map }).__atlasMap = map;
    return () => {
      delete (window as unknown as { __atlasMap?: maplibregl.Map }).__atlasMap;
    };
  }, [map]);

  // ── 1. Flowing lines: rivers / transmission (optional dataset) + the AI corridor ──
  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    let data: GeoJSON.FeatureCollection | null = null;

    const ensureLayers = () => {
      if (!data || cancelled) return;
      // isStyleLoaded() is also false while tiles are still streaming in: try again once the map settles
      if (!map.isStyleLoaded()) {
        map.once("idle", ensureLayers);
        return;
      }
      if (!map.getSource(FLOW_SOURCE)) map.addSource(FLOW_SOURCE, { type: "geojson", data, attribution: "Rivers © OpenStreetMap contributors" });
      const before = map.getLayer("clusters") ? "clusters" : undefined;
      const color: maplibregl.ExpressionSpecification = [
        "match", ["get", "kind"], "transmission", "#E9A93B", /* river / default */ "#4E9DC2",
      ];
      if (!map.getLayer(FLOW_BASE)) {
        map.addLayer(
          {
            id: FLOW_BASE,
            type: "line",
            source: FLOW_SOURCE,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": color, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 2.2], "line-opacity": 0.28 },
          },
          before
        );
      }
      if (!map.getLayer(FLOW_DASH)) {
        map.addLayer(
          {
            id: FLOW_DASH,
            type: "line",
            source: FLOW_SOURCE,
            paint: {
              "line-color": color,
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 10, 2.6],
              "line-opacity": 0.85,
              "line-dasharray": DASH_SEQ[0],
            },
          },
          before
        );
      }
    };

    // The dataset is optional: drop a GeoJSON of LineStrings (properties.kind = "river" | "transmission")
    // at /public/data/atlas-flowlines.geojson and it appears here. No file → no layer.
    fetch("/data/atlas-flowlines.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.features?.length) return;
        data = json as GeoJSON.FeatureCollection;
        ensureLayers();
      })
      .catch(() => {});

    map.on("style.load", ensureLayers);

    let step = 0;
    let last = 0;
    let raf = 0;
    const reduced = prefersReducedMotionNow();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (reduced || document.hidden || now - last < 70) return;
      last = now;
      step = (step + 1) % DASH_SEQ.length;
      for (const id of FLOWING_LAYERS) {
        if (map.getLayer(id)) {
          try {
            map.setPaintProperty(id, "line-dasharray", DASH_SEQ[step]);
          } catch {
            // style mid-swap
          }
        }
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map.off("style.load", ensureLayers);
      map.off("idle", ensureLayers);
      try {
        if (map.getLayer(FLOW_DASH)) map.removeLayer(FLOW_DASH);
        if (map.getLayer(FLOW_BASE)) map.removeLayer(FLOW_BASE);
        if (map.getSource(FLOW_SOURCE)) map.removeSource(FLOW_SOURCE);
      } catch {}
    };
  }, [map]);

  // ── 2. Pulse once when a project becomes active in the list ──
  const lastPulseKey = useRef("");
  useEffect(() => {
    if (!map || !activeCoords || prefersReducedMotionNow()) return;
    const key = activeCoords.join(",");
    if (key === lastPulseKey.current) return;
    lastPulseKey.current = key;
    spawnPulse(map, activeCoords);
  }, [map, activeCoords]);
  useEffect(() => {
    if (!activeCoords) lastPulseKey.current = "";
  }, [activeCoords]);

  // ── 3. Clusters bloom apart: newly revealed projects ripple in with a short stagger ──
  useEffect(() => {
    if (!map) return;
    let prevZoom = map.getZoom();
    let known = new Set<string>();
    const collect = (): Array<{ id: string; at: [number, number] }> => {
      if (!map.getLayer("project-points")) return [];
      const seen = new Set<string>();
      const out: Array<{ id: string; at: [number, number] }> = [];
      for (const f of map.queryRenderedFeatures({ layers: ["project-points"] })) {
        const id = String(f.properties?.id ?? f.id ?? "");
        if (!id || seen.has(id) || f.geometry.type !== "Point") continue;
        seen.add(id);
        out.push({ id, at: f.geometry.coordinates as [number, number] });
      }
      return out;
    };
    const onZoomEnd = () => {
      const z = map.getZoom();
      const now = collect();
      if (z > prevZoom + 0.35 && !prefersReducedMotionNow()) {
        const fresh = now.filter((p) => !known.has(p.id)).slice(0, 14);
        fresh.forEach((p, i) => spawnPulse(map, p.at, i * 40, "bloom"));
      }
      known = new Set(now.map((p) => p.id));
      prevZoom = z;
    };
    map.on("zoomend", onZoomEnd);
    map.once("idle", () => {
      known = new Set(collect().map((p) => p.id));
    });
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  // ── 4. Weather desk: animated rain radar + typhoon tracks ──
  useEffect(() => {
    if (!map || !weatherLayerOn) return;
    let cancelled = false;
    let frames: string[] = [];
    let host = "https://tilecache.rainviewer.com";
    let frameIdx = 0;
    let timer = 0;
    let storms: GeoJSON.FeatureCollection | null = null;

    const before = () => (map.getLayer("clusters") ? "clusters" : undefined);

    const setRainFrame = () => {
      if (cancelled || !frames.length) return;
      if (!map.isStyleLoaded()) {
        map.once("idle", setRainFrame);
        return;
      }
      const tiles = [`${host}${frames[frameIdx]}/256/{z}/{x}/{y}/2/1_1.png`];
      const src = map.getSource(RAIN_SOURCE) as (maplibregl.RasterTileSource & { setTiles?: (t: string[]) => void }) | undefined;
      if (src?.setTiles) {
        src.setTiles(tiles);
      } else {
        if (map.getLayer(RAIN_LAYER)) map.removeLayer(RAIN_LAYER);
        if (map.getSource(RAIN_SOURCE)) map.removeSource(RAIN_SOURCE);
        map.addSource(RAIN_SOURCE, { type: "raster", tiles, tileSize: 256, maxzoom: 7, attribution: "Rain radar © RainViewer" });
      }
      if (!map.getLayer(RAIN_LAYER)) {
        map.addLayer(
          { id: RAIN_LAYER, type: "raster", source: RAIN_SOURCE, paint: { "raster-opacity": 0.55, "raster-fade-duration": 350 } },
          before()
        );
      }
    };

    const drawStorms = () => {
      if (cancelled || !storms) return;
      if (!map.isStyleLoaded()) {
        map.once("idle", drawStorms);
        return;
      }
      if (!map.getSource(STORM_SOURCE)) map.addSource(STORM_SOURCE, { type: "geojson", data: storms });
      else (map.getSource(STORM_SOURCE) as maplibregl.GeoJSONSource).setData(storms);
      if (!map.getLayer("atlas-storm-past")) {
        map.addLayer({
          id: "atlas-storm-past", type: "line", source: STORM_SOURCE, filter: ["==", ["get", "part"], "past"],
          paint: { "line-color": "#F0605D", "line-width": 2.5, "line-opacity": 0.85 },
        });
        map.addLayer({
          id: "atlas-storm-forecast", type: "line", source: STORM_SOURCE, filter: ["==", ["get", "part"], "forecast"],
          paint: { "line-color": "#F0605D", "line-width": 2, "line-opacity": 0.8, "line-dasharray": [2, 2] },
        });
        map.addLayer({
          id: "atlas-storm-eye", type: "circle", source: STORM_SOURCE, filter: ["==", ["get", "part"], "eye"],
          paint: { "circle-radius": 7, "circle-color": "#F0605D", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
        });
        map.addLayer({
          id: "atlas-storm-label", type: "symbol", source: STORM_SOURCE, filter: ["==", ["get", "part"], "eye"],
          layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.4], "text-font": ["Noto Sans Bold"] },
          paint: { "text-color": "#ffffff", "text-halo-color": "#7A1C1A", "text-halo-width": 1.4 },
        });
      }
    };

    const redraw = () => {
      setRainFrame();
      drawStorms();
    };

    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((j: { host?: string; radar?: { past?: Array<{ path: string }>; nowcast?: Array<{ path: string }> } }) => {
        if (cancelled) return;
        if (j.host) host = j.host;
        frames = [...(j.radar?.past ?? []), ...(j.radar?.nowcast ?? [])].slice(-8).map((f) => f.path);
        frameIdx = Math.max(0, frames.length - 1);
        setRainFrame();
        if (frames.length > 1 && !prefersReducedMotionNow()) {
          timer = window.setInterval(() => {
            frameIdx = (frameIdx + 1) % frames.length;
            setRainFrame();
          }, 900);
        }
      })
      .catch(() => {});

    fetch(`/api/weather/typhoons?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { storms?: Array<{ name: string; lat: number; lng: number; forecast?: Array<{ lat: number; lng: number }>; pastTrack?: Array<{ lat: number; lng: number }> }> }) => {
        if (cancelled || !j.storms?.length) return;
        const features: GeoJSON.Feature[] = [];
        for (const s of j.storms) {
          features.push({ type: "Feature", properties: { part: "eye", name: s.name }, geometry: { type: "Point", coordinates: [s.lng, s.lat] } });
          const past = [...(s.pastTrack ?? []).map((p) => [p.lng, p.lat]), [s.lng, s.lat]];
          if (past.length > 1) features.push({ type: "Feature", properties: { part: "past" }, geometry: { type: "LineString", coordinates: past } });
          const fc = [[s.lng, s.lat], ...(s.forecast ?? []).map((p) => [p.lng, p.lat])];
          if (fc.length > 1) features.push({ type: "Feature", properties: { part: "forecast" }, geometry: { type: "LineString", coordinates: fc } });
        }
        storms = { type: "FeatureCollection", features };
        drawStorms();
      })
      .catch(() => {});

    map.on("style.load", redraw);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      map.off("style.load", redraw);
      map.off("idle", setRainFrame);
      map.off("idle", drawStorms);
      try {
        for (const id of [RAIN_LAYER, "atlas-storm-label", "atlas-storm-eye", "atlas-storm-forecast", "atlas-storm-past"]) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(RAIN_SOURCE)) map.removeSource(RAIN_SOURCE);
        if (map.getSource(STORM_SOURCE)) map.removeSource(STORM_SOURCE);
      } catch {}
    };
  }, [map, weatherLayerOn]);

  return null;
}

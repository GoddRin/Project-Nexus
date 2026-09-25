"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as turf from "@turf/turf";
import * as maplibregl from "maplibre-gl";
import {
  Ruler,
  Maximize2,
  Undo2,
  Trash2,
  X,
  Check,
  Navigation2,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MeasurementMode = "distance" | "area";

export interface AtlasMeasurementWidgetProps {
  map: maplibregl.Map | null;
  isActive: boolean;
  onClose: () => void;
  className?: string;
}

export function AtlasMeasurementWidget({
  map,
  isActive,
  onClose,
  className,
}: AtlasMeasurementWidgetProps) {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [points, setPoints] = useState<[number, number][]>([]); // [[lng, lat], ...]
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const pointsRef = useRef<[number, number][]>([]);
  pointsRef.current = points;
  const isFinishedRef = useRef(false);
  isFinishedRef.current = isFinished;
  const modeRef = useRef<MeasurementMode>("distance");
  modeRef.current = mode;

  // Source & Layer IDs for MapLibre GeoJSON overlay
  const SOURCE_ID = "measurement-geojson-source";
  const LINE_LAYER_ID = "measurement-line-layer";
  const FILL_LAYER_ID = "measurement-fill-layer";
  const POINTS_LAYER_ID = "measurement-points-layer";

  // Ensure layers are registered on the map
  const ensureMeasurementLayers = useCallback(() => {
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(FILL_LAYER_ID)) {
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.15,
        },
      });
    }

    if (!map.getLayer(LINE_LAYER_ID)) {
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
        },
      });
    }

    if (!map.getLayer(POINTS_LAYER_ID)) {
      map.addLayer({
        id: POINTS_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#38bdf8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  }, [map]);

  // Clean up layers when exiting measurement mode
  const cleanupMeasurementLayers = useCallback(() => {
    if (!map) return;
    try {
      if (map.getLayer(POINTS_LAYER_ID)) map.removeLayer(POINTS_LAYER_ID);
      if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch {
      // Ignored if map was already unmounted
    }
  }, [map]);

  // Update GeoJSON source whenever points or mousePos change
  const updateGeoJson = useCallback(
    (currentPts: [number, number][], hoverPt: [number, number] | null) => {
      if (!map || !map.isStyleLoaded()) return;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const features: GeoJSON.Feature[] = [];

      // Point features for existing vertices
      currentPts.forEach((pt, idx) => {
        features.push({
          type: "Feature",
          id: `pt-${idx}`,
          geometry: { type: "Point", coordinates: pt },
          properties: { index: idx },
        });
      });

      // Construct line / polygon coordinates with active mouse hover point
      const activeCoords = [...currentPts];
      if (hoverPt && !isFinishedRef.current) {
        activeCoords.push(hoverPt);
      }

      if (activeCoords.length >= 2) {
        if (modeRef.current === "distance") {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: activeCoords },
            properties: {},
          });
        } else if (modeRef.current === "area" && activeCoords.length >= 3) {
          // Closed polygon ring
          const closedRing = [...activeCoords, activeCoords[0]];
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [closedRing] },
            properties: {},
          });
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: closedRing },
            properties: {},
          });
        } else {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: activeCoords },
            properties: {},
          });
        }
      }

      source.setData({
        type: "FeatureCollection",
        features,
      });
    },
    [map]
  );

  // Measure calculations via Turf.js
  const measurementResult = React.useMemo(() => {
    if (points.length < 2) return null;

    if (mode === "distance") {
      try {
        const line = turf.lineString(points);
        const km = turf.length(line, { units: "kilometers" });
        const meters = km * 1000;
        return {
          type: "distance",
          primary: meters < 1000 ? `${meters.toFixed(1)} m` : `${km.toFixed(2)} km`,
          secondary: meters < 1000 ? `${km.toFixed(3)} km` : `${Math.round(meters)} m`,
          pointsCount: points.length,
        };
      } catch {
        return null;
      }
    } else {
      if (points.length < 3) return null;
      try {
        const closed = [...points, points[0]];
        const polygon = turf.polygon([closed]);
        const sqMeters = turf.area(polygon);
        const hectares = sqMeters / 10000;
        const sqKm = sqMeters / 1000000;

        return {
          type: "area",
          primary:
            hectares >= 1
              ? `${hectares.toFixed(2)} ha`
              : `${Math.round(sqMeters).toLocaleString()} m²`,
          secondary:
            sqKm >= 1
              ? `${sqKm.toFixed(3)} km²`
              : `${Math.round(sqMeters).toLocaleString()} m²`,
          pointsCount: points.length,
        };
      } catch {
        return null;
      }
    }
  }, [points, mode]);

  // Handle map clicks to place measurement vertices
  useEffect(() => {
    if (!map || !isActive) return;

    ensureMeasurementLayers();
    map.getCanvas().style.cursor = "crosshair";

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (isFinishedRef.current) return;
      const newPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPoints((prev) => {
        const next = [...prev, newPt];
        updateGeoJson(next, null);
        return next;
      });
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (isFinishedRef.current) return;
      const hover: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setMousePos(hover);
      updateGeoJson(pointsRef.current, hover);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      map.getCanvas().style.cursor = "";
      cleanupMeasurementLayers();
    };
  }, [map, isActive, onClose, ensureMeasurementLayers, cleanupMeasurementLayers, updateGeoJson]);

  // Actions
  const handleUndo = () => {
    setPoints((prev) => {
      const next = prev.slice(0, -1);
      setIsFinished(false);
      updateGeoJson(next, mousePos);
      return next;
    });
  };

  const handleClear = () => {
    setPoints([]);
    setIsFinished(false);
    updateGeoJson([], null);
  };

  const handleFinish = () => {
    setIsFinished(true);
    updateGeoJson(points, null);
  };

  if (!isActive) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center gap-2 p-2 px-3 rounded-2xl bg-white/95 dark:bg-[#081321]/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 text-slate-800 dark:text-slate-100 text-xs font-mono",
        className
      )}
    >
      {/* 1. Mode Selector */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => {
            setMode("distance");
            handleClear();
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
            mode === "distance"
              ? "bg-[#0284C7] text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Distance</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("area");
            handleClear();
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
            mode === "area"
              ? "bg-[#0284C7] text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Area</span>
        </button>
      </div>

      {/* 2. Measurement Metric Readout */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0 min-w-[140px] text-center justify-center">
        {measurementResult ? (
          <div>
            <span className="text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {measurementResult.primary}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">
              ({measurementResult.secondary})
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            {points.length === 0
              ? "Click map to start"
              : mode === "area" && points.length < 3
              ? `Need ${3 - points.length} more point${3 - points.length > 1 ? "s" : ""}`
              : "Click to extend"}
          </span>
        )}
      </div>

      {/* 3. Action Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {points.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Undo last point"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Clear measurement"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {!isFinished && (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Finish measurement"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Finish</span>
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ml-1"
          title="Close measurement (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

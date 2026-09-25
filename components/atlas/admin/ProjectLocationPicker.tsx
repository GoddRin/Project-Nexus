"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  PH_LAT_MIN,
  PH_LAT_MAX,
  PH_LNG_MIN,
  PH_LNG_MAX,
} from "@/lib/validations/projectAtlasSchema";
import { MapPin, Navigation, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// Configure local worker to prevent remote worker failures in Next.js
if (typeof window !== "undefined" && typeof (maplibregl as any).setWorkerUrl === "function") {
  (maplibregl as any).setWorkerUrl("/maplibre-gl-worker.mjs");
}

const GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const MINI_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    "esri-dark": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "esri-dark-layer",
      type: "raster",
      source: "esri-dark",
      minzoom: 0,
    },
  ],
};

const MINI_LIGHT_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    "esri-light": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "esri-light-layer",
      type: "raster",
      source: "esri-light",
      minzoom: 0,
    },
  ],
};

interface CameraPreset {
  label: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
}

// Camera positioning helpers only. Does NOT infer administrative region.
const CAMERA_PRESETS: CameraPreset[] = [
  { label: "Luzon North", center: [121.2, 17.2], zoom: 6.5 },
  { label: "NCR / Central", center: [121.0, 14.6], zoom: 8.5 },
  { label: "Visayas", center: [123.5, 10.8], zoom: 6.8 },
  { label: "Mindanao", center: [125.0, 7.8], zoom: 6.5 },
];

export interface ProjectLocationPickerProps {
  latitude: number | undefined;
  longitude: number | undefined;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export function ProjectLocationPicker({
  latitude,
  longitude,
  onChange,
  className,
}: ProjectLocationPickerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Local text input states to allow natural typing
  const [latInput, setLatInput] = useState<string>(
    latitude !== undefined ? latitude.toFixed(6) : "12.879700"
  );
  const [lngInput, setLngInput] = useState<string>(
    longitude !== undefined ? longitude.toFixed(6) : "121.774000"
  );

  const currentLat = parseFloat(latInput);
  const currentLng = parseFloat(lngInput);

  const isValidLat = !isNaN(currentLat) && currentLat >= PH_LAT_MIN && currentLat <= PH_LAT_MAX;
  const isValidLng = !isNaN(currentLng) && currentLng >= PH_LNG_MIN && currentLng <= PH_LNG_MAX;
  const isCoordinatesValid = isValidLat && isValidLng;

  // Sync inputs if props change from outside
  useEffect(() => {
    if (latitude !== undefined && Math.abs(parseFloat(latInput) - latitude) > 0.000001) {
      setLatInput(latitude.toFixed(6));
    }
  }, [latitude]);

  useEffect(() => {
    if (longitude !== undefined && Math.abs(parseFloat(lngInput) - longitude) > 0.000001) {
      setLngInput(longitude.toFixed(6));
    }
  }, [longitude]);

  // Update marker on map
  const updateMarkerPosition = useCallback((lng: number, lat: number) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "scic-picker-marker";
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.cursor = "grab";
      el.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; background: #10B981; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(16, 185, 129, 0.7); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div>
        </div>
      `;

      markerRef.current = new maplibregl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      markerRef.current.on("dragend", () => {
        const lngLat = markerRef.current!.getLngLat();
        const newLat = parseFloat(lngLat.lat.toFixed(6));
        const newLng = parseFloat(lngLat.lng.toFixed(6));
        setLatInput(newLat.toFixed(6));
        setLngInput(newLng.toFixed(6));
        onChange(newLat, newLng);
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [onChange]);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = !isNaN(currentLat) && isValidLat ? currentLat : 12.8797;
    const initialLng = !isNaN(currentLng) && isValidLng ? currentLng : 121.774;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isDark ? MINI_DARK_STYLE : MINI_LIGHT_STYLE,
      center: [initialLng, initialLat], // [lng, lat]
      zoom: 5.5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      updateMarkerPosition(initialLng, initialLat);
    });

    // Click map to reposition marker
    map.on("click", (e) => {
      const clickLng = parseFloat(e.lngLat.lng.toFixed(6));
      const clickLat = parseFloat(e.lngLat.lat.toFixed(6));
      setLatInput(clickLat.toFixed(6));
      setLngInput(clickLng.toFixed(6));
      updateMarkerPosition(clickLng, clickLat);
      onChange(clickLat, clickLng);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(isDark ? MINI_DARK_STYLE : MINI_LIGHT_STYLE);
  }, [isDark]);

  // Handle manual input changes
  const handleLatChange = (val: string) => {
    setLatInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n >= PH_LAT_MIN && n <= PH_LAT_MAX && !isNaN(currentLng) && isValidLng) {
      updateMarkerPosition(currentLng, n);
      onChange(n, currentLng);
    }
  };

  const handleLngChange = (val: string) => {
    setLngInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n >= PH_LNG_MIN && n <= PH_LNG_MAX && !isNaN(currentLat) && isValidLat) {
      updateMarkerPosition(n, currentLat);
      onChange(currentLat, n);
    }
  };

  const handleCenterOnCoordinates = () => {
    if (isCoordinatesValid && mapRef.current) {
      mapRef.current.flyTo({
        center: [currentLng, currentLat], // [lng, lat]
        zoom: 12,
        duration: 1000,
      });
      updateMarkerPosition(currentLng, currentLat);
    }
  };

  const handlePresetClick = (preset: CameraPreset) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: preset.center,
      zoom: preset.zoom,
      duration: 1000,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top Coordinate Readouts and Validation Badge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Latitude (N)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Envelope: {PH_LAT_MIN}° – {PH_LAT_MAX}°
            </span>
          </label>
          <div className="relative mt-1">
            <input
              type="number"
              step="0.000001"
              value={latInput}
              onChange={(e) => handleLatChange(e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2",
                isValidLat
                  ? "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                  : "border-rose-400 dark:border-rose-600 focus:ring-rose-500 text-rose-600 dark:text-rose-400"
              )}
              placeholder="e.g. 17.279800"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Longitude (E)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Envelope: {PH_LNG_MIN}° – {PH_LNG_MAX}°
            </span>
          </label>
          <div className="relative mt-1">
            <input
              type="number"
              step="0.000001"
              value={lngInput}
              onChange={(e) => handleLngChange(e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2",
                isValidLng
                  ? "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                  : "border-rose-400 dark:border-rose-600 focus:ring-rose-500 text-rose-600 dark:text-rose-400"
              )}
              placeholder="e.g. 121.821400"
            />
          </div>
        </div>
      </div>

      {/* Envelope Notice / Status */}
      <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5">
          {isCoordinatesValid ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">
                Inside Atlas geographic validation envelope:{" "}
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </span>
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Coordinates outside Atlas validation envelope ({PH_LAT_MIN}°–{PH_LAT_MAX}°N, {PH_LNG_MIN}°–{PH_LNG_MAX}°E)
              </span>
            </>
          )}
        </div>

        {isCoordinatesValid && (
          <button
            type="button"
            onClick={handleCenterOnCoordinates}
            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            <Navigation className="w-3 h-3" /> Focus Pin
          </button>
        )}
      </div>

      {/* Map Canvas with Camera Presets Bar */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-950">
        {/* Interactive Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-64 md:h-80" />

        {/* Camera Preset Helpers Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-lg text-[11px]">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Camera:</span>
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePresetClick(p)}
              className="px-2 py-0.5 rounded text-slate-200 hover:text-white hover:bg-slate-700/80 transition-colors font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Legend Hint Overlay */}
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[11px] text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span>Click anywhere or drag marker to set exact location</span>
        </div>
      </div>
    </div>
  );
}

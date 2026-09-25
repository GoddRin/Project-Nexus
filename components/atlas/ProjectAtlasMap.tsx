"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/(dashboard)/dashboard/projects-map/ProjectRadarMarker.css";
import {
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Maximize,
  Minimize,
  Navigation,
  Ruler,
} from "lucide-react";
import type {
  AtlasFeatureCollection,
  AtlasGeoJsonProperties,
} from "@/lib/services/projectAtlasService";
import { AtlasMapLegend } from "./AtlasMapLegend";
import {
  AtlasBaseStyle,
  PHILIPPINES_BOUNDS,
  useOptionalAtlasMap,
} from "./AtlasMapContext";
export type { AtlasBaseStyle };
import {
  ensureAtlasMarkerIcons,
  CATEGORY_ICON_REGISTRY,
  toCanonicalCategory,
} from "./AtlasMarkerIcons";
import {
  ensureAtlasAnimatedImages,
  ATLAS_EFFECTS_CONFIG,
} from "./AtlasAnimatedMarkers";
export { ATLAS_EFFECTS_CONFIG };
import {
  GIS_LAYER_REGISTRY,
  convertOverpassOsmToGeoJson,
} from "@/lib/gis/gisLayerRegistry";
import {
  getVerifiedProjectGeometriesGeoJson,
  getProjectGeometry,
} from "@/lib/data/scicProjectGeometries";
import { AtlasLayerControl } from "./AtlasLayerControl";
import { AtlasMeasurementWidget } from "./AtlasMeasurementWidget";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProjectAtlasMapProps {
  geoJson: AtlasFeatureCollection | null;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  targetCoords?: [number, number] | null; // [lat, lng]
  targetBounds?: [[number, number], [number, number]] | null; // [[minLat, minLng], [maxLat, maxLng]]
  targetZoom?: number;
  currentStyle?: AtlasBaseStyle;
  onStyleChange?: (style: AtlasBaseStyle) => void;
  activeGisLayers?: Set<string>;
  onToggleGisLayer?: (layerId: string) => void;
  isMeasuring?: boolean;
  onToggleMeasuring?: (measuring: boolean) => void;
  className?: string;
}

// Standardized Corporate Infrastructure GIS Basemap Style Specifications
const GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

// Configure local worker to prevent remote worker failures in Next.js
if (typeof window !== "undefined" && typeof (maplibregl as any).setWorkerUrl === "function") {
  (maplibregl as any).setWorkerUrl("/maplibre-gl-worker.mjs");
}

export const DARK_STYLE_SPEC: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    "esri-dark-base": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri, DeLorme, NAVTEQ",
      maxzoom: 16,
    },
    "esri-dark-reference": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "esri-dark-base-layer",
      type: "raster",
      source: "esri-dark-base",
      minzoom: 0,
    },
    {
      id: "esri-dark-reference-layer",
      type: "raster",
      source: "esri-dark-reference",
      minzoom: 0,
    },
  ],
};

export const LIGHT_STYLE_SPEC: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    "esri-light-base": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri, DeLorme, NAVTEQ",
      maxzoom: 15,
    },
    "esri-light-reference": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 15,
    },
  },
  layers: [
    {
      id: "esri-light-base-layer",
      type: "raster",
      source: "esri-light-base",
      minzoom: 0,
    },
    {
      id: "esri-light-reference-layer",
      type: "raster",
      source: "esri-light-reference",
      minzoom: 0,
    },
  ],
};

export const SATELLITE_STYLE_SPEC: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri, Maxar, Earthstar Geographics",
      maxzoom: 18,
    },
    "esri-boundaries-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: "esri-imagery-layer",
      type: "raster",
      source: "esri-world-imagery",
      minzoom: 0,
    },
    {
      id: "esri-labels-layer",
      type: "raster",
      source: "esri-boundaries-labels",
      minzoom: 0,
    },
  ],
};

export const BASE_STYLES: Record<AtlasBaseStyle, maplibregl.StyleSpecification> = {
  DARK: DARK_STYLE_SPEC,
  LIGHT: LIGHT_STYLE_SPEC,
  SATELLITE: SATELLITE_STYLE_SPEC,
};

export function createUnifiedStyleSpec(initialStyle: AtlasBaseStyle = "DARK"): maplibregl.StyleSpecification {
  const isDark = initialStyle === "DARK";
  const isLight = initialStyle === "LIGHT";
  const isSat = initialStyle === "SATELLITE";

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      "esri-dark-base": DARK_STYLE_SPEC.sources["esri-dark-base"],
      "esri-dark-reference": DARK_STYLE_SPEC.sources["esri-dark-reference"],
      "esri-light-base": LIGHT_STYLE_SPEC.sources["esri-light-base"],
      "esri-light-reference": LIGHT_STYLE_SPEC.sources["esri-light-reference"],
      "esri-world-imagery": SATELLITE_STYLE_SPEC.sources["esri-world-imagery"],
      "esri-boundaries-labels": SATELLITE_STYLE_SPEC.sources["esri-boundaries-labels"],
    },
    layers: [
      {
        id: "esri-dark-base-layer",
        type: "raster",
        source: "esri-dark-base",
        minzoom: 0,
        layout: { visibility: isDark ? "visible" : "none" },
      },
      {
        id: "esri-dark-reference-layer",
        type: "raster",
        source: "esri-dark-reference",
        minzoom: 0,
        layout: { visibility: isDark ? "visible" : "none" },
      },
      {
        id: "esri-light-base-layer",
        type: "raster",
        source: "esri-light-base",
        minzoom: 0,
        layout: { visibility: isLight ? "visible" : "none" },
      },
      {
        id: "esri-light-reference-layer",
        type: "raster",
        source: "esri-light-reference",
        minzoom: 0,
        layout: { visibility: isLight ? "visible" : "none" },
      },
      {
        id: "esri-imagery-layer",
        type: "raster",
        source: "esri-world-imagery",
        minzoom: 0,
        layout: { visibility: isSat ? "visible" : "none" },
      },
      {
        id: "esri-labels-layer",
        type: "raster",
        source: "esri-boundaries-labels",
        minzoom: 0,
        layout: { visibility: isSat ? "visible" : "none" },
      },
    ],
  };
}

/**
 * Retrieves all leaves (individual project points) for a given cluster
 * through pagination to avoid the 100-leaf ceiling.
 */
async function fetchAllClusterLeaves(
  source: maplibregl.GeoJSONSource,
  clusterId: number,
  totalCount: number
): Promise<GeoJSON.Feature<GeoJSON.Point>[]> {
  const pageSize = 100;
  const leaves: GeoJSON.Feature<GeoJSON.Point>[] = [];
  let offset = 0;
  const maxLoops = 50; // Safety guard for up to 5,000 projects per cluster
  let loopCount = 0;

  while (offset < totalCount && loopCount < maxLoops) {
    loopCount++;
    try {
      const batch = await source.getClusterLeaves(clusterId, pageSize, offset);
      if (!batch || batch.length === 0) break;
      leaves.push(...(batch as GeoJSON.Feature<GeoJSON.Point>[]));
      offset += batch.length;
      if (batch.length < pageSize) break;
    } catch (err) {
      console.warn("[ProjectAtlasMap] Error fetching cluster leaves batch:", err);
      break;
    }
  }

  return leaves;
}

export function ProjectAtlasMap({
  geoJson,
  selectedProjectId: propSelectedId,
  onSelectProject,
  targetCoords,
  targetBounds,
  targetZoom,
  currentStyle: propCurrentStyle,
  onStyleChange,
  activeGisLayers: propActiveGisLayers,
  onToggleGisLayer: propOnToggleGisLayer,
  isMeasuring: propIsMeasuring,
  onToggleMeasuring: propOnToggleMeasuring,
  className,
}: ProjectAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const selectedReticleMarkerRef = useRef<maplibregl.Marker | null>(null);
  
  // Optional Context consumption (falls back gracefully if mounted outside provider)
  const context = useOptionalAtlasMap();

  const activeSelectedId = propSelectedId ?? context?.selectedProjectId ?? null;
  const activeStyle = propCurrentStyle ?? context?.mapStyle ?? "DARK";

  const activeGisLayers = propActiveGisLayers ?? context?.activeGisLayers ?? new Set(["projects"]);
  const onToggleGisLayer = propOnToggleGisLayer ?? context?.toggleGisLayer ?? (() => {});
  const activeGisLayersRef = useRef<Set<string>>(activeGisLayers);
  activeGisLayersRef.current = activeGisLayers;

  const isMeasuring = propIsMeasuring ?? context?.isMeasuring ?? false;
  const setIsMeasuring = propOnToggleMeasuring ?? context?.setIsMeasuring ?? (() => {});
  const isMeasuringRef = useRef<boolean>(isMeasuring);
  isMeasuringRef.current = isMeasuring;

  // Static/lazy caches to avoid re-fetching identical GIS payloads
  const boundariesCacheRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const roadsCacheRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const riversCacheRef = useRef<GeoJSON.FeatureCollection | null>(null);

  const currentStyleRef = useRef<AtlasBaseStyle>(activeStyle);
  const geoJsonRef = useRef<AtlasFeatureCollection | null>(geoJson);
  geoJsonRef.current = geoJson;
  const activeSelectedIdRef = useRef<string | null>(activeSelectedId);
  activeSelectedIdRef.current = activeSelectedId;

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(5.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Sync fullscreen icon with context state (context is the source of truth when mounted inside AtlasMapProvider)
  const displayIsFullscreen = context?.isFullscreen ?? isFullscreen;

  // Responsive padding calculation for fitting Philippine bounds
  const getResponsivePadding = useCallback(() => {
    if (typeof window === "undefined") {
      return { top: 48, bottom: 48, left: 48, right: 48 };
    }
    const isMobile = window.innerWidth < 768;
    return isMobile
      ? { top: 48, bottom: 100, left: 24, right: 24 }
      : { top: 48, bottom: 48, left: 48, right: 48 };
  }, []);

  // Add / Re-attach Source and Layers
  const setupSourceAndLayers = useCallback(
    async (
      map: maplibregl.Map,
      data: AtlasFeatureCollection | null,
      selectedId: string | null
    ) => {
      if (!map.isStyleLoaded()) {
        map.once("style.load", () => {
          setupSourceAndLayers(map, data, selectedId);
        });
        return;
      }

      // Ensure crisp high-DPI category SVG icons are registered
      await ensureAtlasMarkerIcons(map);
      // Ensure dynamic 60 FPS hardware-accelerated animated canvas textures are registered
      ensureAtlasAnimatedImages(map);

      // Remove existing custom layers if present
      const layerIds = [
        "project-points-selected",
        "project-selected-halo",
        "project-points-hover",
        "project-points",
        "project-sector-ripples",
        "project-ongoing-pulse",
        "project-upcoming-pulse",
        "project-completed-aura",
        "project-active-pulse",
        "cluster-count",
        "clusters",
        "clusters-pulse",
      ];
      for (const id of layerIds) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource("scic-projects")) {
        map.removeSource("scic-projects");
      }

      const featureData: GeoJSON.FeatureCollection = data || {
        type: "FeatureCollection",
        features: [],
      };

      // Native Clustered GeoJSON Source
      map.addSource("scic-projects", {
        type: "geojson",
        data: featureData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // 0. Cluster Breathing Geo-Density Aura Layer (WebGL animated canvas)
      if (ATLAS_EFFECTS_CONFIG.enableClusterBreathingHalo) {
        map.addLayer({
          id: "clusters-pulse",
          type: "symbol",
          source: "scic-projects",
          filter: ["has", "point_count"],
          layout: {
            "icon-image": "cluster-pulse-halo",
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.65,
              9, 0.9,
              13, 1.15,
            ],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }

      // 1. Cluster Circles Layer (Corporate Stepped Hierarchy)
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "scic-projects",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#0284c7", // < 5 Projects: Sky Blue
            5,
            "#0369a1", // 5-15 Projects: Ocean Blue
            15,
            "#075985", // > 15 Projects: Deep Navy
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            5,
            24,
            15,
            30,
          ],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      // 2. Cluster Count Text Layer
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "scic-projects",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "point_count"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // 3. Ongoing Projects: Hardware-Accelerated Radar Sonar Pulse & Breathing Glow
      map.addLayer({
        id: "project-ongoing-pulse",
        type: "symbol",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "status"], "ONGOING"],
        ],
        layout: {
          "icon-image": "radar-pulse-ongoing",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.65,
            9, 0.85,
            13, 1.05,
            17, 1.25,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // 4. Upcoming Projects: Rotating Dashed Amber Orbit & Mobilization Strobe
      map.addLayer({
        id: "project-upcoming-pulse",
        type: "symbol",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "status"], "UPCOMING"],
        ],
        layout: {
          "icon-image": "orbit-ring-upcoming",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.65,
            9, 0.85,
            13, 1.05,
            17, 1.25,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // 5. Completed Projects: Architectural Halo & Periodic Inspection Shimmer
      map.addLayer({
        id: "project-completed-aura",
        type: "symbol",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "status"], "COMPLETED"],
        ],
        layout: {
          "icon-image": "aura-ring-completed",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 0.65,
            9, 0.85,
            13, 1.05,
            17, 1.25,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // 6. Sector Wave Ripples (Renewable Energy & Water Hydrodynamic Waves)
      if (ATLAS_EFFECTS_CONFIG.enableSectorMicroEffects) {
        map.addLayer({
          id: "project-sector-ripples",
          type: "symbol",
          source: "scic-projects",
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            [
              "any",
              ["==", ["get", "category"], "HYDROPOWER"],
              ["==", ["get", "category"], "WATER_RESOURCES"],
            ],
          ],
          layout: {
            "icon-image": "sector-wave-ripple",
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.7,
              9, 0.9,
              13, 1.15,
              17, 1.35,
            ],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }

      // 7. Ongoing / Active Construction Status Indicator (Restrained halo, visible at mid/close zoom)
      map.addLayer({
        id: "project-active-pulse",
        type: "circle",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "isPulse"], true],
        ],
        paint: {
          "circle-color": "#10B981",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            12,
            9,
            15,
            13,
            18,
            17,
            22,
          ],
          "circle-opacity": 0.18,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#10B981",
          "circle-stroke-opacity": 0.6,
        },
      });

      // 8. Selected Project Highlight Ring Layer (Cyan Halo)
      map.addLayer({
        id: "project-selected-halo",
        type: "circle",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "id"], selectedId || "__NONE__"],
        ],
        paint: {
          "circle-color": "transparent",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            14,
            9,
            18,
            13,
            22,
            17,
            26,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#00E5FF",
          "circle-stroke-opacity": 0.95,
        },
      });

      // 5. Unclustered Individual Project Points Symbol Layer (Category-Specific SVG Badges)
      map.addLayer({
        id: "project-points",
        type: "symbol",
        source: "scic-projects",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "match",
            ["get", "category"],
            "HYDROPOWER", "marker-hydro",
            "WIND_POWER", "marker-wind",
            "WATER_RESOURCES", "marker-water",
            "ROADS_HIGHWAYS", "marker-roads",
            "BRIDGES", "marker-bridge",
            "RAIL_TRANSIT", "marker-rail",
            "BUILDINGS", "marker-buildings",
            "INDUSTRIAL", "marker-industrial",
            "ENERGY_GRID", "marker-grid",
            "MINING_TUNNELING", "marker-tunnel",
            "marker-other",
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.65,
            9,
            0.8,
            13,
            0.95,
            17,
            1.15,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // 6. Hover Highlight Symbol Layer (Subtle enlargement on hover)
      map.addLayer({
        id: "project-points-hover",
        type: "symbol",
        source: "scic-projects",
        filter: ["==", ["get", "id"], "__NONE__"],
        layout: {
          "icon-image": [
            "match",
            ["get", "category"],
            "HYDROPOWER", "marker-hydro",
            "WIND_POWER", "marker-wind",
            "WATER_RESOURCES", "marker-water",
            "ROADS_HIGHWAYS", "marker-roads",
            "BRIDGES", "marker-bridge",
            "RAIL_TRANSIT", "marker-rail",
            "BUILDINGS", "marker-buildings",
            "INDUSTRIAL", "marker-industrial",
            "ENERGY_GRID", "marker-grid",
            "MINING_TUNNELING", "marker-tunnel",
            "marker-other",
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.78,
            9,
            0.95,
            13,
            1.12,
            17,
            1.35,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // 7. Selected Project Prominent Symbol Layer (Prominently scaled inside the Cyan Halo)
      map.addLayer({
        id: "project-points-selected",
        type: "symbol",
        source: "scic-projects",
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "id"], selectedId || "__NONE__"],
        ],
        layout: {
          "icon-image": [
            "match",
            ["get", "category"],
            "HYDROPOWER", "marker-hydro",
            "WIND_POWER", "marker-wind",
            "WATER_RESOURCES", "marker-water",
            "ROADS_HIGHWAYS", "marker-roads",
            "BRIDGES", "marker-bridge",
            "RAIL_TRANSIT", "marker-rail",
            "BUILDINGS", "marker-buildings",
            "INDUSTRIAL", "marker-industrial",
            "ENERGY_GRID", "marker-grid",
            "MINING_TUNNELING", "marker-tunnel",
            "marker-other",
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.82,
            9,
            1.02,
            13,
            1.22,
            17,
            1.45,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Synchronize active GIS layers according to registry
      await syncGisLayers(map, activeGisLayersRef.current, selectedId);
    },
    []
  );

  // Synchronize GIS layers (Administrative Boundaries, Footprints, Infrastructure)
  const syncGisLayers = useCallback(
    async (
      map: maplibregl.Map,
      layers: Set<string>,
      selectedId: string | null
    ) => {
      if (!map.isStyleLoaded()) return;

      // 1. Projects Core Layer Visibility
      const isProjectsVisible = layers.has("projects");
      const projectLayerIds = [
        "clusters-pulse",
        "clusters",
        "cluster-count",
        "project-ongoing-pulse",
        "project-upcoming-pulse",
        "project-completed-aura",
        "project-sector-ripples",
        "project-active-pulse",
        "project-points",
        "project-points-hover",
        "project-selected-halo",
        "project-points-selected",
      ];
      for (const id of projectLayerIds) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", isProjectsVisible ? "visible" : "none");
        }
      }

      // 2. Administrative Boundaries Layer
      const adminDef = GIS_LAYER_REGISTRY["admin-boundaries"];
      if (layers.has("admin-boundaries")) {
        if (!map.getSource(adminDef.sourceId)) {
          try {
            if (!boundariesCacheRef.current) {
              const res = await fetch("/api/regional-map/boundary");
              if (res.ok) {
                boundariesCacheRef.current = await res.json();
              }
            }
            if (boundariesCacheRef.current && !map.getSource(adminDef.sourceId)) {
              map.addSource(adminDef.sourceId, {
                type: "geojson",
                data: boundariesCacheRef.current,
              });
            }
          } catch (err) {
            console.warn("[ProjectAtlasMap] Failed to load administrative boundaries:", err);
          }
        }
        if (map.getSource(adminDef.sourceId)) {
          for (const layer of adminDef.layers) {
            if (!map.getLayer(layer.id)) {
              map.addLayer(layer);
            }
            map.setLayoutProperty(layer.id, "visibility", "visible");
          }
        }
      } else {
        for (const layerId of adminDef.layerIds) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
          }
        }
      }

      // 3. Project Footprints Layer (Verified geometries)
      // Spec: The boundary should only appear when the project is selected or when the user enables the layer.
      const footprintsDef = GIS_LAYER_REGISTRY["project-footprints"];
      const isFootprintLayerActive = layers.has("project-footprints");
      const selectedHasFootprint = !!selectedId && !!getProjectGeometry(selectedId);
      const shouldShowFootprints = isFootprintLayerActive || selectedHasFootprint;

      if (shouldShowFootprints) {
        if (!map.getSource(footprintsDef.sourceId)) {
          const footprintsGeoJson = getVerifiedProjectGeometriesGeoJson();
          map.addSource(footprintsDef.sourceId, {
            type: "geojson",
            data: footprintsGeoJson,
          });
        }
        for (const layer of footprintsDef.layers) {
          if (!map.getLayer(layer.id)) {
            map.addLayer(layer);
          }
          map.setLayoutProperty(layer.id, "visibility", "visible");
        }

        // If layer is NOT toggled globally, restrict fill/line/label to the selected project only
        if (!isFootprintLayerActive && selectedId) {
          if (map.getLayer("project-footprints-fill")) {
            map.setFilter("project-footprints-fill", ["==", ["get", "projectId"], selectedId]);
          }
          if (map.getLayer("project-footprints-line")) {
            map.setFilter("project-footprints-line", ["==", ["get", "projectId"], selectedId]);
          }
          if (map.getLayer("project-footprints-label")) {
            map.setFilter("project-footprints-label", ["==", ["get", "projectId"], selectedId]);
          }
        } else {
          // Layer is enabled globally -> show all footprints
          if (map.getLayer("project-footprints-fill")) {
            map.setFilter("project-footprints-fill", null);
          }
          if (map.getLayer("project-footprints-line")) {
            map.setFilter("project-footprints-line", null);
          }
          if (map.getLayer("project-footprints-label")) {
            map.setFilter("project-footprints-label", null);
          }
        }

        // Highlight selected footprint border prominently
        if (map.getLayer("project-footprints-selected-highlight")) {
          map.setFilter("project-footprints-selected-highlight", [
            "==",
            ["get", "projectId"],
            selectedId || "__NONE__",
          ]);
        }
      } else {
        for (const layerId of footprintsDef.layerIds) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
          }
        }
      }

      // 4. Infrastructure Context Layer (Roads & Rivers)
      const infraDef = GIS_LAYER_REGISTRY["infrastructure-context"];
      if (layers.has("infrastructure-context")) {
        try {
          if (!roadsCacheRef.current) {
            const res = await fetch("/api/regional-map/roads");
            if (res.ok) {
              const json = await res.json();
              roadsCacheRef.current = convertOverpassOsmToGeoJson(json);
            }
          }
          if (!riversCacheRef.current) {
            const res = await fetch("/api/regional-map/rivers");
            if (res.ok) {
              const json = await res.json();
              riversCacheRef.current = convertOverpassOsmToGeoJson(json);
            }
          }

          if (roadsCacheRef.current && !map.getSource("scic-infrastructure-roads")) {
            map.addSource("scic-infrastructure-roads", {
              type: "geojson",
              data: roadsCacheRef.current,
            });
          }
          if (riversCacheRef.current && !map.getSource("scic-infrastructure-rivers")) {
            map.addSource("scic-infrastructure-rivers", {
              type: "geojson",
              data: riversCacheRef.current,
            });
          }

          for (const layer of infraDef.layers) {
            if (!map.getLayer(layer.id) && map.getSource(layer.source)) {
              map.addLayer(layer);
            }
            if (map.getLayer(layer.id)) {
              map.setLayoutProperty(layer.id, "visibility", "visible");
            }
          }
        } catch (err) {
          console.warn("[ProjectAtlasMap] Failed to load infrastructure context:", err);
        }
      } else {
        for (const layerId of infraDef.layerIds) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "none");
          }
        }
      }
    },
    []
  );

  // Single MapLibre GL Map Instantiation
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createUnifiedStyleSpec(activeStyle),
      bounds: PHILIPPINES_BOUNDS,
      fitBoundsOptions: {
        padding: getResponsivePadding(),
      },
      minZoom: 4.8,
      maxZoom: 18.5,
      attributionControl: false,
      pitchWithRotate: true,
      dragRotate: true,
    });

    mapRef.current = map;
    context?.registerMapInstance(map);

    // Scale Control in bottom-left
    const scale = new maplibregl.ScaleControl({
      maxWidth: 140,
      unit: "metric",
    });
    map.addControl(scale, "bottom-left");

    map.on("load", () => {
      setIsMapLoaded(true);
      setupSourceAndLayers(map, geoJsonRef.current, activeSelectedIdRef.current);
    });

    map.on("style.load", () => {
      setupSourceAndLayers(map, geoJsonRef.current, activeSelectedIdRef.current);
    });

    map.on("error", (e) => {
      console.warn("[ProjectAtlasMap] MapLibre warning/error:", e);
    });

    map.on("rotate", () => {
      const b = Math.round(map.getBearing());
      setBearing(b);
      context?.updateViewportState({ bearing: b });
    });

    map.on("zoom", () => {
      const z = Number(map.getZoom().toFixed(1));
      setZoom(z);
      context?.updateViewportState({ zoom: z });
    });

    // 1. Cluster Click: Smooth Bounds Fit with Pagination & Edge Case Guard
    map.on("click", "clusters", async (e) => {
      if (isMeasuringRef.current) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const feature = features[0];
      const clusterId = feature?.properties?.cluster_id;
      const pointCount = Number(feature?.properties?.point_count) || 2;
      if (clusterId == null) return;

      const source = map.getSource("scic-projects") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      try {
        const pointGeom = feature.geometry as GeoJSON.Point;
        const clusterCoords = pointGeom?.coordinates as [number, number];
        const leaves = await fetchAllClusterLeaves(source, clusterId, pointCount);

        if (!leaves || leaves.length === 0) {
          const expansionZoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: clusterCoords,
            zoom: Math.min(expansionZoom + 0.5, 15),
            duration: 850,
          });
          return;
        }

        // Calculate actual geographic extent across all cluster leaves
        const bounds = new maplibregl.LngLatBounds();
        let minLng = Infinity;
        let maxLng = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;

        leaves.forEach((leaf) => {
          if (
            leaf.geometry &&
            leaf.geometry.type === "Point" &&
            Array.isArray(leaf.geometry.coordinates)
          ) {
            const [lng, lat] = leaf.geometry.coordinates;
            bounds.extend([lng, lat]);
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        });

        const lngSpan = Math.abs(maxLng - minLng);
        const latSpan = Math.abs(maxLat - minLat);

        // Edge case: single-point or near-identical coordinates (< ~150m span)
        if (lngSpan < 0.0015 && latSpan < 0.0015) {
          const expansionZoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: [minLng, minLat],
            zoom: Math.min(Math.max(expansionZoom, map.getZoom() + 2), 15),
            duration: 850,
          });
        } else {
          map.fitBounds(bounds, {
            padding: getResponsivePadding(),
            maxZoom: 15,
            duration: 850,
          });
        }
      } catch (err) {
        console.warn("[ProjectAtlasMap] Cluster bounds zoom failed:", err);
      }
    });

    // 2. Project Selection on Click (both base and hover symbol layers)
    const handleProjectClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (isMeasuringRef.current) return;
      const feature = e.features?.[0];
      if (!feature) return;

      const props = feature.properties as AtlasGeoJsonProperties;
      if (onSelectProject) {
        onSelectProject(props.id);
      } else if (context) {
        context.selectProject(props.id);
      }

      const geom = feature.geometry as GeoJSON.Point;
      const coords = geom.coordinates as [number, number];

      map.flyTo({
        center: coords,
        zoom: Math.max(map.getZoom(), 13.5),
        duration: 1200,
        essential: true,
      });
    };

    map.on("click", "project-points", handleProjectClick);
    map.on("click", "project-points-hover", handleProjectClick);
    map.on("click", "project-points-selected", handleProjectClick);

    // 3. Cluster Hover Cursor
    map.on("mouseenter", "clusters", () => {
      if (isMeasuringRef.current) return;
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      if (isMeasuringRef.current) return;
      map.getCanvas().style.cursor = "";
    });

    // 4. Project Hover Scaling & Zero-Flicker Inspection Preview Card
    const handleProjectHover = (e: maplibregl.MapLayerMouseEvent) => {
      if (isMeasuringRef.current) return;
      map.getCanvas().style.cursor = "pointer";
      const feature = e.features?.[0];
      if (!feature) return;

      const props = feature.properties as AtlasGeoJsonProperties;
      const geom = feature.geometry as GeoJSON.Point;
      const coords = geom.coordinates.slice() as [number, number];

      // Instantaneous WebGL hover enlargement via dedicated hover symbol layer
      map.setFilter("project-points-hover", ["==", ["get", "id"], props.id]);

      // Category identity from canonical registry
      const canonicalCategory = toCanonicalCategory(props.category);
      const catConfig = CATEGORY_ICON_REGISTRY[canonicalCategory];
      const markerColor = catConfig?.color || props.color || "#0284C7";
      const categoryLabel = catConfig?.shortLabel || props.categoryLabel || "Infrastructure";
      const innerSvg = catConfig?.svgInnerPath || "";

      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: "bottom",
          offset: [0, -18],
          className: "scic-maplibre-popup pointer-events-none",
        });
      }

      const isOngoing = props.status === "ONGOING";
      const isCompleted = props.status === "COMPLETED";

      let statusBadge = "";
      if (isOngoing) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider scic-popup-status-active">
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            ACTIVE
          </span>
        `;
      } else if (isCompleted) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider scic-popup-status-completed">
            <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            COMPLETED
          </span>
        `;
      } else {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider scic-popup-status-upcoming">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            ${props.statusLabel || props.status}
          </span>
        `;
      }

      let metricLabel = "CAPACITY";
      let metricValue = props.capacity || "";

      if (!metricValue && props.projectValue) {
        metricLabel = "INVESTMENT";
        metricValue = props.projectValue;
      } else if (!metricValue && props.client) {
        metricLabel = "CLIENT";
        metricValue = props.client;
      } else if (!metricValue) {
        metricLabel = "LEAD PM";
        metricValue = props.leadPM || "SCIC Engineering";
      }

      const municipality = props.municipality || "";
      const province = props.province || "";
      const locationMain = [municipality, province].filter(Boolean).join(", ") || props.region || "Philippines";
      const regionTag = props.region && props.region !== province ? `<span class="ml-auto text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 scic-popup-region-tag">${props.region}</span>` : "";
      const codeBadge = props.projectCode ? `<span class="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold tracking-wider scic-popup-code mr-1.5">${props.projectCode}</span>` : "";

      const htmlContent = `
        <div class="scic-popup-card pointer-events-none select-none">
          <!-- Glowing top discipline laser bar -->
          <div class="scic-popup-laser" style="background: linear-gradient(90deg, transparent 0%, ${markerColor} 20%, ${markerColor} 80%, transparent 100%);"></div>

          <div class="scic-popup-inner">
            <!-- Ambient radial backlight -->
            <div class="scic-popup-glow" style="background: radial-gradient(ellipse 80% 50% at 50% 0%, ${markerColor}30 0%, transparent 70%);"></div>

            <!-- Main Content Body -->
            <div class="relative z-10 px-3.5 pt-3 pb-2.5">
              <!-- Header Rail: Discipline Badge + Operational Status -->
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-[0.12em] uppercase scic-popup-discipline" style="background: ${markerColor}15; border: 1px solid ${markerColor}35; color: ${markerColor};">
                  <svg class="h-3 w-3 shrink-0" viewBox="0 0 64 64" style="fill: ${markerColor}; color: ${markerColor};">${innerSvg}</svg>
                  <span class="truncate max-w-[125px]">${categoryLabel}</span>
                </div>
                <div class="shrink-0">
                  ${statusBadge}
                </div>
              </div>

              <!-- Project Title -->
              <div class="mb-2">
                <h4 class="text-[12.5px] font-bold scic-popup-title leading-[1.32] tracking-tight line-clamp-2">
                  ${props.name}
                </h4>
              </div>

              <!-- Location Coordinate Line -->
              <div class="flex items-center gap-1.5 scic-popup-loc">
                <svg class="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="text-[10px] font-mono truncate">${locationMain}</span>
                ${regionTag}
              </div>
            </div>

            <!-- Telemetry Shelf (Bottom Dock) -->
            <div class="relative z-10 px-3.5 py-2 flex items-center justify-between scic-popup-footer">
              <div class="min-w-0 pr-2">
                <span class="text-[8px] font-mono font-medium uppercase tracking-[0.14em] scic-popup-metric-label block leading-none mb-1">${metricLabel}</span>
                <span class="text-[11px] font-mono font-bold tracking-tight truncate block leading-none" style="color: ${markerColor};">${metricValue}</span>
              </div>
              <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9.5px] font-mono font-semibold shrink-0 scic-popup-cta">
                <span>Inspect</span>
                <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;

      popupRef.current.setLngLat(coords).setHTML(htmlContent).addTo(map);
    };

    const handleProjectLeave = (e: maplibregl.MapLayerMouseEvent) => {
      // Guard against flicker if cursor transitions between base and hover symbol layers
      if (e?.point) {
        const remaining = map.queryRenderedFeatures(e.point, {
          layers: ["project-points", "project-points-hover", "project-points-selected"],
        });
        if (remaining.length > 0) return;
      }

      map.getCanvas().style.cursor = "";
      map.setFilter("project-points-hover", ["==", ["get", "id"], "__NONE__"]);
      popupRef.current?.remove();
    };

    map.on("mouseenter", "project-points", handleProjectHover);
    map.on("mousemove", "project-points", handleProjectHover);
    map.on("mouseleave", "project-points", handleProjectLeave);
    map.on("mouseenter", "project-points-hover", handleProjectHover);
    map.on("mousemove", "project-points-hover", handleProjectHover);
    map.on("mouseleave", "project-points-hover", handleProjectLeave);
    map.on("mouseenter", "project-points-selected", handleProjectHover);
    map.on("mousemove", "project-points-selected", handleProjectHover);
    map.on("mouseleave", "project-points-selected", handleProjectLeave);

    // ResizeObserver for clean reflow without recreating map
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      popupRef.current?.remove();
      userMarkerRef.current?.remove();
      selectedReticleMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      context?.registerMapInstance(null);
    };
  }, []); // Empty dependency array ensures single lifecycle instantiation

  // Ensure map instance registration is synced with context
  useEffect(() => {
    if (mapRef.current && context?.registerMapInstance) {
      context.registerMapInstance(mapRef.current);
    }
  }, [context?.registerMapInstance]);

  // Sync GeoJSON data changes without tearing down MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource("scic-projects") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(
        geoJson || {
          type: "FeatureCollection",
          features: [],
        }
      );
    }
  }, [geoJson, isMapLoaded]);

  // Sync selected project highlight ring & prominent icon filters & tactical HUD reticle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const selectedFilter: any = [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "id"], activeSelectedId || "__NONE__"],
    ];

    if (map.getLayer("project-selected-halo")) {
      map.setFilter("project-selected-halo", selectedFilter);
    }
    if (map.getLayer("project-points-selected")) {
      map.setFilter("project-points-selected", selectedFilter);
    }
    if (map.getLayer("project-footprints-selected-highlight")) {
      map.setFilter("project-footprints-selected-highlight", [
        "==",
        ["get", "projectId"],
        activeSelectedId || "__NONE__",
      ]);
    }

    // Interactive Cybernetic Tactical Reticle DOM Overlay
    if (activeSelectedId && ATLAS_EFFECTS_CONFIG.enableSelectedCyberneticReticle) {
      const selectedFeature = geoJsonRef.current?.features?.find(
        (f) => f.properties?.id === activeSelectedId
      );
      if (selectedFeature && selectedFeature.geometry?.type === "Point") {
        const [lng, lat] = (selectedFeature.geometry as GeoJSON.Point).coordinates;
        if (!selectedReticleMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "scic-selected-reticle-container";
          el.innerHTML = `
            ${ATLAS_EFFECTS_CONFIG.enableSelectedGroundDropBeacon ? '<div class="scic-ground-drop-beacon"></div>' : ""}
            <div class="scic-radar-wave-1" style="color: #00E5FF;"></div>
            <div class="scic-radar-wave-2" style="color: #00E5FF;"></div>
            <div class="scic-selected-reticle">
              <span class="scic-pip-n"></span>
              <span class="scic-pip-s"></span>
              <span class="scic-pip-e"></span>
              <span class="scic-pip-w"></span>
            </div>
          `;
          selectedReticleMarkerRef.current = new maplibregl.Marker({
            element: el,
            anchor: "center",
          })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          selectedReticleMarkerRef.current.setLngLat([lng, lat]);
        }
      } else {
        selectedReticleMarkerRef.current?.remove();
        selectedReticleMarkerRef.current = null;
      }
    } else {
      selectedReticleMarkerRef.current?.remove();
      selectedReticleMarkerRef.current = null;
    }
  }, [activeSelectedId, isMapLoaded]);

  // Sync active GIS layers whenever state toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    syncGisLayers(map, activeGisLayers, activeSelectedId);
  }, [activeGisLayers, activeSelectedId, isMapLoaded, syncGisLayers]);

  // Instantaneous Style Switching via Basemap Layer Visibility (Zero reload / zero worker teardown)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    currentStyleRef.current = activeStyle;
    const isDark = activeStyle === "DARK";
    const isLight = activeStyle === "LIGHT";
    const isSat = activeStyle === "SATELLITE";

    if (map.getLayer("esri-dark-base-layer")) {
      map.setLayoutProperty("esri-dark-base-layer", "visibility", isDark ? "visible" : "none");
    }
    if (map.getLayer("esri-dark-reference-layer")) {
      map.setLayoutProperty("esri-dark-reference-layer", "visibility", isDark ? "visible" : "none");
    }
    if (map.getLayer("esri-light-base-layer")) {
      map.setLayoutProperty("esri-light-base-layer", "visibility", isLight ? "visible" : "none");
    }
    if (map.getLayer("esri-light-reference-layer")) {
      map.setLayoutProperty("esri-light-reference-layer", "visibility", isLight ? "visible" : "none");
    }
    if (map.getLayer("esri-imagery-layer")) {
      map.setLayoutProperty("esri-imagery-layer", "visibility", isSat ? "visible" : "none");
    }
    if (map.getLayer("esri-labels-layer")) {
      map.setLayoutProperty("esri-labels-layer", "visibility", isSat ? "visible" : "none");
    }
  }, [activeStyle, isMapLoaded]);

  // Handle external camera targets (targetCoords or targetBounds)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (targetCoords) {
      map.flyTo({
        center: [targetCoords[1], targetCoords[0]],
        zoom: targetZoom || 14.5,
        duration: 1500,
        essential: true,
      });
    } else if (targetBounds) {
      map.fitBounds(
        [
          [targetBounds[0][1], targetBounds[0][0]],
          [targetBounds[1][1], targetBounds[1][0]],
        ],
        {
          padding: getResponsivePadding(),
          duration: 1600,
          essential: true,
        }
      );
    }
  }, [targetCoords, targetBounds, targetZoom, isMapLoaded, getResponsivePadding]);

  // Reset to National Overview
  const handleResetNational = () => {
    if (context) {
      context.resetToNationalView();
    } else {
      mapRef.current?.fitBounds(PHILIPPINES_BOUNDS, {
        padding: getResponsivePadding(),
        bearing: 0,
        pitch: 0,
        duration: 1400,
        essential: true,
      });
    }
  };

  // Zoom In / Out
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  // Reset North Orientation
  const handleResetNorth = () => mapRef.current?.resetNorth({ duration: 500 });

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (context) {
      context.toggleFullscreen();
    } else if (typeof document !== "undefined") {
      const el = containerRef.current || document.documentElement;
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().then(() => setIsFullscreen(true));
      } else {
        document.exitFullscreen?.().then(() => setIsFullscreen(false));
      }
    }
  };

  // Optional User Geolocation Trigger
  const handleLocateUser = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { longitude, latitude } = position.coords;

        // Check if user is in Philippine region
        const inBounds =
          longitude >= 115.0 &&
          longitude <= 128.0 &&
          latitude >= 4.0 &&
          latitude <= 22.0;

        const map = mapRef.current;
        if (!map) return;

        if (!inBounds) {
          toast.info(
            "Your current location is outside the Philippines archipelago. Centering view..."
          );
        }

        // Add or update temporary location marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          const el = document.createElement("div");
          el.className =
            "h-4 w-4 rounded-full bg-[#00E5FF] border-2 border-white shadow-lg animate-pulse";
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }

        map.flyTo({
          center: [longitude, latitude],
          zoom: inBounds ? 12 : 7,
          duration: 1500,
        });

        toast.success("Location pinpointed.");
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location access permission was denied.");
        } else {
          toast.error("Unable to retrieve your current location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Sta. Clara National Infrastructure GIS Map"
      className={cn("relative w-full h-full overflow-hidden bg-slate-100 dark:bg-[#08121E]", className)}
    >
      {/* Floating Map Legend (Bottom-Left above Scale Bar) */}
      <div className="absolute bottom-10 left-3 z-30 pointer-events-auto">
        <AtlasMapLegend />
      </div>

      {/* Floating Measurement Widget (Top-Center, below top HUD row) */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <AtlasMeasurementWidget
          map={mapRef.current}
          isActive={isMeasuring}
          onClose={() => setIsMeasuring(false)}
        />
      </div>

      {/* Floating HUD Controls (Top-Right) */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end pointer-events-none">
        {/* Layer Control Popover */}
        <div className="pointer-events-auto">
          <AtlasLayerControl
            currentStyle={activeStyle}
            onStyleChange={(st) => {
              if (onStyleChange) onStyleChange(st);
              else context?.setMapStyle(st);
            }}
            activeGisLayers={activeGisLayers}
            onToggleGisLayer={onToggleGisLayer}
          />
        </div>

        {/* Navigation & GIS Controls */}
        <div className="flex flex-col rounded-xl bg-white/90 dark:bg-[#0B1726]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg pointer-events-auto overflow-hidden">
          {/* Turf.js Geodesic Measurement Toggle Button */}
          <button
            onClick={() => setIsMeasuring(!isMeasuring)}
            title={isMeasuring ? "Exit Measurement Mode (Esc)" : "Measure Distance / Area"}
            className={cn(
              "p-2 transition-colors border-b border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer",
              isMeasuring
                ? "bg-[#0284C7] text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10"
            )}
            aria-label="Toggle distance and area measurement tools"
          >
            <Ruler className={cn("h-4 w-4", isMeasuring ? "text-white" : "text-[#0284C7] dark:text-[#38BDF8]")} />
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors border-b border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Zoom in on map"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors border-b border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Zoom out of map"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetNorth}
            title="Reset North Orientation"
            style={{ transform: `rotate(${-bearing}deg)` }}
            className="p-2 text-slate-600 hover:text-[#0284C7] hover:bg-slate-100 dark:text-slate-300 dark:hover:text-[#0284C7] dark:hover:bg-white/10 transition-all flex items-center justify-center border-b border-slate-200 dark:border-white/10 cursor-pointer"
            aria-label="Reset map bearing to north"
          >
            <Compass className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetNational}
            title="Reset to National Overview"
            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-white/10 transition-colors border-b border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Reset map to national overview of the Philippines"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleLocateUser}
            title="Locate Current Position"
            className={cn(
              "p-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-sky-400 dark:hover:bg-white/10 transition-colors border-b border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer",
              isLocating && "animate-spin text-sky-500 dark:text-sky-400"
            )}
            aria-label="Locate my current position on map"
          >
            <Navigation className="h-4 w-4" />
          </button>
          <button
            onClick={handleToggleFullscreen}
            title={displayIsFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            aria-label={displayIsFullscreen ? "Exit fullscreen map" : "Enter fullscreen map"}
          >
            {displayIsFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Telemetry Display */}
        <div className="hidden sm:flex flex-col px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-[#0B1726]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-500 dark:text-slate-400 text-right pointer-events-auto shadow-2xs">
          <div>
            ZOOM <span className="text-slate-800 dark:text-white font-bold">{zoom}</span>
          </div>
          <div>
            BEARING <span className="text-slate-800 dark:text-white font-bold">{bearing}&deg;</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectAtlasMap;

import * as maplibregl from "maplibre-gl";

/**
 * GIS Layer Registry for SCIC Project Atlas
 * Phase 8 Architectural Standard:
 * - Declarative, extensible GIS layer definitions
 * - Separates GIS layer metadata & specifications from UI components
 * - Supports zoom-appropriate styling and visual hierarchy
 * - Preserves Projects as the dominant visual focal point
 */

export type GisLayerGroup = "basemap" | "projects" | "boundaries" | "infrastructure";

export interface AtlasGisLayerDef {
  id: string;
  label: string;
  group: GisLayerGroup;
  description: string;
  sourceId: string;
  sourceType: "geojson" | "raster";
  dataUrl?: string;
  defaultVisible: boolean;
  minzoom?: number;
  maxzoom?: number;
  layerIds: string[];
  layers: (maplibregl.LayerSpecification | any)[];
}

/**
 * Static registry of supported GIS layers
 */
export const GIS_LAYER_REGISTRY: Record<string, AtlasGisLayerDef> = {
  // 1. Projects Core Layer (Managed dynamically in ProjectAtlasMap)
  projects: {
    id: "projects",
    label: "Projects & Clusters",
    group: "projects",
    description: "SCIC project point markers, interactive clusters, and selected halo ring.",
    sourceId: "scic-projects",
    sourceType: "geojson",
    defaultVisible: true,
    layerIds: [
      "clusters",
      "cluster-count",
      "project-active-pulse",
      "project-points",
      "project-points-hover",
      "project-selected-halo",
      "project-points-selected",
    ],
    layers: [], // Handled by core setupSourceAndLayers in ProjectAtlasMap
  },

  // 2. Administrative Boundaries (Nationwide: 82 Provinces + 1,647 Municipalities & Cities)
  "admin-boundaries": {
    id: "admin-boundaries",
    label: "Administrative Boundaries",
    group: "boundaries",
    description: "Provincial & municipal administrative boundary polygons covering the entire Philippines.",
    sourceId: "scic-admin-boundaries",
    sourceType: "geojson",
    dataUrl: "/api/regional-map/boundary",
    defaultVisible: false,
    minzoom: 5,
    layerIds: [
      "admin-boundaries-fill",
      "admin-boundaries-province-line",
      "admin-boundaries-muni-line",
      "admin-boundaries-label",
    ],
    layers: [
      {
        id: "admin-boundaries-fill",
        type: "fill",
        source: "scic-admin-boundaries",
        minzoom: 7,
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.025,
        },
      },
      {
        id: "admin-boundaries-province-line",
        type: "line",
        source: "scic-admin-boundaries",
        minzoom: 5,
        filter: ["==", ["get", "level"], 2],
        paint: {
          "line-color": "#94a3b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.9, 10, 1.8],
          "line-opacity": 0.55,
        },
      },
      {
        id: "admin-boundaries-muni-line",
        type: "line",
        source: "scic-admin-boundaries",
        minzoom: 7.5,
        filter: ["==", ["get", "level"], 3],
        paint: {
          "line-color": "#64748b",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7.5, 0.6, 12, 1.2],
          "line-opacity": 0.4,
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "admin-boundaries-label",
        type: "symbol",
        source: "scic-admin-boundaries",
        minzoom: 8.5,
        layout: {
          "text-field": ["coalesce", ["get", "name"], ["get", "adm3_en"]],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8.5, 9, 12, 11],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "#020617",
          "text-halo-width": 1.5,
          "text-opacity": 0.75,
        },
      },
    ],
  },

  // 3. Project Footprints & Engineering Boundaries
  "project-footprints": {
    id: "project-footprints",
    label: "Project Footprints",
    group: "boundaries",
    description: "Verified engineering footprints, concession bounds, and compound perimeters across the Philippines.",
    sourceId: "scic-project-footprints",
    sourceType: "geojson",
    defaultVisible: false,
    minzoom: 6,
    layerIds: [
      "project-footprints-fill",
      "project-footprints-line",
      "project-footprints-selected-highlight",
      "project-footprints-label",
    ],
    layers: [
      {
        id: "project-footprints-fill",
        type: "fill",
        source: "scic-project-footprints",
        minzoom: 6,
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.15,
        },
      },
      {
        id: "project-footprints-line",
        type: "line",
        source: "scic-project-footprints",
        minzoom: 6,
        paint: {
          "line-color": "#00E5FF",
          "line-width": 2.2,
          "line-opacity": 0.85,
          "line-dasharray": [4, 2],
        },
      },
      {
        id: "project-footprints-selected-highlight",
        type: "line",
        source: "scic-project-footprints",
        minzoom: 6,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 3.5,
          "line-opacity": 1.0,
        },
        filter: ["==", ["get", "projectId"], "__NONE__"],
      },
      {
        id: "project-footprints-label",
        type: "symbol",
        source: "scic-project-footprints",
        minzoom: 8.5,
        layout: {
          "text-field": ["get", "projectName"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#38bdf8",
          "text-halo-color": "#020617",
          "text-halo-width": 2,
        },
      },
    ],
  },

  // 4. Infrastructure Context (National Highways, River Basins & Power Grid)
  "infrastructure-context": {
    id: "infrastructure-context",
    label: "Infrastructure Context",
    group: "infrastructure",
    description: "National Highway Arterials (AH26), Major River Basins, and Power Grid Corridors.",
    sourceId: "scic-infrastructure-roads",
    sourceType: "geojson",
    dataUrl: "/api/regional-map/roads",
    defaultVisible: false,
    minzoom: 5,
    layerIds: ["infrastructure-rivers-line", "infrastructure-roads-line", "infrastructure-label"],
    layers: [
      {
        id: "infrastructure-rivers-line",
        type: "line",
        source: "scic-infrastructure-rivers",
        minzoom: 5,
        paint: {
          "line-color": "#00E5FF",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 10, 2.5, 14, 4.0],
          "line-opacity": 0.55,
        },
      },
      {
        id: "infrastructure-roads-line",
        type: "line",
        source: "scic-infrastructure-roads",
        minzoom: 5,
        paint: {
          "line-color": [
            "match",
            ["get", "category"],
            "power",
            "#10b981",
            "expressway",
            "#fbbf24",
            "#f59e0b",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 10, 2.2, 14, 3.8],
          "line-opacity": 0.65,
        },
      },
      {
        id: "infrastructure-label",
        type: "symbol",
        source: "scic-infrastructure-roads",
        minzoom: 7.5,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 9,
          "text-letter-spacing": 0.05,
          "text-max-angle": 30,
        },
        paint: {
          "text-color": "#e2e8f0",
          "text-halo-color": "#020617",
          "text-halo-width": 1.5,
          "text-opacity": 0.8,
        },
      },
    ],
  },
};

/**
 * Helper to convert Overpass OSM JSON elements to standard GeoJSON FeatureCollection
 */
export function convertOverpassOsmToGeoJson(osmData: any): GeoJSON.FeatureCollection {
  if (osmData && osmData.type === "FeatureCollection") {
    return osmData;
  }
  if (!osmData || !Array.isArray(osmData.elements)) {
    return { type: "FeatureCollection", features: [] };
  }

  const features: GeoJSON.Feature[] = [];

  for (const el of osmData.elements) {
    if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length >= 2) {
      const coords = el.geometry.map((pt: { lat: number; lon: number }) => [pt.lon, pt.lat]);
      features.push({
        type: "Feature",
        id: el.id,
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
        properties: {
          id: el.id,
          name: el.tags?.name || "Unnamed Infrastructure",
          type: el.tags?.highway || el.tags?.waterway || "infrastructure",
          tags: el.tags || {},
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

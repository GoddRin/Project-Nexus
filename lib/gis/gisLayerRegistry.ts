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

  // 2. Administrative Boundaries
  "admin-boundaries": {
    id: "admin-boundaries",
    label: "Administrative Boundaries",
    group: "boundaries",
    description: "Provincial & municipal administrative boundary polygons with restrained linework.",
    sourceId: "scic-admin-boundaries",
    sourceType: "geojson",
    dataUrl: "/api/regional-map/boundary",
    defaultVisible: false,
    minzoom: 6,
    layerIds: ["admin-boundaries-fill", "admin-boundaries-line", "admin-boundaries-label"],
    layers: [
      {
        id: "admin-boundaries-fill",
        type: "fill",
        source: "scic-admin-boundaries",
        minzoom: 7,
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.03,
        },
      },
      {
        id: "admin-boundaries-line",
        type: "line",
        source: "scic-admin-boundaries",
        minzoom: 6,
        paint: {
          "line-color": "#94a3b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 12, 1.8],
          "line-opacity": 0.45,
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "admin-boundaries-label",
        type: "symbol",
        source: "scic-admin-boundaries",
        minzoom: 9,
        layout: {
          "text-field": ["get", "adm3_en"],
          "text-font": ["Open Sans Regular"],
          "text-size": 10,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "#020617",
          "text-halo-width": 1.5,
          "text-opacity": 0.7,
        },
      },
    ],
  },

  // 3. Project Footprints & Engineering Boundaries
  "project-footprints": {
    id: "project-footprints",
    label: "Project Footprints",
    group: "boundaries",
    description: "Verified engineering footprints, concession bounds, and compound perimeters.",
    sourceId: "scic-project-footprints",
    sourceType: "geojson",
    defaultVisible: false,
    minzoom: 11,
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
        minzoom: 11,
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.12,
        },
      },
      {
        id: "project-footprints-line",
        type: "line",
        source: "scic-project-footprints",
        minzoom: 11,
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2,
          "line-opacity": 0.8,
          "line-dasharray": [4, 2],
        },
      },
      {
        id: "project-footprints-selected-highlight",
        type: "line",
        source: "scic-project-footprints",
        minzoom: 11,
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
        minzoom: 13,
        layout: {
          "text-field": ["get", "projectName"],
          "text-font": ["Open Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.2],
        },
        paint: {
          "text-color": "#38bdf8",
          "text-halo-color": "#020617",
          "text-halo-width": 2,
        },
      },
    ],
  },

  // 4. Infrastructure Context (Roads & Rivers)
  "infrastructure-context": {
    id: "infrastructure-context",
    label: "Infrastructure Context",
    group: "infrastructure",
    description: "Regional road networks and primary river waterways (visually subordinate).",
    sourceId: "scic-infrastructure-roads",
    sourceType: "geojson",
    dataUrl: "/api/regional-map/roads",
    defaultVisible: false,
    minzoom: 9,
    layerIds: ["infrastructure-rivers-line", "infrastructure-roads-line"],
    layers: [
      {
        id: "infrastructure-rivers-line",
        type: "line",
        source: "scic-infrastructure-rivers",
        minzoom: 9,
        paint: {
          "line-color": "#38bdf8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.0, 15, 2.5],
          "line-opacity": 0.35,
        },
      },
      {
        id: "infrastructure-roads-line",
        type: "line",
        source: "scic-infrastructure-roads",
        minzoom: 9,
        paint: {
          "line-color": "#f59e0b",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.0, 15, 2.2],
          "line-opacity": 0.35,
        },
      },
    ],
  },
};

/**
 * Helper to convert Overpass OSM JSON elements to standard GeoJSON FeatureCollection
 */
export function convertOverpassOsmToGeoJson(osmData: any): GeoJSON.FeatureCollection {
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

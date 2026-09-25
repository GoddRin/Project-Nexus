/**
 * Atlas AI Map & UI Action Tools
 * Generates verified, structured client actions for interactive WebGL GIS map manipulation.
 */

import { SCIC_PROJECTS } from "@/lib/data/scicProjectsData";
import { getProjectGeometry } from "@/lib/data/scicProjectGeometries";
import { AtlasAIAction } from "./types";

// ─── Tool 1: select_project ────────────────────────────────────

export function createSelectProjectAction(args: { projectId: string }): {
  action: AtlasAIAction;
  summary: string;
} {
  const query = args.projectId.toLowerCase().trim();
  const proj = SCIC_PROJECTS.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.code.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
  );

  const resolvedId = proj ? proj.id : args.projectId;
  const resolvedName = proj ? proj.name : args.projectId;

  return {
    action: {
      type: "SELECT_PROJECT",
      projectId: resolvedId,
      projectName: resolvedName,
    },
    summary: `Selected project "${resolvedName}" on the map.`,
  };
}

// ─── Tool 2: fly_to_project ────────────────────────────────────

export function createFlyToProjectAction(args: {
  projectId: string;
  zoom?: number;
  pitch?: number;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const query = args.projectId.toLowerCase().trim();
  const proj = SCIC_PROJECTS.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.code.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
  );

  const resolvedId = proj ? proj.id : args.projectId;
  const zoom = args.zoom || 14;
  const pitch = args.pitch || 30;

  return {
    action: {
      type: "FLY_TO_PROJECT",
      projectId: resolvedId,
      zoom,
      pitch,
    },
    summary: `Executing smooth camera transition to project "${proj?.name || resolvedId}" (Zoom: ${zoom}, Pitch: ${pitch}°).`,
  };
}

// ─── Tool 3: zoom_to_region ────────────────────────────────────

const REGION_BOUNDS_MAP: Record<string, [number, number, number, number]> = {
  "REGION II": [120.7, 15.7, 122.5, 18.6],
  "CAGAYAN VALLEY": [120.7, 15.7, 122.5, 18.6],
  "CORDILLERA ADMINISTRATIVE REGION": [120.3, 16.2, 121.6, 18.1],
  "CAR": [120.3, 16.2, 121.6, 18.1],
  "REGION I": [119.8, 15.8, 120.9, 18.7],
  "ILOCOS": [119.8, 15.8, 120.9, 18.7],
  "REGION III": [119.8, 14.5, 121.5, 16.2],
  "CENTRAL LUZON": [119.8, 14.5, 121.5, 16.2],
  "REGION IV-A": [120.5, 13.5, 122.6, 15.2],
  "CALABARZON": [120.5, 13.5, 122.6, 15.2],
  "REGION VII": [123.0, 9.2, 124.7, 11.4],
  "CENTRAL VISAYAS": [123.0, 9.2, 124.7, 11.4],
  "REGION XI": [125.2, 5.5, 126.7, 7.9],
  "DAVAO": [125.2, 5.5, 126.7, 7.9],
  "REGION X": [123.7, 7.5, 125.3, 9.2],
  "NORTHERN MINDANAO": [123.7, 7.5, 125.3, 9.2],
};

export function createZoomToRegionAction(args: { region: string }): {
  action: AtlasAIAction;
  summary: string;
} {
  const norm = args.region.toUpperCase().trim();
  const bounds = REGION_BOUNDS_MAP[norm];

  return {
    action: {
      type: "ZOOM_TO_REGION",
      region: args.region,
      bounds,
    },
    summary: `Adjusted map extent to focus on ${args.region}.`,
  };
}

// ─── Tool 4: apply_project_filters ─────────────────────────────

export function createApplyFiltersAction(args: {
  category?: string;
  status?: string;
  region?: string;
  province?: string;
  islandGroup?: string;
  searchQuery?: string;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "FILTER_PROJECTS",
      filters: args,
    },
    summary: `Applied project filters: ${JSON.stringify(args)}`,
  };
}

// ─── Tool 5: clear_project_filters ─────────────────────────────

export function createClearFiltersAction(): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "CLEAR_FILTERS",
    },
    summary: "Cleared all active filters to display full national project portfolio.",
  };
}

// ─── Tool 6: set_map_style ─────────────────────────────────────

export function createSetMapStyleAction(args: { style: "DARK" | "LIGHT" | "SATELLITE" }): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "SET_MAP_STYLE",
      style: args.style,
    },
    summary: `Switched GIS map style to ${args.style}.`,
  };
}

// ─── Tool 7: toggle_gis_layer ──────────────────────────────────

export function createToggleGisLayerAction(args: {
  layerId: "boundary" | "roads" | "rivers" | "project-footprints";
  visible?: boolean;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "TOGGLE_GIS_LAYER",
      layerId: args.layerId,
      visible: args.visible ?? true,
    },
    summary: `Toggled GIS layer "${args.layerId}" ${args.visible === false ? "OFF" : "ON"}.`,
  };
}

// ─── Tool 8: inspect_engineering_footprint ─────────────────────

export function createInspectFootprintAction(args: { projectId: string }): {
  action: AtlasAIAction;
  summary: string;
} {
  const query = args.projectId.toLowerCase().trim();
  const proj = SCIC_PROJECTS.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.code.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
  );

  const resolvedId = proj ? proj.id : args.projectId;
  const geom = getProjectGeometry(resolvedId) || (proj ? getProjectGeometry(proj.code) : null);

  return {
    action: {
      type: "INSPECT_FOOTPRINT",
      projectId: resolvedId,
    },
    summary: geom
      ? `Focused on verified engineering footprint for "${proj?.name || resolvedId}" (${geom.metadata.notes || "Engineering site perimeter"}).`
      : `Focused on approximate concession zone for "${proj?.name || resolvedId}".`,
  };
}

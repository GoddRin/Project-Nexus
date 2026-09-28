/**
 * Atlas AI Map & UI Action Tools
 * Generates verified, structured client actions for interactive WebGL GIS map manipulation.
 */

import * as turf from "@turf/turf";
import { SCIC_PROJECTS } from "@/lib/data/scicProjectsData";
import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import { getProjectGeometry } from "@/lib/data/scicProjectGeometries";
import { findProjectInDataset } from "@/components/atlas/AtlasSearchUtils";
import { AtlasAIAction } from "./types";

// Combined project catalog for absolute runtime resolution
const ALL_PROJECTS = [...INITIAL_ATLAS_PROJECTS, ...SCIC_PROJECTS];

// ─── Tool 1: select_project ────────────────────────────────────

export function createSelectProjectAction(args: { projectId: string }): {
  action: AtlasAIAction;
  summary: string;
} {
  const proj = findProjectInDataset(ALL_PROJECTS, args.projectId);
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
  const proj = findProjectInDataset(ALL_PROJECTS, args.projectId);

  const resolvedId = proj ? proj.id : args.projectId;
  const resolvedName = proj ? proj.name : args.projectId;
  const resolvedCode = proj ? proj.code : undefined;
  const zoom = args.zoom || 14;
  const pitch = args.pitch || 30;

  return {
    action: {
      type: "FLY_TO_PROJECT",
      projectId: resolvedId,
      projectName: resolvedName,
      projectCode: resolvedCode,
      coordinates: proj ? { lat: proj.coordinates.lat, lng: proj.coordinates.lng } : undefined,
      zoom,
      pitch,
    },
    summary: `Executing smooth camera transition to project "${resolvedName}" (Zoom: ${zoom}, Pitch: ${pitch}°).`,
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
  const normalized: typeof args = { ...args };

  // Normalize category to canonical enum
  if (args.category && args.category !== "ALL") {
    const u = args.category.toUpperCase().replace(/\s+/g, "_");
    if (u.includes("HYDRO")) normalized.category = "HYDROPOWER";
    else if (u.includes("WIND")) normalized.category = "WIND_POWER";
    else if (u.includes("WATER") || u.includes("DAM")) normalized.category = "WATER_RESOURCES";
    else if (u.includes("ROAD") || u.includes("HIGHWAY")) normalized.category = "ROADS_HIGHWAYS";
    else if (u.includes("BRIDGE")) normalized.category = "BRIDGES";
    else if (u.includes("RAIL") || u.includes("TRANSIT")) normalized.category = "RAIL_TRANSIT";
    else if (u.includes("BUILDING")) normalized.category = "BUILDINGS";
    else if (u.includes("INDUSTRIAL")) normalized.category = "INDUSTRIAL";
    else if (u.includes("GRID") || u.includes("POWER")) normalized.category = "ENERGY_GRID";
    else if (u.includes("MINE") || u.includes("TUNNEL")) normalized.category = "MINING_TUNNELING";
  }

  // Normalize status
  if (args.status && args.status !== "ALL") {
    const s = args.status.toUpperCase();
    if (s.includes("ONGOING") || s.includes("ACTIVE")) normalized.status = "ONGOING";
    else if (s.includes("COMPLETED")) normalized.status = "COMPLETED";
    else if (s.includes("UPCOMING")) normalized.status = "UPCOMING";
    else if (s.includes("PLANNING")) normalized.status = "PLANNING";
    else if (s.includes("HOLD")) normalized.status = "ON_HOLD";
  }

  // Normalize island group
  if (args.islandGroup && args.islandGroup !== "ALL") {
    const isl = args.islandGroup.toUpperCase();
    if (isl.includes("LUZON")) normalized.islandGroup = "LUZON";
    else if (isl.includes("VISAYAS")) normalized.islandGroup = "VISAYAS";
    else if (isl.includes("MINDANAO")) normalized.islandGroup = "MINDANAO";
  }

  return {
    action: {
      type: "FILTER_PROJECTS",
      filters: normalized,
    },
    summary: `Applied project filters: ${JSON.stringify(normalized)}`,
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
  const proj = findProjectInDataset(ALL_PROJECTS, args.projectId);
  const resolvedId = proj ? proj.id : args.projectId;
  const geom = getProjectGeometry(resolvedId) || (proj?.code ? getProjectGeometry(proj.code) : null);

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

// ─── Tool 9: enter_discovery_scope ─────────────────────────────

export function createEnterDiscoveryScopeAction(args: {
  scope: "national" | "island" | "region" | "province";
  targetName?: string;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "ENTER_DISCOVERY_SCOPE",
      scope: args.scope,
      targetName: args.targetName,
    },
    summary: `Entered Discovery Mode: ${args.scope}${args.targetName ? ` (${args.targetName})` : ""}`,
  };
}

// ─── Tool 10: highlight_projects ────────────────────────────

export function createHighlightProjectsAction(args: {
  projectIds: string[];
  fitBounds?: boolean;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const resolvedIds = args.projectIds.map((id) => {
    const match = findProjectInDataset(ALL_PROJECTS, id);
    return match ? match.id : id;
  });

  return {
    action: {
      type: "HIGHLIGHT_PROJECTS",
      projectIds: resolvedIds,
      fitBounds: args.fitBounds ?? true,
    },
    summary: `Highlighted ${resolvedIds.length} project(s) on the map${args.fitBounds !== false ? " and adjusted camera bounds" : ""}.`,
  };
}

// ─── Tool 11: start_portfolio_tour ─────────────────────────────

export function createStartTourAction(args?: {
  tourId?: string;
  area?: string;
  region?: string;
  category?: string;
  stepIndex?: number;
  durationSeconds?: number;
  autoPlay?: boolean;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const query = args?.area || args?.region || args?.category || args?.tourId || "national-flagship-tour";
  const stepIndex = args?.stepIndex ?? 0;
  const duration = args?.durationSeconds ?? 0; // Default: 0 = AUTO mode (finish speech or reading description before advancing)
  const autoPlay = args?.autoPlay !== false;

  return {
    action: {
      type: "START_TOUR",
      tourId: query,
      stepIndex,
      durationSeconds: duration,
      autoPlay,
    },
    summary: `Started AI Guided Portfolio Tour (${query}, Step ${stepIndex + 1}, ${duration === 0 ? "AUTO dwell: finishes speech & reading before advancing" : `${duration}s auto-advance`}).`,
  };
}

// ─── Tool 12: drive_spotlight ──────────────────────────────────

export function createDriveSpotlightAction(args: {
  projectId?: string;
  direction?: "next" | "prev";
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const proj = args.projectId ? findProjectInDataset(ALL_PROJECTS, args.projectId) : undefined;
  const resolvedId = proj ? proj.id : args.projectId;

  return {
    action: {
      type: "DRIVE_SPOTLIGHT",
      projectId: resolvedId,
      direction: args.direction,
    },
    summary: proj
      ? `Driving Featured Spotlight to "${proj.name}".`
      : args.direction
      ? `Navigating to ${args.direction} featured project in Spotlight.`
      : "Engaging Project Spotlight.",
  };
}

// ─── Tool 13: control_portfolio_tour ───────────────────────────

export function createControlTourAction(args: {
  action: "play" | "pause" | "next" | "prev" | "set_speed" | "exit";
  speedSeconds?: number;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "CONTROL_TOUR",
      action: args.action,
      speedSeconds: args.speedSeconds,
    },
    summary:
      args.action === "play"
        ? `Resumed Guided Tour auto-advance (${args.speedSeconds || 5}s per project).`
        : args.action === "pause"
        ? "Paused Guided Tour auto-advance."
        : args.action === "set_speed"
        ? `Set Guided Tour interval to ${args.speedSeconds} seconds per project.`
        : args.action === "next"
        ? "Advancing to next project in tour."
        : args.action === "prev"
        ? "Returning to previous project in tour."
        : "Exited Guided Tour.",
  };
}

// ─── Tool 14: draw_transit_corridor ────────────────────────────

export function createTransitCorridorAction(args: {
  fromProjectId: string;
  toProjectId: string;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const from = findProjectInDataset(ALL_PROJECTS, args.fromProjectId);
  const to = findProjectInDataset(ALL_PROJECTS, args.toProjectId);
  if (!from || !to) {
    throw new Error(`Cannot map transit corridor: project not found.`);
  }

  const p1 = turf.point([from.coordinates.lng, from.coordinates.lat]);
  const p2 = turf.point([to.coordinates.lng, to.coordinates.lat]);
  const dist = Math.round(turf.distance(p1, p2, { units: "kilometers" }) * 100) / 100;

  return {
    action: {
      type: "DRAW_TRANSIT_CORRIDOR",
      fromProject: { id: from.id, name: from.name, coordinates: from.coordinates },
      toProject: { id: to.id, name: to.name, coordinates: to.coordinates },
      distanceKm: dist,
    },
    summary: `Mapped transit corridor between ${from.name} and ${to.name} (${dist} km).`,
  };
}

// ─── Tool 15: draw_buffer_zone ─────────────────────────────────

export function createBufferZoneAction(args: {
  projectId: string;
  radiusKm?: number;
  label?: string;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  const proj = findProjectInDataset(ALL_PROJECTS, args.projectId);
  if (!proj) throw new Error(`Project not found for buffer zone.`);
  const radius = args.radiusKm || 25;

  const centerPoint = turf.point([proj.coordinates.lng, proj.coordinates.lat]);
  const inside = ALL_PROJECTS.filter((p) => {
    if (p.id === proj.id) return false;
    const pt = turf.point([p.coordinates.lng, p.coordinates.lat]);
    const d = turf.distance(centerPoint, pt, { units: "kilometers" });
    return d <= radius;
  }).map((p) => p.id);

  return {
    action: {
      type: "DRAW_BUFFER_ZONE",
      center: proj.coordinates,
      radiusKm: radius,
      label: args.label || `${radius}km Impact Zone around ${proj.name}`,
      projectIdsInside: inside,
    },
    summary: `Rendered ${radius}km spatial buffer around ${proj.name} (${inside.length} other project(s) inside).`,
  };
}

// ─── Tool 16: clear_gis_overlays ───────────────────────────────

export function createClearGisOverlaysAction(): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "CLEAR_GIS_OVERLAYS",
    },
    summary: "Cleared dynamic GIS transit corridors and impact buffer overlays.",
  };
}

// ─── Tool 17: open_nexus_operations (Cross-System Action) ──────

export function createOpenNexusOperationsAction(args: {
  projectId: string;
  projectName?: string;
  destination?: string;
  label?: string;
}): {
  action: AtlasAIAction;
  summary: string;
} {
  return {
    action: {
      type: "OPEN_NEXUS_OPERATIONS",
      projectId: args.projectId,
      projectName: args.projectName,
      destination: args.destination || `/dashboard?project=${args.projectId}`,
      label: args.label || "Open Nexus Operations",
    },
    summary: `Created cross-system action to open Project Nexus operations workspace for ${args.projectName || args.projectId}.`,
  };
}

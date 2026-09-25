/**
 * Atlas AI Action & Response Validator
 * Enforces strict runtime validation on actions and structured outputs before reaching the client.
 */

import { AtlasAIAction, AtlasAIResponse, AtlasAISource } from "./tools/types";

const ALLOWED_ACTION_TYPES = new Set([
  "SELECT_PROJECT",
  "FLY_TO_PROJECT",
  "ZOOM_TO_REGION",
  "FILTER_PROJECTS",
  "CLEAR_FILTERS",
  "SET_MAP_STYLE",
  "TOGGLE_GIS_LAYER",
  "INSPECT_FOOTPRINT",
  "ENTER_DISCOVERY_SCOPE",
]);

const ALLOWED_MAP_STYLES = new Set(["DARK", "LIGHT", "SATELLITE"]);
const ALLOWED_GIS_LAYERS = new Set(["boundary", "roads", "rivers", "project-footprints"]);
const ALLOWED_DISCOVERY_SCOPES = new Set(["national", "island", "region", "province"]);

export function validateAtlasAction(action: any): AtlasAIAction | null {
  if (!action || typeof action !== "object") return null;
  if (!ALLOWED_ACTION_TYPES.has(action.type)) return null;

  switch (action.type) {
    case "SELECT_PROJECT": {
      if (typeof action.projectId !== "string" || !action.projectId.trim()) return null;
      return {
        type: "SELECT_PROJECT",
        projectId: action.projectId.trim(),
        projectName: typeof action.projectName === "string" ? action.projectName.trim() : undefined,
      };
    }

    case "FLY_TO_PROJECT": {
      if (typeof action.projectId !== "string" || !action.projectId.trim()) return null;
      const zoom = typeof action.zoom === "number" && !isNaN(action.zoom) ? Math.min(Math.max(action.zoom, 4), 19) : undefined;
      const pitch = typeof action.pitch === "number" && !isNaN(action.pitch) ? Math.min(Math.max(action.pitch, 0), 60) : undefined;
      return {
        type: "FLY_TO_PROJECT",
        projectId: action.projectId.trim(),
        zoom,
        pitch,
      };
    }

    case "ZOOM_TO_REGION": {
      if (typeof action.region !== "string" || !action.region.trim()) return null;
      let bounds: [number, number, number, number] | undefined = undefined;
      if (Array.isArray(action.bounds) && action.bounds.length === 4 && action.bounds.every((n: any) => typeof n === "number")) {
        bounds = action.bounds as [number, number, number, number];
      }
      return {
        type: "ZOOM_TO_REGION",
        region: action.region.trim(),
        bounds,
      };
    }

    case "FILTER_PROJECTS": {
      if (!action.filters || typeof action.filters !== "object") return null;
      const f: any = {};
      if (typeof action.filters.category === "string") f.category = action.filters.category.trim();
      if (typeof action.filters.status === "string") f.status = action.filters.status.trim();
      if (typeof action.filters.region === "string") f.region = action.filters.region.trim();
      if (typeof action.filters.province === "string") f.province = action.filters.province.trim();
      if (typeof action.filters.islandGroup === "string") f.islandGroup = action.filters.islandGroup.trim();
      if (typeof action.filters.searchQuery === "string") f.searchQuery = action.filters.searchQuery.trim();
      return {
        type: "FILTER_PROJECTS",
        filters: f,
      };
    }

    case "CLEAR_FILTERS":
      return { type: "CLEAR_FILTERS" };

    case "SET_MAP_STYLE": {
      if (!ALLOWED_MAP_STYLES.has(action.style)) return null;
      return {
        type: "SET_MAP_STYLE",
        style: action.style,
      };
    }

    case "TOGGLE_GIS_LAYER": {
      if (!ALLOWED_GIS_LAYERS.has(action.layerId)) return null;
      return {
        type: "TOGGLE_GIS_LAYER",
        layerId: action.layerId,
        visible: typeof action.visible === "boolean" ? action.visible : true,
      };
    }

    case "INSPECT_FOOTPRINT": {
      if (typeof action.projectId !== "string" || !action.projectId.trim()) return null;
      return {
        type: "INSPECT_FOOTPRINT",
        projectId: action.projectId.trim(),
      };
    }

    case "ENTER_DISCOVERY_SCOPE": {
      if (!ALLOWED_DISCOVERY_SCOPES.has(action.scope)) return null;
      return {
        type: "ENTER_DISCOVERY_SCOPE",
        scope: action.scope,
        targetName: typeof action.targetName === "string" ? action.targetName.trim() : undefined,
      };
    }

    default:
      return null;
  }
}

export function validateAtlasResponse(raw: {
  answer: string;
  actions?: any[];
  sources?: any[];
  metadata?: any;
}): AtlasAIResponse {
  const answer = typeof raw.answer === "string" ? raw.answer : "I processed your request.";

  const actions: AtlasAIAction[] = [];
  if (Array.isArray(raw.actions)) {
    for (const a of raw.actions) {
      const valid = validateAtlasAction(a);
      if (valid) actions.push(valid);
    }
  }

  const sources: AtlasAISource[] = [];
  if (Array.isArray(raw.sources)) {
    for (const s of raw.sources) {
      if (s && typeof s.name === "string") {
        sources.push({
          name: s.name,
          sourceType: s.sourceType || "DATABASE",
          provenance: s.provenance || "Verified",
          document: s.document,
          projectId: s.projectId,
          section: s.section,
          notes: s.notes,
        });
      }
    }
  }

  return {
    answer,
    actions,
    sources,
    metadata: raw.metadata,
  };
}

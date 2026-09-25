/**
 * Atlas AI Tool Registry & Dispatcher
 * Predefines declarative tool contracts for LLM function calling and dispatches executions safely.
 */

import { AIToolDeclaration } from "@/lib/ai/core/types";
import {
  searchProjects,
  getProjectDetails,
  getPortfolioStatistics,
  getRegionalSummary,
  getNearbyProjects,
} from "./projectReadTools";
import {
  createSelectProjectAction,
  createFlyToProjectAction,
  createZoomToRegionAction,
  createApplyFiltersAction,
  createClearFiltersAction,
  createSetMapStyleAction,
  createToggleGisLayerAction,
  createInspectFootprintAction,
} from "./mapActionTools";
import { AtlasAIAction, AtlasAISource } from "./types";

// ─── Declarative Tool Schemas ───────────────────────────────────

export const ATLAS_TOOL_DECLARATIONS: AIToolDeclaration[] = [
  // READ TOOL: search_projects
  {
    name: "search_projects",
    description: "Search Sta. Clara projects across the Philippines by text keyword, category, status, region, province, or island group.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query matching project name, code, description, or municipality" },
        category: { type: "string", description: "Project category e.g. Hydropower, Wind Power, Solar Power, Roads & Highways, Water Resources, Buildings, Mining & Tunnels" },
        status: { type: "string", description: "Status: ONGOING, COMPLETED, UPCOMING, PLANNING, or ON_HOLD", enum: ["ONGOING", "COMPLETED", "UPCOMING", "PLANNING", "ON_HOLD", "ALL"] },
        region: { type: "string", description: "Philippine administrative region (e.g. Region II, CAR, Region I, Region III, Region XI)" },
        province: { type: "string", description: "Province name (e.g. Isabela, Mountain Province, Tarlac, Ilocos Norte, Davao de Oro)" },
        islandGroup: { type: "string", description: "Island group: LUZON, VISAYAS, or MINDANAO", enum: ["LUZON", "VISAYAS", "MINDANAO", "ALL"] },
        limit: { type: "number", description: "Maximum number of projects to return (default: 15)" },
      },
    },
  },

  // READ TOOL: get_project_details
  {
    name: "get_project_details",
    description: "Retrieve comprehensive engineering details, coordinates, verified footprint availability, and client/contractor data for a specific project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID, code (e.g. SCIC-HEPP-01), or slug name" },
      },
      required: ["projectId"],
    },
  },

  // READ TOOL: get_portfolio_statistics
  {
    name: "get_portfolio_statistics",
    description: "Get macro portfolio statistics including total project count, active vs completed breakdown, total renewable MW, tunneling km, and water MLD.",
    parameters: {
      type: "object",
      properties: {
        islandGroup: { type: "string", description: "Optional filter by island group: LUZON, VISAYAS, MINDANAO, or ALL", enum: ["LUZON", "VISAYAS", "MINDANAO", "ALL"] },
        category: { type: "string", description: "Optional filter by category" },
      },
    },
  },

  // READ TOOL: get_regional_summary
  {
    name: "get_regional_summary",
    description: "Get summary of all Sta. Clara projects in a specific region, including province coverage and category distribution.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "Region name (e.g. Region II, CAR, Region III, Central Visayas, Davao Region)" },
      },
      required: ["region"],
    },
  },

  // READ TOOL: get_nearby_projects
  {
    name: "get_nearby_projects",
    description: "Find projects within a specified radius (in kilometers) from a reference project or geographic coordinate.",
    parameters: {
      type: "object",
      properties: {
        referenceProjectId: { type: "string", description: "ID or code of reference project" },
        lat: { type: "number", description: "Latitude coordinate" },
        lng: { type: "number", description: "Longitude coordinate" },
        radiusKm: { type: "number", description: "Search radius in kilometers (default: 100km)" },
      },
    },
  },

  // MAP ACTION: select_project
  {
    name: "select_project",
    description: "Select and highlight a specific project on the Atlas map and open its Project Intelligence drawer.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID or code of the project to select" },
      },
      required: ["projectId"],
    },
  },

  // MAP ACTION: fly_to_project
  {
    name: "fly_to_project",
    description: "Smoothly fly the WebGL map camera to focus on a specific project with pitch and zoom.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID or code of the project" },
        zoom: { type: "number", description: "Target camera zoom level (e.g. 14 for site vicinity)" },
        pitch: { type: "number", description: "Camera pitch in degrees (e.g. 30 to 45)" },
      },
      required: ["projectId"],
    },
  },

  // MAP ACTION: zoom_to_region
  {
    name: "zoom_to_region",
    description: "Adjust the map camera extent to encompass an entire administrative region.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "Region name to zoom to (e.g. Region II, CAR, Region VII, Davao)" },
      },
      required: ["region"],
    },
  },

  // MAP ACTION: apply_project_filters
  {
    name: "apply_project_filters",
    description: "Filter projects on the map and directory sidebar by category, status, region, or island group.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category filter" },
        status: { type: "string", description: "Status filter" },
        region: { type: "string", description: "Region filter" },
        province: { type: "string", description: "Province filter" },
        islandGroup: { type: "string", description: "Island group filter: LUZON, VISAYAS, or MINDANAO" },
        searchQuery: { type: "string", description: "Text search filter" },
      },
    },
  },

  // MAP ACTION: clear_project_filters
  {
    name: "clear_project_filters",
    description: "Reset all active filters and return to showing all 65 nationwide projects.",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  // MAP ACTION: set_map_style
  {
    name: "set_map_style",
    description: "Switch the basemap style between DARK, LIGHT, and SATELLITE imagery.",
    parameters: {
      type: "object",
      properties: {
        style: { type: "string", enum: ["DARK", "LIGHT", "SATELLITE"], description: "Desired basemap style" },
      },
      required: ["style"],
    },
  },

  // MAP ACTION: toggle_gis_layer
  {
    name: "toggle_gis_layer",
    description: "Toggle an infrastructure or boundary GIS overlay (boundary, roads, rivers, project-footprints).",
    parameters: {
      type: "object",
      properties: {
        layerId: {
          type: "string",
          enum: ["boundary", "roads", "rivers", "project-footprints"],
          description: "Layer identifier",
        },
        visible: { type: "boolean", description: "True to show layer, false to hide" },
      },
      required: ["layerId"],
    },
  },

  // MAP ACTION: inspect_engineering_footprint
  {
    name: "inspect_engineering_footprint",
    description: "Focus camera in high-detail 3D perspective directly on a project's verified engineering footprint polygon.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or code with verified geometry" },
      },
      required: ["projectId"],
    },
  },
];

// ─── Dispatcher Execution ───────────────────────────────────────

export interface ToolExecutionContext {
  actions: AtlasAIAction[];
  sources: AtlasAISource[];
}

export async function dispatchAtlasTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  switch (toolName) {
    // Read Tools
    case "search_projects": {
      const res = await searchProjects(args as any);
      context.sources.push(res.source);
      return res;
    }

    case "get_project_details": {
      const res = await getProjectDetails(args as any);
      context.sources.push(res.source);
      return res;
    }

    case "get_portfolio_statistics": {
      const res = await getPortfolioStatistics(args as any);
      context.sources.push(res.source);
      return res;
    }

    case "get_regional_summary": {
      const res = await getRegionalSummary(args as any);
      context.sources.push(res.source);
      return res;
    }

    case "get_nearby_projects": {
      const res = await getNearbyProjects(args as any);
      context.sources.push(res.source);
      return res;
    }

    // Map Action Tools
    case "select_project": {
      const { action, summary } = createSelectProjectAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "fly_to_project": {
      const { action, summary } = createFlyToProjectAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "zoom_to_region": {
      const { action, summary } = createZoomToRegionAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "apply_project_filters": {
      const { action, summary } = createApplyFiltersAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "clear_project_filters": {
      const { action, summary } = createClearFiltersAction();
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "set_map_style": {
      const { action, summary } = createSetMapStyleAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "toggle_gis_layer": {
      const { action, summary } = createToggleGisLayerAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    case "inspect_engineering_footprint": {
      const { action, summary } = createInspectFootprintAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    default:
      throw new Error(`Unknown Atlas AI tool: "${toolName}"`);
  }
}

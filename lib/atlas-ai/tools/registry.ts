/**
 * Atlas AI Tool Registry & Dispatcher
 * Predefines declarative tool contracts for LLM function calling and dispatches executions safely.
 * Phase 15 Complete Suite:
 *  - search_projects
 *  - get_project (and alias get_project_details)
 *  - get_project_statistics
 *  - get_region_summary
 *  - get_province_summary
 *  - get_project_timeline
 *  - get_nearby_projects
 *  - get_geographic_bounds
 *  - calculate_distance
 *  - get_map_context
 *  - search_atlas_knowledge
 *  - select_project
 *  - fly_to_project
 *  - zoom_to_region
 *  - apply_project_filters
 *  - clear_project_filters
 *  - set_map_style
 *  - toggle_gis_layer
 *  - inspect_engineering_footprint
 *  - enter_discovery_scope
 */

import { AIToolDeclaration } from "@/lib/ai/core/types";
import {
  searchProjects,
  getProject,
  getProjectStatistics,
  getRegionSummary,
  getProvinceSummary,
  getProjectTimeline,
  getNearbyProjects,
  getGeographicBounds,
  calculateDistance,
  getMapContext,
  searchAtlasKnowledge,
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
  createEnterDiscoveryScopeAction,
} from "./mapActionTools";
import { AtlasAIAction, AtlasAISource } from "./types";
import { AtlasContextPayload } from "../identity";

// ─── Declarative Tool Schemas ───────────────────────────────────

export const ATLAS_TOOL_DECLARATIONS: AIToolDeclaration[] = [
  // 1. READ TOOL: search_projects
  {
    name: "search_projects",
    description: "Search Sta. Clara projects across the Philippines by structured criteria (query text, category, status, region, province, municipality, island group).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query matching project name, code, description, or municipality" },
        category: { type: "string", description: "Project category e.g. Hydropower, Wind Power, Solar Power, Roads & Highways, Water Resources, Buildings, Mining & Tunnels" },
        status: { type: "string", description: "Status: ONGOING, COMPLETED, UPCOMING, PLANNING, or ON_HOLD", enum: ["ONGOING", "COMPLETED", "UPCOMING", "PLANNING", "ON_HOLD", "ALL"] },
        region: { type: "string", description: "Philippine administrative region (e.g. Region II, CAR, Region I, Region III, Region XI)" },
        province: { type: "string", description: "Province name (e.g. Isabela, Mountain Province, Tarlac, Ilocos Norte, Davao de Oro)" },
        municipality: { type: "string", description: "Municipality or city name (e.g. Tumauini, Sabangan, Davao City)" },
        islandGroup: { type: "string", description: "Island group: LUZON, VISAYAS, or MINDANAO", enum: ["LUZON", "VISAYAS", "MINDANAO", "ALL"] },
        limit: { type: "number", description: "Maximum number of projects to return (default: 15)" },
      },
    },
  },

  // 2. READ TOOL: get_project
  {
    name: "get_project",
    description: "Retrieve verified public Atlas project DTO, coordinates, engineering specifications, client, and verified footprint status by project ID, code (e.g. SCIC-HEPP-01), or slug.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID, code (e.g. SCIC-HEPP-01), or slug name" },
      },
      required: ["projectId"],
    },
  },

  // 2b. READ TOOL ALIAS: get_project_details
  {
    name: "get_project_details",
    description: "Alias for get_project. Retrieve verified public project DTO and engineering specifications.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID, code (e.g. SCIC-HEPP-01), or slug name" },
      },
      required: ["projectId"],
    },
  },

  // 3. READ TOOL: get_project_statistics
  {
    name: "get_project_statistics",
    description: "Get macro portfolio statistics strictly derived from live database records: total count, status breakdown, category breakdown, island breakdown, and clean energy/tunneling metrics.",
    parameters: {
      type: "object",
      properties: {
        islandGroup: { type: "string", description: "Optional filter by island group: LUZON, VISAYAS, MINDANAO, or ALL", enum: ["LUZON", "VISAYAS", "MINDANAO", "ALL"] },
        category: { type: "string", description: "Optional filter by category" },
      },
    },
  },

  // 4. READ TOOL: get_region_summary
  {
    name: "get_region_summary",
    description: "Get live summary of all Sta. Clara projects in a specific region, including project count, status distribution, category distribution, and provinces covered.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "Region name (e.g. Region II, CAR, Region III, Central Visayas, Davao Region)" },
      },
      required: ["region"],
    },
  },

  // 5. READ TOOL: get_province_summary
  {
    name: "get_province_summary",
    description: "Get live summary of all Sta. Clara projects in a specific province, including project count, status distribution, and municipality locations.",
    parameters: {
      type: "object",
      properties: {
        province: { type: "string", description: "Province name (e.g. Isabela, Mountain Province, Benguet, Cebu, Davao del Sur)" },
      },
      required: ["province"],
    },
  },

  // 6. READ TOOL: get_project_timeline
  {
    name: "get_project_timeline",
    description: "Retrieve verified temporal milestones, project start date, target Commercial Operation Date (COD), and completion year for a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or code (e.g. SCIC-HEPP-01)" },
      },
      required: ["projectId"],
    },
  },

  // 7. READ TOOL: get_nearby_projects
  {
    name: "get_nearby_projects",
    description: "Find projects within a specified radius (in kilometers) from a reference project or geographic coordinate using Turf.js geodesic calculations.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID or code of reference project (e.g. 'scic-thepp-isabela')" },
        lat: { type: "number", description: "Latitude coordinate of origin" },
        lng: { type: "number", description: "Longitude coordinate of origin" },
        radiusKm: { type: "number", description: "Search radius in kilometers (default: 50 km)" },
        limit: { type: "number", description: "Maximum nearby projects to return (default: 10)" },
      },
    },
  },

  // 8. READ TOOL: get_geographic_bounds
  {
    name: "get_geographic_bounds",
    description: "Calculate authoritative bounding box [minLng, minLat, maxLng, maxLat], geometric centroid, and recommended zoom for a project, region, province, or active filter scope using Turf.js.",
    parameters: {
      type: "object",
      properties: {
        scopeType: { type: "string", enum: ["project", "region", "province", "filtered"], description: "Type of scope to calculate bounds for" },
        targetName: { type: "string", description: "Name of target project, region, or province" },
        category: { type: "string", description: "Optional category filter if scopeType is 'filtered'" },
        status: { type: "string", description: "Optional status filter if scopeType is 'filtered'" },
        islandGroup: { type: "string", description: "Optional island group filter if scopeType is 'filtered'" },
      },
      required: ["scopeType"],
    },
  },

  // 9. READ TOOL: calculate_distance
  {
    name: "calculate_distance",
    description: "Calculate the exact geodesic distance (km and miles) and azimuth bearing direction between two Sta. Clara projects using Turf.js.",
    parameters: {
      type: "object",
      properties: {
        projectA: { type: "string", description: "ID, code, or name of origin project" },
        projectB: { type: "string", description: "ID, code, or name of destination project" },
      },
      required: ["projectA", "projectB"],
    },
  },

  // 10. READ TOOL: get_map_context
  {
    name: "get_map_context",
    description: "Inspect the current live GIS map runtime context (selected project ID, current map zoom, active filters, geographic scope, and visible layers).",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  // 11. READ TOOL: search_atlas_knowledge
  {
    name: "search_atlas_knowledge",
    description: "Retrieve verified engineering narratives, technical dossiers, river basin hydrology profiles, and corporate historical records.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic or query keyword (e.g. 'hydrology', 'headrace tunnel', 'river basin', 'concession')" },
        projectId: { type: "string", description: "Optional project ID filter" },
        limit: { type: "number", description: "Maximum document excerpts to return (default: 3)" },
      },
      required: ["query"],
    },
  },

  // 12. MAP ACTION: select_project
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

  // 13. MAP ACTION: fly_to_project
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

  // 14. MAP ACTION: zoom_to_region
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

  // 15. MAP ACTION: apply_project_filters
  {
    name: "apply_project_filters",
    description: "Filter projects on the map and directory sidebar simultaneously by category, status, region, province, or island group.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category filter (e.g. Hydropower, Wind Power, Solar Power, Roads & Highways, Water Resources, Mining & Tunnels)" },
        status: { type: "string", description: "Status filter (e.g. ONGOING, COMPLETED, UPCOMING, PLANNING, ON_HOLD)" },
        region: { type: "string", description: "Region filter" },
        province: { type: "string", description: "Province filter" },
        islandGroup: { type: "string", description: "Island group filter: LUZON, VISAYAS, or MINDANAO" },
        searchQuery: { type: "string", description: "Text search filter" },
      },
    },
  },

  // 16. MAP ACTION: clear_project_filters
  {
    name: "clear_project_filters",
    description: "Reset all active project filters to display the full national portfolio without resetting map camera or style.",
    parameters: {
      type: "object",
      properties: {},
    },
  },

  // 17. MAP ACTION: set_map_style
  {
    name: "set_map_style",
    description: "Switch the GIS basemap style between DARK, LIGHT, and SATELLITE imagery.",
    parameters: {
      type: "object",
      properties: {
        style: { type: "string", enum: ["DARK", "LIGHT", "SATELLITE"], description: "Desired basemap style" },
      },
      required: ["style"],
    },
  },

  // 18. MAP ACTION: toggle_gis_layer
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

  // 19. MAP ACTION: inspect_engineering_footprint
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

  // 20. MAP ACTION: enter_discovery_scope
  {
    name: "enter_discovery_scope",
    description: "Engage Discovery Mode at national, island, regional, or provincial hierarchy scope.",
    parameters: {
      type: "object",
      properties: {
        scope: { type: "string", enum: ["national", "island", "region", "province"], description: "Discovery hierarchy scope level" },
        targetName: { type: "string", description: "Optional name of target island, region, or province" },
      },
      required: ["scope"],
    },
  },
];

// ─── Dispatcher Execution ───────────────────────────────────────

export interface ToolExecutionContext {
  actions: AtlasAIAction[];
  sources: AtlasAISource[];
  runtimeContext?: AtlasContextPayload;
}

export async function dispatchAtlasTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  switch (toolName) {
    // 1. search_projects
    case "search_projects": {
      const res = await searchProjects(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 2. get_project & alias get_project_details
    case "get_project":
    case "get_project_details": {
      const res = await getProject(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 3. get_project_statistics
    case "get_project_statistics":
    case "get_portfolio_statistics": {
      const res = await getProjectStatistics(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 4. get_region_summary
    case "get_region_summary": {
      const res = await getRegionSummary(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 5. get_province_summary
    case "get_province_summary": {
      const res = await getProvinceSummary(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 6. get_project_timeline
    case "get_project_timeline": {
      const res = await getProjectTimeline(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 7. get_nearby_projects
    case "get_nearby_projects": {
      // Auto-resolve selectedProjectId from runtimeContext if omitted by model
      const nearbyArgs: any = { ...args };
      if (!nearbyArgs.projectId && !nearbyArgs.lat && context.runtimeContext?.selectedProjectId) {
        nearbyArgs.projectId = context.runtimeContext.selectedProjectId;
      }
      const res = await getNearbyProjects(nearbyArgs);
      context.sources.push(res.source);
      return res;
    }

    // 8. get_geographic_bounds
    case "get_geographic_bounds": {
      const res = await getGeographicBounds(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 9. calculate_distance
    case "calculate_distance": {
      const res = await calculateDistance(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 10. get_map_context
    case "get_map_context": {
      const res = getMapContext(context.runtimeContext);
      context.sources.push(res.source);
      return res;
    }

    // 11. search_atlas_knowledge
    case "search_atlas_knowledge": {
      const res = await searchAtlasKnowledge(args as any);
      context.sources.push(res.source);
      return res;
    }

    // 12. select_project
    case "select_project": {
      const { action, summary } = createSelectProjectAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 13. fly_to_project
    case "fly_to_project": {
      const { action, summary } = createFlyToProjectAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 14. zoom_to_region
    case "zoom_to_region": {
      const { action, summary } = createZoomToRegionAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 15. apply_project_filters
    case "apply_project_filters": {
      const { action, summary } = createApplyFiltersAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 16. clear_project_filters
    case "clear_project_filters": {
      const { action, summary } = createClearFiltersAction();
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 17. set_map_style
    case "set_map_style": {
      const { action, summary } = createSetMapStyleAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 18. toggle_gis_layer
    case "toggle_gis_layer": {
      const { action, summary } = createToggleGisLayerAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 19. inspect_engineering_footprint
    case "inspect_engineering_footprint": {
      const { action, summary } = createInspectFootprintAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    // 20. enter_discovery_scope
    case "enter_discovery_scope": {
      const { action, summary } = createEnterDiscoveryScopeAction(args as any);
      context.actions.push(action);
      return { status: "success", summary, action };
    }

    default:
      throw new Error(`Unknown Atlas AI tool: "${toolName}"`);
  }
}

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
  compareProjects,
  getPortfolioBrief,
  explainCurrentView,
  getGuidedTour,
  analyzePortfolioHealth,
  analyzeTransitCorridor,
  analyzeBufferZone,
  getNexusProjectSummary,
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
  createHighlightProjectsAction,
  createStartTourAction,
  createDriveSpotlightAction,
  createControlTourAction,
  createTransitCorridorAction,
  createBufferZoneAction,
  createClearGisOverlaysAction,
} from "./mapActionTools";
import { AtlasAIAction, AtlasAISource } from "./types";
import { AtlasContextPayload } from "../identity";
import { isWithinPhilippineBounds } from "../validation";

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

  // 21. READ TOOL: compare_projects
  {
    name: "compare_projects",
    description: "Compare two or more Sta. Clara projects side-by-side across factual database metrics (category, status, region, province, capacity, contract value, engineering scope, client, COD date). Only returns fields verified in the record, omitting unavailable attributes.",
    parameters: {
      type: "object",
      properties: {
        projectIds: { type: "array", items: { type: "string" }, description: "Array of project IDs or codes to compare" },
        queryA: { type: "string", description: "Name or code of first project" },
        queryB: { type: "string", description: "Name or code of second project" },
        category: { type: "string", description: "Optional category filter for multi-project comparison" },
        region: { type: "string", description: "Optional region filter" },
        islandGroup: { type: "string", description: "Optional island group filter" },
        limit: { type: "number", description: "Max projects to compare (default: 6)" },
      },
    },
  },

  // 22. READ TOOL: get_portfolio_brief
  {
    name: "get_portfolio_brief",
    description: "Generate an authoritative executive portfolio briefing from live database records: total projects, status breakdown (ongoing, completed, upcoming), island group breakdown (Luzon, Visayas, Mindanao), sector breakdown (hydropower, wind, solar, water treatment, tunnels, highways), and top regional hubs.",
    parameters: {
      type: "object",
      properties: {
        islandGroup: { type: "string", description: "Optional island group filter" },
        region: { type: "string", description: "Optional region filter" },
      },
    },
  },

  // 23. READ TOOL: explain_current_view
  {
    name: "explain_current_view",
    description: "Analyze and explain what is currently displayed on the map: active geographic scope, filters applied, project count, status/category distribution, visible GIS layers, and why elements (like clusters or footprints) behave as they do.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", enum: ["overview", "clusters", "footprints", "filters"], description: "Optional specific topic or question" },
      },
    },
  },

  // 24. READ TOOL: get_guided_tour
  {
    name: "get_guided_tour",
    description: "Retrieve the curated multi-step national portfolio tour across the Philippines with camera coordinates, regional scopes, featured projects, and factual narrations.",
    parameters: {
      type: "object",
      properties: {
        tourId: { type: "string", description: "Tour ID (default: 'national-flagship-tour')" },
      },
    },
  },

  // 25. MAP ACTION: highlight_projects
  {
    name: "highlight_projects",
    description: "Highlight one or more projects on the map and fit camera bounds to show them simultaneously.",
    parameters: {
      type: "object",
      properties: {
        projectIds: { type: "array", items: { type: "string" }, description: "Array of project IDs to highlight" },
        fitBounds: { type: "boolean", description: "Whether to fit camera bounds to highlighted projects (default: true)" },
      },
      required: ["projectIds"],
    },
  },

  // 26. MAP ACTION: start_portfolio_tour
  {
    name: "start_portfolio_tour",
    description: "Launch the interactive AI Guided Portfolio Tour across the Philippines or a specific region/theme with auto-advancing camera flight.",
    parameters: {
      type: "object",
      properties: {
        tourId: { type: "string", description: "Tour ID or theme (e.g. 'north-luzon-tour', 'clean-energy-tour', 'national-flagship-tour')" },
        area: { type: "string", description: "Geographic area or region to tour (e.g. 'North Luzon', 'CAR', 'Mindanao', 'Visayas')" },
        region: { type: "string", description: "Specific Philippine region to tour (e.g. 'CAR', 'Region II', 'Region XI')" },
        category: { type: "string", description: "Category filter for the tour (e.g. 'HYDROPOWER', 'WATER_UTILITIES')" },
        stepIndex: { type: "number", description: "Starting step index (0-based, default: 0)" },
        durationSeconds: { type: "number", description: "Dwell time per project in seconds before auto-advancing (default: 0 for AUTO mode, which completes speech and reading before advancing)" },
        autoPlay: { type: "boolean", description: "Whether the tour automatically plays and advances from project to project (default: true)" },
      },
    },
  },

  // 27. MAP/UI ACTION: control_portfolio_tour
  {
    name: "control_portfolio_tour",
    description: "Control the currently active guided portfolio tour: play/pause, advance to next, return to previous, adjust speed/interval, or exit.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["play", "pause", "next", "prev", "set_speed", "exit"],
          description: "Action to execute on the active tour controller",
        },
        speedSeconds: {
          type: "number",
          description: "Seconds per project when adjusting speed or resuming play (e.g. 5 for 5 seconds per project)",
        },
      },
      required: ["action"],
    },
  },

  // 28. MAP/UI ACTION: drive_spotlight
  {
    name: "drive_spotlight",
    description: "Switch the Project Spotlight card on the sidebar to focus on a specific project, index, or direction (next/previous).",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID, code, or name to spotlight" },
        direction: { type: "string", enum: ["next", "prev"], description: "Slide spotlight to next or previous project" },
      },
    },
  },

  // 29. READ & SPATIAL TOOL: analyze_portfolio_health
  {
    name: "analyze_portfolio_health",
    description: "Conduct executive portfolio health analysis: active works, completed flagships, upcoming pipeline, and critical path telemetry.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "Filter portfolio health analysis by region" },
        category: { type: "string", description: "Filter portfolio health analysis by category" },
      },
    },
  },

  // 30. READ & SPATIAL ACTION: analyze_transit_corridor
  {
    name: "analyze_transit_corridor",
    description: "Analyze logistics, transport routes, and distance corridor between two heavy civil project sites.",
    parameters: {
      type: "object",
      properties: {
        fromProjectId: { type: "string", description: "Origin project ID, code, or name" },
        toProjectId: { type: "string", description: "Destination project ID, code, or name" },
        drawCorridor: { type: "boolean", description: "Whether to render tactical glowing corridor on map (default: true)" },
      },
      required: ["fromProjectId", "toProjectId"],
    },
  },

  // 31. READ & SPATIAL ACTION: analyze_buffer_zone
  {
    name: "analyze_buffer_zone",
    description: "Perform spatial buffer zone and impact catchment analysis around a project site (default 25km radius).",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Target project ID, code, or name" },
        radiusKm: { type: "number", description: "Buffer radius in kilometers (default: 25)" },
        drawZone: { type: "boolean", description: "Whether to render buffer geofence on map (default: true)" },
      },
      required: ["projectId"],
    },
  },

  // 32. MAP ACTION: clear_gis_overlays
  {
    name: "clear_gis_overlays",
    description: "Clear dynamic GIS logistics corridors and impact buffer overlays from the map.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];

// ─── Phase 18 Controlled Cross-System Nexus Tool Declarations ───
// These tools are strictly decoupled from Atlas geographic tools and are only
// exposed when: user is authenticated + authorized + selected project has Nexus integration.
export const NEXUS_TOOL_DECLARATIONS: AIToolDeclaration[] = [
  {
    name: "get_nexus_project_summary",
    description:
      "Retrieve live, verified operational telemetry from Project Nexus (active work tickets, plant equipment health and maintenance status, recent daily shift logs, and site safety incidents). ONLY available for authenticated, authorized internal team members when a project has active Nexus operations (e.g. Tumauini HEPP).",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Canonical project ID (e.g. cmqvwzn750000r8w1zidk116i), code (e.g. SCIC-HEPP-01), or slug (tumauini-hepp)",
        },
      },
      required: ["projectId"],
    },
  },
];

// ─── Dispatcher Execution ───────────────────────────────────────

export interface ToolExecutionContext {
  actions: AtlasAIAction[];
  sources: AtlasAISource[];
  runtimeContext?: AtlasContextPayload;
  isAuthorized?: boolean;
}

export const ALLOWED_ATLAS_TOOL_NAMES = new Set<string>([
  "search_projects",
  "get_project",
  "get_project_details",
  "get_project_statistics",
  "get_portfolio_statistics",
  "get_region_summary",
  "get_province_summary",
  "get_project_timeline",
  "get_nearby_projects",
  "get_geographic_bounds",
  "calculate_distance",
  "get_map_context",
  "search_atlas_knowledge",
  "select_project",
  "fly_to_project",
  "zoom_to_region",
  "apply_project_filters",
  "clear_project_filters",
  "set_map_style",
  "toggle_gis_layer",
  "inspect_engineering_footprint",
  "enter_discovery_scope",
  "compare_projects",
  "get_portfolio_brief",
  "explain_current_view",
  "get_guided_tour",
  "highlight_projects",
  "start_portfolio_tour",
  "control_portfolio_tour",
  "drive_spotlight",
  "analyze_portfolio_health",
  "analyze_transit_corridor",
  "analyze_buffer_zone",
  "clear_gis_overlays",
  "get_nexus_project_summary",
]);

export async function dispatchAtlasTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<unknown> {
  // 1. Tool Allowlist Security Boundary
  if (!ALLOWED_ATLAS_TOOL_NAMES.has(toolName)) {
    return {
      status: "error",
      tool: toolName,
      message: `Tool "${toolName}" is not registered in the Atlas AI tool registry. Administrative and unauthorized tools are forbidden.`,
    };
  }

  // 2. Safe execution wrapped in controlled error boundary
  try {
    switch (toolName) {
      // 1. search_projects
      case "search_projects": {
        const cleanArgs: any = { ...args };
        if (cleanArgs.limit && (typeof cleanArgs.limit !== "number" || isNaN(cleanArgs.limit) || cleanArgs.limit < 1)) {
          cleanArgs.limit = 15;
        } else if (cleanArgs.limit > 50) {
          cleanArgs.limit = 50;
        }
        const res = await searchProjects(cleanArgs);
        context.sources.push(res.source);
        return res;
      }

      // 2. get_project & alias get_project_details
      case "get_project":
      case "get_project_details": {
        const pid = typeof args.projectId === "string" ? args.projectId.trim() : "";
        if (!pid) {
          return { status: "error", message: "A valid non-empty project ID or code is required." };
        }
        const res = await getProject({ projectId: pid });
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
        const region = typeof args.region === "string" ? args.region.trim() : "";
        if (!region) {
          return { status: "error", message: "A valid region name is required." };
        }
        const res = await getRegionSummary({ region });
        context.sources.push(res.source);
        return res;
      }

      // 5. get_province_summary
      case "get_province_summary": {
        const province = typeof args.province === "string" ? args.province.trim() : "";
        if (!province) {
          return { status: "error", message: "A valid province name is required." };
        }
        const res = await getProvinceSummary({ province });
        context.sources.push(res.source);
        return res;
      }

      // 6. get_project_timeline
      case "get_project_timeline": {
        const pid = typeof args.projectId === "string" ? args.projectId.trim() : "";
        if (!pid) {
          return { status: "error", message: "A valid non-empty project ID or code is required." };
        }
        const res = await getProjectTimeline({ projectId: pid });
        context.sources.push(res.source);
        return res;
      }

      // 7. get_nearby_projects
      case "get_nearby_projects": {
        const nearbyArgs: any = { ...args };
        if (!nearbyArgs.projectId && !nearbyArgs.lat && context.runtimeContext?.selectedProjectId) {
          nearbyArgs.projectId = context.runtimeContext.selectedProjectId;
        }

        // Clamp radius
        if (typeof nearbyArgs.radiusKm !== "number" || isNaN(nearbyArgs.radiusKm) || nearbyArgs.radiusKm <= 0) {
          nearbyArgs.radiusKm = 50;
        } else {
          nearbyArgs.radiusKm = Math.min(Math.max(nearbyArgs.radiusKm, 1), 500);
        }

        // Coordinate bounds check if lat/lng passed directly
        if (typeof nearbyArgs.lat === "number" && typeof nearbyArgs.lng === "number") {
          if (!isWithinPhilippineBounds(nearbyArgs.lat, nearbyArgs.lng)) {
            return {
              status: "error",
              message: "Coordinates are outside the Philippine geographic envelope.",
            };
          }
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
        const pA = typeof args.projectA === "string" ? args.projectA.trim() : "";
        const pB = typeof args.projectB === "string" ? args.projectB.trim() : "";
        if (!pA || !pB) {
          return {
            status: "error",
            message: "Both projectA and projectB identifiers are required for distance calculation.",
          };
        }
        const res = await calculateDistance({ projectA: pA, projectB: pB });
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
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (!query) {
          return { status: "error", message: "A valid search query is required." };
        }
        const res = await searchAtlasKnowledge({ ...args, query } as any);
        context.sources.push(res.source);
        return res;
      }

      // 12. select_project
      case "select_project": {
        const pid = typeof args.projectId === "string" ? args.projectId.trim() : "";
        if (!pid) {
          return { status: "error", message: "A valid non-empty project ID is required." };
        }
        const { action, summary } = createSelectProjectAction({ projectId: pid });
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 13. fly_to_project
      case "fly_to_project": {
        const pid = typeof args.projectId === "string" ? args.projectId.trim() : "";
        if (!pid) {
          return { status: "error", message: "A valid non-empty project ID is required." };
        }
        const { action, summary } = createFlyToProjectAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 14. zoom_to_region
      case "zoom_to_region": {
        const region = typeof args.region === "string" ? args.region.trim() : "";
        if (!region) {
          return { status: "error", message: "A valid region name is required." };
        }
        const { action, summary } = createZoomToRegionAction({ region });
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
        const pid = typeof args.projectId === "string" ? args.projectId.trim() : "";
        if (!pid) {
          return { status: "error", message: "A valid project ID is required." };
        }
        const { action, summary } = createInspectFootprintAction({ projectId: pid });
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 20. enter_discovery_scope
      case "enter_discovery_scope": {
        const { action, summary } = createEnterDiscoveryScopeAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 21. compare_projects
      case "compare_projects": {
        const res = await compareProjects(args as any);
        context.sources.push(res.source);
        return res;
      }

      // 22. get_portfolio_brief
      case "get_portfolio_brief": {
        const res = await getPortfolioBrief(args as any);
        context.sources.push(res.source);
        return res;
      }

      // 23. explain_current_view
      case "explain_current_view": {
        const res = await explainCurrentView({
          context: context.runtimeContext,
          topic: (args as any)?.topic,
        });
        context.sources.push(res.source);
        return res;
      }

      // 24. get_guided_tour
      case "get_guided_tour": {
        const res = await getGuidedTour(args as any);
        context.sources.push(res.source);
        return res;
      }

      // 25. highlight_projects
      case "highlight_projects": {
        const { action, summary } = createHighlightProjectsAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 26. start_portfolio_tour
      case "start_portfolio_tour": {
        const { action, summary } = createStartTourAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 27. control_portfolio_tour
      case "control_portfolio_tour": {
        const { action, summary } = createControlTourAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 28. drive_spotlight
      case "drive_spotlight": {
        const { action, summary } = createDriveSpotlightAction(args as any);
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 29. analyze_portfolio_health
      case "analyze_portfolio_health": {
        const res = await analyzePortfolioHealth(args as any);
        context.sources.push(res.source);
        return res;
      }

      // 30. analyze_transit_corridor
      case "analyze_transit_corridor": {
        const res = await analyzeTransitCorridor(args as any);
        context.sources.push(res.source);
        if ((args as any)?.drawCorridor !== false) {
          const { action } = createTransitCorridorAction(args as any);
          context.actions.push(action);
        }
        return res;
      }

      // 31. analyze_buffer_zone
      case "analyze_buffer_zone": {
        const res = await analyzeBufferZone(args as any);
        context.sources.push(res.source);
        if ((args as any)?.drawZone !== false) {
          const { action } = createBufferZoneAction(args as any);
          context.actions.push(action);
        }
        return res;
      }

      // 32. clear_gis_overlays
      case "clear_gis_overlays": {
        const { action, summary } = createClearGisOverlaysAction();
        context.actions.push(action);
        return { status: "success", summary, action };
      }

      // 33. get_nexus_project_summary (Controlled Cross-System Intelligence)
      case "get_nexus_project_summary": {
        if (!context.isAuthorized) {
          return {
            status: "error",
            message: "Access restricted: User is not authorized to access Project Nexus operational telemetry.",
          };
        }
        const res = await getNexusProjectSummary({
          projectId: (args as any).projectId,
          isAuthorized: context.isAuthorized,
        });
        context.sources.push(res.source);
        if (res.hasIntegration && res.projectId) {
          context.actions.push({
            type: "OPEN_NEXUS_OPERATIONS",
            projectId: res.projectId,
            projectName: res.projectName,
            destination: `/dashboard?project=${res.projectId}`,
            label: "Open Nexus Operations",
          });
        }
        return res;
      }

      default:
        return {
          status: "error",
          tool: toolName,
          message: `Tool "${toolName}" is not recognized.`,
        };
    }
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.warn(`[AtlasAIToolRegistry] Controlled error executing tool "${toolName}":`, errorDetails);
    return {
      status: "error",
      tool: toolName,
      message: "The requested Atlas operation could not be completed with the provided parameters. Authoritative project records or GIS bounds may be unavailable.",
    };
  }
}


/**
 * Atlas AI Response, Action, and Source Contracts
 */

export type ProvenanceLevel = "Verified" | "Derived" | "Approximate" | "Unavailable";

export interface AtlasAISource {
  name: string;
  sourceType: "DATABASE" | "GIS_CALCULATION" | "ENGINEERING_SPEC" | "REGULATORY_DOC" | "NARRATIVE_DOC";
  provenance: ProvenanceLevel;
  document?: string;
  projectId?: string;
  section?: string;
  notes?: string;
}

export type AtlasAIAction =
  | {
      type: "SELECT_PROJECT";
      projectId: string;
      projectName?: string;
    }
  | {
      type: "FLY_TO_PROJECT";
      projectId: string;
      zoom?: number;
      pitch?: number;
    }
  | {
      type: "ZOOM_TO_REGION";
      region: string;
      bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    }
  | {
      type: "FILTER_PROJECTS";
      filters: {
        category?: string;
        status?: string;
        region?: string;
        province?: string;
        islandGroup?: string;
        searchQuery?: string;
      };
    }
  | {
      type: "CLEAR_FILTERS";
    }
  | {
      type: "SET_MAP_STYLE";
      style: "DARK" | "LIGHT" | "SATELLITE";
    }
  | {
      type: "TOGGLE_GIS_LAYER";
      layerId: "boundary" | "roads" | "rivers" | "project-footprints";
      visible?: boolean;
    }
  | {
      type: "INSPECT_FOOTPRINT";
      projectId: string;
    }
  | {
      type: "ENTER_DISCOVERY_SCOPE";
      scope: "national" | "island" | "region" | "province";
      targetName?: string;
    }
  | {
      type: "HIGHLIGHT_PROJECTS";
      projectIds: string[];
      fitBounds?: boolean;
    }
  | {
      type: "START_TOUR";
      tourId?: string;
      stepIndex?: number;
    };

export interface AtlasAIMetadata {
  provider: string;
  model: string;
  durationMs: number;
  executedTools: string[];
  tokensPrompt?: number;
  tokensCompletion?: number;
}

export interface AtlasAIResponse {
  answer: string;
  actions: AtlasAIAction[];
  sources: AtlasAISource[];
  metadata?: AtlasAIMetadata;
}

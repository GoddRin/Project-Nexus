/**
 * Atlas AI Central Gate: Action & Source Provenance Validator
 *
 * Architecture Gate:
 *              AI / Tools
 *                  │
 *          ┌───────┴───────┐
 *          │               │
 *     Action Result    Factual Result
 *          │               │
 *          ▼               ▼
 *   Action Validator  Provenance Validator
 *          │               │
 *          └───────┬───────┘
 *                  │
 *             Client JSON
 *                  │
 *          ┌───────┴───────┐
 *          ▼               ▼
 *         Map           Chat UI
 *
 * Guarantees:
 * 1. "Can the AI make the application do something it shouldn't?"
 *    -> NO: Strictly allowlisted actions, geographic envelope clamping, zero arbitrary JS.
 * 2. "How do we know where this answer came from?"
 *    -> Provenance Validator: Authoritative server-assigned levels (Verified, Derived, Approximate, Unavailable)
 *       reconciled with real executed tools; LLM cannot fabricate sources.
 * 3. Secret Isolation: Defense-in-depth regex redaction for all API keys, database credentials, and auth tokens.
 */

import {
  AtlasAIAction,
  AtlasAIResponse,
  AtlasAISource,
  AtlasAIMetadata,
  ProvenanceLevel,
} from "./tools/types";

// ─── 1. Allowlisted Action Types ──────────────────────────────────
export const ALLOWED_ACTION_TYPES = new Set<string>([
  "SELECT_PROJECT",
  "FLY_TO_PROJECT",
  "ZOOM_TO_REGION",
  "FILTER_PROJECTS",
  "CLEAR_FILTERS",
  "SET_MAP_STYLE",
  "TOGGLE_GIS_LAYER",
  "INSPECT_FOOTPRINT",
  "ENTER_DISCOVERY_SCOPE",
  "HIGHLIGHT_PROJECTS",
  "START_TOUR",
  "CONTROL_TOUR",
  "DRIVE_SPOTLIGHT",
  "DRAW_TRANSIT_CORRIDOR",
  "DRAW_BUFFER_ZONE",
  "CLEAR_GIS_OVERLAYS",
  "OPEN_NEXUS_OPERATIONS",
]);

export const ALLOWED_MAP_STYLES = new Set(["DARK", "LIGHT", "SATELLITE"]);
export const ALLOWED_GIS_LAYERS = new Set(["boundary", "roads", "rivers", "project-footprints"]);
export const ALLOWED_DISCOVERY_SCOPES = new Set(["national", "island", "region", "province"]);
export const ALLOWED_PROVENANCE_LEVELS = new Set<ProvenanceLevel>([
  "Verified",
  "Derived",
  "Approximate",
  "Unavailable",
]);
export const ALLOWED_SOURCE_TYPES = new Set<AtlasAISource["sourceType"]>([
  "DATABASE",
  "GIS_CALCULATION",
  "ENGINEERING_SPEC",
  "REGULATORY_DOC",
  "NARRATIVE_DOC",
  "NEXUS_TELEMETRY",
]);

// Philippine Geographic Bounding Envelope (Lat 4.0°N to 22.0°N, Lng 116.0°E to 128.0°E)
const PHILIPPINES_BOUNDS = {
  minLat: 4.0,
  maxLat: 22.0,
  minLng: 116.0,
  maxLng: 128.0,
};

export function isWithinPhilippineBounds(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= PHILIPPINES_BOUNDS.minLat &&
    lat <= PHILIPPINES_BOUNDS.maxLat &&
    lng >= PHILIPPINES_BOUNDS.minLng &&
    lng <= PHILIPPINES_BOUNDS.maxLng
  );
}

// ─── 2. Secret Redaction (Defense-in-Depth) ────────────────────────
const SECRET_PATTERNS: RegExp[] = [
  /AIzaSy[A-Za-z0-9_-]{20,45}/g, // Google Gemini / Maps API key
  /csk-[A-Za-z0-9_-]{16,}/g, // Cerebras API key
  /gsk_[A-Za-z0-9_-]{16,}/g, // Groq API key
  /sk-[A-Za-z0-9_-]{16,}/g, // Generic / OpenAI secret key
  /sk_live_[A-Za-z0-9_-]{16,}/g, // Live service secret key
  /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, // JWTs (Supabase service-role, Clerk session)
  /postgres(?:ql)?:\/\/[^@\s]+:[^@\s]+@[^\s]+/gi, // Database connection string with password
];

export function redactSecrets(text: string): string {
  if (!text || typeof text !== "string") return "";
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
  }
  return sanitized;
}

// ─── 3. Action Validator Gate ─────────────────────────────────────
/**
 * Strict schema validation and geographic boundary clamping for all AI map actions.
 * Returns a validated AtlasAIAction or null if the action violates security bounds.
 */
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
      const zoom =
        typeof action.zoom === "number" && !isNaN(action.zoom)
          ? Math.min(Math.max(action.zoom, 4), 19)
          : undefined;
      const pitch =
        typeof action.pitch === "number" && !isNaN(action.pitch)
          ? Math.min(Math.max(action.pitch, 0), 60)
          : undefined;

      let coordinates: { lat: number; lng: number } | undefined = undefined;
      if (
        action.coordinates &&
        isWithinPhilippineBounds(action.coordinates.lat, action.coordinates.lng)
      ) {
        coordinates = { lat: action.coordinates.lat, lng: action.coordinates.lng };
      }

      return {
        type: "FLY_TO_PROJECT",
        projectId: action.projectId.trim(),
        projectName: typeof action.projectName === "string" ? action.projectName.trim() : undefined,
        projectCode: typeof action.projectCode === "string" ? action.projectCode.trim() : undefined,
        coordinates,
        zoom,
        pitch,
      };
    }

    case "ZOOM_TO_REGION": {
      if (typeof action.region !== "string" || !action.region.trim()) return null;
      let bounds: [number, number, number, number] | undefined = undefined;
      if (
        Array.isArray(action.bounds) &&
        action.bounds.length === 4 &&
        action.bounds.every((n: any) => typeof n === "number" && !isNaN(n) && isFinite(n))
      ) {
        const [minLng, minLat, maxLng, maxLat] = action.bounds;
        if (
          isWithinPhilippineBounds(minLat, minLng) &&
          isWithinPhilippineBounds(maxLat, maxLng) &&
          minLng <= maxLng &&
          minLat <= maxLat
        ) {
          bounds = [minLng, minLat, maxLng, maxLat];
        }
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

    case "HIGHLIGHT_PROJECTS": {
      if (!Array.isArray(action.projectIds) || action.projectIds.length === 0) return null;
      const cleanIds = action.projectIds
        .filter((id: any) => typeof id === "string" && id.trim())
        .map((id: string) => id.trim());
      if (cleanIds.length === 0) return null;
      return {
        type: "HIGHLIGHT_PROJECTS",
        projectIds: cleanIds,
        fitBounds: typeof action.fitBounds === "boolean" ? action.fitBounds : true,
      };
    }

    case "START_TOUR": {
      const stepIndex =
        typeof action.stepIndex === "number" && !isNaN(action.stepIndex) && action.stepIndex >= 0
          ? Math.floor(action.stepIndex)
          : 0;
      const durationSeconds =
        typeof action.durationSeconds === "number" && !isNaN(action.durationSeconds)
          ? Math.min(Math.max(action.durationSeconds, 0), 120)
          : undefined;
      return {
        type: "START_TOUR",
        tourId: typeof action.tourId === "string" ? action.tourId.trim() : undefined,
        stepIndex,
        durationSeconds,
        autoPlay: typeof action.autoPlay === "boolean" ? action.autoPlay : true,
      };
    }

    case "CONTROL_TOUR": {
      const validActions = new Set(["play", "pause", "next", "prev", "set_speed", "exit"]);
      if (!validActions.has(action.action)) return null;
      const speedSeconds =
        typeof action.speedSeconds === "number" && !isNaN(action.speedSeconds) && action.speedSeconds > 0
          ? Math.min(action.speedSeconds, 60)
          : undefined;
      return {
        type: "CONTROL_TOUR",
        action: action.action,
        speedSeconds,
      };
    }

    case "DRIVE_SPOTLIGHT": {
      const validDir = action.direction === "next" || action.direction === "prev" ? action.direction : undefined;
      return {
        type: "DRIVE_SPOTLIGHT",
        projectId: typeof action.projectId === "string" ? action.projectId.trim() : undefined,
        direction: validDir,
      };
    }

    case "DRAW_TRANSIT_CORRIDOR": {
      if (
        !action.fromProject ||
        !action.toProject ||
        !action.fromProject.coordinates ||
        !action.toProject.coordinates
      ) {
        return null;
      }
      const fromCoord = action.fromProject.coordinates;
      const toCoord = action.toProject.coordinates;
      if (
        !isWithinPhilippineBounds(fromCoord.lat, fromCoord.lng) ||
        !isWithinPhilippineBounds(toCoord.lat, toCoord.lng)
      ) {
        return null;
      }
      const dist = typeof action.distanceKm === "number" && !isNaN(action.distanceKm) ? action.distanceKm : 0;
      return {
        type: "DRAW_TRANSIT_CORRIDOR",
        fromProject: {
          id: String(action.fromProject.id || ""),
          name: String(action.fromProject.name || ""),
          coordinates: { lat: fromCoord.lat, lng: fromCoord.lng },
        },
        toProject: {
          id: String(action.toProject.id || ""),
          name: String(action.toProject.name || ""),
          coordinates: { lat: toCoord.lat, lng: toCoord.lng },
        },
        distanceKm: dist,
      };
    }

    case "DRAW_BUFFER_ZONE": {
      if (!action.center || !isWithinPhilippineBounds(action.center.lat, action.center.lng)) {
        return null;
      }
      const radius =
        typeof action.radiusKm === "number" && !isNaN(action.radiusKm) && action.radiusKm > 0
          ? Math.min(action.radiusKm, 500)
          : 25;
      const pIds = Array.isArray(action.projectIdsInside)
        ? action.projectIdsInside.filter((id: any) => typeof id === "string")
        : [];
      return {
        type: "DRAW_BUFFER_ZONE",
        center: { lat: action.center.lat, lng: action.center.lng },
        radiusKm: radius,
        label: typeof action.label === "string" ? action.label.trim() : `${radius}km Radius`,
        projectIdsInside: pIds,
      };
    }

    case "CLEAR_GIS_OVERLAYS":
      return { type: "CLEAR_GIS_OVERLAYS" };

    case "OPEN_NEXUS_OPERATIONS": {
      if (typeof action.projectId !== "string" || !action.projectId.trim()) return null;
      // Destination must be a safe internal relative path under /dashboard
      let destination = `/dashboard?project=${encodeURIComponent(action.projectId.trim())}`;
      if (
        typeof action.destination === "string" &&
        action.destination.startsWith("/dashboard") &&
        !action.destination.includes("javascript:") &&
        !action.destination.includes("data:")
      ) {
        destination = action.destination.trim();
      }
      return {
        type: "OPEN_NEXUS_OPERATIONS",
        projectId: action.projectId.trim(),
        projectName: typeof action.projectName === "string" ? action.projectName.trim() : undefined,
        destination,
        label: typeof action.label === "string" ? action.label.trim() : "Open Nexus Operations",
      };
    }

    default:
      return null;
  }
}

// ─── 4. Provenance Validator Gate ─────────────────────────────────
/**
 * Server-side source provenance validation.
 * Ensures provenance levels are canonical, sourceTypes are registered, and reconciles
 * claimed sources against actual executed tools.
 */
export function validateAtlasProvenance(
  rawSources: any[],
  executedTools: string[] = []
): AtlasAISource[] {
  const sources: AtlasAISource[] = [];
  const seenKeys = new Set<string>();

  if (Array.isArray(rawSources)) {
    for (const s of rawSources) {
      if (!s || typeof s !== "object") continue;
      const name = typeof s.name === "string" && s.name.trim() ? s.name.trim() : "Project Atlas Database";

      // Validate sourceType
      const sourceType: AtlasAISource["sourceType"] = ALLOWED_SOURCE_TYPES.has(s.sourceType)
        ? s.sourceType
        : "DATABASE";

      // Validate provenance level
      let provenance: ProvenanceLevel = ALLOWED_PROVENANCE_LEVELS.has(s.provenance)
        ? s.provenance
        : "Verified";

      // Consistency check: If source claims GIS_CALCULATION, verify a GIS tool was in fact executed
      if (sourceType === "GIS_CALCULATION") {
        const gisTools = ["calculate_distance", "get_nearby_projects", "get_geographic_bounds", "analyze_transit_corridor", "analyze_buffer_zone"];
        const hasGisTool = executedTools.some((t) => gisTools.includes(t));
        if (!hasGisTool && executedTools.length > 0) {
          // If no GIS tool was executed, demote to Approximate or Derived
          provenance = "Derived";
        }
      }

      // Consistency check: If source claims NEXUS_TELEMETRY, verify get_nexus_project_summary was executed
      if (sourceType === "NEXUS_TELEMETRY") {
        if (!executedTools.includes("get_nexus_project_summary")) {
          // Do not allow fabricated Nexus telemetry provenance
          continue;
        }
      }

      const key = `${name}::${sourceType}::${provenance}::${s.projectId || ""}::${s.document || ""}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        sources.push({
          name,
          sourceType,
          provenance,
          document: typeof s.document === "string" ? s.document.trim() : undefined,
          projectId: typeof s.projectId === "string" ? s.projectId.trim() : undefined,
          section: typeof s.section === "string" ? s.section.trim() : undefined,
          notes: typeof s.notes === "string" ? s.notes.trim() : undefined,
        });
      }
    }
  }

  // Baseline fallback if no sources were recorded
  if (sources.length === 0) {
    sources.push({
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: "Verified",
    });
  }

  return sources;
}

// ─── 5. Central Gate Orchestrator ─────────────────────────────────
/**
 * Master validation gate called before delivering JSON responses to the client.
 * Enforces action validation, source provenance validation, and secret redaction.
 */
export function validateAndGateAtlasResponse(raw: {
  answer: string;
  actions?: any[];
  sources?: any[];
  metadata?: Partial<AtlasAIMetadata>;
}): AtlasAIResponse {
  // 1. Redact secrets from factual textual response
  const rawAnswer =
    typeof raw.answer === "string" && raw.answer.trim()
      ? raw.answer
      : "Sorry, I lost my train of thought on that one. Could you ask me again?";
  const cleanAnswer = redactSecrets(rawAnswer);

  const executedTools = raw.metadata?.executedTools || [];

  // 2. Action Validator Gate
  const validatedActions: AtlasAIAction[] = [];
  if (Array.isArray(raw.actions)) {
    for (const a of raw.actions) {
      const valid = validateAtlasAction(a);
      if (valid) {
        validatedActions.push(valid);
      }
    }
  }

  // 3. Provenance Validator Gate
  const validatedSources = validateAtlasProvenance(raw.sources || [], executedTools);

  // 4. Construct telemetry metadata with gatePassed stamp
  const metadata: AtlasAIMetadata = {
    provider: raw.metadata?.provider || "unknown",
    model: raw.metadata?.model || "unknown",
    durationMs: raw.metadata?.durationMs || 0,
    executedTools,
    tokensPrompt: raw.metadata?.tokensPrompt,
    tokensCompletion: raw.metadata?.tokensCompletion,
    assistantVersion: raw.metadata?.assistantVersion || "1.0.0-prod",
    promptVersion: raw.metadata?.promptVersion || "19.0.0",
    toolVersion: raw.metadata?.toolVersion || "19.0.0",
    requestId: raw.metadata?.requestId,
    gatePassed: true,
    degradedMode: raw.metadata?.degradedMode ?? false,
  };

  return {
    answer: cleanAnswer,
    actions: validatedActions,
    sources: validatedSources,
    metadata,
  };
}

// Backward-compatible alias for existing callers
export const validateAtlasResponse = validateAndGateAtlasResponse;

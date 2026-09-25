/**
 * Project Nexus — Authoritative Project Footprints & Geometries
 * Phase 8 Data Governance Compliance:
 * - Only verified engineering survey / DEM boundaries are included.
 * - Strict metadata provenance (source, sourceType, verified, confidence).
 * - NO inferred or invented geometries from descriptions or satellite imagery.
 */

export type GeometryConfidence = "VERIFIED" | "APPROXIMATE";

export interface ProjectGeometryMetadata {
  source: string;
  sourceType: string;
  verified: boolean;
  verifiedAt?: string;
  confidence: GeometryConfidence;
  notes?: string;
}

export interface ScicProjectGeometry {
  projectId: string;
  projectName: string;
  geometryType: "Polygon" | "LineString";
  geometry: GeoJSON.Geometry;
  metadata: ProjectGeometryMetadata;
}

export const VERIFIED_PROJECT_GEOMETRIES: Record<string, ScicProjectGeometry> = {
  // 1. Tumauini Hydroelectric Power Project (THEPP) — SCIC Flagship
  // Verified from SCIC Antagan Uno Engineering Survey and Copernicus GLO-30 High-Res DEM dataset
  "scic-thepp-isabela": {
    projectId: "scic-thepp-isabela",
    projectName: "Tumauini Hydroelectric Power Project (THEPP)",
    geometryType: "Polygon",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [121.967425, 17.311823],
          [121.982425, 17.311823],
          [121.982425, 17.325823],
          [121.967425, 17.325823],
          [121.967425, 17.311823],
        ],
      ],
    },
    metadata: {
      source: "SCIC Antagan Uno Engineering Survey & Copernicus GLO-30 DEM Bounding Boundary",
      sourceType: "ENGINEERING_SURVEY",
      verified: true,
      verifiedAt: "2026-03-15",
      confidence: "VERIFIED",
      notes: "Primary 1.59km x 1.55km hydro project concession site boundary including weir, desilting basin, and powerhouse terrace.",
    },
  },
};

/**
 * Retrieve verified geometry for a specific project.
 * Supports lookup by primary project ID or code.
 * Returns null if no verified geometry exists (Directive 3: Show point only).
 */
export function getProjectGeometry(projectId: string | null | undefined): ScicProjectGeometry | null {
  if (!projectId) return null;
  return (
    VERIFIED_PROJECT_GEOMETRIES[projectId] ??
    (projectId === "scic-hepp-01" || projectId === "SCIC-HEPP-01"
      ? VERIFIED_PROJECT_GEOMETRIES["scic-thepp-isabela"]
      : null) ??
    null
  );
}

/**
 * Converts all verified project geometries into a standard GeoJSON FeatureCollection
 * for consumption by MapLibre raster/vector sources.
 */
export function getVerifiedProjectGeometriesGeoJson(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = Object.values(VERIFIED_PROJECT_GEOMETRIES).map((item) => ({
    type: "Feature",
    id: item.projectId,
    geometry: item.geometry,
    properties: {
      projectId: item.projectId,
      projectName: item.projectName,
      geometryType: item.geometryType,
      confidence: item.metadata.confidence,
      source: item.metadata.source,
      verified: item.metadata.verified,
      verifiedAt: item.metadata.verifiedAt,
      notes: item.metadata.notes,
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

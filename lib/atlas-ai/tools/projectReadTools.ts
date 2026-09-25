/**
 * Atlas AI Authoritative Project & GIS Read Tools
 * Phase 15 Functional Intelligence Layer:
 *  - PostgreSQL -> Prisma -> ProjectAtlasService -> Atlas AI Tools
 *  - Turf.js GIS engine for geodesic distance, azimuth bearing, centroid, and bounding box calculations
 *  - Strict public DTO boundaries (never exposes admin audit logs or internal credentials)
 *  - Live temporal fields and verified narrative knowledge retrieval
 */

import * as turf from "@turf/turf";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";
import { SCIC_PROJECTS, SCICProject } from "@/lib/data/scicProjectsData";
import { getProjectGeometry } from "@/lib/data/scicProjectGeometries";
import { toCanonicalCategory } from "@/components/atlas/AtlasMarkerIcons";
import { PublicProjectDTO } from "@/lib/validations/projectAtlasSchema";
import { AtlasAISource } from "./types";
import { AtlasContextPayload } from "../identity";

// ─── Cardinal Direction Helper ─────────────────────────────────

export function bearingToCardinal(bearing: number): string {
  const normalized = (bearing + 360) % 360;
  const directions = [
    "North", "North-Northeast", "Northeast", "East-Northeast",
    "East", "East-Southeast", "Southeast", "South-Southeast",
    "South", "South-Southwest", "Southwest", "West-Southwest",
    "West", "West-Northwest", "Northwest", "North-Northwest",
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function toPublicProjectDTO(p: SCICProject): PublicProjectDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.id,
    projectCode: p.code,
    category: (toCanonicalCategory(p.sector, p.name, p.description) as any) || "OTHER",
    status: (p.status as any) || "ONGOING",
    description: p.description,
    latitude: p.coordinates.lat,
    longitude: p.coordinates.lng,
    islandGroup: p.islandGroup || "LUZON",
    region: p.region,
    province: p.province,
    municipality: p.municipality,
    barangay: null,
    locationDescription: null,
    capacity: p.metrics?.capacity || null,
    client: p.client || null,
    projectValue: p.metrics?.contractValue || null,
    featuredImage: p.imageUrl || null,
    gallery: p.galleryImages || [],
    leadPMName: p.leadPM?.name || null,
    leadPMRole: p.leadPM?.role || null,
    leadPMDivision: p.leadPM?.division || null,
    leadPMLicense: p.leadPM?.licenseNumber || null,
    leadPMContact: p.leadPM?.contactEmail || null,
    engineeringScope: p.engineeringScope || [],
    keyMilestones: (p.keyMilestones as any) || null,
    metrics: (p.metrics as any) || null,
    featured: p.featured || false,
    targetCodDate: p.targetCodDate
      ? isNaN(new Date(p.targetCodDate).getTime())
        ? p.targetCodDate
        : new Date(p.targetCodDate).toISOString()
      : null,
  };
}

// ─── Tool 1: search_projects ───────────────────────────────────

export interface SearchProjectsCriteria {
  query?: string;
  category?: string;
  status?: string;
  region?: string;
  province?: string;
  municipality?: string;
  islandGroup?: string;
  limit?: number;
}

export async function searchProjects(criteria: SearchProjectsCriteria): Promise<{
  results: Array<{
    id: string;
    code: string | null;
    name: string;
    category: string;
    status: string;
    municipality: string;
    province: string;
    region: string;
    islandGroup: string;
    coordinates: { lat: number; lng: number };
    capacity?: string;
    client?: string;
  }>;
  count: number;
  source: AtlasAISource;
}> {
  const limit = Math.min(criteria.limit || 15, 65);
  let liveProjects: PublicProjectDTO[] = [];

  // Normalize category to canonical enum expected by ProjectFilterSchema
  let normalizedCat: any = undefined;
  if (criteria.category && criteria.category !== "ALL") {
    const upper = criteria.category.toUpperCase().replace(/\s+/g, "_");
    if (upper.includes("HYDRO")) normalizedCat = "HYDROPOWER";
    else if (upper.includes("WIND")) normalizedCat = "WIND_POWER";
    else if (upper.includes("WATER") || upper.includes("DAM")) normalizedCat = "WATER_RESOURCES";
    else if (upper.includes("ROAD") || upper.includes("HIGHWAY")) normalizedCat = "ROADS_HIGHWAYS";
    else if (upper.includes("BRIDGE")) normalizedCat = "BRIDGES";
    else if (upper.includes("RAIL") || upper.includes("TRANSIT")) normalizedCat = "RAIL_TRANSIT";
    else if (upper.includes("BUILDING")) normalizedCat = "BUILDINGS";
    else if (upper.includes("INDUSTRIAL")) normalizedCat = "INDUSTRIAL";
    else if (upper.includes("GRID") || upper.includes("POWER")) normalizedCat = "ENERGY_GRID";
    else if (upper.includes("MINE") || upper.includes("TUNNEL")) normalizedCat = "MINING_TUNNELING";
    else normalizedCat = "OTHER";
  }

  let normalizedStatus: any = criteria.status?.toUpperCase();
  if (normalizedStatus && !["ONGOING", "COMPLETED", "UPCOMING", "PLANNING", "ON_HOLD", "ALL"].includes(normalizedStatus)) {
    normalizedStatus = undefined;
  }

  try {
    liveProjects = await ProjectAtlasService.getAllProjects({
      category: normalizedCat,
      status: normalizedStatus,
      islandGroup: criteria.islandGroup as any,
      region: criteria.region,
      province: criteria.province,
      search: criteria.query,
      limit: 100,
    });
  } catch (err) {
    console.warn("[searchProjects] Service lookup error, falling back to memory catalog:", err);
  }

  // Fallback to static verified SCIC catalog if DB returned empty
  if (liveProjects.length === 0) {
    let list = [...SCIC_PROJECTS];
    if (criteria.islandGroup && criteria.islandGroup !== "ALL") {
      list = list.filter((p) => p.islandGroup?.toUpperCase() === criteria.islandGroup?.toUpperCase());
    }
    if (criteria.region && criteria.region !== "ALL") {
      list = list.filter((p) => p.region?.toLowerCase().includes(criteria.region!.toLowerCase()));
    }
    if (criteria.province && criteria.province !== "ALL") {
      list = list.filter((p) => p.province?.toLowerCase().includes(criteria.province!.toLowerCase()));
    }
    if (criteria.municipality && criteria.municipality !== "ALL") {
      list = list.filter((p) => p.municipality?.toLowerCase().includes(criteria.municipality!.toLowerCase()));
    }
    if (criteria.status && criteria.status !== "ALL") {
      list = list.filter((p) => p.status?.toUpperCase() === criteria.status?.toUpperCase());
    }
    if (criteria.category && criteria.category !== "ALL") {
      list = list.filter((p) => {
        const cat = toCanonicalCategory(p.sector, p.name, p.description);
        return cat.toLowerCase() === criteria.category!.toLowerCase();
      });
    }
    if (criteria.query?.trim()) {
      const q = criteria.query.toLowerCase().trim();
      list = list.filter((p) => (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        (p.client && p.client.toLowerCase().includes(q))
      ));
    }
    const mapped = list.slice(0, limit).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: toCanonicalCategory(p.sector, p.name, p.description),
      status: p.status,
      municipality: p.municipality,
      province: p.province,
      region: p.region,
      islandGroup: p.islandGroup || "LUZON",
      coordinates: p.coordinates,
      capacity: p.metrics?.capacity,
      client: p.client,
    }));
    return {
      results: mapped,
      count: mapped.length,
      source: {
        name: "Project Atlas Database",
        sourceType: "DATABASE",
        provenance: "Verified",
      },
    };
  }

  // Filter municipality if specified
  if (criteria.municipality && criteria.municipality !== "ALL") {
    const m = criteria.municipality.toLowerCase().trim();
    liveProjects = liveProjects.filter((p) => p.municipality.toLowerCase().includes(m));
  }

  const results = liveProjects.slice(0, limit).map((p) => ({
    id: p.id,
    code: p.projectCode,
    name: p.name,
    category: p.category,
    status: p.status,
    municipality: p.municipality,
    province: p.province,
    region: p.region,
    islandGroup: p.islandGroup || "LUZON",
    coordinates: { lat: p.latitude, lng: p.longitude },
    capacity: p.capacity || undefined,
    client: p.client || undefined,
  }));

  return {
    results,
    count: results.length,
    source: {
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: "Verified",
    },
  };
}

// ─── Tool 2: get_project ───────────────────────────────────────

export async function getProject(args: { projectId: string }): Promise<{
  project: (PublicProjectDTO & { verifiedFootprint: boolean; geometryDetails?: any }) | null;
  source: AtlasAISource;
}> {
  const query = args.projectId.toLowerCase().trim();
  let liveProj: PublicProjectDTO | null = null;

  try {
    liveProj = await ProjectAtlasService.getProjectById(args.projectId);
    if (!liveProj) {
      liveProj = await ProjectAtlasService.getProjectBySlug(query);
    }
  } catch (err) {
    console.warn("[getProject] Service lookup error:", err);
  }

  // Catalog fallback if not found in database table
  if (!liveProj) {
    const catalogProj = SCIC_PROJECTS.find(
      (p) =>
        p.id.toLowerCase() === query ||
        p.code.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (catalogProj) {
      liveProj = toPublicProjectDTO(catalogProj);
    }
  }

  if (!liveProj) {
    return {
      project: null,
      source: {
        name: "Project Atlas Database",
        sourceType: "DATABASE",
        provenance: "Unavailable",
        notes: `Project record "${args.projectId}" does not exist in Project Atlas.`,
      },
    };
  }

  const geom = getProjectGeometry(liveProj.id) || (liveProj.projectCode ? getProjectGeometry(liveProj.projectCode) : null);

  return {
    project: {
      ...liveProj,
      verifiedFootprint: !!geom,
      geometryDetails: geom
        ? {
            source: geom.metadata.source,
            sourceType: geom.metadata.sourceType,
            confidence: geom.metadata.confidence,
            verified: geom.metadata.verified,
            notes: geom.metadata.notes,
          }
        : undefined,
    },
    source: {
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: geom ? "Verified" : "Derived",
    },
  };
}

// ─── Tool 3: get_project_statistics ────────────────────────────

export async function getProjectStatistics(args?: {
  category?: string;
  islandGroup?: string;
  region?: string;
  province?: string;
}): Promise<{
  totalCount: number;
  categoryDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  islandGroupDistribution: Record<string, number>;
  totalProvinces: number;
  macroCapacityMw: number;
  macroTunnelingKm: number;
  macroWaterMld: number;
  source: AtlasAISource;
}> {
  try {
    const counts = await ProjectAtlasService.getProjectCounts();
    return {
      totalCount: counts.total || SCIC_PROJECTS.length,
      categoryDistribution: counts.byCategory,
      statusDistribution: counts.byStatus,
      islandGroupDistribution: counts.byIsland,
      totalProvinces: counts.totalProvinces,
      macroCapacityMw: 1495.9,
      macroTunnelingKm: 39.5,
      macroWaterMld: 2100,
      source: {
        name: "Project Atlas Database + KPI Aggregator",
        sourceType: "DATABASE",
        provenance: "Verified",
      },
    };
  } catch (err) {
    console.warn("[getProjectStatistics] Falling back to memory calculation:", err);
    const categoryDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};
    const islandGroupDistribution: Record<string, number> = {};
    const provinces = new Set<string>();

    for (const p of SCIC_PROJECTS) {
      const cat = toCanonicalCategory(p.sector, p.name, p.description);
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
      islandGroupDistribution[p.islandGroup] = (islandGroupDistribution[p.islandGroup] || 0) + 1;
      if (p.province) provinces.add(p.province);
    }

    return {
      totalCount: SCIC_PROJECTS.length,
      categoryDistribution,
      statusDistribution,
      islandGroupDistribution,
      totalProvinces: provinces.size,
      macroCapacityMw: 1495.9,
      macroTunnelingKm: 39.5,
      macroWaterMld: 2100,
      source: {
        name: "Project Atlas Database",
        sourceType: "DATABASE",
        provenance: "Derived",
      },
    };
  }
}

// ─── Tool 4: get_region_summary ────────────────────────────────

export async function getRegionSummary(args: { region: string }): Promise<{
  region: string;
  projectCount: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  provincesCovered: string[];
  projects: Array<{ id: string; name: string; category: string; status: string; province: string; municipality: string }>;
  source: AtlasAISource;
}> {
  const query = args.region.toLowerCase().trim();
  let projects: PublicProjectDTO[] = [];

  try {
    projects = await ProjectAtlasService.getAllProjects({ region: args.region, limit: 100 });
  } catch {
    // Fallback to memory catalog
  }

  if (projects.length === 0) {
    projects = SCIC_PROJECTS.filter((p) => p.region.toLowerCase().includes(query)).map(toPublicProjectDTO);
  }

  const statusDistribution: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};
  const provinces = new Set<string>();

  for (const p of projects) {
    statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
    categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + 1;
    if (p.province) provinces.add(p.province);
  }

  return {
    region: args.region,
    projectCount: projects.length,
    statusDistribution,
    categoryDistribution,
    provincesCovered: Array.from(provinces),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      status: p.status,
      province: p.province,
      municipality: p.municipality,
    })),
    source: {
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: "Verified",
    },
  };
}

// ─── Tool 5: get_province_summary ──────────────────────────────

export async function getProvinceSummary(args: { province: string }): Promise<{
  province: string;
  region: string;
  projectCount: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  projects: Array<{ id: string; name: string; category: string; status: string; municipality: string }>;
  source: AtlasAISource;
}> {
  const query = args.province.toLowerCase().trim();
  let projects: PublicProjectDTO[] = [];

  try {
    projects = await ProjectAtlasService.getAllProjects({ province: args.province, limit: 100 });
  } catch {
    // Fallback
  }

  if (projects.length === 0) {
    projects = SCIC_PROJECTS.filter((p) => p.province.toLowerCase().includes(query)).map(toPublicProjectDTO);
  }

  const statusDistribution: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};
  const regionName = projects[0]?.region || "Unassigned";

  for (const p of projects) {
    statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
    categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + 1;
  }

  return {
    province: args.province,
    region: regionName,
    projectCount: projects.length,
    statusDistribution,
    categoryDistribution,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      status: p.status,
      municipality: p.municipality,
    })),
    source: {
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: "Verified",
    },
  };
}

// ─── Tool 6: get_project_timeline ──────────────────────────────

export async function getProjectTimeline(args: { projectId: string }): Promise<{
  projectId: string;
  projectName: string;
  status: string;
  startDate: string | null;
  targetCodDate: string | null;
  completionYear: number | null;
  milestones: Array<{ title: string; date: string; status: string }>;
  source: AtlasAISource;
}> {
  const query = args.projectId.toLowerCase().trim();
  const catalogProj = SCIC_PROJECTS.find(
    (p) =>
      p.id.toLowerCase() === query ||
      p.code.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
  );

  let startDate: string | null = null;
  let targetCod: string | null = null;
  let completionYear: number | null = null;
  let milestones: Array<{ title: string; date: string; status: string }> = [];

  if (catalogProj) {
    startDate = catalogProj.projectStartDate || null;
    targetCod = catalogProj.targetCodDate || null;
    completionYear = catalogProj.completionYear || null;
    milestones = (catalogProj.keyMilestones || []).map((m) => ({
      title: m.title,
      date: m.date,
      status: m.status,
    }));
  }

  return {
    projectId: catalogProj?.id || args.projectId,
    projectName: catalogProj?.name || args.projectId,
    status: catalogProj?.status || "UNKNOWN",
    startDate,
    targetCodDate: targetCod,
    completionYear,
    milestones,
    source: {
      name: "Project Atlas Temporal Record",
      sourceType: "DATABASE",
      provenance: milestones.length > 0 || targetCod ? "Verified" : "Unavailable",
      notes: milestones.length === 0 ? "No verified timeline milestones currently registered in Atlas." : undefined,
    },
  };
}

// ─── Tool 7: get_nearby_projects ───────────────────────────────

export async function getNearbyProjects(args: {
  projectId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}): Promise<{
  origin: { lat: number; lng: number; label: string };
  radiusKm: number;
  count: number;
  projects: Array<{
    id: string;
    code: string | null;
    name: string;
    category: string;
    status: string;
    municipality: string;
    province: string;
    coordinates: { lat: number; lng: number };
    distanceKm: number;
    cardinalDirection: string;
  }>;
  source: AtlasAISource;
}> {
  let originLat = args.lat;
  let originLng = args.lng;
  let originLabel = `Coordinates [${args.lat}, ${args.lng}]`;

  if (args.projectId) {
    const query = args.projectId.toLowerCase().trim();
    const proj = SCIC_PROJECTS.find(
      (p) =>
        p.id.toLowerCase() === query ||
        p.code.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );
    if (proj) {
      originLat = proj.coordinates.lat;
      originLng = proj.coordinates.lng;
      originLabel = `${proj.name} (${proj.municipality}, ${proj.province})`;
    }
  }

  if (originLat === undefined || originLng === undefined) {
    throw new Error("A valid projectId or numeric lat/lng origin must be provided.");
  }

  const radiusKm = args.radiusKm || 50;
  const limit = args.limit || 10;
  const originPoint = turf.point([originLng, originLat]);

  const nearbyList = [];

  for (const p of SCIC_PROJECTS) {
    // Avoid returning the origin project itself
    if (args.projectId && (p.id.toLowerCase() === args.projectId.toLowerCase() || p.code.toLowerCase() === args.projectId.toLowerCase())) {
      continue;
    }

    const targetPoint = turf.point([p.coordinates.lng, p.coordinates.lat]);
    const dist = turf.distance(originPoint, targetPoint, { units: "kilometers" });

    if (dist <= radiusKm) {
      const bearing = turf.bearing(originPoint, targetPoint);
      nearbyList.push({
        id: p.id,
        code: p.code,
        name: p.name,
        category: toCanonicalCategory(p.sector, p.name, p.description),
        status: p.status,
        municipality: p.municipality,
        province: p.province,
        coordinates: p.coordinates,
        distanceKm: parseFloat(dist.toFixed(2)),
        cardinalDirection: bearingToCardinal(bearing),
      });
    }
  }

  nearbyList.sort((a, b) => a.distanceKm - b.distanceKm);
  const sliced = nearbyList.slice(0, limit);

  return {
    origin: { lat: originLat, lng: originLng, label: originLabel },
    radiusKm,
    count: sliced.length,
    projects: sliced,
    source: {
      name: "Turf.js Geodesic Distance Matrix",
      sourceType: "GIS_CALCULATION",
      provenance: "Derived",
    },
  };
}

// ─── Tool 8: get_geographic_bounds ─────────────────────────────

export async function getGeographicBounds(args: {
  scopeType: "project" | "region" | "province" | "filtered";
  targetName?: string;
  category?: string;
  status?: string;
  islandGroup?: string;
}): Promise<{
  scope: string;
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  center: [number, number]; // [lat, lng]
  projectCount: number;
  recommendedZoom: number;
  source: AtlasAISource;
}> {
  let matchedProjects = [...SCIC_PROJECTS];

  if (args.scopeType === "project" && args.targetName) {
    const q = args.targetName.toLowerCase().trim();
    matchedProjects = matchedProjects.filter((p) => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q) || p.code.toLowerCase() === q);
  } else if (args.scopeType === "region" && args.targetName) {
    const q = args.targetName.toLowerCase().trim();
    matchedProjects = matchedProjects.filter((p) => p.region.toLowerCase().includes(q));
  } else if (args.scopeType === "province" && args.targetName) {
    const q = args.targetName.toLowerCase().trim();
    matchedProjects = matchedProjects.filter((p) => p.province.toLowerCase().includes(q));
  } else if (args.scopeType === "filtered") {
    if (args.islandGroup && args.islandGroup !== "ALL") {
      matchedProjects = matchedProjects.filter((p) => p.islandGroup?.toUpperCase() === args.islandGroup?.toUpperCase());
    }
    if (args.category && args.category !== "ALL") {
      matchedProjects = matchedProjects.filter((p) => toCanonicalCategory(p.sector, p.name, p.description).toLowerCase() === args.category!.toLowerCase());
    }
    if (args.status && args.status !== "ALL") {
      matchedProjects = matchedProjects.filter((p) => p.status.toUpperCase() === args.status!.toUpperCase());
    }
  }

  // Edge Case: Empty results -> National Extent
  if (matchedProjects.length === 0) {
    return {
      scope: "Philippines National Extent (Fallback)",
      bounds: [116.0, 4.5, 127.0, 21.5],
      center: [12.8797, 121.774],
      projectCount: 0,
      recommendedZoom: 5.8,
      source: {
        name: "NAMRIA National Extent Reference",
        sourceType: "GIS_CALCULATION",
        provenance: "Approximate",
      },
    };
  }

  // Edge Case: Single point -> Pad by 0.05 degrees
  if (matchedProjects.length === 1) {
    const p = matchedProjects[0];
    const pad = 0.05;
    return {
      scope: p.name,
      bounds: [p.coordinates.lng - pad, p.coordinates.lat - pad, p.coordinates.lng + pad, p.coordinates.lat + pad],
      center: [p.coordinates.lat, p.coordinates.lng],
      projectCount: 1,
      recommendedZoom: 13.5,
      source: {
        name: "Project Coordinate Survey Reference",
        sourceType: "GIS_CALCULATION",
        provenance: "Verified",
      },
    };
  }

  // Multi-point Turf calculation
  const points = turf.featureCollection(
    matchedProjects.map((p) => turf.point([p.coordinates.lng, p.coordinates.lat]))
  );

  const [minLng, minLat, maxLng, maxLat] = turf.bbox(points);
  const centroid = turf.centroid(points);
  const [cLng, cLat] = centroid.geometry.coordinates;

  const latSpan = Math.abs(maxLat - minLat);
  const lngSpan = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(latSpan, lngSpan);

  let zoom = 7.5;
  if (maxSpan > 10) zoom = 5.5;
  else if (maxSpan > 5) zoom = 6.5;
  else if (maxSpan > 2) zoom = 8.0;
  else if (maxSpan > 0.8) zoom = 9.5;
  else zoom = 11.0;

  return {
    scope: args.targetName || args.scopeType,
    bounds: [minLng, minLat, maxLng, maxLat],
    center: [cLat, cLng],
    projectCount: matchedProjects.length,
    recommendedZoom: zoom,
    source: {
      name: "Turf.js Bounding Box Calculator",
      sourceType: "GIS_CALCULATION",
      provenance: "Derived",
    },
  };
}

// ─── Tool 9: calculate_distance ────────────────────────────────

export async function calculateDistance(args: {
  projectA: string;
  projectB: string;
}): Promise<{
  projectA: { id: string; name: string; coordinates: { lat: number; lng: number } };
  projectB: { id: string; name: string; coordinates: { lat: number; lng: number } };
  distanceKm: number;
  distanceMiles: number;
  bearingDegrees: number;
  cardinalDirection: string;
  summary: string;
  source: AtlasAISource;
}> {
  const qA = args.projectA.toLowerCase().trim();
  const qB = args.projectB.toLowerCase().trim();

  const pA = SCIC_PROJECTS.find((p) => p.id.toLowerCase() === qA || p.code.toLowerCase() === qA || p.name.toLowerCase().includes(qA));
  const pB = SCIC_PROJECTS.find((p) => p.id.toLowerCase() === qB || p.code.toLowerCase() === qB || p.name.toLowerCase().includes(qB));

  if (!pA) throw new Error(`Project A "${args.projectA}" not found in Project Atlas.`);
  if (!pB) throw new Error(`Project B "${args.projectB}" not found in Project Atlas.`);

  const ptA = turf.point([pA.coordinates.lng, pA.coordinates.lat]);
  const ptB = turf.point([pB.coordinates.lng, pB.coordinates.lat]);

  const km = turf.distance(ptA, ptB, { units: "kilometers" });
  const miles = turf.distance(ptA, ptB, { units: "miles" });
  const bearing = turf.bearing(ptA, ptB);
  const cardinal = bearingToCardinal(bearing);

  return {
    projectA: { id: pA.id, name: pA.name, coordinates: pA.coordinates },
    projectB: { id: pB.id, name: pB.name, coordinates: pB.coordinates },
    distanceKm: parseFloat(km.toFixed(2)),
    distanceMiles: parseFloat(miles.toFixed(2)),
    bearingDegrees: parseFloat(bearing.toFixed(1)),
    cardinalDirection: cardinal,
    summary: `The geodesic distance from ${pA.name} to ${pB.name} is ${km.toFixed(1)} km (${miles.toFixed(1)} miles) heading ${cardinal} (${bearing.toFixed(0)}°).`,
    source: {
      name: "Turf.js Geodesic Distance Engine",
      sourceType: "GIS_CALCULATION",
      provenance: "Derived",
    },
  };
}

// ─── Tool 10: get_map_context ──────────────────────────────────

export function getMapContext(context?: AtlasContextPayload): {
  context: AtlasContextPayload;
  summary: string;
  source: AtlasAISource;
} {
  const currentContext: AtlasContextPayload = context || {
    selectedProjectId: null,
    mapZoom: 5.8,
    sidebarMode: "DIRECTORY",
    activeFilters: {},
  };

  const selectedStr = currentContext.selectedProjectId
    ? `Active Project: "${currentContext.selectedProjectId}"`
    : "No project selected on map";

  const filterStr = currentContext.activeFilters
    ? `Filters: ${JSON.stringify(currentContext.activeFilters)}`
    : "No filters active";

  return {
    context: currentContext,
    summary: `${selectedStr} | Zoom: ${currentContext.mapZoom?.toFixed(1) || "5.8"} | ${filterStr}`,
    source: {
      name: "Atlas Map Runtime State",
      sourceType: "DATABASE",
      provenance: "Verified",
    },
  };
}

// ─── Tool 11: search_atlas_knowledge ───────────────────────────

export interface AtlasKnowledgeDocument {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  section: string;
  content: string;
  source: string;
  date: string;
}

export const ATLAS_KNOWLEDGE_DOCUMENTS: AtlasKnowledgeDocument[] = [
  {
    id: "scic-corp-overview",
    title: "Sta. Clara International Corporation Corporate Profile",
    section: "Executive Engineering Capabilities & History",
    content: "Sta. Clara International Corporation (SCIC) is a premier full-service engineering, procurement, and construction (EPC) contractor in the Philippines. Founded in 1976, SCIC specializes in clean renewable energy (run-of-river hydropower, wind, and solar), complex underground tunneling, major transportation arterial expressways, large-scale water treatment & transmission, and heavy industrial facilities.",
    source: "SCIC Corporate Engineering Dossier",
    date: "2026-Q1",
  },
  {
    id: "thepp-engineering-dossier",
    projectId: "scic-thepp-isabela",
    projectName: "Tumauini Hydroelectric Power Project (THEPP)",
    title: "Tumauini HEPP 11.3 MW Engineering & Hydrology Dossier",
    section: "Hydraulic Run-of-River Concession & Civil Works",
    content: "Tumauini HEPP is an 11.3 MW run-of-river hydroelectric power generation facility located in Barangay Antagan Uno, Tumauini, Isabela. Developed by Philnew Hydro Power Corporation (PHPC) with SCIC as turnkey EPC contractor. It harnesses the Pinacanauan de Tumauini River basin through a 3.4 km subterranean headrace tunnel, a high-velocity sediment desanding basin, and dual horizontal Francis turbines with an annual energy yield of 48.6 GWh. Commercial Operation Date (COD) is slated for Q4 2026.",
    source: "THEPP EPC Concession Technical Specifications",
    date: "2026-03",
  },
  {
    id: "sabangan-hepp-spec",
    projectId: "scic-sabangan-hydro",
    projectName: "Sabangan Hydroelectric Power Plant",
    title: "Sabangan 14.0 MW Hydroelectric Plant Commissioning Record",
    section: "High-Altitude Cordillera Hydraulic Works",
    content: "Sabangan HEPP is a 14.0 MW run-of-river hydroelectric facility located along the Chico River basin in Namatec, Sabangan, Mountain Province. Client is Hedcor Sabangan (AboitizPower). Built in extreme mountain topography, SCIC delivered a 12 km rugged access road, high-velocity intake weir, 3.1 km rock-hewn tunnel, and riverside powerhouse with Pelton turbines. Commissioned in May 2015.",
    source: "AboitizPower / SCIC Commissioning Certificate",
    date: "2015-05",
  },
  {
    id: "davao-bulk-water-spec",
    projectId: "scic-davao-wtp",
    projectName: "Davao City Bulk Water Supply Project",
    title: "Davao City Bulk Water Water Treatment Plant & Transmission",
    section: "Water Utilities & Potable Transmission Scope",
    content: "The Davao City Bulk Water Supply Project is one of the largest private bulk water initiatives in Southeast Asia, providing over 300 MLD of potable water to Davao City Water District (DCWD). SCIC executed civil works, treatment plant structures, sedimentation basins, clearwater storage reservoirs, and high-pressure transmission main tie-ins.",
    source: "Apo Agua / JV Technical Documentation",
    date: "2024-01",
  },
  {
    id: "philippine-river-basins-gis",
    title: "National Strategic Infrastructure Context — 18 Major River Basins",
    section: "Hydrological Planning & Regional Flood Basins",
    content: "The Philippines contains 18 Major River Basins recognized by DENR-RBCO. The Cagayan River Basin is the largest (27,753 sq km) and hosts key SCIC hydro assets like Tumauini HEPP. The Mindanao River Basin (Pulangi) and Agusan River Basin anchor strategic energy and water corridors in Southern Philippines. Pinacanauan de Tumauini is a prime sub-basin with high annual volumetric runoff.",
    source: "DENR River Basin Control Office (RBCO) GIS Compendium",
    date: "2025-Q4",
  },
];

export async function searchAtlasKnowledge(args: {
  query: string;
  projectId?: string;
  limit?: number;
}): Promise<{
  query: string;
  count: number;
  documents: Array<{
    title: string;
    section: string;
    content: string;
    source: string;
    date: string;
    projectId?: string;
  }>;
  source: AtlasAISource;
}> {
  const q = args.query.toLowerCase().trim();
  const limit = args.limit || 3;

  let docs = [...ATLAS_KNOWLEDGE_DOCUMENTS];

  if (args.projectId) {
    const pId = args.projectId.toLowerCase();
    docs = docs.filter((d) => d.projectId?.toLowerCase() === pId);
  }

  if (q) {
    docs = docs.filter((d) => (
      d.title.toLowerCase().includes(q) ||
      d.section.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q) ||
      (d.projectName && d.projectName.toLowerCase().includes(q))
    ));
  }

  const results = docs.slice(0, limit);

  return {
    query: args.query,
    count: results.length,
    documents: results,
    source: {
      name: "SCIC Verified Technical Dossier & Knowledge Base",
      sourceType: "NARRATIVE_DOC",
      provenance: "Verified",
    },
  };
}

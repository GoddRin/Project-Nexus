import { prisma } from "@/lib/db/prisma";
import {
  ProjectFilterParams,
  ProjectFilterSchema,
  ProjectAdminFilterParams,
  ProjectAdminFilterSchema,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategoryId,
  ProjectStatusId,
  ProjectCreateInput,
  ProjectUpdateInput,
  PublicProjectDTO,
  AdminProjectDTO,
  ProjectAuditSummaryDTO,
} from "@/lib/validations/projectAtlasSchema";
import { calculateProjectDiff } from "@/lib/auth/atlasAuth";
import { ProjectAuditAction, Prisma } from "@prisma/client";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Point } from "geojson";

export type ProjectSummary = PublicProjectDTO;

export interface AtlasGeoJsonProperties {
  id: string;
  name: string;
  slug: string;
  projectCode: string;
  category: ProjectCategoryId;
  categoryLabel: string;
  color: string;
  status: ProjectStatusId;
  statusLabel: string;
  isPulse: boolean;
  islandGroup: string;
  region: string;
  province: string;
  municipality: string;
  capacity: string;
  client: string;
  projectValue: string;
  featuredImage: string;
  leadPM: string;
  featured: boolean;
}

export type AtlasFeatureCollection = FeatureCollection<Point, AtlasGeoJsonProperties>;

export interface ProjectHierarchyItem {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  category: string;
  status: string;
  coordinates: [number, number]; // [lat, lng]
}

export interface ProvinceHierarchy {
  name: string;
  count: number;
  projects: ProjectHierarchyItem[];
}

export interface RegionHierarchy {
  name: string;
  count: number;
  provinces: Record<string, ProvinceHierarchy>;
}

export interface IslandGroupHierarchy {
  name: string;
  count: number;
  regions: Record<string, RegionHierarchy>;
}

export interface ProjectHierarchy {
  totalProjects: number;
  islands: Record<string, IslandGroupHierarchy>;
}

/**
 * Map Prisma record to PublicProjectDTO.
 * Strictly omits audit fields, user references, and internal metadata.
 */
function mapPrismaToPublicDTO(db: any): PublicProjectDTO {
  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    projectCode: db.projectCode || null,
    category: (db.category as ProjectCategoryId) || "OTHER",
    status: (db.status as ProjectStatusId) || "ONGOING",
    description: db.description || null,
    latitude: db.latitude ?? 12.8797,
    longitude: db.longitude ?? 121.774,
    islandGroup: db.islandGroup === "MIMAROPA" ? "LUZON" : (db.islandGroup || "LUZON"),
    region: db.region || "National",
    province: db.province || "Various",
    municipality: db.municipality || "Various",
    barangay: db.barangay || null,
    locationDescription: db.locationDescription || db.location || null,
    capacity: db.capacity || (db.capacityMw ? `${db.capacityMw} MW` : null),
    client: db.client || null,
    projectValue: db.projectValue || null,
    featuredImage: db.featuredImage || null,
    gallery: db.gallery || [],
    boundaryGeometry: db.boundaryGeometry || null,
    leadPMName: db.leadPMName || null,
    leadPMRole: db.leadPMRole || null,
    leadPMDivision: db.leadPMDivision || null,
    leadPMLicense: db.leadPMLicense || null,
    leadPMContact: db.leadPMContact || null,
    engineeringScope: db.engineeringScope || [],
    keyMilestones: (db.keyMilestones as any[]) || [],
    metrics: (db.metrics as Record<string, any>) || {},
    featured: Boolean(db.featured),
    targetCodDate: db.targetCodDate ? new Date(db.targetCodDate).toISOString() : null,
    projectStartDate: db.projectStartDate ? new Date(db.projectStartDate).toISOString() : null,
    projectEndDate: db.projectEndDate ? new Date(db.projectEndDate).toISOString() : null,
    completionYear: (db.metrics as any)?.completionYear || (db.projectEndDate ? new Date(db.projectEndDate).getFullYear() : null),
  };
}

/**
 * Map Prisma record to AdminProjectDTO.
 * Includes audit fields, user relations, and recent change history for authorized users.
 */
function mapPrismaToAdminDTO(db: any): AdminProjectDTO {
  const publicData = mapPrismaToPublicDTO(db);

  const recentAuditLogs: ProjectAuditSummaryDTO[] = (db.auditLogs || []).map((l: any) => ({
    id: l.id,
    action: l.action,
    diff: l.diff as Record<string, any> | null,
    userId: l.userId,
    userName: l.user?.name || null,
    userEmail: l.user?.email || null,
    ipAddress: l.ipAddress || null,
    createdAt: new Date(l.createdAt).toISOString(),
  }));

  return {
    ...publicData,
    createdAt: new Date(db.createdAt).toISOString(),
    updatedAt: new Date(db.updatedAt).toISOString(),
    createdById: db.createdById || null,
    createdBy: db.createdBy
      ? { id: db.createdBy.id, name: db.createdBy.name, email: db.createdBy.email }
      : null,
    updatedById: db.updatedById || null,
    updatedBy: db.updatedBy
      ? { id: db.updatedBy.id, name: db.updatedBy.name, email: db.updatedBy.email }
      : null,
    deletedAt: db.deletedAt ? new Date(db.deletedAt).toISOString() : null,
    deletedById: db.deletedById || null,
    deletedBy: db.deletedBy
      ? { id: db.deletedBy.id, name: db.deletedBy.name, email: db.deletedBy.email }
      : null,
    recentAuditLogs,
  };
}

export class ConcurrencyConflictError extends Error {
  constructor(message = "Record was modified by another user. Please reload the latest version.") {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

/**
 * Clean data access service for Project Atlas.
 * Authoritative single runtime source of truth: PostgreSQL via Prisma.
 */
export class ProjectAtlasService {
  private static cache: {
    allProjects?: { data: PublicProjectDTO[]; timestamp: number };
  } = {};

  private static adminCache: Map<string, { result: any; timestamp: number }> = new Map();

  static invalidateCache() {
    this.cache = {};
    this.adminCache.clear();
  }

  /**
   * Fetch all active projects matching filter parameters for public consumers.
   * Strictly enforces `deletedAt: null`.
   */
  static async getAllProjects(params: ProjectFilterParams = {}): Promise<PublicProjectDTO[]> {
    const validated = ProjectFilterSchema.parse(params);

    const isUnfilteredAll =
      (!validated.category || validated.category === "ALL") &&
      (!validated.status || validated.status === "ALL") &&
      (!validated.islandGroup || validated.islandGroup === "ALL") &&
      !validated.region &&
      !validated.province &&
      !validated.search &&
      !validated.featuredOnly &&
      !validated.bounds &&
      validated.page === 1 &&
      validated.limit >= 65;

    if (isUnfilteredAll && this.cache.allProjects) {
      const age = Date.now() - this.cache.allProjects.timestamp;
      if (age < 120_000) {
        return this.cache.allProjects.data;
      }
    }

    const whereClause: Prisma.ProjectWhereInput = {
      deletedAt: null, // Critical: exclude soft-deleted records from public queries
    };

    if (validated.category && validated.category !== "ALL") {
      whereClause.category = validated.category;
    }

    if (validated.status && validated.status !== "ALL") {
      whereClause.status = validated.status;
    }

    if (validated.islandGroup && validated.islandGroup !== "ALL") {
      whereClause.islandGroup = validated.islandGroup;
    }

    if (validated.region) {
      whereClause.region = { contains: validated.region, mode: "insensitive" };
    }

    if (validated.province) {
      whereClause.province = { contains: validated.province, mode: "insensitive" };
    }

    if (validated.featuredOnly) {
      whereClause.featured = true;
    }

    // Spatial bounding box query: [south, west, north, east]
    if (validated.bounds && validated.bounds.length === 4) {
      const [south, west, north, east] = validated.bounds;
      whereClause.latitude = { gte: south, lte: north };
      whereClause.longitude = { gte: west, lte: east };
    }

    // Search query across title, code, client, municipality, province, PM
    if (validated.search?.trim()) {
      const q = validated.search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { projectCode: { contains: q, mode: "insensitive" } },
        { client: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } },
        { municipality: { contains: q, mode: "insensitive" } },
        { leadPMName: { contains: q, mode: "insensitive" } },
      ];
    }

    const dbProjects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      take: validated.limit,
      skip: (validated.page - 1) * validated.limit,
    });

    const mapped = dbProjects.map(mapPrismaToPublicDTO);

    if (isUnfilteredAll) {
      this.cache.allProjects = {
        data: mapped,
        timestamp: Date.now(),
      };
    }

    return mapped;
  }

  /**
   * Find active public project by unique slug. Strictly excludes soft-deleted projects.
   */
  static async getProjectBySlug(slug: string): Promise<PublicProjectDTO | null> {
    const p = await prisma.project.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    return p ? mapPrismaToPublicDTO(p) : null;
  }

  /**
   * Find active public project by ID. Strictly excludes soft-deleted projects.
   */
  static async getProjectById(id: string): Promise<PublicProjectDTO | null> {
    const p = await prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    return p ? mapPrismaToPublicDTO(p) : null;
  }

  /**
   * Public category shortcut
   */
  static async getProjectsByCategory(category: ProjectCategoryId): Promise<PublicProjectDTO[]> {
    return this.getAllProjects({ category });
  }

  /**
   * Public status shortcut
   */
  static async getProjectsByStatus(status: ProjectStatusId): Promise<PublicProjectDTO[]> {
    return this.getAllProjects({ status });
  }

  /**
   * Public region shortcut
   */
  static async getProjectsByRegion(region: string): Promise<PublicProjectDTO[]> {
    return this.getAllProjects({ region });
  }

  /**
   * Spatial Query: Get projects within geographic bounds [south, west, north, east].
   */
  static async getProjectsWithinBounds(
    bounds: [number, number, number, number]
  ): Promise<PublicProjectDTO[]> {
    return this.getAllProjects({ bounds });
  }

  /**
   * Public text search across projects.
   */
  static async searchProjects(query: string): Promise<PublicProjectDTO[]> {
    return this.getAllProjects({ search: query });
  }

  /**
   * Aggregated project counts strictly from active database records.
   */
  static async getProjectCounts() {
    const all = await prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        category: true,
        status: true,
        islandGroup: true,
        province: true,
      },
    });

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byIsland: Record<string, number> = {};
    const byProvince = new Set<string>();

    for (const p of all) {
      const cat = p.category || "OTHER";
      const stat = p.status || "ONGOING";
      const isl = p.islandGroup || "LUZON";

      byCategory[cat] = (byCategory[cat] || 0) + 1;
      byStatus[stat] = (byStatus[stat] || 0) + 1;
      byIsland[isl] = (byIsland[isl] || 0) + 1;
      if (p.province) byProvince.add(p.province);
    }

    return {
      total: all.length,
      byCategory,
      byStatus,
      byIsland,
      totalProvinces: byProvince.size,
    };
  }

  /**
   * Philippine Geographic Hierarchy structure strictly from active database records.
   */
  static async getProjectHierarchy(): Promise<ProjectHierarchy> {
    const all = await this.getAllProjects({ limit: 500 });
    const islands: Record<string, IslandGroupHierarchy> = {
      LUZON: { name: "Luzon", count: 0, regions: {} },
      VISAYAS: { name: "Visayas", count: 0, regions: {} },
      MINDANAO: { name: "Mindanao", count: 0, regions: {} },
    };

    for (const p of all) {
      const normalizedIsland = p.islandGroup === "MIMAROPA" ? "LUZON" : (p.islandGroup || "LUZON");
      const islandKey = (normalizedIsland as keyof typeof islands) || "LUZON";
      if (!islands[islandKey]) {
        islands[islandKey] = { name: islandKey, count: 0, regions: {} };
      }

      const island = islands[islandKey];
      island.count++;

      const regionKey = p.region || "Unassigned Region";
      if (!island.regions[regionKey]) {
        island.regions[regionKey] = { name: regionKey, count: 0, provinces: {} };
      }
      const region = island.regions[regionKey];
      region.count++;

      const provinceKey = p.province || "Unassigned Province";
      if (!region.provinces[provinceKey]) {
        region.provinces[provinceKey] = { name: provinceKey, count: 0, projects: [] };
      }
      const province = region.provinces[provinceKey];
      province.count++;

      province.projects.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        code: p.projectCode,
        category: p.category,
        status: p.status,
        coordinates: [p.latitude, p.longitude],
      });
    }

    return {
      totalProjects: all.length,
      islands,
    };
  }

  /**
   * Generate RFC 7946 standard GeoJSON FeatureCollection optimized for MapLibre GL WebGL clustering.
   * Strictly includes active projects (deletedAt: null).
   */
  static async getProjectsGeoJSON(
    params: ProjectFilterParams = {}
  ): Promise<AtlasFeatureCollection> {
    const projects = await this.getAllProjects(params);

    const features: Feature<Point, AtlasGeoJsonProperties>[] = projects.map((p) => {
      const catConfig = PROJECT_CATEGORIES[p.category] || PROJECT_CATEGORIES.OTHER;
      const statusConfig = PROJECT_STATUSES[p.status] || PROJECT_STATUSES.ONGOING;

      return {
        type: "Feature",
        id: p.id,
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude], // GeoJSON order: [lng, lat]
        },
        properties: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          projectCode: p.projectCode || "",
          category: p.category,
          categoryLabel: catConfig.shortLabel,
          color: catConfig.color,
          status: p.status,
          statusLabel: statusConfig.badgeLabel,
          isPulse: statusConfig.isPulse,
          islandGroup: p.islandGroup || "LUZON",
          region: p.region,
          province: p.province,
          municipality: p.municipality,
          capacity: p.capacity || "",
          client: p.client || "",
          projectValue: p.projectValue || "",
          featuredImage: p.featuredImage || "",
          leadPM: p.leadPMName || "",
          featured: p.featured,
        },
      };
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }

  // ============================================================
  // Administrative Operations (Full CRUD, Auditability, Concurrency)
  // ============================================================

  /**
   * Paginated, searchable administrative list of projects.
   */
  static async getAdminProjects(params: ProjectAdminFilterParams) {
    const validated = ProjectAdminFilterSchema.parse(params);

    const cacheKey = JSON.stringify(validated);
    const cached = this.adminCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60_000) {
      return cached.result;
    }

    const whereClause: Prisma.ProjectWhereInput = {};

    if (!validated.includeDeleted) {
      whereClause.deletedAt = null;
    }

    if (validated.category && validated.category !== "ALL") {
      whereClause.category = validated.category;
    }

    if (validated.status && validated.status !== "ALL") {
      whereClause.status = validated.status;
    }

    if (validated.islandGroup && validated.islandGroup !== "ALL") {
      if (validated.islandGroup === "LUZON") {
        whereClause.islandGroup = { in: ["LUZON", "MIMAROPA"] };
      } else {
        whereClause.islandGroup = validated.islandGroup;
      }
    }

    if (validated.region) {
      whereClause.region = { contains: validated.region, mode: "insensitive" };
    }

    if (validated.search?.trim()) {
      const q = validated.search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { projectCode: { contains: q, mode: "insensitive" } },
        { client: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } },
        { municipality: { contains: q, mode: "insensitive" } },
        { leadPMName: { contains: q, mode: "insensitive" } },
      ];
    }

    const total = await prisma.project.count({ where: whereClause });

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [validated.sortBy]: validated.sortDirection,
    };

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy,
      take: validated.pageSize,
      skip: (validated.page - 1) * validated.pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        deletedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const result = {
      data: projects.map(mapPrismaToAdminDTO),
      total,
      page: validated.page,
      pageSize: validated.pageSize,
      totalPages: Math.ceil(total / validated.pageSize) || 1,
    };

    this.adminCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Get project details for administrative workspace (including recent audit logs).
   */
  static async getAdminProjectById(id: string): Promise<AdminProjectDTO | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        deletedBy: { select: { id: true, name: true, email: true } },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return project ? mapPrismaToAdminDTO(project) : null;
  }

  /**
   * Create a new project in an atomic transaction with a CREATE audit log.
   */
  static async createProject(
    data: ProjectCreateInput,
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<AdminProjectDTO> {
    // Resolve organization: find first existing organization or create default SCIC organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Sta. Clara International Corporation" },
      });
    }

    // Check slug uniqueness
    const existingSlug = await prisma.project.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new Error(`Project slug "${data.slug}" already exists. Please choose a unique slug.`);
    }

    // Execute in transaction
    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: data.name,
          slug: data.slug,
          projectCode: data.projectCode || null,
          category: data.category,
          status: data.status,
          description: data.description || null,
          latitude: data.latitude,
          longitude: data.longitude,
          islandGroup: data.islandGroup,
          region: data.region,
          province: data.province,
          municipality: data.municipality,
          barangay: data.barangay || null,
          locationDescription: data.locationDescription || null,
          capacity: data.capacity || null,
          projectStartDate: data.projectStartDate || null,
          projectEndDate: data.projectEndDate || null,
          client: data.client || null,
          projectValue: data.projectValue || null,
          featuredImage: data.featuredImage || null,
          gallery: data.gallery || [],
          boundaryGeometry: data.boundaryGeometry || Prisma.DbNull,
          leadPMName: data.leadPMName || null,
          leadPMRole: data.leadPMRole || null,
          leadPMDivision: data.leadPMDivision || null,
          leadPMLicense: data.leadPMLicense || null,
          leadPMContact: data.leadPMContact || null,
          engineeringScope: data.engineeringScope || [],
          keyMilestones: (data.keyMilestones as any) || Prisma.DbNull,
          metrics: (data.metrics as any) || Prisma.DbNull,
          featured: data.featured,
          targetCodDate: data.targetCodDate || null,
          createdById: userId,
          updatedById: userId,
        },
      });

      // Write CREATE audit log
      await tx.projectAuditLog.create({
        data: {
          projectId: project.id,
          userId,
          action: ProjectAuditAction.CREATE,
          diff: {
            created: {
              name: project.name,
              slug: project.slug,
              category: project.category,
              status: project.status,
              coordinates: [project.latitude, project.longitude],
              region: project.region,
              province: project.province,
              municipality: project.municipality,
            },
          },
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
        },
      });

      return project;
    });

    this.invalidateCache();
    const fullRecord = await this.getAdminProjectById(created.id);
    return fullRecord!;
  }

  /**
   * Update an existing project in an atomic transaction with optimistic concurrency check and UPDATE audit diff.
   */
  static async updateProject(
    id: string,
    data: ProjectUpdateInput,
    userId: string,
    lastKnownUpdatedAt?: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<AdminProjectDTO> {
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Project with ID "${id}" was not found.`);
    }

    if (existing.deletedAt !== null) {
      throw new Error(`Project "${existing.name}" is archived and cannot be edited.`);
    }

    // Optimistic concurrency check
    const timestampToCheck = lastKnownUpdatedAt || (data as any)?.lastKnownUpdatedAt;
    if (timestampToCheck) {
      const knownTime = new Date(timestampToCheck).getTime();
      const actualTime = new Date(existing.updatedAt).getTime();
      // If the database record was updated after the client's known timestamp (1000ms threshold for clock/serialization)
      if (actualTime - knownTime > 1000) {
        throw new ConcurrencyConflictError(
          "This project was updated by another administrator. Please refresh the page to load the latest changes before saving."
        );
      }
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const slugCollision = await prisma.project.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (slugCollision) {
        throw new Error(`Slug "${data.slug}" is already in use by another project.`);
      }
    }

    // Calculate clean field-level diff
    const diff = calculateProjectDiff(existing, data);

    // If no changes made, return existing
    if (!diff) {
      const current = await this.getAdminProjectById(id);
      return current!;
    }

    // Prepare update data
    const updatePayload: Prisma.ProjectUncheckedUpdateInput = {
      updatedById: userId,
    };

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.projectCode !== undefined) updatePayload.projectCode = data.projectCode;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.latitude !== undefined) updatePayload.latitude = data.latitude;
    if (data.longitude !== undefined) updatePayload.longitude = data.longitude;
    if (data.islandGroup !== undefined) updatePayload.islandGroup = data.islandGroup;
    if (data.region !== undefined) updatePayload.region = data.region;
    if (data.province !== undefined) updatePayload.province = data.province;
    if (data.municipality !== undefined) updatePayload.municipality = data.municipality;
    if (data.barangay !== undefined) updatePayload.barangay = data.barangay;
    if (data.locationDescription !== undefined)
      updatePayload.locationDescription = data.locationDescription;
    if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
    if (data.projectStartDate !== undefined)
      updatePayload.projectStartDate = data.projectStartDate;
    if (data.projectEndDate !== undefined) updatePayload.projectEndDate = data.projectEndDate;
    if (data.client !== undefined) updatePayload.client = data.client;
    if (data.projectValue !== undefined) updatePayload.projectValue = data.projectValue;
    if (data.featuredImage !== undefined) updatePayload.featuredImage = data.featuredImage;
    if (data.gallery !== undefined) updatePayload.gallery = data.gallery;
    if (data.boundaryGeometry !== undefined)
      updatePayload.boundaryGeometry = (data.boundaryGeometry as any) || Prisma.DbNull;
    if (data.leadPMName !== undefined) updatePayload.leadPMName = data.leadPMName;
    if (data.leadPMRole !== undefined) updatePayload.leadPMRole = data.leadPMRole;
    if (data.leadPMDivision !== undefined) updatePayload.leadPMDivision = data.leadPMDivision;
    if (data.leadPMLicense !== undefined) updatePayload.leadPMLicense = data.leadPMLicense;
    if (data.leadPMContact !== undefined) updatePayload.leadPMContact = data.leadPMContact;
    if (data.engineeringScope !== undefined)
      updatePayload.engineeringScope = data.engineeringScope;
    if (data.keyMilestones !== undefined)
      updatePayload.keyMilestones = (data.keyMilestones as any) || Prisma.DbNull;
    if (data.metrics !== undefined)
      updatePayload.metrics = (data.metrics as any) || Prisma.DbNull;
    if (data.featured !== undefined) updatePayload.featured = data.featured;
    if (data.targetCodDate !== undefined) updatePayload.targetCodDate = data.targetCodDate;

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: updatePayload,
      });

      await tx.projectAuditLog.create({
        data: {
          projectId: id,
          userId,
          action: ProjectAuditAction.UPDATE,
          diff,
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
        },
      });
    });

    this.invalidateCache();
    const updated = await this.getAdminProjectById(id);
    return updated!;
  }

  /**
   * Soft-delete / archive a project.
   * Permanently preserves project record, foreign key relationships, and ProjectAuditLog history.
   */
  static async softDeleteProject(
    id: string,
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Project with ID "${id}" was not found.`);
    }

    if (existing.deletedAt !== null) {
      return { success: true, id, message: "Project is already archived." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
      });

      await tx.projectAuditLog.create({
        data: {
          projectId: id,
          userId,
          action: ProjectAuditAction.DELETE,
          diff: {
            deleted: {
              id: existing.id,
              name: existing.name,
              slug: existing.slug,
              category: existing.category,
              status: existing.status,
              archivedAt: new Date().toISOString(),
            },
          },
          ipAddress: meta?.ipAddress || null,
          userAgent: meta?.userAgent || null,
        },
      });
    });

    this.invalidateCache();
    return { success: true, id };
  }

  /**
   * Paginated audit history for a specific project.
   */
  static async getProjectAuditLogs(projectId: string, page = 1, pageSize = 25) {
    const [total, logs] = await Promise.all([
      prisma.projectAuditLog.count({ where: { projectId } }),
      prisma.projectAuditLog.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const formatted: ProjectAuditSummaryDTO[] = logs.map((l) => ({
      id: l.id,
      action: l.action,
      diff: l.diff as Record<string, any> | null,
      userId: l.userId,
      userName: l.user?.name || null,
      userEmail: l.user?.email || null,
      ipAddress: l.ipAddress || null,
      createdAt: new Date(l.createdAt).toISOString(),
    }));

    return {
      data: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  // ============================================================
  // Turf.js Spatial Calculations
  // ============================================================

  /**
   * Calculate bounding box [[minLat, minLng], [maxLat, maxLng]] for a set of projects.
   */
  static calculateBBox(projects: PublicProjectDTO[]): [[number, number], [number, number]] | null {
    if (!projects.length) return null;

    const points = turf.featureCollection(
      projects.map((p) => turf.point([p.longitude, p.latitude]))
    );

    const [minLng, minLat, maxLng, maxLat] = turf.bbox(points);
    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  }

  /**
   * Calculate geometric centroid for an array of projects.
   */
  static calculateCentroid(projects: PublicProjectDTO[]): [number, number] | null {
    if (!projects.length) return null;

    const points = turf.featureCollection(
      projects.map((p) => turf.point([p.longitude, p.latitude]))
    );

    const centroid = turf.centroid(points);
    const [lng, lat] = centroid.geometry.coordinates;
    return [lat, lng];
  }

  /**
   * Find N nearest projects to a given coordinate using Turf.js distance.
   */
  static findNearestProjects(
    origin: [number, number], // [lat, lng]
    projects: PublicProjectDTO[],
    count = 5
  ): Array<{ project: PublicProjectDTO; distanceKm: number }> {
    const fromPoint = turf.point([origin[1], origin[0]]); // [lng, lat]

    const mapped = projects.map((p) => {
      const toPoint = turf.point([p.longitude, p.latitude]);
      const distanceKm = turf.distance(fromPoint, toPoint, { units: "kilometers" });
      return { project: p, distanceKm: parseFloat(distanceKm.toFixed(2)) };
    });

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);
    return mapped.slice(0, count);
  }
}

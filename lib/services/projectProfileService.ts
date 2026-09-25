import { prisma } from "@/lib/db/prisma";
import {
  PublicProjectDTO,
  ProjectCategoryId,
  ProjectStatusId,
} from "@/lib/validations/projectAtlasSchema";
import {
  getProjectGeometry,
  ScicProjectGeometry,
} from "@/lib/data/scicProjectGeometries";

export interface ProjectOperationalSummary {
  hasNexusOperations: boolean;
  activeTicketsCount: number;
  openTicketsCount: number;
  assetsCount: number;
  equipmentCount: number;
  dailyLogsCount: number;
  siteLocationsCount: number;
  documentsCount: number;
  incidentsCount: number;
  visitorsCount: number;
  networkDevicesCount: number;
  milestonesCount: number;
  operationalRoutes: {
    dashboard: string;
    tickets?: string;
    assets?: string;
    equipment?: string;
    dailyLogs?: string;
    sitemap?: string;
    digitalTwin?: string;
    documents?: string;
    incidents?: string;
    weather?: string;
  };
}

export interface DetailedProjectProfileDTO {
  project: PublicProjectDTO;
  operational: ProjectOperationalSummary;
  verifiedGeometry: ScicProjectGeometry | null;
}

/**
 * Maps a Prisma Project record to PublicProjectDTO.
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
    gallery: Array.isArray(db.gallery) ? db.gallery : [],
    boundaryGeometry: db.boundaryGeometry || null,
    leadPMName: db.leadPMName || null,
    leadPMRole: db.leadPMRole || null,
    leadPMDivision: db.leadPMDivision || null,
    leadPMLicense: db.leadPMLicense || null,
    leadPMContact: db.leadPMContact || null,
    engineeringScope: Array.isArray(db.engineeringScope) ? db.engineeringScope : [],
    keyMilestones: Array.isArray(db.keyMilestones) ? db.keyMilestones : [],
    metrics: typeof db.metrics === "object" && db.metrics !== null ? db.metrics : {},
    featured: Boolean(db.featured),
    targetCodDate: db.targetCodDate ? new Date(db.targetCodDate).toISOString() : null,
    projectStartDate: db.projectStartDate ? new Date(db.projectStartDate).toISOString() : null,
    projectEndDate: db.projectEndDate ? new Date(db.projectEndDate).toISOString() : null,
    completionYear: db.projectEndDate
      ? new Date(db.projectEndDate).getFullYear()
      : db.metrics?.completionYear
      ? Number(db.metrics.completionYear)
      : null,
  };
}

export class ProjectProfileService {
  /**
   * Authoritative Project Resolver:
   * Resolves a project by canonical immutable Project.id first.
   * If not found, falls back gracefully to slug, projectCode, or case-insensitive name.
   */
  static async resolveProject(identifier: string): Promise<any | null> {
    if (!identifier) return null;
    const clean = identifier.trim();

    // 1. Immutable Primary Key lookup
    let project = await prisma.project.findUnique({
      where: { id: clean },
    });

    // 2. Slug lookup
    if (!project) {
      project = await prisma.project.findUnique({
        where: { slug: clean },
      });
    }

    // 3. Project code lookup
    if (!project) {
      project = await prisma.project.findFirst({
        where: {
          projectCode: { equals: clean, mode: "insensitive" },
          deletedAt: null,
        },
      });
    }

    // 4. Case-insensitive slug fallback
    if (!project) {
      project = await prisma.project.findFirst({
        where: {
          slug: { equals: clean.toLowerCase(), mode: "insensitive" },
          deletedAt: null,
        },
      });
    }

    return project;
  }

  /**
   * Fetches the complete Project Profile combining:
   * - Canonical Public Project DTO (Atlas Geographic & Engineering Intelligence)
   * - Verified ScicProjectGeometry (if surveyed/verified)
   * - Operational Nexus Summary (Prisma relations & operational routes)
   */
  static async getProjectProfile(
    identifier: string
  ): Promise<DetailedProjectProfileDTO | null> {
    const project = await this.resolveProject(identifier);
    if (!project || project.deletedAt) {
      return null;
    }

    // Query live operational counts across related PostgreSQL tables
    const projectWithCounts = await prisma.project.findUnique({
      where: { id: project.id },
      select: {
        _count: {
          select: {
            tickets: true,
            assets: true,
            equipments: true,
            dailyLogs: true,
            siteIncidents: true,
            documents: true,
            siteLocations: true,
            visitors: true,
            networkDevices: true,
            milestones: true,
          },
        },
        tickets: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
    });

    const counts = projectWithCounts?._count || {
      tickets: 0,
      assets: 0,
      equipments: 0,
      dailyLogs: 0,
      siteIncidents: 0,
      documents: 0,
      siteLocations: 0,
      visitors: 0,
      networkDevices: 0,
      milestones: 0,
    };

    const openTicketsCount = projectWithCounts?.tickets?.length || 0;

    // A project has active Nexus operations if it is Tumauini HEPP (SCIC flagship)
    // or has provisioned operational records in the schema.
    const isTumauini =
      project.slug === "tumauini-hepp" ||
      project.id === "cmqvwzn750000r8w1zidk116i" ||
      project.projectCode === "SCIC-HEPP-01";

    const hasNexusOperations =
      isTumauini ||
      counts.tickets > 0 ||
      counts.dailyLogs > 0 ||
      counts.equipments > 0 ||
      counts.assets > 0;

    const operationalRoutes = hasNexusOperations
      ? {
          dashboard: "/dashboard",
          tickets: "/dashboard/tickets",
          assets: "/dashboard/assets",
          equipment: "/dashboard/equipment",
          dailyLogs: "/dashboard/daily-logs",
          sitemap: "/dashboard/sitemap",
          digitalTwin: "/dashboard/digital-twin",
          documents: "/dashboard/documents",
          incidents: "/dashboard/incidents",
          weather: `/dashboard/weather?lat=${project.latitude}&lng=${project.longitude}&project=${project.id}`,
        }
      : {
          dashboard: "/dashboard",
          weather: `/dashboard/weather?lat=${project.latitude}&lng=${project.longitude}&project=${project.id}`,
        };

    const operational: ProjectOperationalSummary = {
      hasNexusOperations,
      activeTicketsCount: counts.tickets,
      openTicketsCount,
      assetsCount: counts.assets,
      equipmentCount: counts.equipments,
      dailyLogsCount: counts.dailyLogs,
      siteLocationsCount: counts.siteLocations,
      documentsCount: counts.documents,
      incidentsCount: counts.siteIncidents,
      visitorsCount: counts.visitors,
      networkDevicesCount: counts.networkDevices,
      milestonesCount: counts.milestones,
      operationalRoutes,
    };

    // Resolve verified geometry
    const verifiedGeometry =
      getProjectGeometry(project.id) ||
      getProjectGeometry(project.slug) ||
      getProjectGeometry(project.projectCode);

    return {
      project: mapPrismaToPublicDTO(project),
      operational,
      verifiedGeometry,
    };
  }
}

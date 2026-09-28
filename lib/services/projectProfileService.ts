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
          dashboard: `/dashboard?project=${project.id}`,
          tickets: `/dashboard/tickets?project=${project.id}`,
          assets: `/dashboard/assets?project=${project.id}`,
          equipment: `/dashboard/equipment?project=${project.id}`,
          dailyLogs: `/dashboard/daily-logs?project=${project.id}`,
          sitemap: `/dashboard/sitemap?project=${project.id}`,
          digitalTwin: `/dashboard/digital-twin?project=${project.id}`,
          documents: `/dashboard/documents?project=${project.id}`,
          incidents: `/dashboard/incidents?project=${project.id}`,
          weather: `/dashboard/weather?lat=${project.latitude}&lng=${project.longitude}&project=${project.id}`,
        }
      : {
          dashboard: `/dashboard?project=${project.id}`,
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

  /**
   * Phase 18 Controlled Cross-System Intelligence:
   * Retrieves a permission-aware operational summary from Project Nexus.
   * Grounded in canonical Project.id.
   * Operational records are NEVER copied into Atlas.
   */
  static async getNexusProjectSummary(
    identifier: string,
    isAuthorized: boolean = true
  ): Promise<{
    hasIntegration: boolean;
    isAuthorized: boolean;
    projectId?: string;
    projectName?: string;
    projectCode?: string | null;
    summary?: {
      tickets: {
        total: number;
        open: number;
        inProgress: number;
        priorityBreakdown?: Record<string, number>;
      };
      equipment: {
        total: number;
        installed: number;
        commissioned: number;
        underMaintenance: number;
        keyUnits: Array<{ tag: string; name: string; status: string; condition: string }>;
      };
      dailyLogs: {
        total: number;
        recentCount: number;
        latestDate: string | null;
      };
      incidents: {
        total: number;
        active: number;
      };
      assetsCount: number;
      sitemapLocationsCount: number;
      operationalRoutes: Record<string, string>;
    };
    message?: string;
  }> {
    const project = await this.resolveProject(identifier);
    if (!project || project.deletedAt) {
      return {
        hasIntegration: false,
        isAuthorized,
        message: `Project "${identifier}" was not found in the database.`,
      };
    }

    const isTumauini =
      project.slug === "tumauini-hepp" ||
      project.id === "cmqvwzn750000r8w1zidk116i" ||
      project.projectCode === "SCIC-HEPP-01";

    // Query counts to determine if Nexus operations are provisioned
    const counts = await prisma.project.findUnique({
      where: { id: project.id },
      select: {
        _count: {
          select: {
            tickets: true,
            equipments: true,
            dailyLogs: true,
            assets: true,
            siteIncidents: true,
            siteLocations: true,
          },
        },
      },
    });

    const totalTickets = counts?._count?.tickets || 0;
    const totalEquipments = counts?._count?.equipments || 0;
    const totalDailyLogs = counts?._count?.dailyLogs || 0;

    const hasIntegration =
      isTumauini || totalTickets > 0 || totalEquipments > 0 || totalDailyLogs > 0;

    if (!hasIntegration) {
      return {
        hasIntegration: false,
        isAuthorized,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        message: `Project "${project.name}" (${project.id}) is cataloged in the Atlas engineering portfolio. Active Nexus field operations are not provisioned for this site.`,
      };
    }

    // Permission boundary check
    if (!isAuthorized) {
      return {
        hasIntegration: true,
        isAuthorized: false,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        message: "Operational information for this project is available in the Nexus workspace. Internal team members can access work tickets, equipment telematics, and daily site logs directly.",
      };
    }

    // Authorized internal query — fetch live operational telematics & telemetry
    const [tickets, equipments, recentLogs, incidents] = await Promise.all([
      prisma.ticket.findMany({
        where: { projectId: project.id },
        select: { id: true, status: true, priority: true },
      }),
      prisma.plantEquipment.findMany({
        where: { projectId: project.id },
        select: {
          equipmentTag: true,
          name: true,
          status: true,
          condition: true,
        },
        take: 10,
        orderBy: { equipmentTag: "asc" },
      }),
      prisma.dailyLog.findMany({
        where: { projectId: project.id },
        select: { id: true, logDate: true },
        orderBy: { logDate: "desc" },
        take: 5,
      }),
      prisma.siteIncident.findMany({
        where: { projectId: project.id },
        select: { id: true, status: true, severity: true },
      }),
    ]);

    const openTickets = tickets.filter((t) => t.status === "OPEN").length;
    const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS").length;
    const priorityBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      priorityBreakdown[t.priority] = (priorityBreakdown[t.priority] || 0) + 1;
    }

    const installedEquipment = equipments.filter((e) => e.status === "INSTALLED").length;
    const commissionedEquipment = equipments.filter((e) => e.status === "COMMISSIONED").length;
    const underMaintEquipment = equipments.filter((e) => e.status === "UNDER_MAINTENANCE").length;

    const activeIncidents = incidents.filter((i) => i.status === "ACTIVE").length;

    const latestLog = recentLogs[0];

    return {
      hasIntegration: true,
      isAuthorized: true,
      projectId: project.id,
      projectName: project.name,
      projectCode: project.projectCode,
      summary: {
        tickets: {
          total: tickets.length,
          open: openTickets,
          inProgress: inProgressTickets,
          priorityBreakdown,
        },
        equipment: {
          total: totalEquipments,
          installed: installedEquipment,
          commissioned: commissionedEquipment,
          underMaintenance: underMaintEquipment,
          keyUnits: equipments.map((e) => ({
            tag: e.equipmentTag,
            name: e.name,
            status: e.status,
            condition: e.condition,
          })),
        },
        dailyLogs: {
          total: totalDailyLogs,
          recentCount: recentLogs.length,
          latestDate: latestLog ? new Date(latestLog.logDate).toISOString().split("T")[0] : null,
        },
        incidents: {
          total: incidents.length,
          active: activeIncidents,
        },
        assetsCount: counts?._count?.assets || 0,
        sitemapLocationsCount: counts?._count?.siteLocations || 0,
        operationalRoutes: {
          dashboard: `/dashboard?project=${project.id}`,
          tickets: `/dashboard/tickets?project=${project.id}`,
          equipment: `/dashboard/equipment?project=${project.id}`,
          dailyLogs: `/dashboard/daily-logs?project=${project.id}`,
          sitemap: `/dashboard/sitemap?project=${project.id}`,
          digitalTwin: `/dashboard/digital-twin?project=${project.id}`,
        },
      },
    };
  }
}

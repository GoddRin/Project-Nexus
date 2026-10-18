import initialProjectsData from "./scicAtlasInitialProjects.json";
import { SCIC_PROJECTS, SCICProject } from "./scicProjectsData";

const SHORT_NAME_BY_CODE = new Map<string, string>(
  SCIC_PROJECTS.filter((p) => p.code && p.shortName).map((p) => [p.code.toLowerCase(), p.shortName])
);

export const INITIAL_ATLAS_PROJECTS: SCICProject[] = (initialProjectsData as any[]).map((dto) => {
  const codeKey = (dto.projectCode || dto.slug || "").toLowerCase();
  const matchedShortName =
    SHORT_NAME_BY_CODE.get(codeKey) ||
    dto.name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

  return {
    id: dto.id,
    name: dto.name,
    code: dto.projectCode || dto.slug,
    slug: dto.slug,
    shortName: matchedShortName,
    sector: dto.category || "HYDRO_RENEWABLE",
    status: dto.status || "ONGOING",
    islandGroup: dto.islandGroup || "LUZON",
    region: dto.region || "National",
    province: dto.province || "Various",
    municipality: dto.municipality || "Various",
    barangay: dto.barangay || undefined,
    coordinates: {
      lat: dto.latitude ?? 12.8797,
      lng: dto.longitude ?? 121.774,
    },
    metrics: {
      capacity: dto.capacity || undefined,
      contractValue: dto.projectValue || undefined,
      ...(dto.metrics || {}),
    },
    // (empty when the client could not be verified: never defaulted to the company itself)
    client: dto.client || "",
    description: dto.description || "",
    imageUrl: dto.featuredImage || "/project-images/scic-project-placeholder.png",
    galleryImages: dto.gallery || [],
    leadPM: dto.leadPMName
      ? {
          name: dto.leadPMName,
          role: dto.leadPMRole || "Project Manager",
          division: dto.leadPMDivision || "Engineering & Construction",
          licenseNumber: dto.leadPMLicense || undefined,
          contactEmail: dto.leadPMContact || undefined,
          avatarUrl: "/logo.png",
        }
      : undefined,
    leadPMRole: dto.leadPMRole || undefined,
    leadPMDivision: dto.leadPMDivision || undefined,
    engineeringScope: dto.engineeringScope || [],
    keyMilestones: dto.keyMilestones || [],
    featured: dto.featured,
    targetCodDate: dto.targetCodDate || undefined,
    projectStartDate: dto.projectStartDate || undefined,
    projectEndDate: dto.projectEndDate || undefined,
    completionYear: dto.completionYear || (dto.metrics?.completionYear ? Number(dto.metrics.completionYear) : undefined),
  };
});

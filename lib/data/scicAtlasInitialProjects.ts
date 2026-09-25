import initialProjectsData from "./scicAtlasInitialProjects.json";
import { SCICProject } from "./scicProjectsData";

export const INITIAL_ATLAS_PROJECTS: SCICProject[] = (initialProjectsData as any[]).map((dto) => ({
  id: dto.id,
  name: dto.name,
  code: dto.projectCode || dto.slug,
  shortName: dto.name.length > 25 ? dto.name.slice(0, 22) + "..." : dto.name,
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
  client: dto.client || "Sta. Clara International Corporation",
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
  engineeringScope: dto.engineeringScope || [],
  keyMilestones: dto.keyMilestones || [],
  featured: dto.featured,
  targetCodDate: dto.targetCodDate || undefined,
  projectStartDate: dto.projectStartDate || undefined,
  projectEndDate: dto.projectEndDate || undefined,
  completionYear: dto.completionYear || (dto.metrics?.completionYear ? Number(dto.metrics.completionYear) : undefined),
}));

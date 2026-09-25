import { SCICProject } from "@/lib/data/scicProjectsData";
import { PublicProjectDTO } from "@/lib/validations/projectAtlasSchema";

/**
 * Adapter converting live PostgreSQL PublicProjectDTO to SCICProject shape for UI rendering.
 */
export function convertDtoToScicProject(dto: PublicProjectDTO): SCICProject {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.projectCode || dto.slug,
    shortName: dto.name.length > 25 ? dto.name.slice(0, 22) + "..." : dto.name,
    sector: (dto.category as any) || "HYDRO_RENEWABLE",
    status: (dto.status as any) || "ONGOING",
    islandGroup: (dto.islandGroup as any) || "LUZON",
    region: dto.region,
    province: dto.province,
    municipality: dto.municipality,
    barangay: dto.barangay || undefined,
    coordinates: {
      lat: dto.latitude,
      lng: dto.longitude,
    },
    metrics: {
      capacity: dto.capacity || undefined,
      contractValue: dto.projectValue || undefined,
      ...dto.metrics,
    },
    client: dto.client || "Sta. Clara International Corporation",
    description: dto.description || "",
    imageUrl: dto.featuredImage || "/logo.png",
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
    completionYear: dto.completionYear || (dto.metrics as any)?.completionYear || undefined,
  };
}

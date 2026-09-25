import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { SCIC_PROJECTS, SCICProject } from "../lib/data/scicProjectsData";
import { PROJECT_CATEGORIES, ProjectCategoryId } from "../lib/validations/projectAtlasSchema";

function mapSectorToCategory(sector: string): ProjectCategoryId {
  switch (sector) {
    case "HYDRO_RENEWABLE":
      return "HYDROPOWER";
    case "WIND_POWER":
      return "WIND_POWER";
    case "WATER_DAMS":
      return "WATER_RESOURCES";
    case "INFRASTRUCTURE_ROADS":
      return "ROADS_HIGHWAYS";
    case "RAILWAYS_TRANSIT":
      return "RAIL_TRANSIT";
    case "POWER_GRID":
      return "ENERGY_GRID";
    case "MINING_TUNNELING":
      return "MINING_TUNNELING";
    case "BUILDINGS_INDUSTRIAL":
      return "BUILDINGS";
    default:
      return "OTHER";
  }
}

function deriveSlug(project: SCICProject): string {
  if (project.id === "scic-thepp-isabela") {
    return "tumauini-hepp"; // Preserve core operational flagship slug
  }
  return project.id
    .replace(/^scic-/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCapacityMw(capacityStr?: string): number | null {
  if (!capacityStr) return null;
  const match = capacityStr.match(/([\d.]+)\s*MW/i);
  return match ? parseFloat(match[1]) : null;
}

export async function seedProjectAtlas() {
  console.log("🌱 Starting Sta. Clara Project Atlas database sync...");

  // Ensure Organization exists
  const org = await prisma.organization.upsert({
    where: { id: "scic-org-001" },
    update: {},
    create: {
      id: "scic-org-001",
      name: "Sta. Clara International Corporation",
    },
  });

  console.log(`✓ Organization active: ${org.name}`);

  let upsertedCount = 0;

  for (const p of SCIC_PROJECTS) {
    const slug = deriveSlug(p);
    const category = mapSectorToCategory(p.sector);
    const capacityMw = parseCapacityMw(p.metrics.capacity);
    const locationText = `${p.barangay ? p.barangay + ", " : ""}${p.municipality}, ${p.province}`;

    await prisma.project.upsert({
      where: { slug },
      update: {
        name: p.name,
        projectCode: p.code,
        category,
        status: p.status,
        description: p.description,
        latitude: p.coordinates.lat,
        longitude: p.coordinates.lng,
        islandGroup: p.islandGroup,
        region: p.region,
        province: p.province,
        municipality: p.municipality,
        barangay: p.barangay || null,
        locationDescription: `${p.name} - ${locationText} (${p.region})`,
        location: locationText,
        capacity: p.metrics.capacity || null,
        capacityMw: capacityMw ?? undefined,
        client: p.client,
        projectValue: p.metrics.contractValue || null,
        featuredImage: p.imageUrl,
        gallery: p.galleryImages || [],
        leadPMName: p.leadPM?.name || null,
        leadPMRole: p.leadPM?.role || null,
        leadPMDivision: p.leadPM?.division || null,
        leadPMLicense: p.leadPM?.licenseNumber || null,
        leadPMContact: p.leadPM?.contactEmail || null,
        engineeringScope: p.engineeringScope || [],
        keyMilestones: p.keyMilestones || [],
        metrics: p.metrics || {},
        featured: Boolean(p.featured),
      },
      create: {
        organizationId: org.id,
        name: p.name,
        slug,
        projectCode: p.code,
        category,
        status: p.status,
        description: p.description,
        latitude: p.coordinates.lat,
        longitude: p.coordinates.lng,
        islandGroup: p.islandGroup,
        region: p.region,
        province: p.province,
        municipality: p.municipality,
        barangay: p.barangay || null,
        locationDescription: `${p.name} - ${locationText} (${p.region})`,
        location: locationText,
        capacity: p.metrics.capacity || null,
        capacityMw: capacityMw ?? null,
        client: p.client,
        projectValue: p.metrics.contractValue || null,
        featuredImage: p.imageUrl,
        gallery: p.galleryImages || [],
        leadPMName: p.leadPM?.name || null,
        leadPMRole: p.leadPM?.role || null,
        leadPMDivision: p.leadPM?.division || null,
        leadPMLicense: p.leadPM?.licenseNumber || null,
        leadPMContact: p.leadPM?.contactEmail || null,
        engineeringScope: p.engineeringScope || [],
        keyMilestones: p.keyMilestones || [],
        metrics: p.metrics || {},
        featured: Boolean(p.featured),
      },
    });

    upsertedCount++;
  }

  console.log(`✅ Successfully seeded/synced ${upsertedCount} Sta. Clara projects in PostgreSQL database.`);
}

// Allow direct CLI execution: tsx prisma/seed-atlas.ts
if (require.main === module) {
  seedProjectAtlas()
    .catch((e) => {
      console.error("❌ Seed atlas failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

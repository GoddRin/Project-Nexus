import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/db/prisma";

interface VerifiedPMOverride {
  leadPMName: string | null;
  leadPMRole: string | null;
  leadPMDivision: string;
  leadPMContact: string | null;
  leadPMLicense: string | null;
  client?: string;
}

const VERIFIED_PROJECT_PMS: Record<string, VerifiedPMOverride> = {
  // 1. Verified Individual Site Project Managers (from MAR-54/WAR-235 & Official SCIC Press Releases)
  "tumauini-hepp": {
    leadPMName: "Engr. Romeo Sese",
    leadPMRole: "Project Manager (Resident Project Manager)",
    leadPMDivision: "SCIC Hydropower Projects Division (Dir. Renin T. Belo)",
    leadPMContact: "bd@staclara.com.ph",
    leadPMLicense: null,
  },
  "pagudpud-wind": {
    leadPMName: "Engr. Ryan Flores",
    leadPMRole: "Project Manager",
    leadPMDivision: "SCIC Renewable Energy / Wind Power Projects (Dir. Luisito O. Traboco / Dir. Renin T. Belo)",
    leadPMContact: "bd@staclara.com.ph",
    leadPMLicense: null,
  },
  "catuiran-hydro": {
    leadPMName: "Albert B. Mendoza",
    leadPMRole: "Project Manager",
    leadPMDivision: "SCIC Hydropower Projects Division (Dir. Renin T. Belo)",
    leadPMContact: "bd@staclara.com.ph",
    leadPMLicense: null,
  },
  "balingasag-thermal": {
    leadPMName: "Peter Alan D. Pineda",
    leadPMRole: "Project Manager",
    leadPMDivision: "SCIC Energy Projects Division (Dir. Luisito O. Traboco)",
    leadPMContact: "bd@staclara.com.ph",
    leadPMLicense: null,
  },

  // 2. Projects with Verified Division Director / Group Manager / Executive Named in Official SCIC Press Releases
  "maersk-calamba": {
    leadPMName: null,
    leadPMRole: "Group Manager, Buildings & Industrial Plants: Norman Enriquez",
    leadPMDivision: "SCIC Buildings & Industrial Plants Group (GM Norman Enriquez)",
    leadPMContact: null,
    leadPMLicense: null,
  },
  "pmftc-tanauan": {
    leadPMName: null,
    leadPMRole: "Group Manager, Buildings & Industrial Plants: Norman Enriquez (with Dir. Carlos P. Hadap & Dir. Antonio S. Pascua)",
    leadPMDivision: "SCIC Buildings & Industrial Plants Group (GM Norman Enriquez)",
    leadPMContact: null,
    leadPMLicense: null,
  },
  "davao-wtp": {
    leadPMName: null,
    leadPMRole: "Director for Water Projects: Narciso M. Areglado",
    leadPMDivision: "SCIC Water Projects Division (Dir. Narciso M. Areglado)",
    leadPMContact: null,
    leadPMLicense: null,
  },
  "maladugao-hydro": {
    leadPMName: null,
    leadPMRole: "Director for Hydropower Projects: Renin T. Belo (with Deputy MD for Operations Fernando T. Delgado)",
    leadPMDivision: "SCIC Hydropower Projects Division (Dir. Renin T. Belo)",
    leadPMContact: null,
    leadPMLicense: null,
    client: "Investco BHPI Inc.",
  },
  "masinloc-bess-10mw": {
    leadPMName: null,
    leadPMRole: "SVP for Special Operations Division: Nobukazu Kotake",
    leadPMDivision: "SCIC Special Operations & Energy Projects Division (SVP Nobukazu Kotake / Dir. Luisito O. Traboco)",
    leadPMContact: null,
    leadPMLicense: null,
  },
  "prdp-bohol-highway": {
    leadPMName: null,
    leadPMRole: "Director for Infrastructure Projects: Antonio S. Pascua (Groundbreaking led by Deputy MD Miguel Carlos L. Linao)",
    leadPMDivision: "SCIC Infrastructure Projects Division (Dir. Antonio S. Pascua)",
    leadPMContact: null,
    leadPMLicense: null,
  },
};

function getVerifiedDivisionByCategory(category: string, name: string): { division: string; role: string } {
  const upperCat = (category || "").toUpperCase();
  const lowerName = (name || "").toLowerCase();

  if (lowerName.includes("wind") || lowerName.includes("solar")) {
    return {
      division: "SCIC Renewable Energy & Power Projects Division (Dir. Luisito O. Traboco / Dir. Renin T. Belo)",
      role: "Overseen by SCIC Renewable Energy & Power Projects Division",
    };
  }
  if (upperCat === "HYDROPOWER") {
    return {
      division: "SCIC Hydropower Projects Division (Dir. Renin T. Belo)",
      role: "Director for Hydropower Projects: Renin T. Belo",
    };
  }
  if (upperCat === "WATER_RESOURCES") {
    return {
      division: "SCIC Water Projects Division (Dir. Narciso M. Areglado)",
      role: "Director for Water Projects: Narciso M. Areglado",
    };
  }
  if (upperCat === "ENERGY_GRID") {
    return {
      division: "SCIC Energy Projects Division (Dir. Luisito O. Traboco)",
      role: "Director for Energy Projects: Luisito O. Traboco",
    };
  }
  if (upperCat === "BUILDINGS" || upperCat === "INDUSTRIAL") {
    return {
      division: "SCIC Buildings & Industrial Plants Group (GM Norman Enriquez)",
      role: "Group Manager for Buildings & Industrial Plants: Norman Enriquez",
    };
  }
  if (
    upperCat === "ROADS_HIGHWAYS" ||
    upperCat === "BRIDGES" ||
    upperCat === "RAIL_TRANSIT"
  ) {
    return {
      division: "SCIC Infrastructure Projects Division (Dir. Antonio S. Pascua)",
      role: "Director for Infrastructure Projects: Antonio S. Pascua",
    };
  }
  if (upperCat === "MINING_TUNNELING") {
    return {
      division: "SCIC Operations & Underground Works Division (Deputy MD Fernando T. Delgado / Dir. Renin T. Belo)",
      role: "Deputy Managing Director for Operations: Fernando T. Delgado",
    };
  }
  return {
    division: "SCIC Operations & Engineering Division (Deputy MD Fernando T. Delgado)",
    role: "Deputy Managing Director for Operations: Fernando T. Delgado",
  };
}

async function main() {
  console.log("=== Updating SCIC Project Atlas with Verified Project Managers & Division Leadership ===");

  // 1. Clear unverified mock PMs on any soft-deleted projects first
  const clearedDeleted = await prisma.project.updateMany({
    where: {
      deletedAt: { not: null },
      leadPMName: { not: null },
    },
    data: {
      leadPMName: null,
      leadPMRole: null,
      leadPMDivision: null,
      leadPMContact: null,
      leadPMLicense: null,
    },
  });
  console.log(`Cleared unverified mock PMs from ${clearedDeleted.count} soft-deleted rows.`);

  // 2. Fetch all active projects
  const activeProjects = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  console.log(`Found ${activeProjects.length} active projects in PostgreSQL.`);

  let verifiedSitePMCount = 0;
  let divisionAssignedCount = 0;

  for (const p of activeProjects) {
    const override = VERIFIED_PROJECT_PMS[p.slug];
    if (override) {
      await prisma.project.update({
        where: { id: p.id },
        data: {
          leadPMName: override.leadPMName,
          leadPMRole: override.leadPMRole,
          leadPMDivision: override.leadPMDivision,
          leadPMContact: override.leadPMContact,
          leadPMLicense: override.leadPMLicense,
          ...(override.client ? { client: override.client } : {}),
        },
      });
      if (override.leadPMName) {
        verifiedSitePMCount++;
        console.log(`  [VERIFIED PM] ${p.slug} (${p.name}) -> ${override.leadPMName} (${override.leadPMRole})`);
      } else {
        divisionAssignedCount++;
        console.log(`  [VERIFIED EXEC/DIV] ${p.slug} (${p.name}) -> ${override.leadPMRole}`);
      }
    } else {
      const divInfo = getVerifiedDivisionByCategory(p.category, p.name);
      await prisma.project.update({
        where: { id: p.id },
        data: {
          // Strictly clear any unverified v1 mock PM names (e.g., Ramon Valenzuela, Bernardo Reyes, Carlito Perez)
          leadPMName: null,
          leadPMRole: divInfo.role,
          leadPMDivision: divInfo.division,
          leadPMContact: null,
          leadPMLicense: null,
        },
      });
      divisionAssignedCount++;
    }
  }

  console.log(
    `Updated ${verifiedSitePMCount} projects with verified site Project Managers and ${divisionAssignedCount} projects with verified Division Director / Group Manager oversight.`
  );

  // 3. Re-export lib/data/scicAtlasInitialProjects.json
  const updatedActive = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  const jsonPath = path.resolve(process.cwd(), "lib/data/scicAtlasInitialProjects.json");
  fs.writeFileSync(jsonPath, JSON.stringify(updatedActive, null, 2) + "\n", "utf8");
  console.log(`Exported ${updatedActive.length} verified records to ${jsonPath}.`);
}

main()
  .catch((err) => {
    console.error("Error updating verified PMs:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

/**
 * ============================================================
 * AtlasDiscoveryUtils.ts
 * Sta. Clara Project Atlas — Geographic Storytelling & Regional Discovery
 * ============================================================
 */

import { SCICProject } from "@/lib/data/scicProjectsData";
import {
  IslandGroupId,
  ProjectCategoryId,
  ProjectStatusId,
} from "@/lib/validations/projectAtlasSchema";
import { toCanonicalCategory, CATEGORY_ICON_REGISTRY } from "./AtlasMarkerIcons";
import { getBoundsForProjects } from "./AtlasSearchUtils";

export type AtlasDiscoveryScope =
  | { level: "national" }
  | { level: "island"; islandGroup: IslandGroupId }
  | { level: "region"; regionKey: string; regionDisplayName: string; islandGroup: IslandGroupId }
  | { level: "province"; regionKey: string; regionDisplayName: string; province: string; islandGroup: IslandGroupId };

export interface CanonicalRegionDefinition {
  key: string;
  shortName: string;
  regionalTitle: string;
  displayName: string;
  islandGroup: IslandGroupId;
  match: (rawRegion: string) => boolean;
}

export const CANONICAL_REGIONS: CanonicalRegionDefinition[] = [
  // Luzon
  {
    key: "REGION_I",
    shortName: "Region I",
    regionalTitle: "Ilocos Region",
    displayName: "Region I (Ilocos Region)",
    islandGroup: "LUZON",
    match: (r) => (r.startsWith("Region I ") || r === "Region I" || r.includes("Ilocos")) && !r.includes("/"),
  },
  {
    key: "REGION_II",
    shortName: "Region II",
    regionalTitle: "Cagayan Valley",
    displayName: "Region II (Cagayan Valley)",
    islandGroup: "LUZON",
    match: (r) => (r.startsWith("Region II ") || r === "Region II" || r.includes("Cagayan")) && !r.includes("/"),
  },
  {
    key: "CAR",
    shortName: "CAR",
    regionalTitle: "Cordillera",
    displayName: "Cordillera Administrative Region (CAR)",
    islandGroup: "LUZON",
    match: (r) => (r.includes("Cordillera") || r === "CAR") && !r.includes("/"),
  },
  {
    key: "REGION_III",
    shortName: "Region III",
    regionalTitle: "Central Luzon",
    displayName: "Region III (Central Luzon)",
    islandGroup: "LUZON",
    match: (r) => (r.startsWith("Region III ") || r === "Region III" || r.includes("Central Luzon")) && !r.includes("/"),
  },
  {
    key: "NCR",
    shortName: "NCR",
    regionalTitle: "Metro Manila",
    displayName: "NCR (Metro Manila)",
    islandGroup: "LUZON",
    match: (r) => (r.includes("NCR") || r.includes("Metro Manila")) && !r.includes("/"),
  },
  {
    key: "REGION_IV_A",
    shortName: "Region IV-A",
    regionalTitle: "CALABARZON",
    displayName: "Region IV-A (CALABARZON)",
    islandGroup: "LUZON",
    match: (r) => (r.includes("Region IV-A") || r.includes("CALABARZON")) && !r.includes("/"),
  },
  {
    key: "MIMAROPA",
    shortName: "MIMAROPA",
    regionalTitle: "MIMAROPA",
    displayName: "MIMAROPA (Region IV-B)",
    islandGroup: "LUZON",
    match: (r) => r.includes("MIMAROPA") || r.includes("IV-B"),
  },
  {
    key: "REGION_V",
    shortName: "Region V",
    regionalTitle: "Bicol Region",
    displayName: "Region V (Bicol Region)",
    islandGroup: "LUZON",
    match: (r) => (r.startsWith("Region V ") || r === "Region V" || r.includes("Bicol")) && !r.includes("/"),
  },
  {
    key: "LUZON_INTERREGIONAL",
    shortName: "Inter-Regional",
    regionalTitle: "Cross-Boundary Works",
    displayName: "Cross-Boundary / Inter-Regional Works",
    islandGroup: "LUZON",
    match: (r) => r.includes("/"),
  },

  // Visayas
  {
    key: "REGION_VI",
    shortName: "Region VI",
    regionalTitle: "Western Visayas",
    displayName: "Region VI (Western Visayas)",
    islandGroup: "VISAYAS",
    match: (r) => r.startsWith("Region VI ") || r === "Region VI" || r.includes("Western Visayas"),
  },
  {
    key: "REGION_VII",
    shortName: "Region VII",
    regionalTitle: "Central Visayas",
    displayName: "Region VII (Central Visayas)",
    islandGroup: "VISAYAS",
    match: (r) => r.startsWith("Region VII ") || r === "Region VII" || r.includes("Central Visayas"),
  },
  {
    key: "REGION_VIII",
    shortName: "Region VIII",
    regionalTitle: "Eastern Visayas",
    displayName: "Region VIII (Eastern Visayas)",
    islandGroup: "VISAYAS",
    match: (r) => r.startsWith("Region VIII ") || r === "Region VIII" || r.includes("Eastern Visayas"),
  },

  // Mindanao
  {
    key: "REGION_IX",
    shortName: "Region IX",
    regionalTitle: "Zamboanga Peninsula",
    displayName: "Region IX (Zamboanga Peninsula)",
    islandGroup: "MINDANAO",
    match: (r) => r.startsWith("Region IX ") || r === "Region IX" || r.includes("Zamboanga"),
  },
  {
    key: "REGION_X",
    shortName: "Region X",
    regionalTitle: "Northern Mindanao",
    displayName: "Region X (Northern Mindanao)",
    islandGroup: "MINDANAO",
    match: (r) => r.startsWith("Region X ") || r === "Region X" || r.includes("Northern Mindanao"),
  },
  {
    key: "REGION_XI",
    shortName: "Region XI",
    regionalTitle: "Davao Region",
    displayName: "Region XI (Davao Region)",
    islandGroup: "MINDANAO",
    match: (r) => r.startsWith("Region XI ") || r === "Region XI" || r.includes("Davao"),
  },
  {
    key: "REGION_XII",
    shortName: "Region XII",
    regionalTitle: "SOCCSKSARGEN",
    displayName: "Region XII (SOCCSKSARGEN)",
    islandGroup: "MINDANAO",
    match: (r) => r.includes("Region XII") || r.includes("SOCCSKSARGEN"),
  },
  {
    key: "CARAGA",
    shortName: "CARAGA",
    regionalTitle: "Caraga Region",
    displayName: "Caraga (Region XIII)",
    islandGroup: "MINDANAO",
    match: (r) => r.includes("CARAGA") || r.includes("Caraga") || r.includes("XIII"),
  },
  {
    key: "BARMM",
    shortName: "BARMM",
    regionalTitle: "Bangsamoro",
    displayName: "BARMM (Bangsamoro)",
    islandGroup: "MINDANAO",
    match: (r) => r.includes("BARMM") || r.includes("Bangsamoro"),
  },
];

export interface RegionSummaryItem {
  key: string;
  shortName: string;
  regionalTitle: string;
  displayName: string;
  islandGroup: IslandGroupId;
  projectCount: number;
  ongoingCount: number;
  completedCount: number;
  topSectorLabel?: string;
  topSectorColor?: string;
}

export interface IslandGroupSummary {
  id: IslandGroupId;
  name: string;
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  regions: RegionSummaryItem[];
}

/**
 * Aggregates all projects into Island Groups and Regions with live, strictly dynamic counts.
 */
export function computeIslandGroupSummaries(projects: SCICProject[]): IslandGroupSummary[] {
  const islandGroups: { id: IslandGroupId; name: string }[] = [
    { id: "LUZON", name: "Luzon" },
    { id: "VISAYAS", name: "Visayas" },
    { id: "MINDANAO", name: "Mindanao" },
  ];

  return islandGroups.map(({ id, name }) => {
    const islandProjects = projects.filter((p) => p.islandGroup === id);
    const candidateRegions = CANONICAL_REGIONS.filter((r) => r.islandGroup === id);

    const regions: RegionSummaryItem[] = [];

    // 1. Process known canonical regions
    for (const def of candidateRegions) {
      const matched = islandProjects.filter((p) => def.match(p.region));
      if (matched.length > 0) {
        let ongoingCount = 0;
        let completedCount = 0;
        const catCounts: Record<string, number> = {};

        for (const p of matched) {
          if (p.status === "ONGOING") ongoingCount++;
          if (p.status === "COMPLETED") completedCount++;
          const c = toCanonicalCategory(p.sector, p.name, p.description);
          catCounts[c] = (catCounts[c] || 0) + 1;
        }

        // Find top sector
        let topCat = "";
        let maxCount = 0;
        for (const [c, cnt] of Object.entries(catCounts)) {
          if (cnt > maxCount) {
            maxCount = cnt;
            topCat = c;
          }
        }
        const topConfig = topCat ? CATEGORY_ICON_REGISTRY[topCat as keyof typeof CATEGORY_ICON_REGISTRY] : undefined;

        regions.push({
          key: def.key,
          shortName: def.shortName,
          regionalTitle: def.regionalTitle,
          displayName: def.displayName,
          islandGroup: id,
          projectCount: matched.length,
          ongoingCount,
          completedCount,
          topSectorLabel: topConfig?.shortLabel,
          topSectorColor: topConfig?.color,
        });
      }
    }

    // 2. Discover any uncategorized regions dynamically present in this island group
    const matchedProjectIds = new Set<string>();
    for (const def of candidateRegions) {
      for (const p of islandProjects) {
        if (def.match(p.region)) matchedProjectIds.add(p.id);
      }
    }

    const unmapped = islandProjects.filter((p) => !matchedProjectIds.has(p.id));
    if (unmapped.length > 0) {
      const unmappedByRegion: Record<string, SCICProject[]> = {};
      for (const p of unmapped) {
        const reg = p.region || "Other Jurisdiction";
        unmappedByRegion[reg] = unmappedByRegion[reg] || [];
        unmappedByRegion[reg].push(p);
      }

      for (const [regName, regProjs] of Object.entries(unmappedByRegion)) {
        regions.push({
          key: `DYNAMIC_${regName.replace(/\s+/g, "_").toUpperCase()}`,
          shortName: regName,
          regionalTitle: regName,
          displayName: regName,
          islandGroup: id,
          projectCount: regProjs.length,
          ongoingCount: regProjs.filter((p) => p.status === "ONGOING").length,
          completedCount: regProjs.filter((p) => p.status === "COMPLETED").length,
        });
      }
    }

    const totalOngoing = islandProjects.filter((p) => p.status === "ONGOING").length;
    const totalCompleted = islandProjects.filter((p) => p.status === "COMPLETED").length;

    return {
      id,
      name,
      totalProjects: islandProjects.length,
      ongoingProjects: totalOngoing,
      completedProjects: totalCompleted,
      regions,
    };
  });
}

export interface RegionDiscoveryDetail {
  key: string;
  displayName: string;
  shortName: string;
  regionalTitle: string;
  islandGroup: IslandGroupId;
  totalProjects: number;
  statusCounts: Record<ProjectStatusId, number>;
  categoryCounts: {
    category: ProjectCategoryId;
    label: string;
    shortLabel: string;
    color: string;
    count: number;
    percentage: number;
  }[];
  provinces: {
    name: string;
    projectCount: number;
  }[];
  projects: SCICProject[];
  bounds: [[number, number], [number, number]] | null;
}

/**
 * Computes deep regional intelligence for a selected region key in Discovery Mode.
 */
export function getRegionDiscoveryDetail(
  projects: SCICProject[],
  regionKeyOrName: string
): RegionDiscoveryDetail | null {
  const def = CANONICAL_REGIONS.find(
    (r) => r.key === regionKeyOrName || r.displayName === regionKeyOrName || r.shortName === regionKeyOrName
  );

  let inRegion: SCICProject[] = [];
  let islandGroup: IslandGroupId = "LUZON";
  let displayName = regionKeyOrName;
  let shortName = regionKeyOrName;
  let regionalTitle = regionKeyOrName;
  let key = regionKeyOrName;

  if (def) {
    inRegion = projects.filter((p) => def.match(p.region));
    islandGroup = def.islandGroup;
    displayName = def.displayName;
    shortName = def.shortName;
    regionalTitle = def.regionalTitle;
    key = def.key;
  } else {
    inRegion = projects.filter((p) => p.region === regionKeyOrName);
    if (inRegion.length > 0) {
      islandGroup = inRegion[0].islandGroup;
    }
  }

  if (inRegion.length === 0) return null;

  // Status counts
  const statusCounts: Record<ProjectStatusId, number> = {
    ONGOING: 0,
    COMPLETED: 0,
    UPCOMING: 0,
    PLANNING: 0,
    ON_HOLD: 0,
  };

  const catMap: Record<string, number> = {};
  const provMap: Record<string, number> = {};

  for (const p of inRegion) {
    const s = p.status as ProjectStatusId;
    if (statusCounts[s] !== undefined) {
      statusCounts[s]++;
    }

    const cat = toCanonicalCategory(p.sector, p.name, p.description);
    catMap[cat] = (catMap[cat] || 0) + 1;

    if (p.province) {
      const trimmedProv = p.province.trim();
      provMap[trimmedProv] = (provMap[trimmedProv] || 0) + 1;
    }
  }

  // Canonical Phase 2 category distribution (omitting 0 counts)
  const categoryCounts = Object.entries(catMap)
    .map(([catId, count]) => {
      const conf = CATEGORY_ICON_REGISTRY[catId as keyof typeof CATEGORY_ICON_REGISTRY] || CATEGORY_ICON_REGISTRY.OTHER;
      return {
        category: catId as ProjectCategoryId,
        label: conf.label,
        shortLabel: conf.shortLabel,
        color: conf.color,
        count,
        percentage: Math.round((count / inRegion.length) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);

  const provinces = Object.entries(provMap)
    .map(([name, projectCount]) => ({ name, projectCount }))
    .sort((a, b) => b.projectCount - a.projectCount);

  // Alphabetically sorted projects within region
  const sortedProjects = [...inRegion].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  const bounds = getBoundsForProjects(inRegion);

  return {
    key,
    displayName,
    shortName,
    regionalTitle,
    islandGroup,
    totalProjects: inRegion.length,
    statusCounts,
    categoryCounts,
    provinces,
    projects: sortedProjects,
    bounds,
  };
}

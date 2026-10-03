/**
 * ============================================================
 * AtlasSearchUtils.ts
 * Sta. Clara Project Atlas — Canonical Search & Filter Normalization
 * ============================================================
 */

import { SCICProject } from "@/lib/data/scicProjectsData";
import { toCanonicalCategory, CATEGORY_ICON_REGISTRY } from "./AtlasMarkerIcons";

/**
 * Normalizes input text for resilient, case-insensitive, whitespace-trimmed comparison.
 */
export function normalizeSearchText(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Common Roman numerals and numeric region aliases in the Philippines:
 * e.g., "region 2" <-> "region ii", "region 3" <-> "region iii"
 */
const REGION_NUMERAL_MAP: Record<string, string> = {
  "1": "i", "2": "ii", "3": "iii", "4": "iv", "4a": "iv-a", "4b": "iv-b",
  "5": "v", "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
  "11": "xi", "12": "xii", "13": "xiii",
};

/**
 * Evaluates whether projectRegion matches queryText safely with strict word boundaries
 * to prevent Roman numeral substring collisions (e.g. preventing "Region III" from matching "Region II").
 */
export function matchesRegionSafely(projectRegion: string | undefined | null, queryText: string): boolean {
  if (!projectRegion || !queryText) return false;
  const normRegion = normalizeSearchText(projectRegion);
  const normQuery = normalizeSearchText(queryText);

  // Check if query is targeting a region (e.g. "region ii", "region 2", "region iii")
  const regionMatch = normQuery.match(/\bregion\s+([a-z0-9-]+)\b/i);
  if (regionMatch) {
    let targetNumeral = regionMatch[1].toLowerCase();
    if (REGION_NUMERAL_MAP[targetNumeral]) {
      targetNumeral = REGION_NUMERAL_MAP[targetNumeral];
    }
    // Match with strict word boundary on numeral so "ii" NEVER matches "iii"
    const regex = new RegExp(`\\bregion\\s+${targetNumeral}\\b`, "i");
    return regex.test(normRegion);
  }

  return normRegion.includes(normQuery);
}

/**
 * Evaluates whether a project matches the given raw search query across 6 key dimensions:
 * 1. Project Name
 * 2. Project Code
 * 3. Province
 * 4. Municipality
 * 5. Region
 * 6. Category (both full label, short label, and ID)
 */
export function projectMatchesSearch(project: SCICProject, rawQuery: string): boolean {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  // If search specifically queries a region (e.g., "region ii" or "region 2"),
  // use strict word-boundary region matching to avoid collisions with "Phase II" or "Region III".
  if (/\bregion\s+([a-z0-9-]+)\b/i.test(query)) {
    return matchesRegionSafely(project.region, query);
  }

  // 1. Textual attributes
  const name = normalizeSearchText(project.name);
  const code = normalizeSearchText(project.code);
  const province = normalizeSearchText(project.province);
  const municipality = normalizeSearchText(project.municipality);
  const region = normalizeSearchText(project.region);
  const client = normalizeSearchText(project.client);
  const pm = normalizeSearchText(project.leadPM?.name);

  // 2. Canonical category display labels
  const canonicalCat = toCanonicalCategory(project.sector, project.name, project.description);
  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
  const catLabel = catConfig?.label ? normalizeSearchText(catConfig.label) : "";
  const catShortLabel = catConfig?.shortLabel ? normalizeSearchText(catConfig.shortLabel) : "";
  const catId = canonicalCat.toLowerCase().replace(/_/g, " ");

  return (
    name.includes(query) ||
    code.includes(query) ||
    province.includes(query) ||
    municipality.includes(query) ||
    region.includes(query) ||
    client.includes(query) ||
    pm.includes(query) ||
    catLabel.includes(query) ||
    catShortLabel.includes(query) ||
    catId.includes(query)
  );
}

/**
 * Extracts all unique regions present in the dataset, sorted alphabetically.
 */
export function extractUniqueRegions(projects: SCICProject[]): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.region && p.region.trim()) {
      set.add(p.region.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Extracts all unique provinces present in the dataset, optionally filtered by a specific region.
 */
export function extractUniqueProvinces(projects: SCICProject[], selectedRegion?: string | "ALL"): string[] {
  const set = new Set<string>();
  const base = selectedRegion && selectedRegion !== "ALL"
    ? projects.filter((p) => p.region === selectedRegion)
    : projects;

  for (const p of base) {
    if (p.province && p.province.trim()) {
      set.add(p.province.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Computes geographic bounding box for an arbitrary list of projects.
 * Returns null if no projects.
 * Automatically adds safety margins for single-project or tight clusters to avoid zero-area camera crashes.
 */
export function getBoundsForProjects(
  projects: SCICProject[]
): [[number, number], [number, number]] | null {
  if (!projects || projects.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of projects) {
    if (typeof p.coordinates?.lat === "number" && typeof p.coordinates?.lng === "number") {
      if (p.coordinates.lat < minLat) minLat = p.coordinates.lat;
      if (p.coordinates.lat > maxLat) maxLat = p.coordinates.lat;
      if (p.coordinates.lng < minLng) minLng = p.coordinates.lng;
      if (p.coordinates.lng > maxLng) maxLng = p.coordinates.lng;
    }
  }

  if (minLat === Infinity || minLng === Infinity) return null;

  // Single project or near-zero span fallback padding (~10-15km view)
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  if (latSpan < 0.05) {
    minLat -= 0.08;
    maxLat += 0.08;
  }
  if (lngSpan < 0.05) {
    minLng -= 0.08;
    maxLng += 0.08;
  }

  // Returns [[southwestLng, southwestLat], [northeastLng, northeastLat]] (MapLibre [lng, lat] bounds)
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export interface RegionStatistics {
  regionName: string;
  islandGroup: string;
  totalProjects: number;
  statusCounts: {
    PLANNING: number;
    UPCOMING: number;
    ONGOING: number;
    COMPLETED: number;
    ON_HOLD: number;
  };
  categoryCounts: {
    category: string;
    label: string;
    color: string;
    count: number;
    percentage: number;
  }[];
  provinces: string[];
}

/**
 * Computes authoritative regional statistics from project records.
 * Complies with Phase 8 Data Governance:
 * - Strictly derived from SCIC_PROJECTS
 * - Uses canonical ProjectStatusId values (PLANNING, UPCOMING, ONGOING, COMPLETED, ON_HOLD)
 * - Uses Phase 2 canonical categories
 * - Zero fabricated statistics
 */
export function computeRegionStatistics(
  projects: SCICProject[],
  regionName: string
): RegionStatistics | null {
  if (!regionName || regionName === "ALL") return null;

  const inRegion = projects.filter((p) => p.region === regionName);
  if (inRegion.length === 0) return null;

  const islandGroup = inRegion[0].islandGroup || "PHILIPPINES";
  const statusCounts = {
    PLANNING: 0,
    UPCOMING: 0,
    ONGOING: 0,
    COMPLETED: 0,
    ON_HOLD: 0,
  };

  const catMap: Record<string, number> = {};
  const provinceSet = new Set<string>();

  for (const p of inRegion) {
    const s = p.status as keyof typeof statusCounts;
    if (statusCounts[s] !== undefined) {
      statusCounts[s]++;
    } else if (p.status === "ONGOING") {
      statusCounts.ONGOING++;
    }

    const cat = toCanonicalCategory(p.sector, p.name, p.description);
    catMap[cat] = (catMap[cat] || 0) + 1;

    if (p.province) provinceSet.add(p.province.trim());
  }

  const categoryCounts = Object.entries(catMap)
    .map(([catId, count]) => {
      const conf = CATEGORY_ICON_REGISTRY[catId as keyof typeof CATEGORY_ICON_REGISTRY] || CATEGORY_ICON_REGISTRY.OTHER;
      return {
        category: catId,
        label: conf.shortLabel,
        color: conf.color,
        count,
        percentage: Math.round((count / inRegion.length) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    regionName,
    islandGroup,
    totalProjects: inRegion.length,
    statusCounts,
    categoryCounts,
    provinces: Array.from(provinceSet).sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Resiliently finds a project in a dataset by ID, CUID, project code, slug,
 * or full/partial name. Handles case-insensitivity, whitespace, and 'scic-' prefix variations.
 */
export function findProjectInDataset(
  projects: SCICProject[],
  queryOrId: string | null | undefined
): SCICProject | undefined {
  if (!queryOrId || typeof queryOrId !== "string" || !queryOrId.trim()) return undefined;
  const q = normalizeSearchText(queryOrId);
  const qClean = q.replace(/^scic-/, "").trim();

  // 1. Exact ID or CUID match
  const exactId = projects.find((p) => p.id === queryOrId || p.id.toLowerCase() === q);
  if (exactId) return exactId;

  // 2. Exact code match
  const exactCode = projects.find((p) => p.code?.toLowerCase() === q);
  if (exactCode) return exactCode;

  // 3. Slug match (with hyphens/underscores normalized to spaces)
  const exactSlug = projects.find((p) => {
    if (!p.slug) return false;
    const s = p.slug.toLowerCase();
    const sClean = s.replace(/[-_]/g, " ");
    return s === q || s === qClean || sClean === q || sClean === qClean;
  });
  if (exactSlug) return exactSlug;

  // 4. Code without scic- prefix match
  const cleanCode = projects.find(
    (p) => p.code && p.code.toLowerCase().replace(/^scic-/, "") === qClean
  );
  if (cleanCode) return cleanCode;

  // 5. Exact name match
  const exactName = projects.find((p) => normalizeSearchText(p.name) === q);
  if (exactName) return exactName;

  // 6. Name includes query or query includes project short name
  const nameSub = projects.find((p) => {
    const pName = normalizeSearchText(p.name);
    const pShort = normalizeSearchText(p.shortName);
    return (
      pName.includes(q) ||
      (qClean.length >= 3 && pName.includes(qClean)) ||
      (pShort && (pShort.includes(q) || q.includes(pShort)))
    );
  });
  if (nameSub) return nameSub;

  // 7. Distinctive keyword & acronym matching (e.g. "Tumauini HEPP", "Sabangan Hydro", "Bakun Plant")
  const stopWords = new Set(["hepp", "project", "power", "plant", "hydro", "mhp", "thepp", "scic", "dam", "substation"]);
  const queryTokens = q.split(/[\s\-_,]+/).filter((t) => t.length >= 3);
  const distinctiveTokens = queryTokens.filter((t) => !stopWords.has(t));

  if (distinctiveTokens.length > 0) {
    const keywordMatch = projects.find((p) => {
      const pName = normalizeSearchText(p.name);
      const pMuni = normalizeSearchText(p.municipality);
      const pSlug = p.slug ? p.slug.toLowerCase().replace(/[-_]/g, " ") : "";
      return distinctiveTokens.every((token) => pName.includes(token) || pMuni.includes(token) || pSlug.includes(token));
    });
    if (keywordMatch) return keywordMatch;
  }

  return undefined;
}


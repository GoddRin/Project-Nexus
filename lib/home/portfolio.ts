import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";
import { yearsInService } from "./companyFacts";
import { withLastGood } from "./lastGood";
import { CACHE_TAGS, SERVER_TTL, nextRefreshAt } from "./refreshPolicy";
import type { PortfolioStats } from "./types";

/**
 * Portfolio figures, map points and featured projects, from the Project Atlas records.
 * Counts come from ProjectAtlasService.getProjectCounts (soft-deleted rows excluded). The
 * megawatt total, the map points and the featured list need fields the public DTO does not
 * carry (capacityMw, percentComplete), so they are read with one narrow query here.
 */

const ACTIVE = new Set(["ACTIVE", "ONGOING"]);
/** Records the Atlas flags as not confirmed by public sources are left out of the megawatt total, as they are on the Atlas */
const UNCONFIRMED = /Not confirmed by public sources/;
const PLACEHOLDER_IMAGE = /placeholder|logo/i;
const POWER = new Set(["HYDROPOWER", "WIND_POWER", "SOLAR_POWER", "ENERGY_GRID"]);
const RENEWABLE = new Set(["HYDROPOWER", "WIND_POWER", "SOLAR_POWER"]);

/** Megawatts from the capacity text ("2 x 150 MW" is 300), else the numeric column */
function megawatts(capacity: string | null, capacityMw: number | null): number {
  const text = capacity || "";
  const units = text.match(/(\d+)\s*[xX×]\s*([\d,.]+)\s*MW/);
  if (units) return Number(units[1]) * parseFloat(units[2].replace(/,/g, ""));
  const mw = text.match(/([\d,.]+)\s*MW\b/i);
  if (mw) return parseFloat(mw[1].replace(/,/g, ""));
  return capacityMw && capacityMw > 0 ? capacityMw : 0;
}

async function loadPortfolio(): Promise<Omit<PortfolioStats, "status"> & { updatedAt: string }> {
  const [counts, rows] = await Promise.all([
    ProjectAtlasService.getProjectCounts(),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        id: true, slug: true, name: true, latitude: true, longitude: true, status: true, category: true, capacity: true, capacityMw: true,
        percentComplete: true, featured: true, featuredImage: true, municipality: true, province: true, description: true, updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  let totalMw = 0;
  let renewableMw = 0;
  for (const r of rows) {
    if (!POWER.has(r.category) || UNCONFIRMED.test(r.description || "")) continue;
    const mw = megawatts(r.capacity, r.capacityMw);
    totalMw += mw;
    if (RENEWABLE.has(r.category)) renewableMw += mw;
  }
  const place = (r: (typeof rows)[number]) => [r.municipality, r.province].filter(Boolean).join(", ") || undefined;
  const hasImage = (r: (typeof rows)[number]) => !!r.featuredImage && !PLACEHOLDER_IMAGE.test(r.featuredImage);

  // featured = flagged as featured; if none are, the most recently updated ones that have a photograph
  let featuredRows = rows.filter((r) => r.featured && hasImage(r));
  if (!featuredRows.length) featuredRows = rows.filter(hasImage).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);

  return {
    totalProjects: counts.total,
    activeProjects: Object.entries(counts.byStatus).reduce((n, [s, c]) => n + (ACTIVE.has(s) ? c : 0), 0),
    completedProjects: counts.byStatus.COMPLETED ?? 0,
    totalMw: Math.round(totalMw * 10) / 10,
    renewableMw: Math.round(renewableMw * 10) / 10,
    provinces: counts.totalProvinces,
    yearsInService: yearsInService(),
    byStatus: counts.byStatus,
    byCategory: counts.byCategory,
    mapPoints: rows
      .filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number")
      .map((r) => ({
        slug: r.slug, name: r.name, lat: r.latitude as number, lon: r.longitude as number, status: r.status, category: r.category,
        capacity: r.capacity || undefined, location: place(r),
      })),
    featured: featuredRows.map((r) => ({
      slug: r.slug, id: r.id, name: r.name, image: r.featuredImage || undefined, status: r.status,
      // (percentComplete is a legacy column: shown only where a record has one)
      percentComplete: typeof r.percentComplete === "number" ? r.percentComplete : undefined,
      capacity: r.capacity || undefined, location: place(r), category: r.category,
    })),
    updatedAt: new Date().toISOString(),
  };
}

const cached = unstable_cache(loadPortfolio, ["home-portfolio"], { revalidate: SERVER_TTL.portfolio, tags: [CACHE_TAGS.portfolio, "project"] });

export async function getPortfolioStats(): Promise<PortfolioStats | null> {
  const { data, ok } = await withLastGood("portfolio", cached);
  if (!data) return null;
  const { updatedAt, ...stats } = data;
  return { ...stats, status: { source: "Project Atlas", updatedAt, ok, nextRefreshAt: nextRefreshAt(SERVER_TTL.portfolio) } };
}

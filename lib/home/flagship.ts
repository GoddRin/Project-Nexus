import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FLAGSHIP } from "./companyFacts";
import { SERVER_TTL } from "./refreshPolicy";

/**
 * The flagship site's own figures, from its records: overall progress (the latest logged
 * reading; the project record's percentage only when no reading exists), the readings over
 * time, the target commercial operation date and the latest daily log. Cached five minutes.
 */
export interface FlagshipSnapshot {
  id: string;
  slug: string;
  name: string;
  status: string;
  image: string | null;
  gallery: string[];
  targetCodDate: string | null;
  progress: { percent: number; asOf: string | null } | null;
  /** actual overall progress over time, oldest first */
  readings: { date: string; percent: number }[];
  dailyLog: { date: string; headcount: number; zones: number } | null;
}

async function loadFlagship(): Promise<FlagshipSnapshot | null> {
  const project = await prisma.project.findUnique({
    where: { slug: FLAGSHIP.slug },
    select: { id: true, slug: true, name: true, status: true, featuredImage: true, gallery: true, targetCodDate: true, percentComplete: true },
  });
  if (!project) return null;
  const [readings, log] = await Promise.all([
    prisma.progressSnapshot.findMany({ where: { projectId: project.id }, orderBy: { snapshotDate: "asc" }, select: { snapshotDate: true, percentComplete: true } }),
    prisma.dailyLog.findFirst({
      where: { projectId: project.id },
      orderBy: { logDate: "desc" },
      select: { logDate: true, totalHeadcount: true, zoneTunnels: true, zoneWeir: true, zoneTemfacil: true, zonePowerhouse: true, zoneSwitchyard: true },
    }),
  ]);
  const last = readings[readings.length - 1];
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    status: project.status,
    image: project.featuredImage,
    gallery: project.gallery,
    targetCodDate: project.targetCodDate ? project.targetCodDate.toISOString() : null,
    progress: last
      ? { percent: last.percentComplete, asOf: last.snapshotDate.toISOString() }
      : typeof project.percentComplete === "number"
        ? { percent: project.percentComplete, asOf: null }
        : null,
    readings: readings.map((r) => ({ date: r.snapshotDate.toISOString(), percent: r.percentComplete })),
    dailyLog: log
      ? {
          date: log.logDate.toISOString(),
          headcount: log.totalHeadcount,
          // zones with at least one person in them that day
          zones: [log.zoneTunnels, log.zoneWeir, log.zoneTemfacil, log.zonePowerhouse, log.zoneSwitchyard].filter((n) => n > 0).length,
        }
      : null,
  };
}

const cached = unstable_cache(loadFlagship, ["home-flagship", "v3"], { revalidate: SERVER_TTL.portfolio, tags: ["project", "progress"] });

export async function getFlagship(): Promise<FlagshipSnapshot | null> {
  try {
    return await cached();
  } catch (err) {
    console.warn("[home] flagship records could not be read:", err instanceof Error ? err.message : err);
    return null;
  }
}

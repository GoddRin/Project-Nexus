import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { withLastGood } from "./lastGood";
import { toHeadlines } from "./newsAggregator";
import { listNewsFeedItems } from "./newsPosts";
import { CACHE_TAGS, SERVER_TTL, nextRefreshAt } from "./refreshPolicy";
import { fetchRss, titleId } from "./rss";
import type { CompanyFeedItem, CompanyFeedResult } from "./types";

/**
 * The SCIC Newsroom feed: three sources merged, pinned posts first, then newest first.
 *   POST   posts written in the Newsroom composer (NewsPost; added in Phase 4)
 *   PULSE  events read from the project records of the last fourteen days
 *   PRESS  press mentions of the company (Google News search)
 * Each source fails on its own: a failed one is simply absent, the others still show.
 */

const PULSE_DAYS = 14;
// (when:1y: mentions from the last twelve months only, so the Newsroom is not filled with old stories)
const PRESS_QUERY = '("Sta. Clara International" OR "Sta. Clara Power" OR "Tumauini hydro") when:1y';
const PRESS_FEED = `https://news.google.com/rss/search?q=${encodeURIComponent(PRESS_QUERY)}&hl=en-PH&gl=PH&ceid=PH:en`;
const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const day = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "short" }).format(d);

/** POST: Newsroom posts (pinned and newest first; removed and expired ones are left out) */
async function loadPosts(): Promise<CompanyFeedItem[]> {
  try {
    return await listNewsFeedItems();
  } catch (err) {
    // (posts failing must not take the project events down with them)
    console.warn("[home] Newsroom posts could not be read:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * PULSE: what the project records say happened lately, in plain words. Only events that are in
 * the database: a completed milestone, a new progress reading (with its change from the reading
 * before), an approved accomplishment report, a completed COD milestone, and the days since the
 * last reported incident (left out when no incident has ever been logged: no rows is no data,
 * not a perfect record).
 */
async function loadPulse(): Promise<CompanyFeedItem[]> {
  const since = new Date(Date.now() - PULSE_DAYS * 86_400_000);
  const project = { select: { name: true, slug: true } } as const;
  const [milestones, snapshots, reports, codMilestones, lastIncident] = await Promise.all([
    prisma.milestone.findMany({ where: { status: "COMPLETED", completedDate: { gte: since } }, include: { project }, orderBy: { completedDate: "desc" }, take: 10 }),
    prisma.progressSnapshot.findMany({ where: { snapshotDate: { gte: since } }, include: { project }, orderBy: { snapshotDate: "desc" }, take: 10 }),
    prisma.accomplishmentReport.findMany({ where: { status: "APPROVED", reviewedAt: { gte: since } }, include: { project }, orderBy: { reviewedAt: "desc" }, take: 10 }),
    prisma.codMilestone.findMany({ where: { status: "COMPLETED", completedAt: { gte: since } }, include: { project }, orderBy: { completedAt: "desc" }, take: 10 }),
    prisma.siteIncident.findFirst({ orderBy: { createdAt: "desc" }, include: { project } }),
  ]);

  const items: CompanyFeedItem[] = [];
  for (const m of milestones) {
    items.push({
      id: `pulse-milestone-${m.id}`, kind: "PULSE", category: "MILESTONE",
      title: `${m.project.name}: milestone completed, "${m.name}"`,
      href: "/dashboard/progress", external: false, projectName: m.project.name,
      publishedAt: (m.completedDate ?? m.createdAt).toISOString(),
    });
  }
  for (const s of snapshots) {
    // the reading before this one, for the change
    const previous = await prisma.progressSnapshot.findFirst({
      where: { projectId: s.projectId, snapshotDate: { lt: s.snapshotDate } },
      orderBy: { snapshotDate: "desc" },
      select: { percentComplete: true },
    });
    const delta = previous ? s.percentComplete - previous.percentComplete : null;
    items.push({
      id: `pulse-progress-${s.id}`, kind: "PULSE", category: "PROGRESS",
      title: `${s.project.name} reaches ${pct(s.percentComplete)} overall progress${delta !== null && Math.abs(delta) >= 0.05 ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(1)}%)` : ""}`,
      excerpt: s.note || undefined,
      href: "/dashboard/progress", external: false, projectName: s.project.name,
      publishedAt: s.snapshotDate.toISOString(),
    });
  }
  for (const r of reports) {
    items.push({
      id: `pulse-report-${r.id}`, kind: "PULSE", category: "REPORT",
      title: `${r.project.name}: accomplishment report for ${r.workArea} (${day(r.reportDate)}) approved`,
      href: "/dashboard/reports", external: false, projectName: r.project.name,
      publishedAt: (r.reviewedAt ?? r.updatedAt).toISOString(),
    });
  }
  for (const c of codMilestones) {
    items.push({
      id: `pulse-cod-${c.id}`, kind: "PULSE", category: "COD",
      title: `${c.project.name}: ${c.isCritical ? "critical " : ""}COD milestone completed, "${c.title}"`,
      href: "/dashboard/progress", external: false, projectName: c.project.name,
      publishedAt: (c.completedAt ?? c.updatedAt).toISOString(),
    });
  }
  if (lastIncident) {
    const days = Math.floor((Date.now() - lastIncident.createdAt.getTime()) / 86_400_000);
    if (days >= 1) {
      items.push({
        id: `pulse-safety-${lastIncident.id}-${days}`, kind: "PULSE", category: "SAFETY",
        // (SiteIncident has no "recordable" classification, so every reported incident counts)
        title: `${lastIncident.project.name}: ${days} ${days === 1 ? "day" : "days"} since the last reported incident`,
        href: "/dashboard/incidents", external: false, projectName: lastIncident.project.name,
        publishedAt: new Date().toISOString(),
      });
    }
  }
  return items;
}

/**
 * Press mentions the Newsroom leaves out. The search matches any article that names the company,
 * including ones that are about something else. Add a phrase from a headline here (lower case)
 * to keep that article off the front page. Empty by default: every mention is shown.
 */
export const PRESS_EXCLUDE: string[] = [];

/** PRESS: mentions of the company in the news */
async function loadPress(): Promise<CompanyFeedItem[]> {
  const headlines = toHeadlines(await fetchRss(PRESS_FEED), "SCIC_PRESS", 12)
    .filter((h) => !PRESS_EXCLUDE.some((phrase) => phrase && h.title.toLowerCase().includes(phrase.toLowerCase())))
    .slice(0, 8);
  return headlines.map((h) => ({
    id: `press-${titleId(h.title)}`, kind: "PRESS" as const, category: "PRESS",
    title: h.title, href: h.url, external: true, source: h.source, sourceDomain: h.sourceDomain,
    publishedAt: h.publishedAt || new Date(0).toISOString(),
  }));
}

const cachedPress = unstable_cache(loadPress, ["home-press"], { revalidate: SERVER_TTL.press, tags: [CACHE_TAGS.news, `${CACHE_TAGS.news}:press`] });
const cachedInternal = unstable_cache(
  async () => {
    const [posts, pulse] = await Promise.all([loadPosts(), loadPulse()]);
    return { items: [...posts, ...pulse], updatedAt: new Date().toISOString() };
  },
  ["home-company-feed-internal", "v4"],
  { revalidate: SERVER_TTL.companyFeed, tags: [CACHE_TAGS.news] }
);

export async function getCompanyFeed({ limit = 12, category }: { limit?: number; category?: string } = {}): Promise<CompanyFeedResult> {
  const [internal, press] = await Promise.all([withLastGood("feed:internal", cachedInternal), withLastGood("feed:press", cachedPress)]);
  let items = [...(internal.data?.items ?? []), ...(press.data ?? [])];
  if (category && category !== "ALL") items = items.filter((i) => i.category === category);
  items.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
  return {
    items: items.slice(0, limit),
    status: {
      source: "Project records · Google News",
      updatedAt: internal.data?.updatedAt ?? new Date().toISOString(),
      // (stale when the project records could not be read; a press outage only removes the press items)
      ok: internal.ok,
      nextRefreshAt: nextRefreshAt(SERVER_TTL.companyFeed),
    },
  };
}

/**
 * Cached data fetchers for dashboard pages.
 *
 * Uses Next.js `unstable_cache` to persist DB query results in the
 * server-side cache between requests. Pages using these fetchers serve
 * cached data instantly on repeat navigations — no DB round-trip needed.
 *
 * Revalidate TTLs:
 *  - project config:      300s (almost never changes)
 *  - tickets/assets/kb:    60s
 *  - documents:            30s
 *  - reports:              20s (frequently submitted/updated)
 *  - progress:             60s
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";

// ── Project ───────────────────────────────────────────────────────────────────
export const getCachedProject = unstable_cache(
  async (slug: string) => {
    return prisma.project.findUnique({ where: { slug } });
  },
  ["project-by-slug"],
  { revalidate: 300, tags: ["project"] }
);

// ── Tickets ───────────────────────────────────────────────────────────────────
export const getCachedTickets = unstable_cache(
  async (projectId: string) => {
    return prisma.ticket.findMany({
      where: { projectId },
      include: {
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
  ["tickets-list"],
  { revalidate: 60, tags: ["tickets"] }
);

// ── Assets ────────────────────────────────────────────────────────────────────
export const getCachedAssets = unstable_cache(
  async (projectId: string) => {
    return prisma.asset.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  },
  ["assets-list"],
  { revalidate: 60, tags: ["assets"] }
);

// ── Knowledge Base ────────────────────────────────────────────────────────────
export const getCachedKnowledgeArticles = unstable_cache(
  async (projectId: string) => {
    return prisma.knowledgeArticle.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });
  },
  ["knowledge-articles"],
  { revalidate: 120, tags: ["knowledge-base"] }
);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getCachedReports = unstable_cache(
  async (projectId: string) => {
    return prisma.accomplishmentReport.findMany({
      where: { projectId },
      include: {
        submittedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        photos: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  },
  ["reports-list"],
  { revalidate: 20, tags: ["reports"] }
);

// ── Progress Snapshots ────────────────────────────────────────────────────────
export const getCachedSnapshots = unstable_cache(
  async (projectId: string) => {
    return prisma.progressSnapshot.findMany({
      where: { projectId },
      include: { loggedBy: { select: { name: true } } },
      orderBy: { snapshotDate: "asc" },
    });
  },
  ["progress-snapshots"],
  { revalidate: 60, tags: ["progress"] }
);

export const getCachedMilestones = unstable_cache(
  async (projectId: string) => {
    return prisma.milestone.findMany({
      where: { projectId },
      orderBy: { targetDate: "asc" },
    });
  },
  ["milestones-list"],
  { revalidate: 60, tags: ["progress"] }
);

// ── Documents ─────────────────────────────────────────────────────────────────
export const getCachedDocumentFolders = unstable_cache(
  async (projectId: string) => {
    return prisma.documentFolder.findMany({
      where: { projectId, parentId: null },
      include: {
        children: {
          include: { children: true },
        },
      },
      orderBy: { name: "asc" },
    });
  },
  ["document-folders"],
  { revalidate: 30, tags: ["documents"] }
);

// ── Maintenance ───────────────────────────────────────────────────────────────
export const getCachedMaintenanceSchedules = unstable_cache(
  async (projectId: string) => {
    return prisma.maintenanceSchedule.findMany({
      where: { projectId },
      include: {
        asset: { select: { id: true, name: true, category: true } },
      },
      orderBy: { nextDueDate: "asc" },
    });
  },
  ["maintenance-schedules"],
  { revalidate: 60, tags: ["maintenance"] }
);


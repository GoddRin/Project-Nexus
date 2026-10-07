import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FLAGSHIP, LAST_LTA_DATE } from "./companyFacts";
import { withLastGood } from "./lastGood";
import { nextRefreshAt } from "./refreshPolicy";
import type { SourceStatus } from "./types";

/**
 * The site's operational figures, in one place.
 *
 * PART 1 is the Command Center's own queries, moved here unchanged from
 * components/dashboard/DashboardWidgets.tsx (same models, same `where`, `include`, `orderBy`
 * and `take`): the widgets there call these functions, so /dashboard reads exactly what it
 * read before. PART 2 is the Nexus Home snapshot, which is built from the same functions.
 */

// ── PART 1: the Command Center's queries ───────────────────────────────────────────────────

/** The site the Command Center is about */
export function findOpsProject() {
  return prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
}

/** Helpdesk tickets that are open or being worked on */
export function countOpenTickets(projectId: string) {
  return prisma.ticket.count({
    where: {
      projectId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
}

/** Visitors signed in and not yet signed out */
export function countOnSiteVisitors(projectId: string) {
  return prisma.visitor.count({
    where: {
      projectId,
      status: "CHECKED_IN",
    },
  });
}

/** The latest four accomplishment reports, approved inventory movements and visitor entries */
export function findRecentActivity(projectId: string) {
  return Promise.all([
    prisma.accomplishmentReport.findMany({
      where: { projectId },
      include: {
        submittedBy: true,
        reviewedBy: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.inventoryTransaction.findMany({
      where: { projectId, status: "APPROVED" },
      include: {
        item: true,
        approvedBy: true,
        requestedBy: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.visitor.findMany({
      where: { projectId },
      include: { host: true, loggedBy: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
}

// ── PART 2: the Nexus Home snapshot ────────────────────────────────────────────────────────

export type OpsTone = "green" | "amber" | "red" | "blue" | "muted";
export interface OpsActivity {
  id: string;
  kind: "report" | "transaction" | "visitor";
  text: string;
  detail: string;
  href: string;
  tone: OpsTone;
  at: string;
}
export interface OpsSnapshot {
  openTickets: number;
  onSiteVisitors: number;
  /**
   * What the safety streak counts from: the company's stated last lost-time accident ("lta"),
   * or a later entry in the Incidents module ("incident"). Null when neither exists: the streak
   * is then not shown at all.
   */
  lastIncidentAt: string | null;
  lastIncidentKind: "lta" | "incident" | null;
  activity: OpsActivity[];
  status: SourceStatus;
}

const OPS_TTL = 60; // seconds

async function loadOps(): Promise<Omit<OpsSnapshot, "status"> & { updatedAt: string }> {
  const project = await findOpsProject();
  if (!project) throw new Error(`project ${FLAGSHIP.slug} not found`);
  const [openTickets, onSiteVisitors, [reports, transactions, visitors], lastIncident] = await Promise.all([
    countOpenTickets(project.id),
    countOnSiteVisitors(project.id),
    findRecentActivity(project.id),
    prisma.siteIncident.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  // the same wording and the same order as the Command Center's activity stream
  const activity: OpsActivity[] = [
    ...reports.map((r): OpsActivity => ({
      id: `report-${r.id}`,
      kind: "report",
      href: `/dashboard/reports/${r.id}`,
      detail: `Work area: ${r.workArea}`,
      at: r.updatedAt.toISOString(),
      ...(r.status === "APPROVED"
        ? { text: `${r.reviewedBy?.name || "PM"} approved report for ${r.workArea}`, tone: "blue" as const }
        : r.status === "REJECTED"
          ? { text: `${r.reviewedBy?.name || "PM"} rejected report for ${r.workArea}`, tone: "red" as const }
          : { text: `${r.submittedBy.name} submitted accomplishment report`, tone: "amber" as const }),
    })),
    ...transactions.map((t): OpsActivity => ({
      id: `transaction-${t.id}`,
      kind: "transaction",
      href: `/dashboard/inventory/${t.itemId}`,
      detail: `Material: ${t.item.name}`,
      at: t.updatedAt.toISOString(),
      ...(t.type === "RESTOCK"
        ? { text: `${t.approvedBy?.name || "Admin"} restocked ${t.quantity} ${t.item.unit}`, tone: "green" as const }
        : t.type === "ISSUE"
          ? { text: `Issued ${t.quantity} ${t.item.unit} to ${t.requestedBy.name}`, tone: "amber" as const }
          : { text: `${t.type} ${t.quantity} ${t.item.unit} (${t.item.name})`, tone: "blue" as const }),
    })),
    ...visitors.map((v): OpsActivity => ({
      id: `visitor-${v.id}`,
      kind: "visitor",
      href: `/dashboard/visitors/${v.id}`,
      detail: `Visitor: ${v.organization || v.fullName}`,
      at: v.createdAt.toISOString(),
      ...(v.status === "CHECKED_IN" ? { text: `Visitor check-in: ${v.fullName}`, tone: "green" as const } : { text: `Visitor check-out: ${v.fullName}`, tone: "muted" as const }),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  // midnight in the Philippines on the stated date
  const lta = LAST_LTA_DATE ? new Date(`${LAST_LTA_DATE}T00:00:00+08:00`) : null;
  const logged = lastIncident?.createdAt ?? null;
  const useLogged = !!logged && (!lta || logged.getTime() > lta.getTime());
  const last = useLogged ? logged : lta;
  return {
    openTickets,
    onSiteVisitors,
    lastIncidentAt: last ? last.toISOString() : null,
    lastIncidentKind: last ? (useLogged ? "incident" : "lta") : null,
    activity,
    updatedAt: new Date().toISOString(),
  };
}

const cached = unstable_cache(loadOps, ["home-ops", "v2"], { revalidate: OPS_TTL, tags: ["tickets", "visitors", "reports", "home-ops"] });

/** Null when the records cannot be read and there is no earlier copy: the card is then left out */
export async function getOpsSnapshot(): Promise<OpsSnapshot | null> {
  const { data, ok } = await withLastGood("ops", cached);
  if (!data) return null;
  const { updatedAt, ...ops } = data;
  return { ...ops, status: { source: "Site records", updatedAt, ok, nextRefreshAt: nextRefreshAt(OPS_TTL) } };
}

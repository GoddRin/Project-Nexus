import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { notFound, redirect } from "next/navigation";
import { IntelligenceClient } from "./IntelligenceClient";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  // 1. Fetch default project
  const project = await prisma.project.findUnique({
    where: { slug: "tumauini-hepp" },
  });
  if (!project) return notFound();

  // 2. Fetch user and verify project access
  const { dbUser, member } = await getOrCreateUser(project.id);
  if (!dbUser || !member) {
    return redirect("/sign-in");
  }

  // 3. Fetch sitemap locations for completion rings
  const siteLocations = await prisma.siteLocation.findMany({
    where: { projectId: project.id },
    orderBy: { slug: "asc" },
  });

  // 4. Fetch COD Milestones sorted by order
  const milestones = await prisma.codMilestone.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });

  // 5. Fetch project-level progress snapshots for the sparkline trend
  const snapshots = await prisma.progressSnapshot.findMany({
    where: { projectId: project.id },
    orderBy: { snapshotDate: "asc" },
  });

  // Serializing for client component
  const serializedLocations = siteLocations.map((loc) => ({
    id: loc.id,
    slug: loc.slug,
    name: loc.name,
    percentComplete: loc.percentComplete ?? 0,
    status: loc.status,
  }));

  const serializedMilestones = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    targetDate: m.targetDate ? m.targetDate.toISOString() : null,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    status: m.status,
    order: m.order,
    isCritical: m.isCritical,
  }));

  const serializedSnapshots = snapshots.map((s) => ({
    id: s.id,
    snapshotDate: s.snapshotDate.toISOString(),
    percentComplete: s.percentComplete,
  }));

  return (
    <div className="flex-grow space-y-6">
      <IntelligenceClient
        projectId={project.id}
        targetCodDate={project.targetCodDate ? project.targetCodDate.toISOString() : null}
        milestones={serializedMilestones}
        locations={serializedLocations}
        snapshots={serializedSnapshots}
      />
    </div>
  );
}

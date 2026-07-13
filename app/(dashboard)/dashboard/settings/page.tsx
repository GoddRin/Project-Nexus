import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { notFound, redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // 1. Fetch default project
  const project = await prisma.project.findUnique({
    where: { slug: "tumauini-hepp" },
  });
  if (!project) return notFound();

  // 2. Fetch user and verify ADMINISTRATOR role
  const { dbUser, member } = await getOrCreateUser(project.id);
  if (!dbUser || !member) {
    return redirect("/sign-in");
  }

  if (member.role !== "ADMINISTRATOR") {
    // Return a styled unauthorized message or redirect
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-signal-red/20 bg-signal-red/5 p-8 max-w-md shadow-lg backdrop-blur-md">
          <h2 className="text-xl font-bold text-signal-red font-display">Access Restricted</h2>
          <p className="mt-3 text-sm text-text-muted leading-relaxed">
            Only team members with the <strong>ADMINISTRATOR</strong> role are authorized to modify project operations timelines or milestone statuses.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.04] px-4 text-xs font-semibold text-text-primary hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors border border-border-hairline"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 3. Fetch milestones sorted by order
  const milestones = await prisma.codMilestone.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });

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

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Project Configuration"
        subtitle="Manage commercial operation date timelines and update critical commissioning milestones"
      />
      <SettingsClient
        projectId={project.id}
        initialCodDate={project.targetCodDate ? project.targetCodDate.toISOString() : null}
        initialMilestones={serializedMilestones}
      />
    </div>
  );
}

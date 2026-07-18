import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { IncidentListClient } from "./IncidentListClient";

export default async function IncidentsPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const incidents = await prisma.siteIncident.findMany({
    where: { projectId: project.id },
    include: {
      loggedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Incident Dispatch Log"
        subtitle="Permanent record of all medical, security, and fire incidents dispatched to regional facilities"
        className="mb-0!"
      />
      <IncidentListClient initialIncidents={incidents as unknown as Record<string, unknown>[]} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { PageHeader } from "@/components/shared/PageHeader";
import { NewScheduleForm } from "./NewScheduleForm";
import { Role } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ assetId?: string }>;
}

export default async function NewMaintenanceSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaultAssetId = params.assetId || "";

  const project = await getCachedProject("tumauini-hepp");
  if (!project) return null;

  const { member } = await getOrCreateUser(project.id);

  // Only managers / warehouse / IT / admin can create schedules
  const canManage = member
    ? ([Role.ADMINISTRATOR, Role.IT_SUPPORT, Role.WAREHOUSE] as Role[]).includes(member.role)
    : false;

  if (!canManage) redirect("/dashboard/maintenance");

  // Fetch all non-retired assets available for scheduling
  const assets = await prisma.asset.findMany({
    where: { projectId: project.id, status: { not: "RETIRED" } },
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Maintenance Schedule"
        subtitle="Attach a recurring maintenance task to a site asset."
      />

      <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6 shadow-xl">
        <NewScheduleForm
          assets={assets}
          projectId={project.id}
          defaultAssetId={defaultAssetId}
        />
      </div>
    </div>
  );
}

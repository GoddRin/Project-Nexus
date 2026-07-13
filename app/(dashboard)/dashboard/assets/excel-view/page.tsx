import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { redirect } from "next/navigation";

export default async function ExcelViewPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const { member } = await getOrCreateUser(project.id);
  if (!member) redirect("/dashboard/assets");
  const isEditor = member.role === "PROJECT_MANAGER" || member.role === "ADMINISTRATOR" || member.role === "IT_SUPPORT";
  if (!isEditor) redirect("/dashboard/assets");


  // Fetch all assets with their latest completed maintenance task (to match Excel's "Condition/Issue Found" columns)
  const assets = await prisma.asset.findMany({
    where: { projectId: project.id },
    include: {
      assignedTo: true,
      maintenanceSchedules: {
        include: {
          tasks: {
            where: { completedAt: { not: null } },
            orderBy: { completedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { purchaseDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Consolidated Asset & Maintenance Log"
          subtitle="Excel-format reference view of all tracked equipment"
          className="mb-0!"
        />
        <div className="flex items-center gap-3">
          <Link href="/dashboard/assets">
            <Button variant="outline">Back to Grid</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-primary whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/[0.08]">
              <tr>
                <th className="px-4 py-3 font-semibold text-text-muted">Date</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Asset Tag Number</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Device Type</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Serial Number</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Location</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Department</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Assigned To</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Condition</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Issue Found</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Action Taken</th>
                <th className="px-4 py-3 font-semibold text-text-muted">With Warranty?</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {assets.map((asset) => {
                // Get the most recent completed task across all schedules for this asset
                const allTasks = asset.maintenanceSchedules.flatMap(s => s.tasks);
                const latestTask = allTasks.sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

                return (
                  <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">
                      {asset.purchaseDate ? asset.purchaseDate.toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-flow-teal">{asset.assetTag || "-"}</td>
                    <td className="px-4 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{asset.serialNumber || "-"}</td>
                    <td className="px-4 py-3">{asset.location || "-"}</td>
                    <td className="px-4 py-3">{asset.department || "-"}</td>
                    <td className="px-4 py-3">
                      {asset.assignedToName || (asset.assignedTo ? asset.assignedTo.name : "-")}
                    </td>
                    <td className="px-4 py-3">
                      {latestTask?.condition || "-"}
                    </td>
                    <td className="px-4 py-3 text-signal-amber">
                      {latestTask?.issueFound || "-"}
                    </td>
                    <td className="px-4 py-3 text-flow-teal">
                      {latestTask?.actionTaken || "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {asset.hasWarranty ? "YES" : "NO"}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs truncate max-w-[200px]" title={latestTask?.notes || ""}>
                      {latestTask?.notes || "-"}
                    </td>
                  </tr>
                );
              })}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-text-muted">
                    No assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

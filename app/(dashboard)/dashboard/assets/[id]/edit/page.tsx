import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { UserCombobox } from "@/components/shared/UserCombobox";
import { updateAsset } from "../../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAssetPage({ params }: PageProps) {
  const { id } = await params;
  
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) notFound();

  // Authentication & permission verification at render time
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/dashboard/assets");

  const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!dbUser) redirect("/dashboard/assets");

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
  });
  if (!member) redirect("/dashboard/assets");

  const role = member.role;
  const isEditor = role === "WAREHOUSE" || role === "IT_SUPPORT" || role === "ADMINISTRATOR";
  if (!isEditor) redirect("/dashboard/assets");

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const boundUpdateAsset = updateAsset.bind(null, asset.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Edit Asset"
        subtitle={`Update details for ${asset.name}`}
      />

      <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
        <form action={boundUpdateAsset} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asset Tag Number */}
            <div className="space-y-1.5 md:col-span-1">
              <label htmlFor="assetTag" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Asset Tag Number
              </label>
              <input
                id="assetTag"
                name="assetTag"
                type="text"
                defaultValue={asset.assetTag || ""}
                placeholder="e.g. 6518"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Device Type */}
            <div className="space-y-1.5 md:col-span-1">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Device Type *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={asset.name}
                placeholder="e.g. Laptop, Printer"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={asset.category}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                <option value="">Select category...</option>
                <option value="IT Hardware">IT Hardware</option>
                <option value="Network Equipment">Network Equipment</option>
                <option value="Heavy Equipment">Heavy Equipment</option>
                <option value="Safety Gear">Safety Gear</option>
                <option value="Office Equipment">Office Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Serial Number */}
            <div className="space-y-1.5">
              <label htmlFor="serialNumber" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Serial Number
              </label>
              <input
                id="serialNumber"
                name="serialNumber"
                type="text"
                defaultValue={asset.serialNumber || ""}
                placeholder="S/N or Asset Tag"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={asset.location || ""}
                placeholder="e.g. Server Room A, Warehouse 2"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Vendor */}
            <div className="space-y-1.5">
              <label htmlFor="vendor" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Vendor / Supplier
              </label>
              <input
                id="vendor"
                name="vendor"
                type="text"
                defaultValue={asset.vendor || ""}
                placeholder="e.g. Cisco Systems, local provider"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label htmlFor="purchaseDate" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Date (Purchase/Registry)
              </label>
              <input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={asset.purchaseDate ? asset.purchaseDate.toISOString().split("T")[0] : ""}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label htmlFor="department" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Department
              </label>
              <input
                id="department"
                name="department"
                type="text"
                defaultValue={asset.department || ""}
                placeholder="e.g. HR, ADMIN, ENGINEERING"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={asset.status}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="IN_MAINTENANCE">IN MAINTENANCE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>

            {/* With Warranty? */}
            <div className="space-y-1.5">
              <label htmlFor="hasWarranty" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                With Warranty?
              </label>
              <select
                id="hasWarranty"
                name="hasWarranty"
                defaultValue={asset.hasWarranty ? "true" : "false"}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                <option value="true">YES</option>
                <option value="false">NO</option>
              </select>
            </div>

            {/* Assigned User */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Assign To User
              </label>
              <UserCombobox
                inputName="assignedToId"
                fallbackName="assignedToName"
                users={members.map((m) => ({
                  id: m.userId,
                  name: m.user.name,
                  role: m.role,
                }))}
                defaultValue={asset.assignedToId || undefined}
                defaultQuery={asset.assignedToName || undefined}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.05]">
            <Link href={`/dashboard/assets/${asset.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

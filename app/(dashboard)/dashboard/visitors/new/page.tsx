import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { logVisitorIn } from "../actions";
import { UserCheck } from "lucide-react";
import { UserCombobox } from "@/components/shared/UserCombobox";

export default async function NewVisitorPage() {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) return null;

 const { member } = await getOrCreateUser(project.id);
 if (!member || (member.role !== "GUARD" && member.role !== "ADMINISTRATOR")) {
 redirect("/dashboard/visitors");
 }

 // Fetch all active project members to populate the host dropdown
 const members = await prisma.projectMember.findMany({
 where: { projectId: project.id },
 include: { user: true },
 orderBy: { user: { name: "asc" } }
 });

 return (
 <div className="max-w-2xl mx-auto space-y-6">
 <div className="mb-4">
 <Link href="/dashboard/visitors" className="text-sm text-text-muted hover:text-white flex items-center gap-2">
 ← Back to Visitors
 </Link>
 </div>
 <PageHeader
 title="Log New Visitor"
 subtitle="Register a visitor entering the site"
 />

 <div className="glass-card p-6 border-t-4 border-t-flow-teal">
 <form action={logVisitorIn} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2 md:col-span-2">
 <label htmlFor="fullName" className="text-sm font-medium text-text-primary">Full Name <span className="text-red-500">*</span></label>
 <input
 id="fullName"
 name="fullName"
 type="text"
 required
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="Juan dela Cruz"
 />
 </div>

 <div className="space-y-2">
 <label htmlFor="organization" className="text-sm font-medium text-text-primary">Organization / Company</label>
 <input
 id="organization"
 name="organization"
 type="text"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="e.g. Supplier Inc."
 />
 </div>

  <div className="space-y-2">
  <label className="text-sm font-medium text-text-primary">Host <span className="text-red-500">*</span></label>
  <UserCombobox
  inputName="hostId"
  users={members.map(m => ({
  id: m.userId,
  name: m.user.name,
  role: m.role,
  }))}
  placeholder="Search for a host..."
  required={true}
  />
  </div>

 <div className="space-y-2 md:col-span-2">
 <label htmlFor="purpose" className="text-sm font-medium text-text-primary">Purpose of Visit <span className="text-red-500">*</span></label>
 <input
 id="purpose"
 name="purpose"
 type="text"
 required
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="e.g. Delivery of materials"
 />
 </div>

 <div className="space-y-2">
 <label htmlFor="vehicle" className="text-sm font-medium text-text-primary">Vehicle Plate Number</label>
 <input
 id="vehicle"
 name="vehicle"
 type="text"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="e.g. ABC 1234"
 />
 </div>

 <div className="space-y-2">
 <label htmlFor="idType" className="text-sm font-medium text-text-primary">ID Surrendered</label>
 <select
 id="idType"
 name="idType"
 className="w-full rounded-xl bg-[#0f1115] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 >
 <option value="">None</option>
 <option value="Driver's License">Driver&apos;s License</option>
 <option value="Company ID">Company ID</option>
 <option value="Passport">Passport</option>
 <option value="Other">Other ID</option>
 </select>
 </div>

 <div className="space-y-2 md:col-span-2">
 <label htmlFor="remarks" className="text-sm font-medium text-text-primary">Remarks</label>
 <input
 id="remarks"
 name="remarks"
 type="text"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="Optional notes"
 />
 </div>
 </div>

 <div className="flex justify-end pt-4 border-t border-white/[0.05]">
 <Button type="submit" className="bg-flow-teal hover:bg-flow-teal/90 text-white min-w-[140px]">
 <UserCheck className="w-4 h-4 mr-2" />
 Check In
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}

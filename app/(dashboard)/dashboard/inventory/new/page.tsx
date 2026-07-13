import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { createItem } from "../actions";

export default async function NewInventoryItemPage() {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
 if (!project) throw new Error("Project not found");

 // Authentication & permission verification at render time
 const clerkUser = await currentUser();
 if (!clerkUser) redirect("/dashboard/inventory");

 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
 if (!dbUser) redirect("/dashboard/inventory");

 const member = await prisma.projectMember.findUnique({
 where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
 });
 if (!member) redirect("/dashboard/inventory");

 const role = member.role;
 const isManager = role === "WAREHOUSE" || role === "ADMINISTRATOR";
 if (!isManager) redirect("/dashboard/inventory");

 return (
 <div className="max-w-2xl mx-auto space-y-6">
 <PageHeader
 title="Add Inventory Item"
 subtitle="Register a new material, consumable, or tool to the inventory."
 />

 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <form action={createItem} className="space-y-5">
 <input type="hidden" name="projectId" value={project.id} />
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Item Name */}
 <div className="space-y-1.5 md:col-span-2">
 <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Item Name *
 </label>
 <input
 id="name"
 name="name"
 type="text"
 required
 placeholder="e.g. Cat6 Ethernet Cable"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>

 {/* Category */}
 <div className="space-y-1.5">
 <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Category *
 </label>
 <input
 id="category"
 name="category"
 type="text"
 required
 list="category-suggestions"
 placeholder="e.g. Consumables"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 <datalist id="category-suggestions">
 <option value="Consumables" />
 <option value="Tools" />
 <option value="Safety Equipment" />
 <option value="Raw Materials" />
 <option value="Spare Parts" />
 </datalist>
 </div>

 {/* Unit */}
 <div className="space-y-1.5">
 <label htmlFor="unit" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Unit of Measurement *
 </label>
 <input
 id="unit"
 name="unit"
 type="text"
 required
 placeholder="e.g. pcs, meters, kg"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>

 {/* Initial Quantity */}
 <div className="space-y-1.5">
 <label htmlFor="quantityOnHand" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Initial Stock Quantity
 </label>
 <input
 id="quantityOnHand"
 name="quantityOnHand"
 type="number"
 step="0.01"
 defaultValue="0"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>

 {/* Low Stock Threshold */}
 <div className="space-y-1.5">
 <label htmlFor="lowStockThreshold" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Low Stock Warning Level
 </label>
 <input
 id="lowStockThreshold"
 name="lowStockThreshold"
 type="number"
 step="0.01"
 defaultValue="0"
 placeholder="0 = No warning"
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
 placeholder="e.g. Warehouse Rack 4B"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>

 {/* Vendor */}
 <div className="space-y-1.5">
 <label htmlFor="vendor" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Supplier/Vendor
 </label>
 <input
 id="vendor"
 name="vendor"
 type="text"
 placeholder="e.g. Hardware Corp"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
 <Link href="/dashboard/inventory">
 <Button variant="outline" type="button" className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white">
 Cancel
 </Button>
 </Link>
 <Button type="submit" className="bg-flow-teal hover:bg-flow-teal/90 text-white shadow-[0_0_15px_rgba(31,182,166,0.3)]">
 Create Item
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}

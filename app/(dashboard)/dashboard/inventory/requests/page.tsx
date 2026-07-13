import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, Check, X, User as UserIcon, ArrowRightLeft, PackageMinus, PackagePlus, Undo2, type LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { approveTransaction, rejectTransaction } from "../actions";

function TypeBadge({ type }: { type: string }) {
 const styles: Record<string, { cls: string, icon: LucideIcon }> = {
 RESTOCK: { cls: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30", icon: PackagePlus },
 ISSUE: { cls: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30", icon: PackageMinus },
 BORROW: { cls: "bg-blue-500/10 text-blue-400 ring-blue-500/30", icon: ArrowRightLeft },
 RETURN: { cls: "bg-purple-500/10 text-purple-400 ring-purple-500/30", icon: Undo2 },
 };
 const config = styles[type] || { cls: "bg-white/5 text-text-muted ring-white/10", icon: PackageOpen };
 const Icon = config.icon;
 
 return (
 <Badge variant="outline" className={`${config.cls} ring-1 px-2 py-0.5`}>
 <Icon className="mr-1 h-3 w-3" />
 {type}
 </Badge>
 );
}

export default async function PendingRequestsPage() {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
 if (!project) throw new Error("Project not found");

 const clerkUser = await currentUser();
 if (!clerkUser) redirect("/dashboard/inventory");

 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
 if (!dbUser) redirect("/dashboard/inventory");

 const member = await prisma.projectMember.findUnique({
 where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
 });
 if (!member) redirect("/dashboard/inventory");

 const role = member.role;
 const canManage = role === "WAREHOUSE" || role === "ADMINISTRATOR";
 if (!canManage) redirect("/dashboard/inventory");

 const pendingRequests = await prisma.inventoryTransaction.findMany({
 where: { projectId: project.id, status: "PENDING" },
 include: {
 item: true,
 requestedBy: true
 },
 orderBy: { createdAt: "asc" }
 });

 return (
 <div className="flex h-full flex-col">
 <PageHeader
 title="Pending Inventory Requests"
 subtitle="Review and approve stock adjustments, issues, and borrow requests."
 >
 <Link href="/dashboard/inventory">
 <Button variant="outline" className="bg-white/5 ring-1 ring-white/10 hover:bg-white/10">
 Back to Inventory
 </Button>
 </Link>
 </PageHeader>

 <div className="p-6">
 {pendingRequests.length === 0 ? (
 <EmptyState
 title="No pending requests"
 description="You're all caught up! There are no inventory transactions awaiting approval."
 icon={PackageOpen}
 />
 ) : (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {pendingRequests.map((req) => (
 <div key={req.id} className="flex flex-col justify-between overflow-hidden rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
 <div>
 <div className="flex items-start justify-between mb-4">
 <TypeBadge type={req.type} />
 <span className="text-xs text-text-muted">
 {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
 </span>
 </div>
 
 <Link href={`/dashboard/inventory/${req.itemId}`} className="hover:underline">
 <h3 className="font-semibold text-text-primary text-lg">{req.item.name}</h3>
 </Link>
 <p className="text-sm text-text-muted mb-4">{req.item.category}</p>

 <div className="space-y-3 p-4 rounded-xl bg-black/20 ring-1 ring-white/5 mb-6">
 <div className="flex justify-between items-center">
 <span className="text-xs text-text-muted">Quantity Requested</span>
 <span className="font-bold text-text-primary">
 {req.quantity} <span className="text-xs font-normal text-text-muted">{req.item.unit}</span>
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-xs text-text-muted">Current Stock</span>
 <span className="font-medium text-text-primary">
 {req.item.quantityOnHand} <span className="text-xs text-text-muted">{req.item.unit}</span>
 </span>
 </div>
 <div className="flex justify-between items-center pt-2 border-t border-white/5">
 <span className="text-xs text-text-muted">Requester</span>
 <div className="flex items-center gap-1.5 text-xs text-text-primary">
 <UserIcon className="h-3 w-3 text-text-muted" />
 {req.requestedBy.name}
 </div>
 </div>
 {req.purpose && (
 <div className="pt-2 border-t border-white/5">
 <span className="text-xs text-text-muted block mb-1">Purpose</span>
 <p className="text-xs text-text-primary">{req.purpose}</p>
 </div>
 )}
 </div>
 </div>

 <div className="flex gap-2">
 <form action={async () => {
 "use server";
 await rejectTransaction(project.id, req.id);
 }} className="flex-1">
 <Button variant="outline" type="submit" className="w-full bg-signal-error/10 text-signal-error ring-1 ring-signal-error/30 hover:bg-signal-error/20 border-0">
 <X className="mr-1.5 h-4 w-4" /> Reject
 </Button>
 </form>
 
 <form action={async () => {
 "use server";
 await approveTransaction(project.id, req.id);
 }} className="flex-1">
 <Button type="submit" className="w-full bg-flow-teal hover:bg-flow-teal/90 text-white">
 <Check className="mr-1.5 h-4 w-4" /> Approve
 </Button>
 </form>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

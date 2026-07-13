import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Tag, ArrowRightLeft, PackageMinus, PackagePlus, Undo2, CheckCircle2, Clock, XCircle, AlertCircle, User as UserIcon, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { requestTransaction, approveTransaction, rejectTransaction, logReturn } from "../actions";
import { TransactionType } from "@prisma/client";

function StatusBadge({ status }: { status: string }) {
 if (status === "APPROVED") return <Badge variant="outline" className="bg-flow-teal/10 text-flow-teal ring-flow-teal/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
 if (status === "PENDING") return <Badge variant="outline" className="bg-signal-amber/10 text-signal-amber ring-signal-amber/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
 if (status === "REJECTED") return <Badge variant="outline" className="bg-signal-error/10 text-signal-error ring-signal-error/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
 if (status === "RETURNED") return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 ring-purple-500/30"><Undo2 className="w-3 h-3 mr-1" /> Returned</Badge>;
 return <Badge variant="outline">{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
 const styles: Record<string, { cls: string, icon: LucideIcon }> = {
 RESTOCK: { cls: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30", icon: PackagePlus },
 ISSUE: { cls: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30", icon: PackageMinus },
 BORROW: { cls: "bg-blue-500/10 text-blue-400 ring-blue-500/30", icon: ArrowRightLeft },
 RETURN: { cls: "bg-purple-500/10 text-purple-400 ring-purple-500/30", icon: Undo2 },
 };
 const config = styles[type] || { cls: "bg-white/5 text-text-muted ring-white/10", icon: Package };
 const Icon = config.icon;
 return (
 <Badge variant="outline" className={`${config.cls} ring-1 px-2 py-0.5`}>
 <Icon className="mr-1 h-3 w-3" />
 {type}
 </Badge>
 );
}

export default async function InventoryItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
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

 const item = await prisma.inventoryItem.findUnique({
 where: { id, projectId: project.id },
 include: {
 transactions: {
 orderBy: { createdAt: 'desc' },
 include: {
 requestedBy: true,
 approvedBy: true
 }
 }
 }
 });

 if (!item) redirect("/dashboard/inventory");

 const isManager = member.role === "WAREHOUSE" || member.role === "ADMINISTRATOR";
 const isLowStock = item.lowStockThreshold > 0 && item.quantityOnHand <= item.lowStockThreshold;

 return (
 <div className="flex h-full flex-col">
 <PageHeader
 title={item.name}
 subtitle={`Manage stock and view history for this ${item.category.toLowerCase()} item.`}
 >
 <Link href="/dashboard/inventory">
 <Button variant="outline" className="bg-white/5 ring-1 ring-white/10 hover:bg-white/10">
 Back to Inventory
 </Button>
 </Link>
 </PageHeader>

 <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column: Details & Request Form */}
 <div className="space-y-6 lg:col-span-1">
 {/* Current Stock Card */}
 <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 border border-white/[0.08]">
 <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Current Stock</h3>
 <div className="flex items-end gap-3">
 <span className={`text-5xl font-bold ${isLowStock ? 'text-signal-amber' : 'text-text-primary'}`}>
 {item.quantityOnHand}
 </span>
 <span className="text-lg text-text-muted mb-1 font-medium">{item.unit}</span>
 </div>
 
 {isLowStock && (
 <div className="mt-4 flex items-center gap-2 text-sm text-signal-amber bg-signal-amber/10 px-3 py-2 rounded-lg border border-signal-amber/20">
 <AlertCircle className="h-4 w-4 shrink-0" />
 <span>Low stock warning. Threshold: {item.lowStockThreshold} {item.unit}</span>
 </div>
 )}
 </div>

 {/* Details Card */}
 <div className="rounded-2xl bg-black/20 p-6 border border-white/[0.05] space-y-4">
 <div>
 <span className="text-xs text-text-muted block mb-1">Category</span>
 <span className="text-sm text-text-primary flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-text-muted" /> {item.category}</span>
 </div>
 <div>
 <span className="text-xs text-text-muted block mb-1">Location</span>
 <span className="text-sm text-text-primary flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-text-muted" /> {item.location || "Unassigned"}</span>
 </div>
 {item.vendor && (
 <div>
 <span className="text-xs text-text-muted block mb-1">Vendor</span>
 <span className="text-sm text-text-primary">{item.vendor}</span>
 </div>
 )}
 <div>
 <span className="text-xs text-text-muted block mb-1">QR Code Token</span>
 <span className="text-xs font-mono text-text-primary bg-white/5 px-2 py-1 rounded">{item.qrCodeToken}</span>
 </div>
 </div>

 {/* Request Form */}
 <div className="rounded-2xl bg-white/[0.03] p-6 border border-white/[0.08]">
 <h3 className="text-lg font-semibold text-text-primary mb-4">Request Item</h3>
 <form action={async (formData: FormData) => {
 "use server";
 const type = formData.get("type") as TransactionType;
 const quantity = parseFloat(formData.get("quantity") as string);
 const purpose = formData.get("purpose") as string;
 const dueDate = formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null;
 await requestTransaction(project.id, item.id, type, quantity, purpose, dueDate);
 }} className="space-y-4">
 
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-text-muted">Type *</label>
 <select name="type" required className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none">
 <option value="ISSUE">Issue (Permanent consumption)</option>
 <option value="BORROW">Borrow (Temporary use)</option>
 {isManager && <option value="RESTOCK">Restock (Add stock)</option>}
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-medium text-text-muted">Quantity ({item.unit}) *</label>
 <input type="number" name="quantity" step="0.01" min="0.01" required placeholder="0.00" className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal outline-none" />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-medium text-text-muted">Purpose</label>
 <input type="text" name="purpose" placeholder="e.g. For generator repair" className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal outline-none" />
 </div>

 <Button type="submit" className="w-full bg-flow-teal hover:bg-flow-teal/90 text-white mt-2">
 Submit Request
 </Button>
 </form>
 </div>
 </div>

 {/* Right Column: Transactions */}
 <div className="lg:col-span-2 space-y-6">
 <h2 className="text-xl font-semibold text-text-primary">Transaction History</h2>
 
 {item.transactions.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
 <Package className="mx-auto h-8 w-8 text-text-muted/50 mb-3" />
 <h3 className="text-sm font-medium text-text-primary">No transactions yet</h3>
 <p className="text-xs text-text-muted mt-1">Requests and stock adjustments will appear here.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {item.transactions.map((tx) => (
 <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-4 border border-white/5 hover:bg-white/[0.05] transition-colors">
 
 <div className="flex items-start gap-4">
 <div className="mt-1">
 <TypeBadge type={tx.type} />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold text-text-primary">
 {tx.type === 'RESTOCK' || tx.type === 'RETURN' ? '+' : '-'}{tx.quantity} <span className="text-xs font-normal text-text-muted">{item.unit}</span>
 </span>
 <StatusBadge status={tx.status} />
 </div>
 <div className="text-xs text-text-muted space-y-0.5">
 <div className="flex items-center gap-1.5">
 <Clock className="w-3 h-3" />
 {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
 </div>
 <div className="flex items-center gap-1.5">
 <UserIcon className="w-3 h-3" />
 Requested by {tx.requestedBy.name}
 </div>
 {tx.purpose && <p className="mt-1">&quot;{tx.purpose}&quot;</p>}
 </div>
 </div>
 </div>

 {/* Actions for Pending/Borrow */}
 <div className="flex flex-col gap-2 shrink-0 sm:items-end">
 {tx.status === "PENDING" && isManager && (
 <div className="flex gap-2">
 <form action={async () => {
 "use server";
 await rejectTransaction(project.id, tx.id);
 }}>
 <Button size="sm" variant="outline" className="h-8 text-xs bg-signal-error/10 text-signal-error border-0 hover:bg-signal-error/20">Reject</Button>
 </form>
 <form action={async () => {
 "use server";
 await approveTransaction(project.id, tx.id);
 }}>
 <Button size="sm" className="h-8 text-xs bg-flow-teal hover:bg-flow-teal/90 text-white">Approve</Button>
 </form>
 </div>
 )}

 {tx.type === "BORROW" && tx.status === "APPROVED" && (isManager || tx.requestedById === dbUser.id) && (
 <form action={async () => {
 "use server";
 await logReturn(project.id, tx.id);
 }}>
 <Button size="sm" variant="outline" className="h-8 text-xs bg-purple-500/10 text-purple-400 border-0 hover:bg-purple-500/20">
 <Undo2 className="w-3 h-3 mr-1" /> Log Return
 </Button>
 </form>
 )}
 </div>

 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

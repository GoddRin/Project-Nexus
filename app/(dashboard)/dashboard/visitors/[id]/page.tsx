import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { updateVisitorRemarks, logVisitorOut } from "../actions";
import { Clock, LogOut, CheckCircle, Shield } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function VisitorDetailPage({ params }: { params: { id: string } }) {
 const visitor = await prisma.visitor.findUnique({
 where: { id: params.id },
 include: {
 host: true,
 loggedBy: true,
 project: true,
 }
 });

 if (!visitor) {
 notFound();
 }

 const { member } = await getOrCreateUser(visitor.projectId);
 if (!member) return null;

 const canManage = member.role === "GUARD" || member.role === "ADMINISTRATOR";
 const canView = canManage || member.role === "PROJECT_MANAGER";

 if (!canView) {
 return (
 <div className="p-8">
 <EmptyState
 icon={Shield}
 title="Access Denied"
 description="You do not have permission to view visitor records."
 intent="warning"
 />
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto space-y-6">
 <div className="mb-4">
 <Link href="/dashboard/visitors" className="text-sm text-text-muted hover:text-white flex items-center gap-2">
 ← Back to Visitors
 </Link>
 </div>
 <PageHeader
 title="Visitor Details"
 subtitle={`Log details for ${visitor.fullName}`}
 >
 {canManage && visitor.status === "CHECKED_IN" && (
 <form action={logVisitorOut.bind(null, visitor.id)}>
 <Button type="submit" variant="outline" className="text-white border-white/20 hover:bg-white/5">
 <LogOut className="w-4 h-4 mr-2" />
 Check Out Visitor
 </Button>
 </form>
 )}
 </PageHeader>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-2 space-y-6">
 <div className="glass-card p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-white">Visitor Information</h3>
 {visitor.status === "CHECKED_IN" ? (
 <span className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full bg-flow-teal/20 text-flow-teal border border-flow-teal/30">
 Checked In
 </span>
 ) : (
 <span className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full bg-white/5 text-text-muted border border-white/10">
 Checked Out
 </span>
 )}
 </div>
 
 <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
 <div>
 <dt className="text-sm font-medium text-text-muted">Full Name</dt>
 <dd className="mt-1 text-sm text-white">{visitor.fullName}</dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-text-muted">Organization</dt>
 <dd className="mt-1 text-sm text-white">{visitor.organization || "-"}</dd>
 </div>
 <div className="sm:col-span-2">
 <dt className="text-sm font-medium text-text-muted">Purpose of Visit</dt>
 <dd className="mt-1 text-sm text-white">{visitor.purpose}</dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-text-muted">ID Type & Number</dt>
 <dd className="mt-1 text-sm text-white">
 {visitor.idType ? `${visitor.idType} ${visitor.idNumber ? `(${visitor.idNumber})` : ""}` : "-"}
 </dd>
 </div>
 <div>
 <dt className="text-sm font-medium text-text-muted">Vehicle</dt>
 <dd className="mt-1 text-sm text-white">{visitor.vehicle || "-"}</dd>
 </div>
 </dl>
 </div>

 <div className="glass-card p-6">
 <h3 className="text-lg font-semibold text-white mb-4">Remarks</h3>
 {canManage ? (
 <form action={async (formData) => {
 "use server";
 await updateVisitorRemarks(visitor.id, formData.get("remarks") as string);
 }} className="space-y-4">
 <textarea
 name="remarks"
 defaultValue={visitor.remarks || ""}
 className="w-full h-32 rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 placeholder="Add notes about this visitor..."
 />
 <div className="flex justify-end">
 <Button type="submit" size="sm" variant="outline" className="border-white/10 bg-white/5">
 Save Remarks
 </Button>
 </div>
 </form>
 ) : (
 <p className="text-sm text-text-muted whitespace-pre-wrap">{visitor.remarks || "No remarks."}</p>
 )}
 </div>
 </div>

 <div className="space-y-6">
 <div className="glass-card p-6">
 <h3 className="text-lg font-semibold text-white mb-4">Log Details</h3>
 <div className="space-y-6">
 <div className="flex items-start gap-3">
 <div className="mt-0.5 p-1.5 rounded-md bg-flow-teal/10 text-flow-teal">
 <Clock className="w-4 h-4" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted">Time In</p>
 <p className="text-sm text-white">{format(visitor.timeIn, "MMM d, yyyy h:mm a")}</p>
 </div>
 </div>
 
 <div className="flex items-start gap-3">
 <div className="mt-0.5 p-1.5 rounded-md bg-white/5 text-text-muted">
 {visitor.timeOut ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted">Time Out</p>
 <p className="text-sm text-white">
 {visitor.timeOut ? format(visitor.timeOut, "MMM d, yyyy h:mm a") : "Currently on site"}
 </p>
 </div>
 </div>

 <div className="pt-4 border-t border-white/5">
 <p className="text-xs font-medium text-text-muted mb-1">Host</p>
 <p className="text-sm text-white">{visitor.host.name}</p>
 </div>

 <div className="pt-4 border-t border-white/5">
 <p className="text-xs font-medium text-text-muted mb-1">Logged By</p>
 <p className="text-sm text-white">{visitor.loggedBy.name}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

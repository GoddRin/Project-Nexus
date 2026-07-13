
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { Shield, LogOut, Clock } from "lucide-react";
import { logVisitorOut } from "./actions";

interface VisitorsPageProps {
 searchParams: { search?: string };
}

export default async function VisitorsPage({ searchParams }: VisitorsPageProps) {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) return null;

 const { member } = await getOrCreateUser(project.id);
 if (!member) return null;

 // Check read permissions
 const canManage = member.role === "GUARD" || member.role === "ADMINISTRATOR";
 const canView = canManage || member.role === "PROJECT_MANAGER";

 if (!canView) {
 return (
 <div className="p-8">
 <EmptyState
 icon={Shield}
 title="Access Denied"
 description="You do not have permission to view visitor logs."
 intent="warning"
 />
 </div>
 );
 }

 const search = searchParams.search || "";

 // Fetch checked in visitors
 const activeVisitors = await prisma.visitor.findMany({
 where: {
 projectId: project.id,
 status: "CHECKED_IN",
 ...(search && {
 OR: [
 { fullName: { contains: search, mode: "insensitive" } },
 { organization: { contains: search, mode: "insensitive" } },
 ]
 })
 },
 include: { host: true },
 orderBy: { timeIn: "desc" }
 });

 // Fetch history
 const historyVisitors = await prisma.visitor.findMany({
 where: {
 projectId: project.id,
 status: "CHECKED_OUT",
 ...(search && {
 OR: [
 { fullName: { contains: search, mode: "insensitive" } },
 { organization: { contains: search, mode: "insensitive" } },
 ]
 })
 },
 include: { host: true },
 orderBy: { timeOut: "desc" },
 take: 50 // Limit history for performance
 });

 return (
 <div className="space-y-6">
 <PageHeader
 title="Visitor Management"
 subtitle="Track site access, host information, and visitor status"
 >
 {canManage && (
 <Link href="/dashboard/visitors/new">
 <Button className="bg-flow-teal hover:bg-flow-teal/90 text-white">
 Log New Visitor
 </Button>
 </Link>
 )}
 </PageHeader>

 <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-xl border border-white/[0.05]">
 <SearchInput placeholder="Search visitors by name or organization..." />
 </div>

 <div className="space-y-4">
 <h2 className="text-lg font-semibold flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-flow-teal animate-pulse" />
 Currently On Site ({activeVisitors.length})
 </h2>
 
 {activeVisitors.length === 0 ? (
 <div className="glass-card p-8 text-center text-text-muted">
 No active visitors on site matching your search.
 </div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
 {activeVisitors.map(visitor => (
 <div key={visitor.id} className="glass-card p-5 border-l-2 border-l-flow-teal flex flex-col justify-between">
 <div>
 <div className="flex justify-between items-start mb-2">
 <Link href={`/dashboard/visitors/${visitor.id}`} className="hover:underline font-medium text-white">
 {visitor.fullName}
 </Link>
 <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-flow-teal/10 text-flow-teal rounded-full font-bold">
 Checked In
 </span>
 </div>
 {visitor.organization && (
 <p className="text-sm text-text-muted mb-3">{visitor.organization}</p>
 )}
 <div className="text-xs text-text-muted space-y-1 mb-4">
 <p><strong>Purpose:</strong> {visitor.purpose}</p>
 <p><strong>Host:</strong> {visitor.host.name}</p>
 <p><strong>Time In:</strong> {format(visitor.timeIn, "MMM d, yyyy h:mm a")}</p>
 </div>
 </div>
 
 {canManage && (
 <form action={logVisitorOut.bind(null, visitor.id)}>
 <Button type="submit" variant="outline" size="sm" className="w-full text-xs">
 <LogOut className="w-3 h-3 mr-2" />
 Check Out
 </Button>
 </form>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="space-y-4 mt-8">
 <h2 className="text-lg font-semibold text-text-muted flex items-center gap-2">
 <Clock className="w-5 h-5" />
 Visitor History
 </h2>
 
 {historyVisitors.length === 0 ? (
 <div className="glass-card p-8 text-center text-text-muted">
 No historical visitors matching your search.
 </div>
 ) : (
 <div className="glass-card overflow-hidden">
 <table className="w-full text-sm text-left">
 <thead className="text-xs uppercase bg-white/[0.02] border-b border-white/[0.05] text-text-muted">
 <tr>
 <th className="px-6 py-4 font-medium">Visitor</th>
 <th className="px-6 py-4 font-medium">Organization</th>
 <th className="px-6 py-4 font-medium">Host</th>
 <th className="px-6 py-4 font-medium">Time In</th>
 <th className="px-6 py-4 font-medium">Time Out</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/[0.05]">
 {historyVisitors.map(visitor => (
 <tr key={visitor.id} className="hover:bg-white/[0.02] transition-colors">
 <td className="px-6 py-4">
 <Link href={`/dashboard/visitors/${visitor.id}`} className="font-medium hover:text-white transition-colors">
 {visitor.fullName}
 </Link>
 </td>
 <td className="px-6 py-4 text-text-muted">{visitor.organization || "-"}</td>
 <td className="px-6 py-4 text-text-muted">{visitor.host.name}</td>
 <td className="px-6 py-4 text-text-muted">{format(visitor.timeIn, "MMM d, h:mm a")}</td>
 <td className="px-6 py-4 text-text-muted">
 {visitor.timeOut ? format(visitor.timeOut, "MMM d, h:mm a") : "-"}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}

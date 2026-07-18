import { getCachedProject, getCachedTickets } from "@/lib/db/cachedQueries";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Ticket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const revalidate = 60;


function StatusBadge({ status }: { status: TicketStatus }) {
 const styles: Record<TicketStatus, string> = {
 OPEN: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 hover:bg-flow-teal/20 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 IN_PROGRESS: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 hover:bg-signal-amber/20 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 RESOLVED: "bg-white/5 text-text-muted ring-1 ring-white/10 hover:bg-white/10 ",
 CLOSED: "bg-transparent text-text-muted border border-white/5 hover:bg-white/5",
 };
 return <Badge variant="outline" className={styles[status]}>{status.replace("_", " ")}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
 const styles: Record<TicketPriority, string> = {
 LOW: "text-text-muted border border-white/5 bg-white/[0.02]",
 MEDIUM: "text-text-primary border border-white/10 bg-white/5",
 HIGH: "text-signal-amber ring-1 ring-signal-amber/30 bg-signal-amber/10 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 URGENT: "text-signal-red ring-1 ring-signal-red/30 bg-signal-red/10 shadow-[0_0_10px_rgba(214,72,63,0.15),inset_0_1px_0_0_rgba(214,72,63,0.2)]",
 };
 return <Badge variant="outline" className={styles[priority]}>{priority}</Badge>;
}

// Next.js 15+ searchParams are a Promise
export default async function TicketsPage({
 searchParams,
}: {
 searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
 const params = await searchParams;
 const statusFilter = params.status as TicketStatus | undefined;

 const project = await getCachedProject("tumauini-hepp");
 const allTickets = project ? await getCachedTickets(project.id) : [];

  // Filter in-memory — no extra DB round-trip per status change
  const filtered = statusFilter
  ? allTickets.filter((t) => t.status === statusFilter)
  : allTickets;

  // Sort order:
  //  1. Open statuses first (OPEN, IN_PROGRESS) — closed (RESOLVED, CLOSED) at bottom
  //  2. Within each group: URGENT → HIGH → MEDIUM → LOW
  //  3. Within same priority: oldest createdAt first (first reporter = top of list)
  const STATUS_ORDER: Record<string, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3,
  };
  const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  };

  const tickets = [...filtered].sort((a, b) => {
  const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  if (statusDiff !== 0) return statusDiff;
  const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  if (priorityDiff !== 0) return priorityDiff;
  // Same status + priority → oldest first (first reporter wins)
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

 return (
 <div className="relative">
 <PageHeader
 title="IT Helpdesk"
 subtitle="Manage and track site operations tickets."
 >
 <Link href="/dashboard/tickets/new">
 <Button>Create Ticket</Button>
 </Link>
 </PageHeader>

 <div className="mb-8 flex items-center overflow-x-auto">
 <div className="inline-flex items-center gap-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.02] p-1 ring-1 ring-black/[0.05] dark:ring-white/[0.05] ">
 <Link
 href="/dashboard/tickets"
 className={cn(
 "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
 !statusFilter
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/10"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.02] hover:text-text-primary"
 )}
 >
 All
 </Link>
 {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
 <Link
 key={status}
 href={`/dashboard/tickets?status=${status}`}
 className={cn(
 "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
 statusFilter === status
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/10"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.02] hover:text-text-primary"
 )}
 >
 {status.replace("_", " ")}
 </Link>
 ))}
 </div>
 </div>

 {tickets.length === 0 ? (
 <EmptyState
 icon={Ticket}
 title={statusFilter ? `No ${statusFilter.replace("_", " ")} tickets` : "No tickets yet"}
 description="There are currently no IT support tickets matching this view."
 />
 ) : (
 <div className="overflow-hidden rounded-xl border border-white/5 bg-bg-panel/40 shadow-lg">
 <div className="divide-y divide-white/5">
 {tickets.map((ticket) => (
 <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block">
 <div className="flex flex-col gap-4 p-5 transition-colors duration-200 hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
 <div className="space-y-1.5">
 <h3 className="font-display text-base font-medium tracking-wide text-text-primary transition-colors group-hover:text-flow-teal">
 {ticket.title}
 </h3>
 <div className="flex items-center gap-3 text-xs text-text-muted font-mono tracking-tight">
 <span className="bg-white/5 px-1.5 py-0.5 rounded text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-white/10">
 #{ticket.id.slice(-6).toUpperCase()}
 </span>
 <span className="opacity-50">•</span>
 <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
 <span className="opacity-50">•</span>
 <span className="flex items-center gap-1.5">
 <div className="h-4 w-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-sans font-bold text-white shadow-sm ring-1 ring-white/10">
 {ticket.createdBy.name.charAt(0)}
 </div>
 {ticket.createdBy.name}
 </span>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2 md:gap-3">
 <PriorityBadge priority={ticket.priority} />
 <StatusBadge status={ticket.status} />
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}

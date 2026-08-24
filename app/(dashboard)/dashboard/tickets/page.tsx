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
    OPEN: "bg-scic-blue/10 text-scic-blue dark:bg-scic-cyan/10 dark:text-scic-cyan border border-scic-blue/30 dark:border-scic-cyan/30",
    IN_PROGRESS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    RESOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    CLOSED: "bg-black/[0.02] dark:bg-white/5 text-text-muted border border-border-hairline",
  };
  return <Badge variant="outline" className={cn("font-mono text-[10px] font-bold uppercase", styles[status])}>{status.replace("_", " ")}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    LOW: "text-text-muted border border-border-hairline bg-black/[0.02] dark:bg-white/[0.02]",
    MEDIUM: "text-text-primary border border-border-hairline bg-black/[0.04] dark:bg-white/5 font-semibold",
    HIGH: "text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 font-bold",
    URGENT: "text-red-600 dark:text-red-400 border border-red-500/30 bg-red-500/10 font-bold shadow-sm",
  };
  return <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", styles[priority])}>{priority}</Badge>;
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
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="IT & Site Facilities Helpdesk"
        subtitle="Manage and track site operations tickets, machinery breakdowns, and support issues."
      >
        <Link href="/dashboard/tickets/new">
          <Button className="bg-scic-blue hover:bg-scic-blue/90 dark:bg-scic-cyan dark:hover:bg-scic-cyan/90 text-white dark:text-slate-950 font-bold">
            Create Ticket
          </Button>
        </Link>
      </PageHeader>

      <div className="flex items-center overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] p-1 border border-border-hairline">
          <Link
            href="/dashboard/tickets"
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
              !statusFilter
                ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            All
          </Link>
          {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
            <Link
              key={status}
              href={`/dashboard/tickets?status=${status}`}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                statusFilter === status
                  ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                  : "text-text-muted hover:text-text-primary"
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
          actionLabel="Create Ticket"
          actionHref="/dashboard/tickets/new"
          intent="primary"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl glass-scic-card">
          <div className="divide-y divide-border-hairline">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="block group">
                <div className="flex flex-col gap-4 p-5 transition-all duration-150 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold tracking-wide text-text-primary transition-colors group-hover:text-scic-blue dark:group-hover:text-scic-cyan">
                      {ticket.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted font-mono tracking-tight">
                      <span className="bg-black/[0.04] dark:bg-white/5 px-2 py-0.5 rounded text-text-primary border border-border-hairline font-bold">
                        #{ticket.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="opacity-50">•</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <span className="opacity-50">•</span>
                      <span className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded-full bg-scic-blue/20 dark:bg-scic-cyan/20 flex items-center justify-center text-[8px] font-sans font-bold text-scic-blue dark:text-scic-cyan">
                          {ticket.createdBy.name.charAt(0)}
                        </div>
                        {ticket.createdBy.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
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

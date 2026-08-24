import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, User as UserIcon, MapPin, Tag, Archive, CheckCircle2, Wrench, Table } from "lucide-react";
import { AssetStatus, Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: AssetStatus }) {
  const styles: Record<AssetStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    IN_MAINTENANCE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    RETIRED: "bg-black/[0.02] dark:bg-white/5 text-text-muted border border-border-hairline",
  };
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] font-bold uppercase", styles[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

interface PageProps {
  searchParams: Promise<{
    category?: string;
    status?: string;
  }>;
}

export default async function AssetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filterCategory = params.category || "all";
  const filterStatus = params.status || "all";

  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const clerkUser = await currentUser();
  let role = "GUEST";
  if (clerkUser) {
    const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (dbUser) {
      const member = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
      });
      if (member) {
        role = member.role;
      }
    }
  }

  const isEditor = role === "WAREHOUSE" || role === "IT_SUPPORT" || role === "ADMINISTRATOR";

  // Fetch unique categories for the filter panel
  const allAssetsForCats = await prisma.asset.findMany({
    where: { projectId: project.id },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = allAssetsForCats.map((a) => a.category);

  // Build prisma query filters
  const whereClause: Prisma.AssetWhereInput = {
    projectId: project.id,
  };

  if (filterCategory !== "all") {
    whereClause.category = filterCategory;
  }
  if (filterStatus !== "all") {
    whereClause.status = filterStatus as AssetStatus;
  }

  // Aggregate counts across all assets (ignoring current filters)
  const statusCounts = await prisma.asset.groupBy({
    by: ["status"],
    where: { projectId: project.id },
    _count: { _all: true },
  });

  const countByStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r._count._all])
  ) as Record<string, number>;

  const totalAssets = statusCounts.reduce((sum, r) => sum + r._count._all, 0);
  const activeCount = countByStatus["ACTIVE"] ?? 0;
  const inMaintenanceCount = countByStatus["IN_MAINTENANCE"] ?? 0;
  const retiredCount = countByStatus["RETIRED"] ?? 0;

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Heavy Equipment & Plant Asset Registry"
        subtitle="Manage site machinery, earthmoving equipment, turbine components, and IT hardware."
      >
        {isEditor && (
          <div className="flex gap-2">
            <Link href="/dashboard/assets/excel-view">
              <Button variant="outline" className="gap-2 border-border-hairline text-xs font-semibold">
                <Table className="h-4 w-4" />
                Excel View
              </Button>
            </Link>
            <Link href="/dashboard/assets/new">
              <Button className="bg-scic-blue hover:bg-scic-blue/90 dark:bg-scic-cyan dark:hover:bg-scic-cyan/90 text-white dark:text-slate-950 font-bold text-xs">
                Register Asset
              </Button>
            </Link>
          </div>
        )}
      </PageHeader>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total */}
        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-blue">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20">
            <Archive className="h-5 w-5 text-scic-blue dark:text-scic-cyan" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-text-primary">{totalAssets}</p>
            <p className="mt-1 text-[10px] font-mono uppercase font-bold tracking-wider text-text-muted">Total Assets</p>
          </div>
        </div>

        {/* Active */}
        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-green">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            <p className="mt-1 text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Active & Operational</p>
          </div>
        </div>

        {/* In Maintenance */}
        <div className="glass-scic-card p-4 flex items-center gap-3.5 scic-card-accent-amber">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-amber-600 dark:text-amber-400">{inMaintenanceCount}</p>
            <p className="mt-1 text-[10px] font-mono uppercase font-bold tracking-wider text-amber-600/80 dark:text-amber-400/80">Under Maintenance</p>
          </div>
        </div>

        {/* Retired */}
        <div className="glass-scic-card p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-border-hairline">
            <Package className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-text-muted">{retiredCount}</p>
            <p className="mt-1 text-[10px] font-mono uppercase font-bold tracking-wider text-text-muted">Decommissioned</p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="flex flex-col gap-4 rounded-2xl glass-scic-card p-4 md:flex-row md:items-center md:justify-between">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Link href={`?category=all&status=${filterStatus}`}>
            <span
              className={cn(
                "inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                filterCategory === "all"
                  ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              All Categories
            </span>
          </Link>
          {categories.map((cat) => (
            <Link key={cat} href={`?category=${encodeURIComponent(cat)}&status=${filterStatus}`}>
              <span
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                  filterCategory === cat
                    ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {cat}
              </span>
            </Link>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] p-1 border border-border-hairline">
          {["all", "ACTIVE", "IN_MAINTENANCE", "RETIRED"].map((status) => (
            <Link
              key={status}
              href={`?category=${encodeURIComponent(filterCategory)}&status=${status}`}
            >
              <span
                className={cn(
                  "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150",
                  filterStatus === status
                    ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {status === "all" ? "All Status" : status.replace("_", " ")}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Asset List Content */}
      {assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description={
            filterCategory !== "all" || filterStatus !== "all"
              ? "Try clearing your filters to see registered assets."
              : "Register plant equipment, tools, and hardware to begin tracking."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl glass-scic-card">
          <div className="divide-y divide-border-hairline">
            {assets.map((asset) => (
              <Link
                key={asset.id}
                href={`/dashboard/assets/${asset.id}`}
                className="group flex flex-col justify-between gap-4 p-5 transition-all duration-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-base font-bold text-text-primary transition-colors group-hover:text-scic-blue dark:group-hover:text-scic-cyan">
                      {asset.name}
                    </span>
                    <StatusBadge status={asset.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-scic-blue dark:text-scic-cyan" />
                      <span>{asset.category}</span>
                    </div>
                    {asset.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{asset.location}</span>
                      </div>
                    )}
                    {asset.serialNumber && (
                      <div className="font-mono text-[10px] bg-black/[0.04] dark:bg-white/5 px-1.5 py-0.5 rounded border border-border-hairline">
                        S/N: {asset.serialNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
                  {(asset.assignedTo || asset.assignedToName) ? (
                    <div className="flex items-center gap-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-1.5 border border-border-hairline">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-scic-blue/10 dark:bg-scic-cyan/10 text-[10px] font-bold text-scic-blue dark:text-scic-cyan">
                        {(asset.assignedTo?.name || asset.assignedToName || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-text-primary">
                        {asset.assignedTo?.name || asset.assignedToName}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                      <UserIcon className="h-3.5 w-3.5" />
                      <span>Unassigned</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

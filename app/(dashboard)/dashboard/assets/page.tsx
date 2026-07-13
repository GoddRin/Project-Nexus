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
 ACTIVE: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 IN_MAINTENANCE: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 RETIRED: "bg-white/5 text-text-muted ring-1 ring-white/10 ",
 };
 return (
 <Badge variant="outline" className={styles[status]}>
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
 title="Asset Registry"
 subtitle="Manage site equipment, components, and hardware."
 >
 {isEditor && (
 <div className="flex gap-2">
 <Link href="/dashboard/assets/excel-view">
 <Button variant="outline" className="gap-2">
 <Table className="h-4 w-4" />
 Excel View
 </Button>
 </Link>
 <Link href="/dashboard/assets/new">
 <Button>Register Asset</Button>
 </Link>
 </div>
 )}
 </PageHeader>

 {/* Stats Strip */}
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 {/* Total */}
 <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
 <Archive className="h-4 w-4 text-text-muted" />
 </div>
 <div>
 <p className="font-mono text-2xl font-semibold leading-none text-text-primary">{totalAssets}</p>
 <p className="mt-0.5 text-[11px] uppercase tracking-wider text-text-muted">Total Assets</p>
 </div>
 </div>

 {/* Active */}
 <div className="flex items-center gap-3 rounded-xl bg-flow-teal/[0.06] p-4 ring-1 ring-flow-teal/20">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-flow-teal/10">
 <CheckCircle2 className="h-4 w-4 text-flow-teal" />
 </div>
 <div>
 <p className="font-mono text-2xl font-semibold leading-none text-flow-teal">{activeCount}</p>
 <p className="mt-0.5 text-[11px] uppercase tracking-wider text-flow-teal/70">Active</p>
 </div>
 </div>

 {/* In Maintenance */}
 <div className="flex items-center gap-3 rounded-xl bg-signal-amber/[0.06] p-4 ring-1 ring-signal-amber/20">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-amber/10">
 <Wrench className="h-4 w-4 text-signal-amber" />
 </div>
 <div>
 <p className="font-mono text-2xl font-semibold leading-none text-signal-amber">{inMaintenanceCount}</p>
 <p className="mt-0.5 text-[11px] uppercase tracking-wider text-signal-amber/70">In Maintenance</p>
 </div>
 </div>

 {/* Retired */}
 <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
 <Package className="h-4 w-4 text-text-muted" />
 </div>
 <div>
 <p className="font-mono text-2xl font-semibold leading-none text-text-muted">{retiredCount}</p>
 <p className="mt-0.5 text-[11px] uppercase tracking-wider text-text-muted/60">Retired</p>
 </div>
 </div>
 </div>

 {/* Glass Filter Panel */}
 <div className="flex flex-col gap-4 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/5 md:flex-row md:items-center md:justify-between">
 {/* Category filters */}
 <div className="flex flex-wrap gap-2">
 <Link href={`?category=all&status=${filterStatus}`}>
 <span
 className={cn(
 "inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all duration-200",
 filterCategory === "all"
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/[0.08] dark:text-white dark:ring-white/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
 : "text-text-muted ring-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.03] hover:text-text-primary"
 )}
 >
 All Categories
 </span>
 </Link>
 {categories.map((cat) => (
 <Link key={cat} href={`?category=${encodeURIComponent(cat)}&status=${filterStatus}`}>
 <span
 className={cn(
 "inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all duration-200",
 filterCategory === cat
 ? "bg-white/[0.08] text-white ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
 : "text-text-muted ring-transparent hover:bg-white/[0.03] hover:text-text-primary"
 )}
 >
 {cat}
 </span>
 </Link>
 ))}
 </div>

 {/* Status filters */}
 <div className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] dark:bg-black/25 p-1 ring-1 ring-black/5 dark:ring-white/5">
 {["all", "ACTIVE", "IN_MAINTENANCE", "RETIRED"].map((status) => (
 <Link
 key={status}
 href={`?category=${encodeURIComponent(filterCategory)}&status=${status}`}
 >
 <span
 className={cn(
 "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200",
 filterStatus === status
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:bg-white/[0.08] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
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
 <div className="rounded-2xl bg-white/[0.02] p-12 ring-1 ring-white/5 ">
 <EmptyState
 icon={Package}
 title="No assets found"
 description={
 filterCategory !== "all" || filterStatus !== "all"
 ? "Try clearing your filters to see registered assets."
 : "Register plant equipment, tools, and hardware to begin tracking."
 }
 />
 </div>
 ) : (
 <div className="overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-white/5 shadow-lg">
 <div className="divide-y divide-white/[0.05]">
 {assets.map((asset) => (
 <Link
 key={asset.id}
 href={`/dashboard/assets/${asset.id}`}
 className="group flex flex-col justify-between gap-4 p-5 transition-all duration-300 hover:bg-white/[0.03] sm:flex-row sm:items-center"
 >
 <div className="space-y-1.5 min-w-0">
 <div className="flex items-center gap-2.5">
 <span className="font-display font-medium text-text-primary transition-colors duration-300 group-hover:text-flow-teal">
 {asset.name}
 </span>
 <StatusBadge status={asset.status} />
 </div>
 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
 <div className="flex items-center gap-1">
 <Tag className="h-3.5 w-3.5" />
 <span>{asset.category}</span>
 </div>
 {asset.location && (
 <div className="flex items-center gap-1">
 <MapPin className="h-3.5 w-3.5" />
 <span>{asset.location}</span>
 </div>
 )}
 {asset.serialNumber && (
 <div className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.03]">
 S/N: {asset.serialNumber}
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
 {(asset.assignedTo || asset.assignedToName) ? (
 <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 ring-1 ring-white/5">
 <div className="flex h-5 w-5 items-center justify-center rounded-full bg-flow-teal/10 text-[10px] font-semibold text-flow-teal">
 {(asset.assignedTo?.name || asset.assignedToName || "?").charAt(0).toUpperCase()}
 </div>
 <span className="text-xs text-text-primary">
 {asset.assignedTo?.name || asset.assignedToName}
 </span>
 </div>
 ) : (
 <div className="flex items-center gap-1.5 text-xs text-text-muted">
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

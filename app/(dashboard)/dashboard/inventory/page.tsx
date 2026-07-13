import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Search, AlertCircle, Plus } from "lucide-react";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

interface PageProps {
 searchParams: Promise<{
 category?: string;
 q?: string;
 }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
 const params = await searchParams;
 const filterCategory = params.category || "all";
 const searchQuery = params.q || "";

 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
 if (!project) throw new Error("Project not found");

 const clerkUser = await currentUser();
 const dbUser = clerkUser
 ? await prisma.user.findUnique({ where: { clerkId: clerkUser.id } })
 : null;
 
 const member = dbUser 
 ? await prisma.projectMember.findUnique({
 where: { userId_projectId: { userId: dbUser.id, projectId: project.id } }
 })
 : null;

 const canManage = member?.role === "WAREHOUSE" || member?.role === "ADMINISTRATOR";

 // Build where clause
 const where: Prisma.InventoryItemWhereInput = {
 projectId: project.id,
 };

 if (filterCategory !== "all") {
 where.category = filterCategory;
 }

 if (searchQuery) {
 where.name = {
 contains: searchQuery,
 mode: "insensitive",
 };
 }

 // Fetch unique categories for the filters
 const categoriesRaw = await prisma.inventoryItem.findMany({
 where: { projectId: project.id },
 select: { category: true },
 distinct: ["category"],
 });
 const categories = categoriesRaw.map(c => c.category).sort();

 // Fetch items
 const items = await prisma.inventoryItem.findMany({
 where,
 orderBy: { name: "asc" },
 });

 return (
 <div className="flex h-full flex-col">
 <PageHeader
 title="Inventory"
 subtitle="Manage stock, consumables, and transactions."
 >
 <div className="flex gap-3">
 {canManage && (
 <Link href="/dashboard/inventory/requests">
 <Button variant="outline" className="bg-white/5 ring-1 ring-white/10 hover:bg-white/10">
 <AlertCircle className="mr-2 h-4 w-4" />
 Pending Requests
 </Button>
 </Link>
 )}
 <Link href="/dashboard/inventory/new">
 <Button className="bg-flow-teal hover:bg-flow-teal/90 text-white">
 <Plus className="mr-2 h-4 w-4" />
 Add Item
 </Button>
 </Link>
 </div>
 </PageHeader>

 <div className="flex flex-col gap-6 p-6">
 {/* Filters & Search */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex flex-wrap gap-2">
 <Link href={`?category=all&q=${searchQuery}`}>
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
 <Link key={cat} href={`?category=${encodeURIComponent(cat)}&q=${searchQuery}`}>
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
 
 <div className="relative">
 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
 <form action="/dashboard/inventory" method="GET">
 <input type="hidden" name="category" value={filterCategory} />
 <input
 type="text"
 name="q"
 defaultValue={searchQuery}
 placeholder="Search items..."
 className="h-10 w-full rounded-xl bg-black/20 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-flow-teal/50 sm:w-64 transition-all"
 />
 </form>
 </div>
 </div>

 {/* Item List */}
 {items.length === 0 ? (
 <EmptyState
 title="No items found"
 description={
 searchQuery || filterCategory !== "all"
 ? "Try adjusting your filters or search query."
 : "Your inventory is currently empty."
 }
 icon={Package}
 actionLabel="Add First Item"
 actionHref="/dashboard/inventory/new"
 />
 ) : (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {items.map((item) => {
 const isLowStock = item.lowStockThreshold > 0 && item.quantityOnHand <= item.lowStockThreshold;

 return (
 <Link key={item.id} href={`/dashboard/inventory/${item.id}`}>
 <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:ring-white/20">
 <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
 
 <div className="relative">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
 <Package className="h-5 w-5 text-text-muted" />
 </div>
 <div>
 <h3 className="font-semibold text-text-primary line-clamp-1">{item.name}</h3>
 <p className="text-xs text-text-muted line-clamp-1">{item.category}</p>
 </div>
 </div>
 {isLowStock && (
 <Badge variant="outline" className="bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shrink-0 ml-2">
 <AlertCircle className="mr-1 h-3 w-3" />
 Low Stock
 </Badge>
 )}
 </div>

 <div className="grid grid-cols-2 gap-4 mt-4">
 <div className="flex flex-col">
 <span className="text-xs text-text-muted">Stock Level</span>
 <span className={cn("text-lg font-bold", isLowStock ? "text-signal-amber" : "text-text-primary")}>
 {item.quantityOnHand} <span className="text-sm font-normal text-text-muted">{item.unit}</span>
 </span>
 </div>
 <div className="flex flex-col justify-end">
 {item.location && (
 <div className="flex items-center gap-1.5 text-xs text-text-muted">
 <MapPin className="h-3.5 w-3.5 shrink-0" />
 <span className="line-clamp-1">{item.location}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}

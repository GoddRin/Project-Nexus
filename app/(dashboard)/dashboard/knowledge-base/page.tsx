import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { KbCategory, Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/shared/SearchInput";

function CategoryBadge({ category }: { category: KbCategory }) {
 const styles: Record<KbCategory, string> = {
 FAQ: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 TROUBLESHOOTING: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 MANUAL: "bg-white/5 text-text-primary ring-1 ring-white/10 ",
 POLICY: "bg-white/5 text-text-muted ring-1 ring-white/10 ",
 PROCEDURE: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 };
 return (
 <Badge variant="outline" className={styles[category]}>
 {category}
 </Badge>
 );
}

interface PageProps {
 searchParams: Promise<{
 category?: string;
 search?: string;
 }>;
}

export default async function KnowledgeBasePage({ searchParams }: PageProps) {
 const params = await searchParams;
 const filterCategory = params.category || "all";
 const filterSearch = params.search || "";

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

 const isEditor = role === "IT_SUPPORT" || role === "ADMINISTRATOR";

 // Build prisma query filters
 const whereClause: Prisma.KnowledgeArticleWhereInput = {
 projectId: project.id,
 published: true, // only show published to general list
 };

 if (filterCategory !== "all") {
 whereClause.category = filterCategory as KbCategory;
 }

 if (filterSearch) {
 whereClause.OR = [
 { title: { contains: filterSearch, mode: "insensitive" } },
 { body: { contains: filterSearch, mode: "insensitive" } },
 ];
 }

 const articles = await prisma.knowledgeArticle.findMany({
 where: whereClause,
 include: {
 author: true,
 },
 orderBy: { createdAt: "desc" },
 });

 return (
 <div className="relative space-y-6">
 <PageHeader
 title="Knowledge Base"
 subtitle="Operational procedures, FAQs, and reference manuals."
 >
 {isEditor && (
 <Link href="/dashboard/knowledge-base/new">
 <Button>Create Article</Button>
 </Link>
 )}
 </PageHeader>

 {/* Glass Filter & Search Panel */}
 <div className="flex flex-col gap-4 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/5 md:flex-row md:items-center md:justify-between">
 {/* Category Filters */}
 <div className="flex flex-wrap gap-2">
 <Link href={`?category=all&search=${encodeURIComponent(filterSearch)}`}>
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
 {Object.values(KbCategory).map((cat) => (
 <Link key={cat} href={`?category=${cat}&search=${encodeURIComponent(filterSearch)}`}>
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

 {/* Text Search Input Form */}
 <SearchInput placeholder="Search articles..." />
 </div>

 {/* Article List Content */}
 {articles.length === 0 ? (
 <div className="rounded-2xl bg-white/[0.02] p-12 ring-1 ring-white/5 ">
 <EmptyState
 icon={BookOpen}
 title="No articles found"
 description={
 filterCategory !== "all" || filterSearch
 ? "Try adjusting your filters or search terms."
 : "Operational manuals and FAQs will appear here once published."
 }
 />
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {articles.map((article) => (
 <Link
 key={article.id}
 href={`/dashboard/knowledge-base/${article.slug}`}
 className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-flow-teal/20"
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between gap-2">
 <CategoryBadge category={article.category} />
 <span className="text-[10px] font-mono text-text-muted">
 {new Date(article.createdAt).toLocaleDateString()}
 </span>
 </div>
 <h3 className="font-display text-base font-semibold text-text-primary group-hover:text-flow-teal transition-colors duration-300">
 {article.title}
 </h3>
 <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
 {article.body.replace(/[#*`_\[\]]/g, "")} {/* strip basic md for preview */}
 </p>
 </div>

 <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center gap-2">
 <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-[10px] font-semibold text-text-muted">
 {article.author.name.charAt(0).toUpperCase()}
 </div>
 <span className="text-[10px] text-text-muted font-medium">
 By {article.author.name}
 </span>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 );
}

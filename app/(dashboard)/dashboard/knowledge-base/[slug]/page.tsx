import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
 BookOpen,
 Calendar,
 User as UserIcon,
 ArrowLeft,
 EyeOff,
} from "lucide-react";
import { KbCategory } from "@prisma/client";
import { unpublishArticle } from "../actions";

export const dynamic = "force-dynamic";

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

interface MarkdownProps {
 children?: React.ReactNode;
}

interface CodeProps {
 inline?: boolean;
 children?: React.ReactNode;
}

// Custom Markdown renderers to match the visual dark theme and fonts
const markdownComponents = {
 h1: ({ children }: MarkdownProps) => (
 <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary mt-8 mb-4">
 {children}
 </h1>
 ),
 h2: ({ children }: MarkdownProps) => (
 <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary mt-6 mb-3 border-b border-white/5 pb-2">
 {children}
 </h2>
 ),
 h3: ({ children }: MarkdownProps) => (
 <h3 className="font-display text-lg font-medium tracking-tight text-text-primary mt-5 mb-2">
 {children}
 </h3>
 ),
 p: ({ children }: MarkdownProps) => (
 <p className="text-sm leading-relaxed text-text-primary/95 mb-4 font-normal">
 {children}
 </p>
 ),
 ul: ({ children }: MarkdownProps) => (
 <ul className="list-disc pl-6 space-y-1.5 mb-4 text-sm text-text-primary/90">
 {children}
 </ul>
 ),
 ol: ({ children }: MarkdownProps) => (
 <ol className="list-decimal pl-6 space-y-1.5 mb-4 text-sm text-text-primary/90">
 {children}
 </ol>
 ),
 li: ({ children }: MarkdownProps) => <li className="pl-1 leading-relaxed">{children}</li>,
 blockquote: ({ children }: MarkdownProps) => (
 <blockquote className="border-l-3 border-flow-teal bg-flow-teal/5 pl-4 py-2.5 pr-2 rounded-r-xl text-text-muted italic mb-4 text-sm leading-relaxed">
 {children}
 </blockquote>
 ),
 code: ({ inline, children, ...props }: CodeProps) => {
 return inline ? (
 <code className="font-mono text-xs bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-flow-teal font-medium" {...props}>
 {children}
 </code>
 ) : (
 <pre className="font-mono text-xs bg-black/45 border border-white/5 rounded-xl p-4 overflow-x-auto mb-4 leading-relaxed text-text-primary select-text">
 <code {...props}>{children}</code>
 </pre>
 );
 },
 table: ({ children }: MarkdownProps) => (
 <div className="overflow-x-auto w-full mb-6 rounded-xl border border-white/5 shadow-lg">
 <table className="w-full border-collapse text-sm text-left">{children}</table>
 </div>
 ),
 thead: ({ children }: MarkdownProps) => <thead className="bg-white/[0.03] border-b border-white/5">{children}</thead>,
 tbody: ({ children }: MarkdownProps) => <tbody className="divide-y divide-white/5">{children}</tbody>,
 tr: ({ children }: MarkdownProps) => <tr className="hover:bg-white/[0.01] transition-colors">{children}</tr>,
 th: ({ children }: MarkdownProps) => (
 <th className="px-4 py-3 font-semibold text-text-primary text-xs uppercase tracking-wider">
 {children}
 </th>
 ),
 td: ({ children }: MarkdownProps) => <td className="px-4 py-3 text-text-primary/80 font-normal">{children}</td>,
};

interface PageProps {
 params: Promise<{ slug: string }>;
}

export default async function ArticleDetailPage({ params }: PageProps) {
 const { slug } = await params;

 const article = await prisma.knowledgeArticle.findFirst({
 where: { slug },
 include: {
 author: true,
 project: true,
 },
 });

 if (!article || !article.published) {
 notFound();
 }

 // Get user permissions
 const clerkUser = await currentUser();
 let role = "GUEST";
 let isEditor = false;
 if (clerkUser) {
 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
 if (dbUser) {
 const member = await prisma.projectMember.findUnique({
 where: {
 userId_projectId: { userId: dbUser.id, projectId: article.projectId },
 },
 });
 if (member) {
 role = member.role;
 isEditor = role === "IT_SUPPORT" || role === "ADMINISTRATOR";
 }
 }
 }

 const handleUnpublish = async () => {
 "use server";
 await unpublishArticle(article.id);
 };

 return (
 <div className="space-y-6">
 {/* Page Header */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <Link href="/dashboard/knowledge-base">
 <Button variant="outline" className="gap-1.5">
 <ArrowLeft className="h-4 w-4" /> Back to Knowledge Base
 </Button>
 </Link>
 {isEditor && (
 <form action={handleUnpublish}>
 <Button type="submit" variant="destructive" className="gap-1.5">
 <EyeOff className="h-4 w-4" /> Unpublish Article
 </Button>
 </form>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Main Article Content */}
 <div className="lg:col-span-2 space-y-6">
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 border border-white/[0.08] shadow-xl">
 {/* Metadata bar */}
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.05] pb-4 mb-6">
 <CategoryBadge category={article.category} />
 <div className="flex items-center gap-1.5 text-xs text-text-muted">
 <Calendar className="h-3.5 w-3.5" />
 <span>Published {new Date(article.createdAt).toLocaleDateString()}</span>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-text-muted">
 <UserIcon className="h-3.5 w-3.5" />
 <span>By {article.author.name}</span>
 </div>
 </div>

 <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary mb-6">
 {article.title}
 </h1>

 {/* Markdown Body */}
 <div className="select-text">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
 {article.body}
 </ReactMarkdown>
 </div>
 </div>
 </div>

 {/* Side Panel Info */}
 <div className="space-y-6">
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary mb-4 flex items-center gap-2">
 <BookOpen className="h-4 w-4 text-flow-teal" /> Article Summary
 </h3>
 <div className="space-y-4 text-xs text-text-muted">
 <div>
 <span className="block uppercase tracking-wider font-semibold text-[10px] mb-1">Project Site</span>
 <span className="text-text-primary font-medium">{article.project.name}</span>
 </div>
 <div>
 <span className="block uppercase tracking-wider font-semibold text-[10px] mb-1">Slug Address</span>
 <span className="font-mono text-text-primary/70">{article.slug}</span>
 </div>
 <div>
 <span className="block uppercase tracking-wider font-semibold text-[10px] mb-1">Last Updated</span>
 <span className="text-text-primary font-medium">{new Date(article.updatedAt).toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

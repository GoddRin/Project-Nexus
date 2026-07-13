import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { KbCategory } from "@prisma/client";
import { createArticle } from "../actions";

export default async function NewArticlePage() {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
 if (!project) throw new Error("Project not found");

 // Authentication & permission verification at render time
 const clerkUser = await currentUser();
 if (!clerkUser) redirect("/dashboard/knowledge-base");

 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
 if (!dbUser) redirect("/dashboard/knowledge-base");

 const member = await prisma.projectMember.findUnique({
 where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
 });
 if (!member) redirect("/dashboard/knowledge-base");

 const role = member.role;
 const isEditor = role === "IT_SUPPORT" || role === "ADMINISTRATOR";
 if (!isEditor) redirect("/dashboard/knowledge-base");

 return (
 <div className="max-w-3xl mx-auto space-y-6">
 <PageHeader
 title="Publish Article"
 subtitle="Write a new policy, procedure, manual, or FAQ item."
 />

 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <form action={createArticle} className="space-y-5">
 <div className="space-y-4">
 {/* Title */}
 <div className="space-y-1.5">
 <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Article Title *
 </label>
 <input
 id="title"
 name="title"
 type="text"
 required
 placeholder="e.g. Standard Turbines Shutdown Procedure"
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 />
 </div>

 {/* Category */}
 <div className="space-y-1.5">
 <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Category *
 </label>
 <select
 id="category"
 name="category"
 required
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
 >
 <option value="">Select category...</option>
 {Object.values(KbCategory).map((cat) => (
 <option key={cat} value={cat}>
 {cat}
 </option>
 ))}
 </select>
 </div>

 {/* Markdown Body */}
 <div className="space-y-1.5">
 <div className="flex justify-between items-center">
 <label htmlFor="body" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Article Body (Markdown) *
 </label>
 <span className="text-[10px] text-text-muted/70">Supports rich tables, lists, and code blocks</span>
 </div>
 <textarea
 id="body"
 name="body"
 required
 rows={14}
 placeholder="Write body content using Markdown syntax... Use headers (###), lists (-), bold (**), or code blocks (```)."
 className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors font-mono text-xs leading-relaxed resize-y"
 />
 </div>
 </div>

 {/* Form Actions */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.05]">
 <Link href="/dashboard/knowledge-base">
 <Button type="button" variant="outline">
 Cancel
 </Button>
 </Link>
 <Button type="submit">
 Publish Article
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}

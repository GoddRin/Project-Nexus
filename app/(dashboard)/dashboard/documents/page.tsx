import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DocumentBrowserClient } from "./DocumentBrowserClient";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export const dynamic = "force-dynamic";

interface PageProps {
 searchParams: Promise<{
 folderId?: string;
 search?: string;
 }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
 const resolvedSearchParams = await searchParams;
 const folderId = resolvedSearchParams.folderId || null;
 const searchQuery = resolvedSearchParams.search || "";

 // Get project
 const project = await prisma.project.findFirst({
 where: { slug: "tumauini-hepp" },
 });
 if (!project) return notFound();

 // Get user & role via JIT provisioning helper
 let userRole = "GUEST";
 const { member } = await getOrCreateUser(project.id);
 if (member) {
 userRole = member.role;
 }

 const canManage =
 userRole === "ADMINISTRATOR" ||
 userRole === "IT_SUPPORT" ||
 userRole === "PROJECT_MANAGER";

 // Fetch all folders to construct breadcrumbs in memory
 const allFolders = await prisma.documentFolder.findMany({
 where: { projectId: project.id },
 orderBy: { createdAt: "asc" },
 });

 // Build breadcrumb path
 const breadcrumbs = [];
 let currId = folderId;
 while (currId) {
 const f = allFolders.find((folder) => folder.id === currId);
 if (!f) break;
 breadcrumbs.unshift(f);
 currId = f.parentId;
 }

 // Fetch subfolders of current folder
 const subfolders = await prisma.documentFolder.findMany({
 where: {
 projectId: project.id,
 parentId: folderId,
 },
 orderBy: { name: "asc" },
 });

 // Fetch documents of current folder (filtered by name search if provided)
 const documents = await prisma.document.findMany({
 where: {
 projectId: project.id,
 folderId: folderId,
 name: searchQuery
 ? { contains: searchQuery, mode: "insensitive" }
 : undefined,
 },
 include: {
 versions: {
 orderBy: { versionNum: "desc" },
 select: {
 id: true,
 versionNum: true,
 fileName: true,
 fileSizeKb: true,
 mimeType: true,
 },
 },
 },
 orderBy: { name: "asc" },
 });

 return (
 <div className="space-y-6">
 <PageHeader
 title="Document Center"
 subtitle="Drawings, permits, reports, and project files."
 />

 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl">
 <DocumentBrowserClient
 projectId={project.id}
 currentFolderId={folderId}
 breadcrumbs={breadcrumbs}
 folders={subfolders}
 documents={documents}
 canManage={canManage}
 />
 </div>
 </div>
 );
}

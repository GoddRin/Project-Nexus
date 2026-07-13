import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DocumentDetailClient } from "./DocumentDetailClient";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export const dynamic = "force-dynamic";

interface PageProps {
 params: Promise<{
 id: string;
 }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
 const resolvedParams = await params;
 const { id } = resolvedParams;

 const document = await prisma.document.findUnique({
 where: { id },
 include: {
 versions: {
 include: {
 uploadedBy: {
 select: { name: true },
 },
 },
 orderBy: { versionNum: "desc" },
 },
 project: true,
 },
 });

 if (!document) return notFound();

 // Get current user & role via JIT provisioning helper
 let userRole = "GUEST";
 const { member } = await getOrCreateUser(document.projectId);
 if (member) {
 userRole = member.role;
 }

 const canManage =
 userRole === "ADMINISTRATOR" ||
 userRole === "IT_SUPPORT" ||
 userRole === "PROJECT_MANAGER";

 // Build breadcrumb path
 const allFolders = await prisma.documentFolder.findMany({
 where: { projectId: document.projectId },
 orderBy: { createdAt: "asc" },
 });

 const breadcrumbs = [];
 let currId = document.folderId;
 while (currId) {
 const f = allFolders.find((folder) => folder.id === currId);
 if (!f) break;
 breadcrumbs.unshift(f);
 currId = f.parentId;
 }

 // Generate signed URL for the current/latest version
 let initialPreviewUrl: string | null = null;
 const latestVersion = document.versions[0];
 if (latestVersion) {
 try {
 const { data, error } = await supabaseAdmin.storage
 .from("documents")
 .createSignedUrl(latestVersion.storagePath, 60); // 60 seconds
 if (!error && data) {
 initialPreviewUrl = data.signedUrl;
 }
 } catch (err) {
 console.error("Failed to generate preview URL:", err);
 }
 }

 return (
 <div className="space-y-6">
 <PageHeader
 title="Document Details"
 subtitle="Manage versions, metadata, and view secure previews."
 />

 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl">
 <DocumentDetailClient
 projectId={document.projectId}
 document={{
 id: document.id,
 name: document.name,
 folderId: document.folderId,
 }}
 breadcrumbs={breadcrumbs}
 versions={document.versions}
 initialPreviewUrl={initialPreviewUrl}
 canManage={canManage}
 />
 </div>
 </div>
 );
}

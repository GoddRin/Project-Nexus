"use server";

import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { indexDocument } from "@/lib/rag/index";

/**
 * Helper to authenticate and get the caller's ProjectMember record.
 * Throws if unauthenticated or not a member of the project.
 */
async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) throw new Error("Unauthorized: No active session");
 return { dbUser, member };
}

/**
 * Helper to ensure the user has elevated roles for Document management operations
 */
function requireElevatedRole(role: string) {
 if (role !== "ADMINISTRATOR" && role !== "IT_SUPPORT" && role !== "PROJECT_MANAGER") {
 throw new Error("Forbidden: Requires ADMINISTRATOR, IT_SUPPORT, or PROJECT_MANAGER role");
 }
}

/**
 * Creates a new DocumentFolder
 */
export async function createFolder(projectId: string, name: string, parentId: string | null = null) {
 const { member } = await requireProjectMember(projectId);
 requireElevatedRole(member.role);

 if (!name.trim()) throw new Error("Folder name cannot be empty");

 const folder = await prisma.documentFolder.create({
 data: {
 projectId,
 name: name.trim(),
 parentId: parentId || null,
 },
 });

 revalidatePath("/dashboard/documents");
 return folder;
}

/**
 * Generates a short-lived signed URL for a specific document version
 */
export async function getSignedDownloadUrl(projectId: string, versionId: string) {
 // Enforce project membership for viewing/downloading
 await requireProjectMember(projectId);

 const version = await prisma.documentVersion.findUnique({
 where: { id: versionId },
 });
 if (!version) throw new Error("Version not found");

 const { data, error } = await supabaseAdmin.storage
 .from("documents")
 .createSignedUrl(version.storagePath, 60); // 60 seconds expiry

 if (error) {
 throw new Error(`Failed to generate download URL: ${error.message}`);
 }

 return data.signedUrl;
}

/**
 * Server action to upload a document (initial version)
 */
export async function uploadDocument(projectId: string, folderId: string | null, formData: FormData) {
 const { dbUser, member } = await requireProjectMember(projectId);
 requireElevatedRole(member.role);

 const file = formData.get("file") as File;
 if (!file) throw new Error("No file provided");
 if (file.size > 25 * 1024 * 1024) throw new Error("File size exceeds 25MB limit");

 const fileName = file.name;
 const mimeType = file.type || "application/octet-stream";
 const fileSizeKb = Math.round(file.size / 1024);

 // Create Document first to get its ID
 const document = await prisma.document.create({
 data: {
 projectId,
 folderId: folderId || null,
 name: fileName,
 createdById: dbUser.id,
 },
 });

 const versionId = crypto.randomUUID();
 const storagePath = `${projectId}/${document.id}/${versionId}-${fileName}`;

 // Upload to Supabase using admin client
 const arrayBuffer = await file.arrayBuffer();
 const buffer = Buffer.from(arrayBuffer);

 const { error } = await supabaseAdmin.storage
 .from("documents")
 .upload(storagePath, buffer, {
 contentType: mimeType,
 duplex: "half",
 });

 if (error) {
 // Rollback document creation
 await prisma.document.delete({ where: { id: document.id } });
 throw new Error(`Failed to upload to storage: ${error.message}`);
 }

 // Create DocumentVersion
 const version = await prisma.documentVersion.create({
 data: {
 id: versionId,
 documentId: document.id,
 versionNum: 1,
 storagePath,
 fileName,
 fileSizeKb,
 mimeType,
 uploadedById: dbUser.id,
 },
 });

 // Update currentVersionId
 await prisma.document.update({
 where: { id: document.id },
 data: { currentVersionId: version.id },
 });

 // Background RAG Indexing
 indexDocument(document.id, projectId).catch((err: unknown) =>
 console.error(`[RAG Auto-Index] Failed to index document ${document.id}:`, err)
 );

 revalidatePath("/dashboard/documents");
 return document;
}

/**
 * Server action to upload a new version of an existing document
 */
export async function uploadNewVersion(projectId: string, documentId: string, formData: FormData) {
 const { dbUser, member } = await requireProjectMember(projectId);
 requireElevatedRole(member.role);

 const file = formData.get("file") as File;
 if (!file) throw new Error("No file provided");
 if (file.size > 25 * 1024 * 1024) throw new Error("File size exceeds 25MB limit");

 const document = await prisma.document.findUnique({
 where: { id: documentId },
 include: { versions: true },
 });
 if (!document) throw new Error("Document not found");

 const latestVersionNum = Math.max(...document.versions.map((v) => v.versionNum), 0);
 const nextVersionNum = latestVersionNum + 1;

 const fileName = file.name;
 const mimeType = file.type || "application/octet-stream";
 const fileSizeKb = Math.round(file.size / 1024);

 const versionId = crypto.randomUUID();
 const storagePath = `${projectId}/${document.id}/${versionId}-${fileName}`;

 // Upload to Supabase
 const arrayBuffer = await file.arrayBuffer();
 const buffer = Buffer.from(arrayBuffer);

 const { error } = await supabaseAdmin.storage
 .from("documents")
 .upload(storagePath, buffer, {
 contentType: mimeType,
 duplex: "half",
 });

 if (error) {
 throw new Error(`Failed to upload new version: ${error.message}`);
 }

 const version = await prisma.documentVersion.create({
 data: {
 id: versionId,
 documentId,
 versionNum: nextVersionNum,
 storagePath,
 fileName,
 fileSizeKb,
 mimeType,
 uploadedById: dbUser.id,
 },
 });

 await prisma.document.update({
 where: { id: documentId },
 data: { currentVersionId: version.id },
 });

 // Background RAG Indexing
 indexDocument(documentId, projectId).catch((err: unknown) =>
 console.error(`[RAG Auto-Index] Failed to index document ${documentId}:`, err)
 );

 revalidatePath(`/dashboard/documents/${documentId}`);
 revalidatePath("/dashboard/documents");
 return version;
}

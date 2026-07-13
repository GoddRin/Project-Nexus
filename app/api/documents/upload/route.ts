import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { indexDocument } from "@/lib/rag/index";

export async function POST(request: NextRequest) {
 try {
 const formData = await request.formData();
 const projectId = formData.get("projectId") as string;
 const folderId = formData.get("folderId") as string | null;
 const documentId = formData.get("documentId") as string | null;
 const file = formData.get("file") as File;

 if (!projectId || !file) {
 return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
 }

 if (file.size > 25 * 1024 * 1024) {
 return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 400 });
 }

 // Resolve user and check/create membership via JIT provisioning
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
 }

 const allowedRoles = ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"];
 if (!allowedRoles.includes(member.role)) {
 return NextResponse.json({ error: "Forbidden: Elevated role required" }, { status: 403 });
 }

 const fileName = file.name;
 const mimeType = file.type || "application/octet-stream";
 const fileSizeKb = Math.round(file.size / 1024);

 let docId = documentId;
 let nextVersionNum = 1;

 if (docId) {
 const doc = await prisma.document.findUnique({
 where: { id: docId },
 include: { versions: true },
 });
 if (!doc) {
 return NextResponse.json({ error: "Document not found" }, { status: 404 });
 }
 const latestVersionNum = Math.max(...doc.versions.map((v) => v.versionNum), 0);
 nextVersionNum = latestVersionNum + 1;
 } else {
 const doc = await prisma.document.create({
 data: {
 projectId,
 folderId: folderId || null,
 name: fileName,
 createdById: dbUser.id,
 },
 });
 docId = doc.id;
 }

 const versionId = crypto.randomUUID();
 const storagePath = `${projectId}/${docId}/${versionId}-${fileName}`;

 const arrayBuffer = await file.arrayBuffer();
 const buffer = Buffer.from(arrayBuffer);

 const { error: storageError } = await supabaseAdmin.storage
 .from("documents")
 .upload(storagePath, buffer, {
 contentType: mimeType,
 duplex: "half",
 });

 if (storageError) {
 if (!documentId) {
 await prisma.document.delete({ where: { id: docId } });
 }
 return NextResponse.json({ error: storageError.message }, { status: 500 });
 }

 const version = await prisma.documentVersion.create({
 data: {
 id: versionId,
 documentId: docId,
 versionNum: nextVersionNum,
 storagePath,
 fileName,
 fileSizeKb,
 mimeType,
 uploadedById: dbUser.id,
 },
 });

 await prisma.document.update({
 where: { id: docId },
 data: { currentVersionId: version.id },
 });

 // Trigger background indexing for RAG
 indexDocument(docId, projectId).catch((err: unknown) =>
 console.error(`[RAG Auto-Index] Failed to index document ${docId}:`, err)
 );

 return NextResponse.json({ success: true, documentId: docId, versionId });
 } catch (error) {
 console.error("Upload error:", error);
 const message = error instanceof Error ? error.message : "Internal server error";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

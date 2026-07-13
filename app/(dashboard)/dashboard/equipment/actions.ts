"use server";

import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { EquipmentCategory, EquipmentStatus, EquipmentCondition } from "@prisma/client";
import { indexEquipmentSpec } from "@/lib/rag/index";

/**
 * Helper to authenticate and verify project membership.
 */
async function requireProjectMember(projectId: string) {
  const { dbUser, member } = await getOrCreateUser(projectId);
  if (!dbUser || !member) throw new Error("Unauthorized: No active session");
  return { dbUser, member };
}

/**
 * Helper to enforce role constraints.
 */
function requireAllowedRoles(role: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(role)) {
    throw new Error(`Forbidden: Requires one of these roles: ${allowedRoles.join(", ")}`);
  }
}

interface EquipmentInput {
  equipmentTag: string;
  name: string;
  category: EquipmentCategory;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string | null;
  commissionDate?: string | null;
  location?: string;
  siteLocationId?: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  specifications: Record<string, string>;
}

export async function createEquipment(projectId: string, data: EquipmentInput) {
  const { dbUser, member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"]);

  const equipment = await prisma.plantEquipment.create({
    data: {
      projectId,
      equipmentTag: data.equipmentTag,
      name: data.name,
      category: data.category,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      installationDate: data.installationDate ? new Date(data.installationDate) : null,
      commissionDate: data.commissionDate ? new Date(data.commissionDate) : null,
      location: data.location || null,
      siteLocationId: data.siteLocationId || null,
      status: data.status,
      condition: data.condition,
      specifications: data.specifications,
      createdById: dbUser.id,
    },
  });

  // Background RAG Indexing
  indexEquipmentSpec(equipment.id, projectId).catch((err: unknown) =>
    console.error(`[RAG Auto-Index] Failed to index equipment ${equipment.id}:`, err)
  );

  revalidatePath(`/dashboard/equipment`);
  return equipment;
}

export async function updateEquipment(projectId: string, id: string, data: EquipmentInput) {
  const { member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"]);

  const equipment = await prisma.plantEquipment.update({
    where: { id },
    data: {
      equipmentTag: data.equipmentTag,
      name: data.name,
      category: data.category,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      installationDate: data.installationDate ? new Date(data.installationDate) : null,
      commissionDate: data.commissionDate ? new Date(data.commissionDate) : null,
      location: data.location || null,
      siteLocationId: data.siteLocationId || null,
      status: data.status,
      condition: data.condition,
      specifications: data.specifications,
    },
  });

  // Background RAG Indexing
  indexEquipmentSpec(id, projectId).catch((err: unknown) =>
    console.error(`[RAG Auto-Index] Failed to index equipment ${id}:`, err)
  );

  revalidatePath(`/dashboard/equipment`);
  revalidatePath(`/dashboard/equipment/${id}`);
  return equipment;
}

export async function deleteEquipment(projectId: string, id: string) {
  const { member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "PROJECT_MANAGER"]);

  // Delete all associated files from storage first
  const docs = await prisma.equipmentDocument.findMany({ where: { equipmentId: id } });
  for (const doc of docs) {
    await supabaseAdmin.storage.from("equipment-docs").remove([doc.storagePath]);
  }

  await prisma.plantEquipment.delete({ where: { id } });

  revalidatePath(`/dashboard/equipment`);
  return { success: true };
}

export async function uploadDocument(projectId: string, equipmentId: string, formData: FormData) {
  const { dbUser, member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"]);

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");
  if (file.size > 50 * 1024 * 1024) throw new Error("File exceeds 50MB limit");

  const fileName = file.name;
  const mimeType = file.type || "application/octet-stream";
  const fileType = fileName.split(".").pop()?.toUpperCase() || "UNKNOWN";

  const docId = crypto.randomUUID();
  const storagePath = `${projectId}/${equipmentId}/${docId}-${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: storageError } = await supabaseAdmin.storage
    .from("equipment-docs")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      duplex: "half",
    });

  if (storageError) {
    throw new Error(`Storage upload failed: ${storageError.message}`);
  }

  const document = await prisma.equipmentDocument.create({
    data: {
      id: docId,
      equipmentId,
      name: fileName,
      storagePath,
      fileType,
      uploadedById: dbUser.id,
    },
  });

  revalidatePath(`/dashboard/equipment/${equipmentId}`);
  return document;
}

export async function deleteDocument(projectId: string, equipmentId: string, docId: string) {
  const { member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"]);

  const doc = await prisma.equipmentDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new Error("Document not found");

  const { error: storageError } = await supabaseAdmin.storage
    .from("equipment-docs")
    .remove([doc.storagePath]);

  if (storageError) {
    throw new Error(`Storage deletion failed: ${storageError.message}`);
  }

  await prisma.equipmentDocument.delete({ where: { id: docId } });

  revalidatePath(`/dashboard/equipment/${equipmentId}`);
  return { success: true };
}

export async function logMaintenance(
  projectId: string,
  equipmentId: string,
  data: {
    type: string;
    description: string;
    findings?: string;
    actionTaken?: string;
    nextServiceDue?: string | null;
  }
) {
  const { dbUser, member } = await requireProjectMember(projectId);
  requireAllowedRoles(member.role, ["ADMINISTRATOR", "PROJECT_MANAGER"]);

  const log = await prisma.equipmentMaintenanceLog.create({
    data: {
      equipmentId,
      loggedById: dbUser.id,
      type: data.type,
      description: data.description,
      findings: data.findings || null,
      actionTaken: data.actionTaken || null,
      nextServiceDue: data.nextServiceDue ? new Date(data.nextServiceDue) : null,
    },
  });

  revalidatePath(`/dashboard/equipment/${equipmentId}`);
  return log;
}

export async function getEquipmentDocUrl(projectId: string, docId: string) {
  await requireProjectMember(projectId);

  const doc = await prisma.equipmentDocument.findUnique({
    where: { id: docId },
  });
  if (!doc) throw new Error("Document not found");

  const { data, error } = await supabaseAdmin.storage
    .from("equipment-docs")
    .createSignedUrl(doc.storagePath, 3600); // 1 hour

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

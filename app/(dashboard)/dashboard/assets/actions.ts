"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { AssetStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

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
 * Helper to ensure the user has elevated roles for Asset management operations
 */
function requireElevatedRole(role: string) {
 if (role !== "WAREHOUSE" && role !== "IT_SUPPORT" && role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Requires WAREHOUSE, IT_SUPPORT, or ADMINISTRATOR role");
 }
}

/**
 * Create a new Asset
 */
export async function createAsset(formData: FormData) {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" }});
 if (!project) throw new Error("Project not found");
 const projectId = project.id;

 const { member } = await requireProjectMember(projectId);
 requireElevatedRole(member.role);

 const name = formData.get("name") as string;
 const category = formData.get("category") as string;
 const serialNumber = formData.get("serialNumber") as string || null;
 const location = formData.get("location") as string || null;
 const vendor = formData.get("vendor") as string || null;
 const assignedToId = formData.get("assignedToId") as string || null;
 const assignedToName = formData.get("assignedToName") as string || null;

  const purchaseDateStr = formData.get("purchaseDate") as string;
  const hasWarrantyStr = formData.get("hasWarranty") as string;

  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const hasWarranty = hasWarrantyStr === "on" || hasWarrantyStr === "true";

 const assetTag = formData.get("assetTag") as string || null;
 const department = formData.get("department") as string || null;

 if (!name || !category) throw new Error("Name and Category are required");

 await prisma.asset.create({
 data: {
 projectId,
 name,
 category,
 serialNumber,
 assetTag,
 department,
 location,
 vendor,
 purchaseDate,
 hasWarranty,
 assignedToId: assignedToId || null,
  assignedToName: assignedToName || null,
  status: "ACTIVE",

  },
 });

 revalidatePath("/dashboard/assets");
 redirect("/dashboard/assets");
}

/**
 * Update an existing Asset
 */
export async function updateAsset(id: string, formData: FormData) {
 const asset = await prisma.asset.findUnique({ where: { id } });
 if (!asset) throw new Error("Asset not found");

 const { member } = await requireProjectMember(asset.projectId);
 requireElevatedRole(member.role);

 const name = formData.get("name") as string;
 const category = formData.get("category") as string;
 const serialNumber = formData.get("serialNumber") as string || null;
 const location = formData.get("location") as string || null;
 const vendor = formData.get("vendor") as string || null;
 const status = (formData.get("status") as AssetStatus) || "ACTIVE";
 const assignedToId = formData.get("assignedToId") as string || null;
 const assignedToName = formData.get("assignedToName") as string || null;

  const purchaseDateStr = formData.get("purchaseDate") as string;
  const hasWarrantyStr = formData.get("hasWarranty") as string;

  const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;
  const hasWarranty = hasWarrantyStr === "on" || hasWarrantyStr === "true";

 const assetTag = formData.get("assetTag") as string || null;
 const department = formData.get("department") as string || null;

 if (!name || !category) throw new Error("Name and Category are required");

 await prisma.asset.update({
 where: { id },
 data: {
 name,
 category,
 serialNumber,
 assetTag,
 department,
 location,
 vendor,
 status,
 purchaseDate,
 hasWarranty,
 assignedToId: assignedToId || null,
 assignedToName: assignedToId ? null : (assignedToName || null),
 },
 });

 revalidatePath(`/dashboard/assets/${id}`);
 revalidatePath("/dashboard/assets");
 redirect(`/dashboard/assets/${id}`);
}

/**
 * Assign an Asset
 */
export async function assignAsset(assetId: string, userId: string | null, assignedToName: string | null = null) {
 const asset = await prisma.asset.findUnique({ where: { id: assetId } });
 if (!asset) throw new Error("Asset not found");

 const { member } = await requireProjectMember(asset.projectId);
 requireElevatedRole(member.role);

 await prisma.asset.update({
 where: { id: assetId },
 data: { 
  assignedToId: userId,
  assignedToName: userId ? null : assignedToName 
 },
 });

 revalidatePath(`/dashboard/assets/${assetId}`);
 revalidatePath("/dashboard/assets");
}

/**
 * Retire an Asset
 */
export async function retireAsset(assetId: string) {
 const asset = await prisma.asset.findUnique({ where: { id: assetId } });
 if (!asset) throw new Error("Asset not found");

 const { member } = await requireProjectMember(asset.projectId);
 requireElevatedRole(member.role);

 await prisma.asset.update({
 where: { id: assetId },
 data: { status: "RETIRED" },
 });

 revalidatePath(`/dashboard/assets/${assetId}`);
 revalidatePath("/dashboard/assets");
}

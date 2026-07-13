"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TransactionType } from "@prisma/client";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) throw new Error("Unauthorized: No active session");
 return { dbUser, member };
}

function canManageInventory(role: string) {
 return role === "WAREHOUSE" || role === "ADMINISTRATOR";
}

export async function createItem(formData: FormData) {
 const projectId = formData.get("projectId") as string;
 const { member } = await requireProjectMember(projectId);
 
 if (!canManageInventory(member.role)) {
 throw new Error("Forbidden: Requires WAREHOUSE or ADMINISTRATOR role");
 }

 const name = formData.get("name") as string;
 const category = formData.get("category") as string;
 const unit = formData.get("unit") as string;
 const quantityOnHand = parseFloat(formData.get("quantityOnHand") as string || "0");
 const lowStockThreshold = parseFloat(formData.get("lowStockThreshold") as string || "0");
 const location = formData.get("location") as string;
 const vendor = formData.get("vendor") as string;

 await prisma.inventoryItem.create({
 data: {
 projectId,
 name,
 category,
 unit,
 quantityOnHand,
 lowStockThreshold,
 location: location || null,
 vendor: vendor || null,
 }
 });

 revalidatePath("/dashboard/inventory", "layout");
 redirect("/dashboard/inventory");
}

export async function requestTransaction(
 projectId: string,
 itemId: string,
 type: TransactionType,
 quantity: number,
 purpose: string | null,
 dueDate: Date | null
) {
 const { dbUser } = await requireProjectMember(projectId);

 if (quantity <= 0) {
 throw new Error("Quantity must be greater than 0");
 }

 await prisma.inventoryTransaction.create({
 data: {
 projectId,
 itemId,
 type,
 quantity,
 requestedById: dbUser.id,
 purpose,
 dueDate,
 }
 });

 revalidatePath("/dashboard/inventory", "layout");
}

export async function approveTransaction(projectId: string, transactionId: string) {
 const { dbUser, member } = await requireProjectMember(projectId);

 if (!canManageInventory(member.role)) {
 throw new Error("Forbidden: Requires WAREHOUSE or ADMINISTRATOR role");
 }

 const transaction = await prisma.inventoryTransaction.findUnique({
 where: { id: transactionId, projectId },
 include: { item: true }
 });

 if (!transaction) throw new Error("Transaction not found");
 if (transaction.status !== "PENDING") throw new Error("Transaction is not pending");

 // Adjust stock logic
 let quantityDelta = 0;
 if (transaction.type === "RESTOCK") {
 quantityDelta = transaction.quantity;
 } else if (transaction.type === "ISSUE" || transaction.type === "BORROW") {
 quantityDelta = -transaction.quantity;
 }

 if (transaction.type !== "RESTOCK" && transaction.item.quantityOnHand + quantityDelta < 0) {
 throw new Error("Insufficient stock");
 }

 await prisma.$transaction([
 prisma.inventoryTransaction.update({
 where: { id: transactionId },
 data: {
 status: "APPROVED",
 approvedById: dbUser.id,
 updatedAt: new Date()
 }
 }),
 prisma.inventoryItem.update({
 where: { id: transaction.itemId },
 data: {
 quantityOnHand: { increment: quantityDelta },
 updatedAt: new Date()
 }
 })
 ]);

 revalidatePath("/dashboard/inventory", "layout");
}

export async function rejectTransaction(projectId: string, transactionId: string, reason: string | null = null) {
 const { dbUser, member } = await requireProjectMember(projectId);

 if (!canManageInventory(member.role)) {
 throw new Error("Forbidden: Requires WAREHOUSE or ADMINISTRATOR role");
 }

 const transaction = await prisma.inventoryTransaction.findUnique({
 where: { id: transactionId, projectId }
 });

 if (!transaction) throw new Error("Transaction not found");
 if (transaction.status !== "PENDING") throw new Error("Transaction is not pending");

 await prisma.inventoryTransaction.update({
 where: { id: transactionId },
 data: {
 status: "REJECTED",
 approvedById: dbUser.id,
 notes: reason,
 updatedAt: new Date()
 }
 });

 revalidatePath("/dashboard/inventory", "layout");
}

export async function logReturn(projectId: string, transactionId: string) {
 const { dbUser, member } = await requireProjectMember(projectId);

 const transaction = await prisma.inventoryTransaction.findUnique({
 where: { id: transactionId, projectId },
 include: { item: true }
 });

 if (!transaction) throw new Error("Transaction not found");
 if (transaction.type !== "BORROW") throw new Error("Can only return borrowed items");
 if (transaction.status !== "APPROVED") throw new Error("Transaction must be approved first");

 // Only WAREHOUSE/ADMIN or the original requester can log a return
 if (!canManageInventory(member.role) && transaction.requestedById !== dbUser.id) {
 throw new Error("Forbidden: You cannot return this item");
 }

 await prisma.$transaction([
 prisma.inventoryTransaction.update({
 where: { id: transactionId },
 data: {
 status: "RETURNED",
 returnedAt: new Date(),
 updatedAt: new Date()
 }
 }),
 prisma.inventoryItem.update({
 where: { id: transaction.itemId },
 data: {
 quantityOnHand: { increment: transaction.quantity },
 updatedAt: new Date()
 }
 })
 ]);

 revalidatePath("/dashboard/inventory", "layout");
}

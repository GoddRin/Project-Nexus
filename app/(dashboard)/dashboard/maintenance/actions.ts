"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { Role } from "@prisma/client";

/**
 * Ensures user is authenticated and part of the project.
 * Throws an error if not. Returns user and member objects.
 */
async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized or not a project member");
 }
 return { dbUser, member };
}

/**
 * Checks if user has permission to manage maintenance records.
 * IT_SUPPORT, WAREHOUSE, ADMINISTRATOR can create/start/complete.
 * PROJECT_MANAGER and ADMINISTRATOR can delete.
 */
function canManageMaintenance(role: Role) {
 return ([Role.ADMINISTRATOR, Role.IT_SUPPORT, Role.WAREHOUSE] as Role[]).includes(role);
}

function canDeleteMaintenance(role: Role) {
 return ([Role.ADMINISTRATOR, Role.PROJECT_MANAGER] as Role[]).includes(role);
}

export async function createSchedule(
 projectId: string,
 assetId: string,
 title: string,
 description: string | null,
 frequencyDays: number,
 nextDueDate: Date,
 tasks: string[]
) {
 const { dbUser, member } = await requireProjectMember(projectId);

 if (!canManageMaintenance(member.role)) {
 throw new Error("You do not have permission to create maintenance schedules");
 }

 const schedule = await prisma.maintenanceSchedule.create({
 data: {
 projectId,
 assetId,
 title,
 description,
 frequencyDays,
 nextDueDate,
 status: "UPCOMING",
 createdById: dbUser.id,
 tasks: {
 create: tasks.filter((t) => t.trim() !== "").map((title) => ({
 title: title.trim()
 }))
 }
 }
 });

 revalidatePath("/dashboard/maintenance", "layout");
 revalidatePath("/dashboard/assets", "layout");
 return schedule;
}

export async function startMaintenance(projectId: string, scheduleId: string) {
 const { member } = await requireProjectMember(projectId);

 if (!canManageMaintenance(member.role)) {
 throw new Error("You do not have permission to start maintenance");
 }

 // Fetch the schedule to get the assetId
 const schedule = await prisma.maintenanceSchedule.findUnique({
 where: { id: scheduleId, projectId }
 });

 if (!schedule) {
 throw new Error("Schedule not found");
 }

 if (schedule.status !== "UPCOMING" && schedule.status !== "OVERDUE") {
 throw new Error("Maintenance must be upcoming or overdue to start");
 }

 // Perform atomic transaction
 await prisma.$transaction([
 // 1. Update Schedule Status
 prisma.maintenanceSchedule.update({
 where: { id: scheduleId },
 data: { status: "IN_PROGRESS" }
 }),
 // 2. Update Asset Status
 prisma.asset.update({
 where: { id: schedule.assetId },
 data: { 
 status: "IN_MAINTENANCE",
 updatedAt: new Date()
 }
 })
 ]);

 revalidatePath("/dashboard/maintenance", "layout");
 revalidatePath("/dashboard/assets", "layout");
}

export async function completeTask(
  projectId: string,
  taskId: string,
  notes: string | null = null,
  condition: string | null = null,
  issueFound: string | null = null,
  actionTaken: string | null = null,
  withWarranty: boolean | null = null
) {
  const { dbUser, member } = await requireProjectMember(projectId);

  if (!canManageMaintenance(member.role)) {
  throw new Error("You do not have permission to complete maintenance tasks");
  }

  // Validate task belongs to project via schedule
  const task = await prisma.maintenanceTask.findUnique({
  where: { id: taskId },
  include: { schedule: true }
  });

  if (!task || task.schedule.projectId !== projectId) {
  throw new Error("Task not found");
  }

  await prisma.maintenanceTask.update({
  where: { id: taskId },
  data: {
  completedAt: new Date(),
  completedById: dbUser.id,
  notes,
  condition,
  issueFound,
  actionTaken,
  withWarranty
  }
  });

 revalidatePath("/dashboard/maintenance", "layout");
}

export async function completeMaintenance(projectId: string, scheduleId: string) {
 const { member } = await requireProjectMember(projectId);

 if (!canManageMaintenance(member.role)) {
 throw new Error("You do not have permission to complete maintenance");
 }

 const schedule = await prisma.maintenanceSchedule.findUnique({
 where: { id: scheduleId, projectId }
 });

 if (!schedule) {
 throw new Error("Schedule not found");
 }

 if (schedule.status !== "IN_PROGRESS") {
 throw new Error("Schedule must be IN_PROGRESS to complete");
 }

 const now = new Date();
 
 // Calculate next due date
 const nextDueDate = new Date(now);
 nextDueDate.setDate(nextDueDate.getDate() + schedule.frequencyDays);

 await prisma.$transaction([
 // 1. Update Schedule
 prisma.maintenanceSchedule.update({
 where: { id: scheduleId },
 data: { 
 status: "COMPLETED",
 lastDoneDate: now,
 nextDueDate: nextDueDate
 }
 }),
 // 2. Update Asset Status back to ACTIVE
 prisma.asset.update({
 where: { id: schedule.assetId },
 data: { 
 status: "ACTIVE",
 updatedAt: now
 }
 })
 ]);

 revalidatePath("/dashboard/maintenance", "layout");
 revalidatePath("/dashboard/assets", "layout");
}

export async function deleteSchedule(projectId: string, scheduleId: string) {
 const { member } = await requireProjectMember(projectId);

 if (!canDeleteMaintenance(member.role)) {
 throw new Error("You do not have permission to delete maintenance schedules");
 }

 // Verify ownership
 const schedule = await prisma.maintenanceSchedule.findUnique({
 where: { id: scheduleId, projectId }
 });

 if (!schedule) {
 throw new Error("Schedule not found");
 }

 // Must delete tasks first if any exist due to foreign key constraints, or cascade.
 // Prisma relations in our schema don't specify onDelete: Cascade, so we do it manually in a transaction.
 await prisma.$transaction([
 prisma.maintenanceTask.deleteMany({
 where: { scheduleId: scheduleId }
 }),
 prisma.maintenanceSchedule.delete({
 where: { id: scheduleId }
 })
 ]);

 revalidatePath("/dashboard/maintenance", "layout");
 revalidatePath("/dashboard/assets", "layout");
}

"use server";

import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { revalidatePath } from "next/cache";
import { MilestoneStatus } from "@prisma/client";

/**
 * Creates a new milestone for a project.
 * Allowed roles: PROJECT_MANAGER, ADMINISTRATOR
 */
export async function createMilestone(
 projectId: string,
 name: string,
 targetDate: Date
) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 const allowedRoles = ["PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 throw new Error("Forbidden: Only Project Managers and Administrators can create milestones");
 }

 if (!name || !name.trim()) {
 throw new Error("Milestone name is required");
 }

 const milestone = await prisma.milestone.create({
 data: {
 projectId,
 name: name.trim(),
 targetDate: new Date(targetDate),
 status: MilestoneStatus.PENDING,
 },
 });

 revalidatePath("/dashboard/progress");
 revalidatePath("/dashboard");
 return milestone;
}

/**
 * Updates a milestone's status and optional completed date.
 * Allowed roles: PROJECT_MANAGER, ADMINISTRATOR
 */
export async function updateMilestoneStatus(
 projectId: string,
 id: string,
 status: MilestoneStatus,
 completedDate?: Date
) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 const allowedRoles = ["PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 throw new Error("Forbidden: Only Project Managers and Administrators can update milestones");
 }

 const milestone = await prisma.milestone.update({
 where: { id },
 data: {
 status,
 completedDate: status === MilestoneStatus.COMPLETED ? (completedDate ? new Date(completedDate) : new Date()) : null,
 },
 });

 revalidatePath("/dashboard/progress");
 revalidatePath("/dashboard");
 return milestone;
}

/**
 * Logs a new progress snapshot for a project.
 * Allowed roles: PROJECT_MANAGER, ADMINISTRATOR
 */
export async function logProgressSnapshot(
 projectId: string,
 snapshotDate: Date,
 percentComplete: number,
 note?: string
) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 const allowedRoles = ["PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 throw new Error("Forbidden: Only Project Managers and Administrators can log progress snapshots");
 }

 if (percentComplete < 0 || percentComplete > 100) {
 throw new Error("Percentage complete must be between 0 and 100");
 }

 const snapshot = await prisma.progressSnapshot.create({
 data: {
 projectId,
 snapshotDate: new Date(snapshotDate),
 percentComplete: Number(percentComplete),
 note: note ? note.trim() : null,
 loggedById: dbUser.id,
 },
 });

 revalidatePath("/dashboard/progress");
 revalidatePath("/dashboard");
 return snapshot;
}

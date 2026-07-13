"use server";

import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { revalidatePath } from "next/cache";
import { MilestoneCategory, MilestoneStatus2 } from "@prisma/client";

/**
 * Ensures user is an ADMINISTRATOR for settings modifications
 */
async function requireAdmin(projectId: string) {
  const { dbUser, member } = await getOrCreateUser(projectId);
  if (!dbUser || !member) {
    throw new Error("Unauthorized: No active session");
  }
  if (member.role !== "ADMINISTRATOR") {
    throw new Error("Forbidden: ADMINISTRATOR role required");
  }
  return { dbUser, member };
}

/**
 * Update Project target COD Date
 */
export async function updateProjectCod(projectId: string, codDateStr: string | null) {
  await requireAdmin(projectId);

  const parsedDate = codDateStr ? new Date(codDateStr) : null;

  if (parsedDate) {
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid target COD date format.");
    }
    const year = parsedDate.getFullYear();
    if (year < 2020 || year > 2100) {
      throw new Error("Target COD year must be between 2020 and 2100.");
    }
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      targetCodDate: parsedDate,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/intelligence");
  return project;
}

/**
 * Update CodMilestone status and completion timestamp
 */
export async function updateMilestoneStatus(
  projectId: string,
  milestoneId: string,
  status: MilestoneStatus2,
  completedAtStr: string | null
) {
  await requireAdmin(projectId);

  const completedAt = completedAtStr ? new Date(completedAtStr) : null;

  const milestone = await prisma.codMilestone.update({
    where: { id: milestoneId },
    data: {
      status,
      completedAt: status === MilestoneStatus2.COMPLETED ? (completedAt || new Date()) : null,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/intelligence");
  return milestone;
}

/**
 * Add a new CodMilestone to the project
 */
export async function addMilestone(
  projectId: string,
  data: {
    title: string;
    category: MilestoneCategory;
    isCritical: boolean;
    status: MilestoneStatus2;
    targetDateStr?: string;
  }
) {
  await requireAdmin(projectId);

  if (!data.title || !data.title.trim()) {
    throw new Error("Milestone title is required");
  }

  // Determine the next order index
  const lastMilestone = await prisma.codMilestone.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });

  const nextOrder = lastMilestone ? lastMilestone.order + 1 : 1;
  const targetDate = data.targetDateStr ? new Date(data.targetDateStr) : null;

  if (targetDate) {
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid target date format.");
    }
    const year = targetDate.getFullYear();
    if (year < 2020 || year > 2100) {
      throw new Error("Target year must be between 2020 and 2100.");
    }
  }

  const milestone = await prisma.codMilestone.create({
    data: {
      projectId,
      title: data.title.trim(),
      category: data.category,
      isCritical: data.isCritical,
      status: data.status,
      targetDate,
      order: nextOrder,
      completedAt: data.status === MilestoneStatus2.COMPLETED ? new Date() : null,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/intelligence");
  return milestone;
}

/**
 * Reorder milestones sequentially based on an array of milestone IDs
 */
export async function reorderMilestones(projectId: string, milestoneIds: string[]) {
  await requireAdmin(projectId);

  await prisma.$transaction(
    milestoneIds.map((id, index) =>
      prisma.codMilestone.update({
        where: { id },
        data: { order: index + 1 },
      })
    )
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/intelligence");
  return { success: true };
}

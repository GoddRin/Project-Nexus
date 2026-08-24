"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { EquipmentZone } from "@prisma/client";

/**
 * Helper to resolve the target project & enforce auth via getOrCreateUser.
 */
async function getAuthenticatedProject(requireAuth: boolean = true) {
  const project = await prisma.project.findUnique({
    where: { slug: "tumauini-hepp" },
  });
  if (!project) {
    throw new Error("Project 'tumauini-hepp' not found");
  }

  const { dbUser, member } = await getOrCreateUser(project.id);
  if (requireAuth && (!dbUser || !member)) {
    throw new Error("Unauthorized");
  }

  return { project, dbUser, member };
}

/**
 * 1. Reverse Lookup: Given a sitemap location/zone (siteLocationId, slug, or zone enum),
 * returns all associated equipment records.
 */
export async function getEquipmentByLocation(locationIdentifier: string = "all") {
  const { project } = await getAuthenticatedProject(false);

  const isAll = locationIdentifier === "all";
  const knownZones = ["INTAKE", "PENSTOCK", "TURBINE_HALL", "SWITCHYARD", "SURGE_TANK", "TAILRACE", "ACCESS_ROAD", "OTHER"];
  const isZoneEnum = knownZones.includes(locationIdentifier) || (typeof EquipmentZone !== "undefined" && EquipmentZone && Object.values(EquipmentZone).includes(locationIdentifier as EquipmentZone));
  const zoneEnum = isZoneEnum ? (locationIdentifier as EquipmentZone) : null;

  const equipments = await prisma.plantEquipment.findMany({
    where: {
      projectId: project.id,
      ...(isAll
        ? {}
        : {
            OR: [
              { siteLocationId: locationIdentifier },
              { siteLocation: { slug: locationIdentifier } },
              { siteLocation: { id: locationIdentifier } },
              ...(zoneEnum ? [{ zone: zoneEnum }] : []),
            ],
          }),
    },
    include: {
      siteLocation: true,
      maintenanceLogs: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { equipmentTag: "asc" },
  });

  return equipments;
}

/**
 * 1. Reverse Lookup: Given an equipment ID, returns its sitemap position, zone,
 * and associated site location if one exists.
 */
export async function getEquipmentSitemapPosition(equipmentId: string) {
  const { project } = await getAuthenticatedProject(false);

  const equipment = await prisma.plantEquipment.findFirst({
    where: {
      id: equipmentId,
      projectId: project.id,
    },
    include: {
      siteLocation: true,
    },
  });

  if (!equipment) {
    return null;
  }

  return {
    equipmentId: equipment.id,
    equipmentTag: equipment.equipmentTag,
    name: equipment.name,
    positionX: equipment.positionX,
    positionY: equipment.positionY,
    zone: equipment.zone,
    siteLocationId: equipment.siteLocationId,
    siteLocation: equipment.siteLocation,
    status: equipment.status,
    condition: equipment.condition,
  };
}

/**
 * Atomic update of equipment sitemap position & zone using prisma.$transaction.
 */
export async function updateEquipmentSitemapPosition(
  equipmentId: string,
  positionX: number,
  positionY: number,
  zone?: EquipmentZone | null,
  siteLocationId?: string | null
) {
  const { project } = await getAuthenticatedProject();

  // Atomic update using prisma.$transaction
  const updatedEquipment = await prisma.$transaction(async (tx) => {
    // Verify equipment exists and belongs to user's project
    const existing = await tx.plantEquipment.findFirst({
      where: { id: equipmentId, projectId: project.id },
    });
    if (!existing) {
      throw new Error(`Equipment ${equipmentId} not found in project`);
    }

    const updated = await tx.plantEquipment.update({
      where: { id: equipmentId },
      data: {
        positionX,
        positionY,
        ...(zone !== undefined ? { zone } : {}),
        ...(siteLocationId !== undefined ? { siteLocationId } : {}),
      },
      include: {
        siteLocation: true,
      },
    });

    return updated;
  });

  revalidatePath("/dashboard/sitemap");
  revalidatePath("/dashboard/equipment");
  return updatedEquipment;
}

/**
 * Engineer Assignment Server Actions
 */
export async function assignEngineer(
  locationId: string,
  userId: string | null,
  role: string,
  userName?: string | null
) {
  if (!locationId) throw new Error("Location ID is required");

  let targetUserId = userId;

  if (!targetUserId) {
    if (!userName || !userName.trim()) {
      throw new Error("User ID or User Name is required");
    }

    const trimmedName = userName.trim();
    let existingUser = await prisma.user.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (!existingUser) {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      existingUser = await prisma.user.create({
        data: {
          name: trimmedName,
          email: `crew-${uniqueId}@nexus.local`,
          clerkId: `crew_${uniqueId}`,
        },
      });
    }

    targetUserId = existingUser.id;
  }

  await prisma.siteLocationEngineer.upsert({
    where: {
      locationId_userId: {
        locationId,
        userId: targetUserId,
      },
    },
    update: {
      role,
    },
    create: {
      locationId,
      userId: targetUserId,
      role,
    },
  });

  const location = await prisma.siteLocation.findUnique({
    where: { id: locationId },
  });
  if (location) {
    revalidatePath(`/dashboard/sitemap/${location.slug}`);
    revalidatePath("/dashboard/sitemap");
  }
}

export async function removeEngineer(locationId: string, userId: string) {
  if (!locationId || !userId) throw new Error("Location ID and User ID are required");

  await prisma.siteLocationEngineer.delete({
    where: {
      locationId_userId: {
        locationId,
        userId,
      },
    },
  });

  const location = await prisma.siteLocation.findUnique({
    where: { id: locationId },
  });
  if (location) {
    revalidatePath(`/dashboard/sitemap/${location.slug}`);
    revalidatePath("/dashboard/sitemap");
  }
}

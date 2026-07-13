"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function assignEngineer(locationId: string, userId: string | null, role: string, userName?: string | null) {
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
          mode: "insensitive"
        }
      }
    });

    if (!existingUser) {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      existingUser = await prisma.user.create({
        data: {
          name: trimmedName,
          email: `crew-${uniqueId}@nexus.local`,
          clerkId: `crew_${uniqueId}`,
        }
      });
    }

    targetUserId = existingUser.id;
  }

  await prisma.siteLocationEngineer.upsert({
    where: {
      locationId_userId: {
        locationId,
        userId: targetUserId,
      }
    },
    update: {
      role,
    },
    create: {
      locationId,
      userId: targetUserId,
      role,
    }
  });

  const location = await prisma.siteLocation.findUnique({
    where: { id: locationId }
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
      }
    }
  });

  const location = await prisma.siteLocation.findUnique({
    where: { id: locationId }
  });
  if (location) {
    revalidatePath(`/dashboard/sitemap/${location.slug}`);
    revalidatePath("/dashboard/sitemap");
  }
}

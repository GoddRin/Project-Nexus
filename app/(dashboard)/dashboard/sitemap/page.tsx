import { prisma } from "@/lib/db/prisma";
import { SiteMapClient } from "./SiteMapClient";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { redirect } from "next/navigation";

export default async function SiteMapPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) return null;

  const { member } = await getOrCreateUser(project.id);
  if (!member) {
    redirect("/dashboard");
  }

  // Fetch locations with comprehensive inclusions
  const locations = await prisma.siteLocation.findMany({
    where: { projectId: project.id },
    include: {
      photos: {
        orderBy: { createdAt: "desc" }
      },
      assignedEngineers: {
        include: {
          user: true,
        }
      },
      equipments: true,
    },
    orderBy: { createdAt: "asc" }
  });

  // Fetch all tickets for the project to filter by zone name in-memory
  const tickets = await prisma.ticket.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" }
  });

  // Fetch equipment counts per zone in a single query using Prisma groupBy on siteLocationId
  const equipmentGrouped = await prisma.plantEquipment.groupBy({
    by: ["siteLocationId"],
    where: {
      projectId: project.id,
      siteLocationId: { not: null }
    },
    _count: {
      id: true
    }
  });

  const equipmentCounts: Record<string, number> = {};
  for (const item of equipmentGrouped) {
    if (item.siteLocationId) {
      equipmentCounts[item.siteLocationId] = item._count.id;
    }
  }

  // Calculate isWorkingHours in Philippine Time (PHT, UTC+8)
  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000;
  const utcTime = now.getTime() + utcOffset;
  const phtTime = new Date(utcTime + (3600000 * 8));
  const phtHours = phtTime.getHours();
  const phtDay = phtTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const isWorkingHours = phtDay >= 1 && phtDay <= 6 && phtHours >= 6 && phtHours < 18;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SiteMapClient 
        locations={locations} 
        tickets={tickets} 
        equipmentCounts={equipmentCounts} 
        isWorkingHours={isWorkingHours} 
      />
    </div>
  );
}

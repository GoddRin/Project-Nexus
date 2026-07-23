import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = [];

    // 1. Fetch recent tickets
    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const ticket of recentTickets) {
      notifications.push({
        id: `ticket-${ticket.id}`,
        title: `New Ticket: ${ticket.title}`,
        description: ticket.description.substring(0, 50) + (ticket.description.length > 50 ? "..." : ""),
        timestamp: ticket.createdAt.toISOString(),
        type: "TICKET",
      });
    }

    // 2. Fetch upcoming maintenance
    const upcomingMaintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        status: { in: ["UPCOMING", "OVERDUE"] },
        nextDueDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { asset: true },
      orderBy: { nextDueDate: "asc" },
      take: 5,
    });

    for (const maintenance of upcomingMaintenance) {
      notifications.push({
        id: `maint-${maintenance.id}`,
        title: `Maintenance: ${maintenance.asset.name}`,
        description: `${maintenance.title} is due on ${new Date(maintenance.nextDueDate).toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        type: "MAINTENANCE",
      });
    }

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications API:", error);
    return NextResponse.json([]);
  }
}

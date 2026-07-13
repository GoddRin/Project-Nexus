"use server";

import { prisma } from "@/lib/db/prisma";

export type NotificationType = "TICKET" | "MAINTENANCE" | "VISITOR" | "SYSTEM";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: NotificationType;
}

export async function getRecentNotifications(): Promise<NotificationItem[]> {
  try {
    const notifications: NotificationItem[] = [];

    // 1. Fetch recent tickets (created or updated in the last 7 days)
    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
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

    // 2. Fetch upcoming maintenance (due in the next 7 days or overdue)
    const upcomingMaintenance = await prisma.maintenanceSchedule.findMany({
      where: {
        status: { in: ["UPCOMING", "OVERDUE"] },
        nextDueDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next 7 days
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
        description: `${maintenance.title} is due on ${maintenance.nextDueDate.toLocaleDateString()}`,
        timestamp: new Date().toISOString(), // Using now for sorting purposes or we could use created at
        type: "MAINTENANCE",
      });
    }

    // 3. Fetch recent visitors (checked in today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentVisitors = await prisma.visitor.findMany({
      where: {
        timeIn: {
          gte: today,
        },
      },
      orderBy: { timeIn: "desc" },
      take: 5,
    });

    for (const visitor of recentVisitors) {
      notifications.push({
        id: `visitor-${visitor.id}`,
        title: `Visitor Checked In`,
        description: `${visitor.fullName} (${visitor.purpose}) is on site.`,
        timestamp: visitor.timeIn.toISOString(),
        type: "VISITOR",
      });
    }

    // Sort all aggregated notifications by timestamp descending
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return notifications.slice(0, 10); // Return top 10 recent notifications
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
}

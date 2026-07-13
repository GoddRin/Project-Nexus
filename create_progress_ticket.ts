import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const project = await prisma.project.findFirst();
  if (!project) throw new Error("No project found");
  
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  const ticket = await prisma.ticket.create({
    data: {
      projectId: project.id,
      title: "Network Latency Spikes in Sector 4",
      description: "Intermittent high latency observed in network segment covering Sector 4. Needs investigation and possible switch reboot.",
      priority: "HIGH",
      status: "OPEN",
      createdById: user.id,
    }
  });

  console.log("Created ticket:", ticket.id);

  // Assign and update status
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      assignedToId: user.id,
      status: "IN_PROGRESS"
    }
  });

  console.log("Updated ticket to IN_PROGRESS assigned to user:", updated.id);

  // Fetch all tickets by status to verify counts
  const openCount = await prisma.ticket.count({ where: { status: "OPEN" } });
  const inProgressCount = await prisma.ticket.count({ where: { status: "IN_PROGRESS" } });
  const resolvedCount = await prisma.ticket.count({ where: { status: "RESOLVED" } });
  const closedCount = await prisma.ticket.count({ where: { status: "CLOSED" } });

  console.log(`DB Counts -> OPEN: ${openCount}, IN_PROGRESS: ${inProgressCount}, RESOLVED: ${resolvedCount}, CLOSED: ${closedCount}`);
}

main().finally(() => prisma.$disconnect());

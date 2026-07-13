import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" }});
  const user = await prisma.user.findFirst();

  if (!project || !user) throw new Error("Project or user not found");

  const ticket = await prisma.ticket.create({
    data: {
      projectId: project.id,
      title: "SCADA network switch offline in Turbine Hall",
      description: "The primary network switch for the SCADA system in the turbine hall is unreachable. Requires immediate physical inspection and possible replacement.",
      priority: "URGENT",
      status: "OPEN",
      createdById: user.id,
    }
  });

  console.log(`TICKET_ID=${ticket.id}`);
}

main().finally(() => prisma.$disconnect());

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ticketId = "cmqvx3k3g0000vsw1tw3m6dtq";
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  console.log("Queried Ticket:", ticket);

  const allTickets = await prisma.ticket.findMany();
  console.log("All Tickets in DB:", allTickets.length);
}

main().finally(() => prisma.$disconnect());

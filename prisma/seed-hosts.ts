import { config } from "dotenv";
config();
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) {
    console.error("Project tumauini-hepp not found");
    return;
  }

  const hostsToCreate = [
    { name: "Maria Santos", email: "maria.warehouse@example.com", role: Role.WAREHOUSE, clerkId: "user_mock_maria" },
    { name: "Romeo Sese", email: "carlos.pm@example.com", role: Role.PROJECT_MANAGER, clerkId: "user_mock_carlos" },
    { name: "Rovigail Joy Abellar", email: "ana.hr@example.com", role: Role.HR, clerkId: "user_mock_ana" },
    { name: "Roberto Garcia", email: "roberto.safety@example.com", role: Role.SAFETY, clerkId: "user_mock_roberto" },
    { name: "Elena Cruz", email: "elena.supervisor@example.com", role: Role.SUPERVISOR, clerkId: "user_mock_elena" },
    { name: "David Lim", email: "david.engineer@example.com", role: Role.ENGINEER, clerkId: "user_mock_david" },
    { name: "Jose Rizal", email: "jose.guard@example.com", role: Role.GUARD, clerkId: "user_mock_jose" }
  ];

  for (const host of hostsToCreate) {
    // Create or update the user
    const user = await prisma.user.upsert({
      where: { email: host.email },
      update: { name: host.name },
      create: {
        name: host.name,
        email: host.email,
        clerkId: host.clerkId,
      }
    });

    // Make sure they are a member of the project
    await prisma.projectMember.upsert({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: project.id
        }
      },
      update: { role: host.role },
      create: {
        userId: user.id,
        projectId: project.id,
        role: host.role
      }
    });
    
    console.log(`Ensured user ${host.name} (${host.role}) exists and is a project member.`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

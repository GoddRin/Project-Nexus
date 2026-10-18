import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emailArg = process.argv[2] || "romeo@projectnexus.dev";
  const roleArg = (process.argv[3]?.toUpperCase() || "ADMINISTRATOR") as Role;

  const validRoles = Object.values(Role);
  if (!validRoles.includes(roleArg)) {
    console.error(`Invalid role "${roleArg}". Valid roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: emailArg, mode: "insensitive" } },
  });

  if (!user) {
    console.error(`User with email "${emailArg}" not found.`);
    const allUsers = await prisma.user.findMany({
      select: { name: true, email: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("Existing users:", allUsers);
    process.exit(1);
  }

  const updatedMember = await prisma.projectMember.updateMany({
    where: { userId: user.id },
    data: { role: roleArg },
  });

  console.log(`Updated role for ${user.name} (${user.email}) -> ${roleArg} (${updatedMember.count} project membership(s))`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

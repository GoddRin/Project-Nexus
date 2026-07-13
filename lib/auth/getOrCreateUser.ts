import { prisma } from "@/lib/db/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

export async function getOrCreateUser(projectId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return { dbUser: null, member: null };

  const clerkId = clerkUser.id;
  let dbUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!dbUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || "unknown@projectnexus.dev";
    const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : email;
    dbUser = await prisma.user.create({
      data: {
        clerkId,
        email,
        name,
        memberships: {
          create: {
            projectId,
            role: Role.EMPLOYEE,
          },
        },
      },
    });
  }

  let member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: dbUser.id,
        projectId,
      },
    },
  });

  if (!member) {
    member = await prisma.projectMember.create({
      data: {
        userId: dbUser.id,
        projectId,
        role: Role.EMPLOYEE,
      },
    });
  }

  return { dbUser, member };
}

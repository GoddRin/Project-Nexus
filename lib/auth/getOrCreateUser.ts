import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

/** Capitalizes each word of a name: "harrold salva" -> "Harrold Salva" */
function formatName(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.includes("@")) {
    const local = trimmed.split("@")[0].split(/[._]/).filter(Boolean);
    if (local.length > 0) {
      return local.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return trimmed;
  }
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The signed-in person's database user and their membership of a project, created on first
 * sight (as an EMPLOYEE). The layout, the page and its widgets all ask for this while one page
 * is being built, so the answer is remembered for the length of that one request (React
 * `cache`): it is never shared between requests or people, and a role change shows on the next
 * page view. The user and the membership are read together in one query.
 */
async function loadUser(projectId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return { dbUser: null, member: null };

  const clerkId = clerkUser.id;
  const found = await prisma.user.findUnique({
    where: { clerkId },
    include: { memberships: { where: { projectId }, take: 1 } },
  });

  if (!found) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || "unknown@projectnexus.dev";
    const rawName = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : email;
    const name = formatName(rawName);
    const created = await prisma.user.create({
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
      include: { memberships: { where: { projectId }, take: 1 } },
    });
    const { memberships, ...dbUser } = created;
    return { dbUser, member: memberships[0] ?? null };
  }

  const { memberships, ...dbUser } = found;

  // Auto-upgrade lowercase names to properly capitalized title case
  if (dbUser.name) {
    const formatted = formatName(dbUser.name);
    if (formatted && formatted !== dbUser.name) {
      dbUser.name = formatted;
      prisma.user.update({ where: { id: dbUser.id }, data: { name: formatted } }).catch(() => {});
    }
  }

  let member = memberships[0] ?? null;
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

export const getOrCreateUser = cache(loadUser);

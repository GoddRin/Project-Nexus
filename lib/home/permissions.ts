import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { getCachedProject } from "@/lib/db/cachedQueries";
import { prisma } from "@/lib/db/prisma";
import { FLAGSHIP } from "./companyFacts";
import { NEWS_PUBLISHER_ROLES } from "./newsRoles";

export { NEWS_PUBLISHER_ROLES };

/**
 * May this user write, edit, pin or remove Newsroom posts? True when they hold one of the
 * publisher roles in ANY project they belong to (one indexed query). Hiding the button is not
 * authorisation: every Newsroom server action calls this again.
 */
export async function canPublishNews(userId: string): Promise<boolean> {
  const membership = await prisma.projectMember.findFirst({
    where: { userId, role: { in: NEWS_PUBLISHER_ROLES } },
    select: { id: true },
  });
  return membership !== null;
}

/**
 * The signed-in user as the Newsroom sees them: resolved the way the dashboard layout does it
 * (against the flagship project, which also creates the user record on first visit), then
 * checked for a publisher role. `user` is null when nobody is signed in.
 */
export async function getNewsViewer(): Promise<{ user: { id: string; name: string } | null; canPublish: boolean }> {
  try {
    const project = await getCachedProject(FLAGSHIP.slug);
    if (!project) return { user: null, canPublish: false };
    const { dbUser } = await getOrCreateUser(project.id);
    if (!dbUser) return { user: null, canPublish: false };
    return { user: { id: dbUser.id, name: dbUser.name }, canPublish: await canPublishNews(dbUser.id) };
  } catch (err) {
    console.warn("[home] could not resolve the Newsroom viewer:", err instanceof Error ? err.message : err);
    return { user: null, canPublish: false };
  }
}

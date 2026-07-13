import { getOrCreateUser } from "./getOrCreateUser";
export { getOrCreateUser };

export async function requireProjectMember(projectId?: string) {
  // If projectId is not provided, fetch the default Tumauini project
  let pid = projectId;
  if (!pid) {
    const { prisma } = await import("@/lib/db/prisma");
    const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
    if (!project) throw new Error("Default project not found");
    pid = project.id;
  }

  const { dbUser, member } = await getOrCreateUser(pid);
  if (!dbUser || !member) throw new Error("Unauthorized: No active session");
  return { dbUser, member, projectId: pid, role: member.role };
}

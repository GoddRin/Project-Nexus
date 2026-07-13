import { prisma } from "@/lib/db/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { EquipmentListClient } from "./EquipmentListClient";

export default async function EquipmentPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const clerkUser = await currentUser();
  let role = "GUEST";
  if (clerkUser) {
    const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (dbUser) {
      const member = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: dbUser.id, projectId: project.id } },
      });
      if (member) {
        role = member.role;
      }
    }
  }

  const isEditor = role === "ADMINISTRATOR" || role === "IT_SUPPORT" || role === "PROJECT_MANAGER";

  // Fetch all equipment for the project
  const equipment = await prisma.plantEquipment.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      equipmentTag: true,
      name: true,
      category: true,
      manufacturer: true,
      model: true,
      status: true,
      condition: true,
      location: true,
      siteLocation: {
        select: {
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: { equipmentTag: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plant Equipment Registry"
        subtitle="Data foundation and catalog of heavy operational machinery at Tumauini HEPP"
        className="mb-0!"
      />
      <EquipmentListClient initialEquipment={equipment} isEditor={isEditor} />
    </div>
  );
}

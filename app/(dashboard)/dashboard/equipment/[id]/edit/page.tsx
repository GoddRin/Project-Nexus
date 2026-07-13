import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { redirect, notFound } from "next/navigation";
import { EquipmentFormClient } from "../../new/EquipmentFormClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEquipmentPage({ params }: PageProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const { member } = await getOrCreateUser(project.id);
  if (!member) redirect(`/dashboard/equipment/${id}`);
  const allowedRoles = ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"];
  if (!allowedRoles.includes(member.role)) {
    redirect(`/dashboard/equipment/${id}`);
  }

  const equipment = await prisma.plantEquipment.findUnique({
    where: { id },
  });

  if (!equipment) notFound();

  const locations = await prisma.siteLocation.findMany({
    where: { projectId: project.id },
    orderBy: { name: "asc" },
  });

  // Cast JSON specifications
  const specs = (equipment.specifications as Record<string, string>) || {};

  return (
    <div className="max-w-6xl mx-auto">
      <EquipmentFormClient
        projectId={project.id}
        locations={locations}
        initialData={{
          ...equipment,
          specifications: specs,
        }}
      />
    </div>
  );
}

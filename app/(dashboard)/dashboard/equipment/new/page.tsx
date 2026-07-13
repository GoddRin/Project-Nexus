import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { redirect } from "next/navigation";
import { EquipmentFormClient } from "./EquipmentFormClient";

export default async function NewEquipmentPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const { member } = await getOrCreateUser(project.id);
  if (!member) redirect("/dashboard/equipment");
  const allowedRoles = ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"];
  if (!allowedRoles.includes(member.role)) {
    redirect("/dashboard/equipment");
  }

  // Fetch sitemap locations for this project to link equipment to zones
  const locations = await prisma.siteLocation.findMany({
    where: { projectId: project.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <EquipmentFormClient projectId={project.id} locations={locations} />
    </div>
  );
}

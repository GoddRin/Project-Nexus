import { prisma } from "@/lib/db/prisma";
import { RegionalMapWrapper } from "./RegionalMapWrapper";

export default async function RegionalMapPage() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  return <RegionalMapWrapper projectId={project.id} />;
}

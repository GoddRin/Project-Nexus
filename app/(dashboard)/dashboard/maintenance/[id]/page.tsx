import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { PageHeader } from "@/components/shared/PageHeader";
import { MaintenanceDetailClient } from "./MaintenanceDetailClient";
import { Role } from "@prisma/client";

export default async function MaintenanceDetailPage({
 params,
}: {
 params: { id: string };
}) {
 const project = await prisma.project.findUnique({
 where: { slug: "tumauini-hepp" },
 });

 if (!project) return null;

 const { member } = await getOrCreateUser(project.id);
 if (!member) {
 return <div className="p-8 text-white">Unauthorized</div>;
 }

 const schedule = await prisma.maintenanceSchedule.findUnique({
 where: { id: params.id, projectId: project.id },
 include: {
 asset: true,
 createdBy: { select: { id: true, name: true, email: true } },
 tasks: {
 include: {
 completedBy: { select: { name: true } },
 },
 orderBy: { createdAt: "asc" }
 }
 },
 });

 if (!schedule) {
 notFound();
 }

 const canManage = ([Role.ADMINISTRATOR, Role.IT_SUPPORT, Role.WAREHOUSE] as Role[]).includes(member.role);
 const canDelete = ([Role.ADMINISTRATOR, Role.PROJECT_MANAGER] as Role[]).includes(member.role);

 return (
 <div className="relative max-w-4xl">
 <PageHeader
 title={schedule.title}
 subtitle={`Maintenance Schedule for ${schedule.asset.name}`}
 />
 <div className="relative z-10">
 <MaintenanceDetailClient 
 schedule={schedule} 
 projectId={project.id}
 canManage={canManage}
 canDelete={canDelete}
 />
 </div>
 </div>
 );
}

import { Suspense } from "react";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { MaintenanceBrowserClient } from "./MaintenanceBrowserClient";
import { getCachedMaintenanceSchedules } from "@/lib/db/cachedQueries";
import { Role } from "@prisma/client";

export default async function MaintenancePage() {
 // 1. Auth & Project Context
 // We use the tumauini-hepp slug explicitly per the existing pattern
 const project = await prisma.project.findUnique({
 where: { slug: "tumauini-hepp" },
 });

 if (!project) return null;

 const { member } = await getOrCreateUser(project.id);
 if (!member) {
 return <div className="p-8 text-white">Unauthorized</div>;
 }

 // 2. Fetch Cached Data
 const schedules = await getCachedMaintenanceSchedules(project.id);

 // 3. Determine permissions
 const canManage = ([Role.ADMINISTRATOR, Role.IT_SUPPORT, Role.WAREHOUSE] as Role[]).includes(member.role);

 return (
 <div className="relative">
 <PageHeader
 title="Preventive Maintenance"
 subtitle="Manage upcoming maintenance schedules and history"
 >
 {canManage && (
 <Link href="/dashboard/maintenance/new">
 <Button>New Schedule</Button>
 </Link>
 )}
 </PageHeader>
 
 <div className="relative z-10">
 <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/[0.02] border border-white/[0.05]" />}>
 <MaintenanceBrowserClient 
 schedules={schedules} 
 canManage={canManage}
 />
 </Suspense>
 </div>
 </div>
 );
}

import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { ReportSubmissionForm } from "./ReportSubmissionForm";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
 // Fetch active project
 const project = await prisma.project.findFirst({
 where: { slug: "tumauini-hepp" },
 });
 if (!project) return notFound();

 // Authentication and JIT User Provisioning
 const { dbUser, member } = await getOrCreateUser(project.id);
 if (!dbUser || !member) {
 return redirect("/sign-in");
 }

 // Verify permissions: ENGINEER, SUPERVISOR, PROJECT_MANAGER, ADMINISTRATOR can create reports
 const allowedRoles = ["ENGINEER", "SUPERVISOR", "PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 return redirect("/dashboard/reports");
 }

 return (
 <div className="relative">
 {/* Breadcrumb Navigation */}
 <div className="mb-4 flex items-center gap-2 text-xs text-text-muted font-mono">
 <Link href="/dashboard/reports" className="hover:text-text-primary transition-colors">
 DAILY REPORTS
 </Link>
 <ChevronRight className="h-3 w-3" />
 <span className="text-text-primary">NEW SUBMISSION</span>
 </div>

 <PageHeader
 title="Submit Daily Accomplishment Report"
 subtitle="Record daily accomplishments, materials, equipment, and photos."
 />

 <ReportSubmissionForm projectId={project.id} />
 </div>
 );
}

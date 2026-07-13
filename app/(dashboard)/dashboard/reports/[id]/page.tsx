import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabase";
import { ReportDetailClient } from "./ReportDetailClient";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
 params: Promise<{
 id: string;
 }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
 const resolvedParams = await params;
 const { id } = resolvedParams;

 // Query accomplishment report
 const report = await prisma.accomplishmentReport.findUnique({
 where: { id },
 include: {
 submittedBy: {
 select: { id: true, name: true, email: true },
 },
 reviewedBy: {
 select: { id: true, name: true },
 },
 photos: {
 orderBy: { createdAt: "asc" },
 },
 },
 });

 if (!report) return notFound();

 // Authentication and JIT User Provisioning
 const { dbUser, member } = await getOrCreateUser(report.projectId);
 if (!dbUser || !member) {
 return redirect("/sign-in");
 }

 // Generate signed URLs for all report photos on the server
 const photosWithSignedUrls = await Promise.all(
 report.photos.map(async (photo) => {
 let signedUrl = "";
 try {
 const { data, error } = await supabaseAdmin.storage
 .from("report-photos")
 .createSignedUrl(photo.storagePath, 3600); // 1 hour expiration
 if (!error && data) {
 signedUrl = data.signedUrl;
 }
 } catch (err) {
 console.error(`Failed to sign URL for photo ${photo.id}:`, err);
 }
 return {
 id: photo.id,
 storagePath: photo.storagePath,
 caption: photo.caption,
 signedUrl,
 };
 })
 );

 const reportData = {
 id: report.id,
 projectId: report.projectId,
 reportDate: report.reportDate.toISOString(),
 workArea: report.workArea,
 weatherCondition: report.weatherCondition,
 accomplishments: report.accomplishments,
 equipmentUsed: report.equipmentUsed,
 materialsUsed: report.materialsUsed,
 delays: report.delays,
 remarks: report.remarks,
 status: report.status,
 reviewedById: report.reviewedById,
 reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
 rejectionReason: report.rejectionReason,
 createdAt: report.createdAt.toISOString(),
 submittedBy: report.submittedBy,
 reviewedBy: report.reviewedBy,
 photos: photosWithSignedUrls,
 };

 return (
 <div className="relative">
 {/* Breadcrumb Navigation */}
 <div className="mb-4 flex items-center gap-2 text-xs text-text-muted font-mono">
 <Link href="/dashboard/reports" className="hover:text-text-primary transition-colors">
 DAILY REPORTS
 </Link>
 <ChevronRight className="h-3 w-3" />
 <span className="text-text-primary">REPORT #{report.id.slice(-6).toUpperCase()}</span>
 </div>

 <PageHeader
 title={`Report - ${report.workArea}`}
 subtitle={`Submitted on ${report.reportDate.toLocaleDateString("en-US", {
 month: "long",
 day: "numeric",
 year: "numeric",
 })}`}
 />

 <ReportDetailClient report={reportData} userRole={member.role} />
 </div>
 );
}

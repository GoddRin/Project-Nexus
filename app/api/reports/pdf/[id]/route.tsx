import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabase";
import { pdf } from "@react-pdf/renderer";
import { ReportPdfTemplate } from "@/lib/pdf/ReportPdfTemplate";

interface PageProps {
 params: Promise<{
 id: string;
 }>;
}

export async function GET(
 request: NextRequest,
 { params }: PageProps
): Promise<NextResponse | Response> {
 try {
 const resolvedParams = await params;
 const { id } = resolvedParams;

 if (!id) {
 return NextResponse.json({ error: "Missing Report ID" }, { status: 400 });
 }

 // 1. Fetch accomplishment report details
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

 if (!report) {
 return NextResponse.json({ error: "Report not found" }, { status: 404 });
 }

 // 2. Validate user role and session (Project Member)
 const { dbUser, member } = await getOrCreateUser(report.projectId);
 if (!dbUser || !member) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 // 3. Generate signed URLs for report photos
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
 status: report.status as "SUBMITTED" | "APPROVED" | "REJECTED",
 reviewedById: report.reviewedById,
 reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
 rejectionReason: report.rejectionReason,
 createdAt: report.createdAt.toISOString(),
 submittedBy: report.submittedBy,
 reviewedBy: report.reviewedBy,
 photos: photosWithSignedUrls,
 };

 // 4. Generate the PDF buffer on the server
 const pdfBuffer = await pdf(
 <ReportPdfTemplate report={reportData} />
 ).toBuffer();

 // 5. Stream the PDF back to the browser
 return new NextResponse(pdfBuffer as unknown as BodyInit, {
 headers: {
 "Content-Type": "application/pdf",
 "Content-Disposition": `attachment; filename="report-${id.slice(-6).toUpperCase()}.pdf"`,
 "Cache-Control": "no-store, max-age=0",
 },
 });
 } catch (error) {
 console.error("PDF generation route error:", error);
 const message = error instanceof Error ? error.message : "Internal Server Error";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

"use server";

import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { WeatherCondition, ReportStatus } from "@prisma/client";

/**
 * Creates a new Accomplishment Report.
 * Allowed roles: ENGINEER, SUPERVISOR, PROJECT_MANAGER, ADMINISTRATOR
 */
export async function createReport(
 projectId: string,
 data: {
 reportDate: Date;
 workArea: string;
 weatherCondition: WeatherCondition;
 accomplishments: string;
 equipmentUsed?: string;
 materialsUsed?: string;
 delays?: string;
 remarks?: string;
 photos: { storagePath: string; caption?: string }[];
 }
) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 // Validate role
 const allowedRoles = ["ENGINEER", "SUPERVISOR", "PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 throw new Error("Forbidden: Only Engineers and Supervisors can submit accomplishment reports");
 }

 if (!data.workArea.trim()) {
 throw new Error("Work Area is required");
 }
 if (!data.accomplishments.trim()) {
 throw new Error("Accomplishments description is required");
 }

 // Create report and photos in a transaction
 const report = await prisma.$transaction(async (tx) => {
 const newReport = await tx.accomplishmentReport.create({
 data: {
 projectId,
 reportDate: new Date(data.reportDate),
 submittedById: dbUser.id,
 workArea: data.workArea,
 weatherCondition: data.weatherCondition,
 accomplishments: data.accomplishments,
 equipmentUsed: data.equipmentUsed || null,
 materialsUsed: data.materialsUsed || null,
 delays: data.delays || null,
 remarks: data.remarks || null,
 status: ReportStatus.SUBMITTED,
 photos: {
 create: data.photos.map((p) => ({
 storagePath: p.storagePath,
 caption: p.caption || null,
 })),
 },
 },
 });
 return newReport;
 });

 revalidatePath("/dashboard/reports");
 revalidatePath("/dashboard");
 return report;
}

/**
 * Approves a submitted Accomplishment Report.
 * Allowed roles: PROJECT_MANAGER, ADMINISTRATOR
 */
export async function approveReport(reportId: string) {
 const report = await prisma.accomplishmentReport.findUnique({
 where: { id: reportId },
 });
 if (!report) {
 throw new Error("Report not found");
 }

 const { dbUser, member } = await getOrCreateUser(report.projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 // Validate role: PM or Admin only
 if (member.role !== "PROJECT_MANAGER" && member.role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Only Project Managers and Administrators can approve accomplishment reports");
 }

 const updatedReport = await prisma.accomplishmentReport.update({
 where: { id: reportId },
 data: {
 status: ReportStatus.APPROVED,
 reviewedById: dbUser.id,
 reviewedAt: new Date(),
 rejectionReason: null,
 },
 });

 revalidatePath("/dashboard/reports");
 revalidatePath(`/dashboard/reports/${reportId}`);
 revalidatePath("/dashboard");
 return updatedReport;
}

/**
 * Rejects a submitted Accomplishment Report.
 * Allowed roles: PROJECT_MANAGER, ADMINISTRATOR
 */
export async function rejectReport(reportId: string, reason: string) {
 if (!reason || !reason.trim()) {
 throw new Error("Rejection reason is required");
 }

 const report = await prisma.accomplishmentReport.findUnique({
 where: { id: reportId },
 });
 if (!report) {
 throw new Error("Report not found");
 }

 const { dbUser, member } = await getOrCreateUser(report.projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 // Validate role: PM or Admin only
 if (member.role !== "PROJECT_MANAGER" && member.role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Only Project Managers and Administrators can reject accomplishment reports");
 }

 const updatedReport = await prisma.accomplishmentReport.update({
 where: { id: reportId },
 data: {
 status: ReportStatus.REJECTED,
 reviewedById: dbUser.id,
 reviewedAt: new Date(),
 rejectionReason: reason.trim(),
 },
 });

 revalidatePath("/dashboard/reports");
 revalidatePath(`/dashboard/reports/${reportId}`);
 revalidatePath("/dashboard");
 return updatedReport;
}

/**
 * Generates a signed URL for a photo in the report-photos bucket.
 */
export async function getSignedPhotoUrl(projectId: string, storagePath: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 throw new Error("Unauthorized: No active session");
 }

 const { data, error } = await supabaseAdmin.storage
 .from("report-photos")
 .createSignedUrl(storagePath, 60); // 60-second expiration

 if (error || !data) {
 throw new Error(error?.message || "Failed to generate signed URL");
 }

 return data.signedUrl;
}

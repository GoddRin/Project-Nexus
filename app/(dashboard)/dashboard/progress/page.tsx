import { prisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabase";
import { ProgressDashboardClient } from "./ProgressDashboardClient";
import { getCachedSnapshots, getCachedMilestones, getCachedReports } from "@/lib/db/cachedQueries";

// Auth must run per-request; only DB data queries are cached
export const dynamic = "force-dynamic";

export default async function ProgressDashboardPage() {
 const project = await prisma.project.findUnique({
 where: { slug: "tumauini-hepp" },
 });

 if (!project) return notFound();

 // Validate user authentication and project access
 const { dbUser, member } = await getOrCreateUser(project.id);
 if (!dbUser || !member) {
 return redirect("/sign-in");
 }

 // Fetch snapshots + milestones from cache (no DB round-trip on repeat nav)
 const [snapshots, milestones] = await Promise.all([
 getCachedSnapshots(project.id),
 getCachedMilestones(project.id),
 ]);

 const formattedSnapshots = snapshots.map((s) => {
 // unstable_cache serializes Dates to strings — wrap with new Date()
 const date = new Date(s.snapshotDate);
 return {
 id: s.id,
 snapshotDate: date.toISOString(),
 formattedDate: date.toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 year: "numeric",
 }),
 percentComplete: s.percentComplete,
 note: s.note,
 loggedBy: s.loggedBy.name,
 };
 });

 // Determine latest percentage
 const latestPercent =
 snapshots.length > 0
 ? snapshots[snapshots.length - 1].percentComplete
 : project.percentComplete ?? 0;

 // 2. Fetch milestones — already fetched above via Promise.all

 const formattedMilestones = milestones.map((m) => ({
 id: m.id,
 name: m.name,
 // Dates are strings after cache serialization
 targetDate: new Date(m.targetDate).toISOString(),
 completedDate: m.completedDate ? new Date(m.completedDate).toISOString() : null,
 status: m.status,
 }));

 // 3. Fetch recent 5 APPROVED accomplishment reports (cached)
 const allReports = await getCachedReports(project.id);
 const recentAccomplishments = allReports
 .filter((r) => r.status === "APPROVED")
 .slice(0, 5);


 const formattedAccomplishments = recentAccomplishments.map((r) => ({
 id: r.id,
 workArea: r.workArea,
 reportDate: new Date(r.reportDate).toISOString(),
 accomplishments: r.accomplishments,
 submittedByName: r.submittedBy.name,
 }));

 // 4. Fetch recent photos from approved reports
 const photos = await prisma.reportPhoto.findMany({
 where: {
 report: {
 projectId: project.id,
 status: "APPROVED",
 },
 },
 include: {
 report: {
 select: {
 id: true,
 workArea: true,
 reportDate: true,
 },
 },
 },
 orderBy: { createdAt: "desc" },
 take: 4,
 });

 // Sign URLs for photos
 const signedPhotos = await Promise.all(
 photos.map(async (p) => {
 let signedUrl = "";
 try {
 const { data, error } = await supabaseAdmin.storage
 .from("report-photos")
 .createSignedUrl(p.storagePath, 3600);
 if (!error && data) {
 signedUrl = data.signedUrl;
 }
 } catch (err) {
 console.error("Failed to sign photo URL:", err);
 }

 return {
 id: p.id,
 storagePath: p.storagePath,
 caption: p.caption,
 signedUrl,
 workArea: p.report.workArea,
 reportDate: p.report.reportDate.toISOString(),
 reportId: p.report.id,
 };
 })
 );

 return (
 <div className="relative space-y-6">
 <PageHeader
 title="Construction Progress Dashboard"
 subtitle="Physical S-Curve completion tracking, milestones, and daily accomplishment feeds"
 />

 <ProgressDashboardClient
 projectId={project.id}
 userRole={member.role}
 snapshots={formattedSnapshots}
 milestones={formattedMilestones}
 recentAccomplishments={formattedAccomplishments}
 recentPhotos={signedPhotos}
 latestPercent={latestPercent}
 />
 </div>
 );
}

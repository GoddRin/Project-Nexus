"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { getCachedProject } from "@/lib/db/cachedQueries";

async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) throw new Error("Unauthorized: No active session");
 return { dbUser, member };
}

function requireGuardOrAdmin(role: string) {
 if (role !== "GUARD" && role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Requires GUARD or ADMINISTRATOR role");
 }
}

export async function logVisitorIn(formData: FormData) {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) throw new Error("Project not found");
 
 const { dbUser, member } = await requireProjectMember(project.id);
 requireGuardOrAdmin(member.role);

 const fullName = formData.get("fullName") as string;
 const organization = formData.get("organization") as string | null;
 const purpose = formData.get("purpose") as string;
 const hostId = formData.get("hostId") as string;
 const vehicle = formData.get("vehicle") as string | null;
 const idType = formData.get("idType") as string | null;
 const idNumber = formData.get("idNumber") as string | null;
 const remarks = formData.get("remarks") as string | null;

 if (!hostId || hostId.trim() === "") {
    throw new Error("Invalid host. Please select a valid Host from the dropdown.");
  }

 await prisma.visitor.create({
 data: {
 projectId: project.id,
 fullName,
 organization: organization || null,
 purpose,
 hostId,
 vehicle: vehicle || null,
 idType: idType || null,
 idNumber: idNumber || null,
 remarks: remarks || null,
 loggedById: dbUser.id,
 status: "CHECKED_IN",
 }
 });

 revalidatePath("/dashboard/visitors");
 redirect("/dashboard/visitors");
}

export async function logVisitorOut(visitorId: string) {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) throw new Error("Project not found");
 
 const { member } = await requireProjectMember(project.id);
 requireGuardOrAdmin(member.role);

 await prisma.visitor.update({
 where: { id: visitorId },
 data: { 
 status: "CHECKED_OUT", 
 timeOut: new Date() 
 }
 });

 revalidatePath("/dashboard/visitors");
 revalidatePath(`/dashboard/visitors/${visitorId}`);
}

export async function updateVisitorRemarks(visitorId: string, remarks: string) {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) throw new Error("Project not found");
 
 const { member } = await requireProjectMember(project.id);
 requireGuardOrAdmin(member.role);

 await prisma.visitor.update({
 where: { id: visitorId },
 data: { remarks }
 });

 revalidatePath("/dashboard/visitors");
 revalidatePath(`/dashboard/visitors/${visitorId}`);
}

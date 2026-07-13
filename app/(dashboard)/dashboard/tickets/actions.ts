"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { getCachedProject } from "@/lib/db/cachedQueries";

/**
 * Helper to authenticate and get the caller's ProjectMember record.
 * Throws if unauthenticated or not a member of the project.
 */
async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) throw new Error("Unauthorized: No active session");
 return { dbUser, member };
}

/**
 * Helper to ensure the user has elevated roles for Helpdesk ops
 */
function requireElevatedRole(role: string) {
 if (role !== "IT_SUPPORT" && role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Requires IT_SUPPORT or ADMINISTRATOR role");
 }
}

/**
 * Create a new Ticket
 */
export async function createTicket(formData: FormData) {
 const project = await getCachedProject("tumauini-hepp");
 if (!project) throw new Error("Project not found");
 const projectId = project.id;

 const { dbUser } = await requireProjectMember(projectId);

 const title = formData.get("title") as string;
 const description = formData.get("description") as string;
 const priority = (formData.get("priority") as TicketPriority) || "MEDIUM";

 if (!title || !description) throw new Error("Title and description are required");

 const ticket = await prisma.ticket.create({
 data: {
 projectId,
 title,
 description,
 priority,
 status: "OPEN",
 createdById: dbUser.id,
 },
 });

 revalidateTag("tickets", "max");
 revalidatePath("/dashboard/tickets");
 redirect(`/dashboard/tickets/${ticket.id}`);
}

/**
 * Assign a Ticket
 */
export async function assignTicket(ticketId: string, assignedToId: string) {
 const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
 if (!ticket) throw new Error("Ticket not found");

 const { member } = await requireProjectMember(ticket.projectId);
 requireElevatedRole(member.role);

 await prisma.ticket.update({
 where: { id: ticketId },
 data: { assignedToId },
 });

 revalidateTag("tickets", "max");
 revalidatePath(`/dashboard/tickets/${ticketId}`);
 revalidatePath("/dashboard/tickets");
}

/**
 * Update Ticket Status
 */
export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
 const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
 if (!ticket) throw new Error("Ticket not found");

 const { member } = await requireProjectMember(ticket.projectId);
 requireElevatedRole(member.role);

 await prisma.ticket.update({
 where: { id: ticketId },
 data: { status },
 });

 revalidateTag("tickets", "max");
 revalidatePath(`/dashboard/tickets/${ticketId}`);
 revalidatePath("/dashboard/tickets");
}

/**
 * Add a Comment
 */
export async function addComment(formData: FormData) {
 const ticketId = formData.get("ticketId") as string;
 const body = formData.get("body") as string;

 if (!ticketId || !body) throw new Error("Ticket ID and comment body required");

 const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
 if (!ticket) throw new Error("Ticket not found");

 const { dbUser } = await requireProjectMember(ticket.projectId);

 await prisma.ticketComment.create({
 data: {
 ticketId,
 authorId: dbUser.id,
 body,
 },
 });

 revalidateTag("tickets", "max");
 revalidatePath(`/dashboard/tickets/${ticketId}`);
}

import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, updateTicketStatus, assignTicket } from "../actions";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCombobox } from "@/components/shared/UserCombobox";

function StatusBadge({ status }: { status: TicketStatus }) {
 const styles: Record<TicketStatus, string> = {
 OPEN: "bg-flow-teal/20 text-flow-teal border-flow-teal/30 hover:bg-flow-teal/30",
 IN_PROGRESS: "bg-signal-amber/20 text-signal-amber border-signal-amber/30 hover:bg-signal-amber/30",
 RESOLVED: "bg-text-muted/20 text-text-muted border-text-muted/30 hover:bg-text-muted/30",
 CLOSED: "bg-bg-panel-raised text-text-muted border-border-hairline hover:bg-bg-panel-raised",
 };
 return <Badge variant="outline" className={styles[status]}>{status.replace("_", " ")}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
 const styles: Record<TicketPriority, string> = {
 LOW: "text-text-muted border-border-hairline",
 MEDIUM: "text-text-primary border-border-hairline",
 HIGH: "text-signal-amber border-signal-amber/30",
 URGENT: "text-signal-red border-signal-red/30 bg-signal-red/10",
 };
 return <Badge variant="outline" className={styles[priority]}>{priority}</Badge>;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const resolvedParams = await params;
 const ticketId = resolvedParams.id;
 const { userId: clerkId } = await auth();

 const ticket = await prisma.ticket.findUnique({
 where: { id: ticketId },
 include: {
 createdBy: true,
 assignedTo: true,
 comments: {
 include: { author: true },
 orderBy: { createdAt: "asc" },
 },
 },
 });

 if (!ticket) notFound();

 // Find the current user's role in this project
 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkId || "" }});
 const currentUserMembership = await prisma.projectMember.findUnique({
 where: {
 userId_projectId: {
 userId: dbUser?.id || "",
 projectId: ticket.projectId,
 }
 }
 });

 const canManage = currentUserMembership && (currentUserMembership.role === "IT_SUPPORT" || currentUserMembership.role === "ADMINISTRATOR");

 // Fetch all potential assignees for the project (if can manage)
 let projectMembers: Array<{ role: string, user: { id: string, name: string } }> = [];
 if (canManage) {
 projectMembers = await prisma.projectMember.findMany({
 where: { projectId: ticket.projectId },
 include: { user: true },
 });
 }

 return (
 <div className="relative max-w-4xl space-y-6">
 <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
 <div>
 <h1 className="font-display text-2xl font-semibold text-text-primary">{ticket.title}</h1>
 <p className="mt-1 text-sm text-text-muted">
 Opened {new Date(ticket.createdAt).toLocaleDateString()} by {ticket.createdBy.name}
 </p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <PriorityBadge priority={ticket.priority} />
 <StatusBadge status={ticket.status} />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
 <div className="md:col-span-2 space-y-6">
 <Card className="border-border-hairline bg-bg-panel">
 <CardHeader>
 <CardTitle className="text-sm font-medium text-text-muted">Description</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="whitespace-pre-wrap text-text-primary">{ticket.description}</p>
 </CardContent>
 </Card>

 <div className="space-y-4">
 <h3 className="font-display text-lg font-medium text-text-primary">Comments</h3>
 
 {ticket.comments.length === 0 ? (
 <p className="text-sm text-text-muted">No comments yet.</p>
 ) : (
 <div className="space-y-4">
 {ticket.comments.map((comment) => (
 <Card key={comment.id} className="border-border-hairline bg-bg-panel">
 <CardContent className="p-4">
 <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
 <span className="font-medium text-text-primary">{comment.author.name}</span>
 <span>{new Date(comment.createdAt).toLocaleString()}</span>
 </div>
 <p className="whitespace-pre-wrap text-sm text-text-primary">{comment.body}</p>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 <form action={addComment} className="mt-4 space-y-3">
 <input type="hidden" name="ticketId" value={ticket.id} />
 <Textarea 
 name="body" 
 required 
 placeholder="Leave a comment..."
 className="border-border-hairline bg-input/20 text-text-primary" 
 />
 <Button type="submit" className="bg-flow-teal text-bg-base hover:bg-flow-teal/90">
 Post Comment
 </Button>
 </form>
 </div>
 </div>

 <div className="space-y-6">
 <Card className="border-border-hairline bg-bg-panel">
 <CardHeader>
 <CardTitle className="text-sm font-medium text-text-muted">Details</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <p className="text-xs text-text-muted">Assignee</p>
 <p className="text-sm font-medium text-text-primary">
 {ticket.assignedTo?.name || "Unassigned"}
 </p>
 </div>

 {canManage && (
 <div className="space-y-3 pt-4 border-t border-border-hairline">
 <form action={async (formData) => {
 "use server";
 const status = formData.get("status") as TicketStatus;
 await updateTicketStatus(ticket.id, status);
 }}>
 <div className="space-y-2">
 <p className="text-xs text-text-muted">Update Status</p>
 <div className="flex gap-2">
 <Select key={ticket.status} name="status" defaultValue={ticket.status}>
 <SelectTrigger className="border-border-hairline bg-input/20 text-text-primary">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.values(TicketStatus).map((status) => (
 <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button type="submit" variant="outline" className="border-border-hairline">Save</Button>
 </div>
 </div>
 </form>

 <form action={async (formData) => {
 "use server";
 const assigneeId = formData.get("assigneeId") as string;
 await assignTicket(ticket.id, assigneeId);
 }}>
  <div className="space-y-2">
  <p className="text-xs text-text-muted">Update Assignee</p>
  <div className="flex gap-2">
  <div className="flex-1">
  <UserCombobox
  inputName="assigneeId"
  users={projectMembers.map((m) => ({
  id: m.user.id,
  name: m.user.name,
  role: m.role,
  }))}
  defaultValue={ticket.assignedToId || ""}
  />
  </div>
  <Button type="submit" variant="outline" className="border-border-hairline">Save</Button>
  </div>
  </div>
 </form>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTicket } from "../actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { TicketPriority } from "@prisma/client";
import { Loader2 } from "lucide-react";

function SubmitButton() {
 const { pending } = useFormStatus();
 return (
 <Button
 type="submit"
 disabled={pending}
 className="bg-flow-teal text-bg-base hover:bg-flow-teal/90 min-w-[130px]"
 >
 {pending ? (
 <span className="flex items-center gap-2">
 <Loader2 className="h-4 w-4 animate-spin" />
 Submitting…
 </span>
 ) : (
 "Submit Ticket"
 )}
 </Button>
 );
}

export default function NewTicketPage() {
 const [error, formAction] = useActionState(
 async (_prev: string | null, formData: FormData) => {
 try {
 await createTicket(formData);
 return null;
 } catch (err) {
 // redirect() throws a special Next.js error — re-throw it
 if (
 err instanceof Error &&
 err.message.includes("NEXT_REDIRECT")
 ) {
 throw err;
 }
 return err instanceof Error ? err.message : "Failed to submit ticket. Please try again.";
 }
 },
 null
 );

 return (
 <div className="relative max-w-2xl">
 <PageHeader
 title="Create Ticket"
 subtitle="Open a new IT helpdesk ticket for Tumauini HEPP."
 />

 <div className="glass-card p-6">
 <form action={formAction} className="space-y-6">
 {error && (
 <div className="rounded-xl border border-signal-red/30 bg-signal-red/10 px-4 py-3 text-sm text-signal-red">
 {error}
 </div>
 )}

 <div className="space-y-2">
 <Label htmlFor="title" className="text-text-primary">
 Title
 </Label>
 <Input
 id="title"
 name="title"
 required
 placeholder="E.g. SCADA network switch offline"
 className="border-border-hairline bg-white/[0.04] text-text-primary"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="description" className="text-text-primary">
 Description
 </Label>
 <Textarea
 id="description"
 name="description"
 required
 rows={4}
 placeholder="Describe the issue in detail..."
 className="border-border-hairline bg-white/[0.04] text-text-primary"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="priority" className="text-text-primary">
 Priority
 </Label>
 <Select name="priority" defaultValue="MEDIUM">
 <SelectTrigger className="border-border-hairline bg-white/[0.04] text-text-primary w-full md:w-[200px]">
 <SelectValue placeholder="Select priority" />
 </SelectTrigger>
 <SelectContent>
 {Object.values(TicketPriority).map((priority) => (
 <SelectItem key={priority} value={priority}>
 {priority}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="flex gap-3 pt-4">
 <SubmitButton />
 <Link href="/dashboard/tickets">
 <Button
 type="button"
 variant="outline"
 className="border-border-hairline text-text-muted hover:text-text-primary"
 >
 Cancel
 </Button>
 </Link>
 </div>
 </form>
 </div>
 </div>
 );
}

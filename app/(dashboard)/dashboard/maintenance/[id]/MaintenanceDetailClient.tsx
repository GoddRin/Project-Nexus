"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
 Wrench,
 Clock,
 CheckCircle2,
 AlertCircle,
 Package,
 Calendar,
 Play,
 Check,
 User,
 Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";
import { startMaintenance, completeTask, completeMaintenance, deleteSchedule } from "../actions";
import Link from "next/link";

type Task = {
 id: string;
 title: string;
 notes: string | null;
 completedAt: Date | null;
 completedBy: { name: string } | null;
 condition?: string | null;
 issueFound?: string | null;
 actionTaken?: string | null;
 withWarranty?: boolean | null;
};

type ScheduleDetail = {
 id: string;
 title: string;
 description: string | null;
 frequencyDays: number;
 nextDueDate: Date;
 lastDoneDate: Date | null;
 status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
 asset: {
 id: string;
 name: string;
 };
 createdBy: {
 name: string;
 };
 tasks: Task[];
};

const STATUS_CONFIG = {
 UPCOMING: {
 label: "Upcoming",
 icon: Clock,
 className: "bg-white/5 text-text-muted ring-1 ring-white/10"
 },
 IN_PROGRESS: {
 label: "In Progress",
 icon: Wrench,
 className: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]"
 },
 OVERDUE: {
 label: "Overdue",
 icon: AlertCircle,
 className: "bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30 shadow-[inset_0_1px_0_0_rgba(214,72,63,0.2)]"
 },
 COMPLETED: {
 label: "Completed",
 icon: CheckCircle2,
 className: "bg-brand-green/10 text-brand-green ring-1 ring-brand-green/30 shadow-[inset_0_1px_0_0_rgba(1,119,11,0.2)]"
 }
};

export function MaintenanceDetailClient({
 schedule,
 projectId,
 canManage,
 canDelete,
}: {
 schedule: ScheduleDetail;
 projectId: string;
 canManage: boolean;
 canDelete: boolean;
}) {
 const router = useRouter();
 const [isStarting, setIsStarting] = useState(false);
 const [isCompleting, setIsCompleting] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [taskSubmitting, setTaskSubmitting] = useState<string | null>(null);

 const now = new Date();
 
 // Visual Overdue computation matches the list page
 const visualStatus = schedule.status === "UPCOMING" && new Date(schedule.nextDueDate) < now 
 ? "OVERDUE" 
 : schedule.status;

 const statusConfig = STATUS_CONFIG[visualStatus];
 const StatusIcon = statusConfig.icon;

 const allTasksCompleted = schedule.tasks.every(t => t.completedAt !== null);

 async function handleStart() {
 setIsStarting(true);
 try {
 await startMaintenance(projectId, schedule.id);
 toast.success("Maintenance started", { description: "Asset status is now IN_MAINTENANCE" });
 router.refresh();
 } catch (error) {
 toast.error("Failed to start", { description: error instanceof Error ? error.message : "An error occurred" });
 } finally {
 setIsStarting(false);
 }
 }

 async function handleComplete() {
 setIsCompleting(true);
 try {
 await completeMaintenance(projectId, schedule.id);
 toast.success("Maintenance completed", { description: "Asset is now ACTIVE and next due date calculated" });
 router.refresh();
 } catch (error) {
 toast.error("Failed to complete", { description: error instanceof Error ? error.message : "An error occurred" });
 } finally {
 setIsCompleting(false);
 }
 }

 async function handleTaskSubmit(formData: FormData) {
  const taskId = formData.get("taskId") as string;
  if (taskSubmitting) return;
  setTaskSubmitting(taskId);
  try {
  await completeTask(
  projectId, 
  taskId, 
  formData.get("notes") as string || null,
  formData.get("condition") as string || null,
  formData.get("issueFound") as string || null,
  formData.get("actionTaken") as string || null,
  formData.get("hasWarranty") === "true"
  );
  toast.success("Task completed");
  router.refresh();
  } catch (error) {
  toast.error("Failed to update task", { description: error instanceof Error ? error.message : "An error occurred" });
  } finally {
  setTaskSubmitting(null);
  }
  }

 async function handleDelete() {
 if (!confirm("Are you sure you want to delete this maintenance schedule? This cannot be undone.")) return;
 setIsDeleting(true);
 try {
 await deleteSchedule(projectId, schedule.id);
 toast.success("Schedule deleted");
 router.push("/dashboard/maintenance");
 } catch (error) {
 toast.error("Failed to delete", { description: error instanceof Error ? error.message : "An error occurred" });
 setIsDeleting(false);
 }
 }

 return (
 <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
 {/* Main Content (Left, 2 cols) */}
 <div className="space-y-6 md:col-span-2">
 
 {/* Info Card */}
 <AnimatedSection delay={0.05}>
 <div className="glass-card overflow-hidden">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <div className={cn(
 "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
 statusConfig.className
 )}>
 <StatusIcon className="h-4 w-4" />
 <span>{statusConfig.label}</span>
 </div>
 {canDelete && (
 <Button 
 variant="ghost" 
 size="sm"
 disabled={isDeleting}
 onClick={handleDelete}
 className="text-text-muted hover:text-signal-red hover:bg-signal-red/10"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 )}
 </div>

 <div className="space-y-6">
 {schedule.description && (
 <div>
 <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">Description</h4>
 <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-wrap">
 {schedule.description}
 </p>
 </div>
 )}
 
 <div className="grid grid-cols-2 gap-4">
 <Link href={`/dashboard/assets/${schedule.asset.id}`}>
 <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 transition-colors hover:bg-white/[0.04]">
 <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Asset</h4>
 <div className="flex items-center gap-2 text-sm font-medium text-flow-teal">
 <Package className="h-4 w-4" />
 <span className="truncate">{schedule.asset.name}</span>
 </div>
 </div>
 </Link>
 <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
 <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Created By</h4>
 <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
 <User className="h-4 w-4 text-text-muted" />
 <span className="truncate">{schedule.createdBy.name}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </AnimatedSection>

 {/* Task List */}
 <AnimatedSection delay={0.1}>
 <div className="glass-card overflow-hidden">
 <div className="border-b border-white/[0.05] bg-white/[0.02] px-6 py-4">
 <h3 className="font-display font-semibold text-text-primary flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 text-flow-teal" />
 Maintenance Checklist
 </h3>
 </div>
 <div className="p-0">
 {schedule.tasks.length === 0 ? (
 <div className="p-6 text-center text-text-muted text-sm">
 No tasks defined for this schedule.
 </div>
 ) : (
 <div className="divide-y divide-white/[0.05]">
 {schedule.tasks.map((task) => {
 const isCompleted = task.completedAt !== null;
 const canComplete = canManage && schedule.status === "IN_PROGRESS" && !isCompleted;
  return (
  <div key={task.id} className="p-4 sm:p-6 hover:bg-white/[0.01] transition-colors border-b border-white/[0.05] last:border-0">
  <div className="flex items-start gap-4">
  {isCompleted ? (
  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-flow-teal bg-flow-teal/20 text-flow-teal shadow-[0_0_10px_rgba(31,182,166,0.3)]">
  <Check className="h-3.5 w-3.5" />
  </div>
  ) : (
  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/20" />
  )}
  <div className="flex-1 min-w-0">
  <p className={cn(
  "text-sm font-medium transition-colors",
  isCompleted ? "text-text-primary line-through decoration-white/20" : "text-text-primary"
  )}>
  {task.title}
  </p>
  {isCompleted && task.completedBy && (
  <div className="mt-2 space-y-2">
  <p className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted/80">
  <CheckCircle2 className="h-3 w-3 text-flow-teal" />
  Completed by {task.completedBy.name} on {new Date(task.completedAt!).toLocaleDateString()}
  </p>
  {task.condition && <p className="text-xs text-text-muted"><span className="font-semibold text-text-primary">Condition:</span> {task.condition}</p>}
  {task.issueFound && <p className="text-xs text-text-muted"><span className="font-semibold text-text-primary">Issue:</span> {task.issueFound}</p>}
  {task.actionTaken && <p className="text-xs text-text-muted"><span className="font-semibold text-text-primary">Action:</span> {task.actionTaken}</p>}
  {task.withWarranty !== null && <p className="text-xs text-text-muted"><span className="font-semibold text-text-primary">With Warranty?:</span> {task.withWarranty ? "YES" : "NO"}</p>}
  </div>
  )}
  </div>
  </div>

  {canComplete && (
  <form action={handleTaskSubmit} className="mt-4 pl-10 space-y-3">
  <input type="hidden" name="taskId" value={task.id} />
  
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div className="space-y-1">
  <label className="text-[10px] uppercase tracking-wider text-text-muted">Condition</label>
  <input name="condition" placeholder="e.g. Needs Repair" className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-xs text-text-primary outline-none focus:border-flow-teal" />
  </div>
  <div className="space-y-1">
  <label className="text-[10px] uppercase tracking-wider text-text-muted">With Warranty?</label>
  <select name="hasWarranty" className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-xs text-text-primary outline-none focus:border-flow-teal [&_option]:bg-bg-panel">
  <option value="false">NO</option>
  <option value="true">YES</option>
  </select>
  </div>
  <div className="space-y-1 sm:col-span-2">
  <label className="text-[10px] uppercase tracking-wider text-text-muted">Issue Found</label>
  <input name="issueFound" placeholder="Describe the issue" className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-xs text-text-primary outline-none focus:border-flow-teal" />
  </div>
  <div className="space-y-1 sm:col-span-2">
  <label className="text-[10px] uppercase tracking-wider text-text-muted">Action Taken</label>
  <input name="actionTaken" placeholder="What was done" className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-xs text-text-primary outline-none focus:border-flow-teal" />
  </div>
  <div className="space-y-1 sm:col-span-2">
  <label className="text-[10px] uppercase tracking-wider text-text-muted">Additional Notes (Optional)</label>
  <input name="notes" placeholder="Any other notes" className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-xs text-text-primary outline-none focus:border-flow-teal" />
  </div>
  </div>

  <div className="pt-2">
  <Button type="submit" size="sm" disabled={taskSubmitting === task.id}>
  {taskSubmitting === task.id ? "Saving..." : "Log & Complete Task"}
  </Button>
  </div>
  </form>
  )}
  </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </AnimatedSection>
 </div>

 {/* Sidebar (Right, 1 col) */}
 <div className="space-y-6 md:col-span-1">
 
 {/* Actions Card */}
 {canManage && schedule.status !== "COMPLETED" && (
 <AnimatedSection delay={0.15}>
 <div className="glass-card p-6">
 <h3 className="font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
 <Play className="h-4 w-4 text-flow-teal" />
 Actions
 </h3>
 
 {schedule.status === "UPCOMING" || schedule.status === "OVERDUE" ? (
 <Button 
 onClick={handleStart} 
 disabled={isStarting}
 className="w-full bg-flow-teal text-black hover:bg-flow-teal/90 shadow-[0_0_15px_rgba(31,182,166,0.3)]"
 >
 {isStarting ? "Starting..." : "Start Maintenance"}
 </Button>
 ) : schedule.status === "IN_PROGRESS" ? (
 <Button 
 onClick={handleComplete} 
 disabled={isCompleting || !allTasksCompleted}
 className="w-full bg-brand-green text-white hover:bg-brand-green/90 shadow-[0_0_15px_rgba(1,119,11,0.3)]"
 >
 {isCompleting ? "Completing..." : "Complete Maintenance"}
 </Button>
 ) : null}

 {schedule.status === "IN_PROGRESS" && !allTasksCompleted && (
 <p className="text-xs text-text-muted text-center mt-3">
 All tasks must be checked off before completing.
 </p>
 )}
 </div>
 </AnimatedSection>
 )}

 {/* Schedule Card */}
 <AnimatedSection delay={0.2}>
 <div className="glass-card p-6">
 <h3 className="font-display font-semibold text-text-primary mb-4 flex items-center gap-2">
 <Calendar className="h-4 w-4 text-flow-teal" />
 Schedule info
 </h3>
 <div className="space-y-4">
 <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
 <span className="text-xs text-text-muted">Frequency</span>
 <span className="text-sm font-medium text-text-primary">{schedule.frequencyDays} Days</span>
 </div>
 <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
 <span className="text-xs text-text-muted">Due Date</span>
 <span className="text-sm font-medium text-text-primary">
 {new Date(schedule.nextDueDate).toLocaleDateString()}
 </span>
 </div>
 <div className="flex justify-between items-center py-2">
 <span className="text-xs text-text-muted">Last Completed</span>
 <span className="text-sm font-medium text-text-primary">
 {schedule.lastDoneDate ? new Date(schedule.lastDoneDate).toLocaleDateString() : "Never"}
 </span>
 </div>
 </div>
 </div>
 </AnimatedSection>

 </div>
 </div>
 );
}

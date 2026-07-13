"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
 Wrench, 
 Search,
 Package,
 Calendar,
 CheckCircle2,
 Clock,
 AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

type Schedule = {
 id: string;
 projectId: string;
 assetId: string;
 title: string;
 description: string | null;
 frequencyDays: number;
 nextDueDate: Date;
 lastDoneDate: Date | null;
 status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
 asset: {
 id: string;
 name: string;
 category: string;
 };
};

export function MaintenanceBrowserClient({
 schedules,
 canManage,
}: {
 schedules: Schedule[];
 canManage: boolean;
}) {
 const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

 const now = new Date();

 // "Upcoming & Active" — schedules with status UPCOMING or IN_PROGRESS.
 // We apply the OVERDUE visual treatment to UPCOMING schedules that are past their nextDueDate.
 const activeSchedules = schedules
 .filter((s) => ["UPCOMING", "IN_PROGRESS", "OVERDUE"].includes(s.status))
 .map((s) => ({
 ...s,
 // Visual OVERDUE override
 visualStatus: s.status === "UPCOMING" && new Date(s.nextDueDate) < now 
 ? "OVERDUE" 
 : s.status
 }))
 .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

 // "History" — schedules with status COMPLETED.
 const historySchedules = schedules
 .filter((s) => s.status === "COMPLETED")
 .sort((a, b) => {
 const aDate = a.lastDoneDate ? new Date(a.lastDoneDate).getTime() : 0;
 const bDate = b.lastDoneDate ? new Date(b.lastDoneDate).getTime() : 0;
 return bDate - aDate;
 });

 const displayedSchedules = activeTab === "ACTIVE" ? activeSchedules : historySchedules;

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

 return (
 <div className="space-y-6">
 {/* Action Bar */}
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 {/* Tabs */}
 <div className="flex w-full items-center gap-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] p-1 ring-1 ring-black/[0.05] dark:ring-white/[0.05] sm:w-auto">
 <button
 onClick={() => setActiveTab("ACTIVE")}
 className={cn(
 "flex-1 rounded-lg px-4 py-2 font-display text-sm font-medium transition-all duration-200 sm:flex-none",
 activeTab === "ACTIVE"
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/[0.08] dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/[0.05]"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary"
 )}
 >
 Upcoming & Active
 </button>
 <button
 onClick={() => setActiveTab("HISTORY")}
 className={cn(
 "flex-1 rounded-lg px-4 py-2 font-display text-sm font-medium transition-all duration-200 sm:flex-none",
 activeTab === "HISTORY"
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/[0.08] dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/[0.05]"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary"
 )}
 >
 History
 </button>
 </div>

 {/* Search & Actions (Placeholder for now, keeping UI consistent) */}
 <div className="flex items-center gap-3">
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-flow-teal transition-colors" />
 <input
 type="text"
 placeholder="Search schedules..."
 className="h-10 w-full sm:w-64 rounded-xl bg-white/[0.02] border border-white/[0.05] pl-10 pr-4 text-sm text-white placeholder-text-muted/50 outline-none focus:border-flow-teal/50 focus:bg-white/[0.04] transition-all"
 />
 </div>
 </div>
 </div>

 {/* Grid */}
 <div className="relative min-h-[400px]">
 {displayedSchedules.length === 0 ? (
 <EmptyState
 icon={Wrench}
 title={activeTab === "ACTIVE" ? "No active schedules" : "No maintenance history"}
 description={activeTab === "ACTIVE" ? "There are currently no upcoming or active maintenance tasks." : "Completed schedules will appear here."}
 actionLabel={canManage && activeTab === "ACTIVE" ? "Create Schedule" : undefined}
 actionHref="/dashboard/maintenance/new"
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 <AnimatePresence mode="popLayout">
 {displayedSchedules.map((schedule, i) => {
 const statusStr = (schedule as Schedule & { visualStatus?: string }).visualStatus || schedule.status;
 const status = STATUS_CONFIG[statusStr as keyof typeof STATUS_CONFIG];
 const StatusIcon = status.icon;

 return (
 <motion.div
 key={schedule.id}
 layout
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2, delay: i * 0.05 }}
 className="group"
 >
 <Link href={`/dashboard/maintenance/${schedule.id}`}>
 <div className="glass-card flex h-full flex-col p-5 transition-all duration-300 hover:bg-white/[0.04] hover:shadow-xl">
 
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className={cn(
 "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
 status.className
 )}>
 <StatusIcon className="h-3.5 w-3.5" />
 <span>{status.label}</span>
 </div>
 </div>

 {/* Title & Asset */}
 <div className="mb-4 flex-1">
 <h3 className="font-display text-lg font-semibold text-text-primary mb-1 group-hover:text-flow-teal transition-colors">
 {schedule.title}
 </h3>
 <div className="flex items-center gap-1.5 text-sm text-text-muted">
 <Package className="h-3.5 w-3.5" />
 <span className="truncate">{schedule.asset.name}</span>
 </div>
 </div>

 {/* Details */}
 <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-4">
 <div>
 <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70 mb-0.5">
 Frequency
 </p>
 <p className="text-sm font-medium text-text-primary">
 {schedule.frequencyDays} Days
 </p>
 </div>
 <div>
 <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70 mb-0.5">
 {activeTab === "ACTIVE" ? "Due Date" : "Completed"}
 </p>
 <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
 <Calendar className="h-3.5 w-3.5 text-text-muted" />
 <span>
 {new Date(activeTab === "ACTIVE" ? schedule.nextDueDate : (schedule.lastDoneDate || schedule.nextDueDate)).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 {/* Quick Action Button (Visual only on list page) */}
 {canManage && activeTab === "ACTIVE" && (
 <div className="mt-auto">
 <div className="w-full rounded-lg bg-white/[0.03] px-4 py-2 text-center text-sm font-medium text-text-muted ring-1 ring-white/10 transition-colors group-hover:bg-flow-teal group-hover:text-black group-hover:ring-flow-teal group-hover:shadow-[0_0_15px_rgba(31,182,166,0.4)]">
 {statusStr === "IN_PROGRESS" ? "Complete Maintenance" : "Start Maintenance"}
 </div>
 </div>
 )}
 </div>
 </Link>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>
 )}
 </div>
 </div>
 );
}

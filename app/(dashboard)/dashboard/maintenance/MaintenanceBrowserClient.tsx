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
      className: "bg-black/[0.02] dark:bg-white/5 text-text-muted border border-border-hairline"
    },
    IN_PROGRESS: {
      label: "In Progress",
      icon: Wrench,
      className: "bg-scic-blue/10 text-scic-blue dark:bg-scic-cyan/10 dark:text-scic-cyan border border-scic-blue/20 dark:border-scic-cyan/30"
    },
    OVERDUE: {
      label: "Overdue",
      icon: AlertCircle,
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 font-bold"
    },
    COMPLETED: {
      label: "Completed",
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex w-full items-center gap-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] p-1 border border-border-hairline sm:w-auto">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all sm:flex-initial",
              activeTab === "ACTIVE"
                ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            Active & Upcoming ({activeSchedules.length})
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all sm:flex-initial",
              activeTab === "HISTORY"
                ? "bg-scic-blue text-white dark:bg-scic-cyan dark:text-slate-950 shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            History & Logs ({historySchedules.length})
          </button>
        </div>

 {/* Search & Actions */}
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
          description={
            activeTab === "ACTIVE"
              ? "All equipment is currently up to date on preventive maintenance."
              : "Completed maintenance logs will be cataloged here."
          }
          actionLabel={canManage && activeTab === "ACTIVE" ? "Schedule Maintenance" : undefined}
          actionHref={canManage && activeTab === "ACTIVE" ? "/dashboard/maintenance/new" : undefined}
          intent="primary"
        />
 ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {displayedSchedules.map((schedule, i) => {
              const statusCfg = STATUS_CONFIG[(schedule as any).visualStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UPCOMING;
              const StatusIcon = statusCfg.icon;

              return (
                <motion.div
                  key={schedule.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <Link
                    href={`/dashboard/maintenance/${schedule.id}`}
                    className="glass-scic-card group flex h-full flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-1 hover:border-scic-blue/30 dark:hover:border-scic-cyan/30"
                  >
 
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusCfg.className
                      )}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{statusCfg.label}</span>
                      </div>
                    </div>

                    {/* Title & Asset */}
                    <div className="mb-4 flex-1">
                      <h3 className="font-display text-base font-bold text-text-primary mb-1 group-hover:text-scic-blue dark:group-hover:text-scic-cyan transition-colors">
                        {schedule.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Package className="h-3.5 w-3.5" />
                        <span className="truncate">{schedule.asset.name}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline mb-4">
                      <div>
                        <p className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-muted mb-0.5">
                          Frequency
                        </p>
                        <p className="text-xs font-semibold text-text-primary">
                          {schedule.frequencyDays} Days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-muted mb-0.5">
                          {activeTab === "ACTIVE" ? "Due Date" : "Completed"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                          <Calendar className="h-3.5 w-3.5 text-scic-blue dark:text-scic-cyan" />
                          <span>
                            {new Date(activeTab === "ACTIVE" ? schedule.nextDueDate : (schedule.lastDoneDate || schedule.nextDueDate)).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    {canManage && activeTab === "ACTIVE" && (
                      <div className="mt-auto">
                        <div className="w-full rounded-xl bg-black/[0.02] dark:bg-white/[0.03] px-3.5 py-2 text-center text-xs font-semibold text-text-muted border border-border-hairline transition-all group-hover:bg-scic-blue dark:group-hover:bg-scic-cyan group-hover:text-white dark:group-hover:text-slate-950">
                          View & Complete Maintenance &rarr;
                        </div>
                      </div>
                    )}
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

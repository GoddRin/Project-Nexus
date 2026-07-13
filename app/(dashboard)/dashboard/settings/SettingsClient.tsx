"use client";

import { useState, useTransition } from "react";
import { updateProjectCod, updateMilestoneStatus, reorderMilestones, addMilestone } from "./actions";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Calendar, Plus, ShieldAlert, CheckCircle2, AlertTriangle, Play, HelpCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MilestoneCategory, MilestoneStatus2 } from "@prisma/client";

interface Milestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  targetDate: string | null;
  completedAt: string | null;
  status: MilestoneStatus2;
  order: number;
  isCritical: boolean;
}

interface SettingsClientProps {
  projectId: string;
  initialCodDate: string | null;
  initialMilestones: Milestone[];
}

export function SettingsClient({ projectId, initialCodDate, initialMilestones }: SettingsClientProps) {
  const [codDate, setCodDate] = useState<string>(initialCodDate ? initialCodDate.substring(0, 10) : "");
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isPending, startTransition] = useTransition();

  // Add Milestone form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<MilestoneCategory>("TESTING");
  const [newIsCritical, setNewIsCritical] = useState(false);
  const [newStatus, setNewStatus] = useState<MilestoneStatus2>("LOCKED");
  const [newTargetDate, setNewTargetDate] = useState("");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function triggerMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }
  // 1. Save Project COD
  const handleSaveCod = () => {
    startTransition(async () => {
      try {
        if (codDate) {
          const parsed = new Date(codDate);
          if (isNaN(parsed.getTime())) {
            throw new Error("Invalid date input");
          }
          const year = parsed.getFullYear();
          if (year < 2020 || year > 2100) {
            throw new Error("Date year must be between 2020 and 2100");
          }
          await updateProjectCod(projectId, parsed.toISOString());
        } else {
          await updateProjectCod(projectId, null);
        }
        triggerMessage("Target COD date updated successfully!", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update COD date";
        triggerMessage(msg, "error");
      }
    });
  };


  // 2. Change Milestone Status inline
  const handleStatusChange = (milestoneId: string, status: MilestoneStatus2) => {
    startTransition(async () => {
      try {
        await updateMilestoneStatus(projectId, milestoneId, status, status === "COMPLETED" ? new Date().toISOString() : null);
        
        // Update local state
        setMilestones(prev => prev.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              status,
              completedAt: status === "COMPLETED" ? new Date().toISOString() : null
            };
          }
          return m;
        }));
        triggerMessage("Milestone status updated successfully!", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update milestone status";
        triggerMessage(msg, "error");
      }
    });
  };

  // 3. Reorder Milestone (Up/Down)
  const handleMoveMilestone = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;

    startTransition(async () => {
      try {
        const newList = [...milestones];
        // Swap
        const temp = newList[index];
        newList[index] = newList[targetIndex];
        newList[targetIndex] = temp;

        // Re-assign order fields sequentially
        const orderedList = newList.map((item, idx) => ({ ...item, order: idx + 1 }));
        setMilestones(orderedList);

        // Call database action
        await reorderMilestones(projectId, orderedList.map(item => item.id));
        triggerMessage("Milestones reordered successfully!", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to reorder milestones";
        triggerMessage(msg, "error");
        // Reset to initial ordered list if error
        setMilestones(initialMilestones);
      }
    });
  };

  // 4. Create New Milestone
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      try {
        const created = await addMilestone(projectId, {
          title: newTitle,
          category: newCategory,
          isCritical: newIsCritical,
          status: newStatus,
          targetDateStr: newTargetDate ? new Date(newTargetDate).toISOString() : undefined,
        });

        const newMilestone: Milestone = {
          id: created.id,
          title: created.title,
          category: created.category,
          targetDate: created.targetDate ? created.targetDate.toISOString() : null,
          completedAt: created.completedAt ? created.completedAt.toISOString() : null,
          status: created.status,
          order: created.order,
          isCritical: created.isCritical,
        };

        setMilestones(prev => [...prev, newMilestone].sort((a, b) => a.order - b.order));
        
        // Reset form
        setNewTitle("");
        setNewIsCritical(false);
        setNewTargetDate("");
        setNewStatus("LOCKED");
        
        triggerMessage("New milestone added successfully!", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to add milestone";
        triggerMessage(msg, "error");
      }
    });
  };

  // Milestone Status Helper icons/styles
  const getStatusIcon = (status: MilestoneStatus2) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4 text-flow-teal" />;
      case "IN_PROGRESS": return <Play className="h-4 w-4 text-flow-teal animate-pulse" />;
      case "UPCOMING": return <HelpCircle className="h-4 w-4 text-text-muted" />;
      case "BLOCKED": return <AlertTriangle className="h-4 w-4 text-signal-red" />;
      case "LOCKED": default: return <Lock className="h-4 w-4 text-text-muted/40" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {message && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4",
            message.type === "success"
              ? "bg-flow-teal/10 border-flow-teal/20 text-flow-teal"
              : "bg-signal-red/10 border-signal-red/20 text-signal-red"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Grid containing Project Configuration Card & Add Milestone Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Project Configuration */}
        <div className="glass-card p-6 border-t-4 border-t-flow-teal flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-display text-text-primary">Project Configuration</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Define the target Commercial Operation Date (COD) for Tumauini HEPP. The countdown timer and readiness widgets will update instantly.
            </p>
            <div className="space-y-2 pt-2">
              <label htmlFor="targetCod" className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                Target COD Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  id="targetCod"
                  type="date"
                  value={codDate}
                  onChange={(e) => setCodDate(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors font-mono"
                />
              </div>
            </div>
          </div>
          <div className="pt-6">
            <Button
              onClick={handleSaveCod}
              disabled={isPending}
              className="w-full bg-flow-teal hover:bg-flow-teal/95 text-white"
            >
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Card 2: Add Milestone Form */}
        <div className="glass-card p-6 border-t-4 border-t-flow-teal md:col-span-2">
          <h2 className="text-lg font-bold font-display text-text-primary mb-4">Create Milestone</h2>
          <form onSubmit={handleAddMilestone} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SCADA Point-by-Point Verification"
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MilestoneCategory)}
                  className="w-full rounded-xl bg-[#0f1115] border border-white/[0.08] px-4 py-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
                >
                  <option value="CIVIL">Civil Works</option>
                  <option value="MECHANICAL">Mechanical Works</option>
                  <option value="ELECTRICAL">Electrical Works</option>
                  <option value="TESTING">Testing & Commissioning</option>
                  <option value="DOCUMENTATION">Documentation</option>
                  <option value="REGULATORY">Regulatory Compliance</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as MilestoneStatus2)}
                  className="w-full rounded-xl bg-[#0f1115] border border-white/[0.08] px-4 py-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
                >
                  <option value="LOCKED">Locked</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">Target Date</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 text-sm text-text-primary focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pl-2 pt-6">
                <input
                  id="isCritical"
                  type="checkbox"
                  checked={newIsCritical}
                  onChange={(e) => setNewIsCritical(e.target.checked)}
                  className="rounded bg-white/[0.03] border-white/[0.08] text-flow-teal focus:ring-flow-teal"
                />
                <label htmlFor="isCritical" className="text-xs font-semibold text-text-primary select-none cursor-pointer">
                  On Critical Path to COD
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending} className="bg-flow-teal hover:bg-flow-teal/95 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Milestone Management */}
      <div className="glass-card p-6 border-t-4 border-t-flow-teal">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4">Milestone Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs font-semibold text-text-muted uppercase font-mono tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Order</th>
                <th className="py-3 px-4">Milestone Title</th>
                <th className="py-3 px-4 w-36">Category</th>
                <th className="py-3 px-4 w-36">Target Date</th>
                <th className="py-3 px-4 w-48">Status Update</th>
                <th className="py-3 px-4 w-28 text-center">Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {milestones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-text-muted">
                    No milestones found. Create one above to get started.
                  </td>
                </tr>
              ) : (
                milestones.map((m, index) => (
                  <tr key={m.id} className={cn("hover:bg-white/[0.01] transition-colors", m.isCritical && "bg-signal-red/[0.01]")}>
                    <td className="py-4 px-4 text-center font-mono text-xs font-medium text-text-muted">
                      {m.order}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(m.status)}
                        <span className="text-sm font-semibold text-text-primary">{m.title}</span>
                        {m.isCritical && (
                          <span className="rounded bg-signal-red/10 border border-signal-red/20 px-1.5 py-0.5 text-[9px] font-bold text-signal-red uppercase font-mono tracking-wider">
                            Critical Path
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-semibold border font-mono tracking-wide",
                        m.category === "CIVIL" && "bg-[#4A6572]/15 border-[#4A6572]/25 text-[#73A6BC]",
                        m.category === "MECHANICAL" && "bg-[#5B7A8A]/15 border-[#5B7A8A]/25 text-[#95C0D5]",
                        m.category === "ELECTRICAL" && "bg-signal-amber/15 border-signal-amber/25 text-signal-amber",
                        m.category === "TESTING" && "bg-flow-teal/15 border-flow-teal/25 text-flow-teal",
                        m.category === "DOCUMENTATION" && "bg-white/5 border-white/10 text-text-muted",
                        m.category === "REGULATORY" && "bg-[#8A4A6A]/15 border-[#8A4A6A]/25 text-[#D18FBD]"
                      )}>
                        {m.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-text-muted">
                      {m.targetDate ? new Date(m.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={m.status}
                        onChange={(e) => handleStatusChange(m.id, e.target.value as MilestoneStatus2)}
                        disabled={isPending}
                        className="w-full rounded-lg bg-[#0f1115] border border-white/[0.08] px-2.5 py-1.5 text-xs text-text-primary focus:border-flow-teal outline-none transition-colors"
                      >
                        <option value="LOCKED">Locked</option>
                        <option value="UPCOMING">Upcoming</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMoveMilestone(index, "up")}
                          disabled={index === 0 || isPending}
                          className="p-1 rounded bg-white/[0.03] border border-white/[0.08] text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveMilestone(index, "down")}
                          disabled={index === milestones.length - 1 || isPending}
                          className="p-1 rounded bg-white/[0.03] border border-white/[0.08] text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

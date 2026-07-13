/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMilestone, updateMilestoneStatus, logProgressSnapshot } from "./actions";
import { ProgressChart } from "./ProgressChart";
import { Button, buttonVariants } from "@/components/ui/button";
import { Role, MilestoneStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
 TrendingUp,
 Flag,
 Calendar,
 CheckCircle2,
 Plus,
 FileCheck,
 Image as ImageIcon,
 ChevronRight,
} from "lucide-react";

interface SnapshotPoint {
 id: string;
 snapshotDate: string;
 formattedDate: string;
 percentComplete: number;
 note: string | null;
 loggedBy: string;
}

interface MilestoneItem {
 id: string;
 name: string;
 targetDate: string;
 completedDate: string | null;
 status: MilestoneStatus;
}

interface AccomplishmentItem {
 id: string;
 workArea: string;
 reportDate: string;
 accomplishments: string;
 submittedByName: string;
}

interface PhotoItem {
 id: string;
 storagePath: string;
 caption: string | null;
 signedUrl: string;
 workArea: string;
 reportDate: string;
 reportId: string;
}

interface ProgressDashboardClientProps {
 projectId: string;
 userRole: Role;
 snapshots: SnapshotPoint[];
 milestones: MilestoneItem[];
 recentAccomplishments: AccomplishmentItem[];
 recentPhotos: PhotoItem[];
 latestPercent: number;
}

export function ProgressDashboardClient({
 projectId,
 userRole,
 snapshots,
 milestones,
 recentAccomplishments,
 recentPhotos,
 latestPercent,
}: ProgressDashboardClientProps) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 const isElevated = userRole === Role.PROJECT_MANAGER || userRole === Role.ADMINISTRATOR;

 // Modals / forms toggle states
 const [showLogSnapshot, setShowLogSnapshot] = useState(false);
 const [showAddMilestone, setShowAddMilestone] = useState(false);

 // Form inputs
 const [snapshotPercent, setSnapshotPercent] = useState<string | number>(latestPercent);
 const [snapshotDate, setSnapshotDate] = useState<Date | undefined>(new Date());
 const [snapshotNote, setSnapshotNote] = useState("");
 const [formError, setFormError] = useState<string | null>(null);

 const [milestoneName, setMilestoneName] = useState("");
 const [milestoneDate, setMilestoneDate] = useState<Date | undefined>(new Date());

 // Handle Snapshot Submission
 const handleLogSnapshotSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!snapshotDate) return setFormError("Date is required");
 setFormError(null);
 startTransition(async () => {
 try {
 await logProgressSnapshot(
 projectId,
 snapshotDate,
 Number(snapshotPercent),
 snapshotNote
 );
 setShowLogSnapshot(false);
 setSnapshotNote("");
 router.refresh();
 } catch (err: unknown) {
 setFormError(err instanceof Error ? err.message : "Failed to log snapshot");
 }
 });
 };

 // Handle Milestone Submission
 const handleAddMilestoneSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!milestoneDate) return setFormError("Date is required");
 setFormError(null);
 startTransition(async () => {
 try {
 await createMilestone(projectId, milestoneName, milestoneDate);
 setShowAddMilestone(false);
 setMilestoneName("");
 router.refresh();
 } catch (err: unknown) {
 setFormError(err instanceof Error ? err.message : "Failed to add milestone");
 }
 });
 };

 // Handle Milestone Status Update
 const handleStatusUpdate = async (id: string, newStatus: MilestoneStatus) => {
 startTransition(async () => {
 try {
 await updateMilestoneStatus(projectId, id, newStatus);
 router.refresh();
 } catch (err: unknown) {
 alert(err instanceof Error ? err.message : "Failed to update milestone");
 }
 });
 };

 const now = new Date();

 return (
 <div className="space-y-8">
 {/* 1. TOP SECTION: Progress Chart & Current Stat Panel */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Chart Panel */}
 <div className="lg:col-span-2 glass-card p-6">
 <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
 <div>
 <h2 className="font-display text-lg font-bold tracking-wide text-text-primary flex items-center gap-2">
 <TrendingUp className="h-5 w-5 text-flow-teal" />
 Construction Completion S-Curve
 </h2>
 <p className="text-xs text-text-muted">
 Tracking physical work progress percentage over project milestones
 </p>
 </div>
 {isElevated && (
 <Button
 onClick={() => setShowLogSnapshot(!showLogSnapshot)}
 className="bg-flow-teal hover:bg-flow-teal/90 text-black font-semibold shadow-lg text-xs"
 >
 <Plus className="h-4 w-4 mr-1" />
 Log Progress Snapshot
 </Button>
 )}
 </div>

 {/* Log Snapshot Form Dropdown */}
 {showLogSnapshot && (
 <form
 onSubmit={handleLogSnapshotSubmit}
 className="mb-6 rounded-xl border border-flow-teal/30 bg-flow-teal/[0.04] p-4 space-y-4"
 >
 <h3 className="font-display text-sm font-semibold text-flow-teal">
 Record New Progress Snapshot
 </h3>
 {formError && (
 <p className="text-xs text-signal-red bg-signal-red/10 p-2 rounded-lg border border-signal-red/20">
 {formError}
 </p>
 )}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block font-mono text-[10px] uppercase text-text-muted mb-1">
 Snapshot Date
 </label>
 <Popover>
 <PopoverTrigger
 className={cn(
 buttonVariants({ variant: "outline" }),
 "w-full justify-start text-left font-normal border-white/10 bg-white/[0.04] text-xs px-3 py-1.5 h-auto",
 !snapshotDate && "text-muted-foreground"
 )}
 >
 <Calendar className="mr-2 h-3.5 w-3.5 text-flow-teal" />
 {snapshotDate ? format(snapshotDate, "MM/dd/yyyy") : <span>Pick a date</span>}
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0" align="start">
 <CalendarPicker
 mode="single"
 selected={snapshotDate}
 onSelect={setSnapshotDate}
 />
 </PopoverContent>
 </Popover>
 </div>
 <div>
 <label className="block font-mono text-[10px] uppercase text-text-muted mb-1">
 Completion Percentage (%)
 </label>
 <input
 type="number"
 min="0"
 max="100"
 step="0.1"
 value={snapshotPercent}
 onChange={(e) => setSnapshotPercent(e.target.value)}
 className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-text-primary focus:border-flow-teal focus:outline-none"
 required
 />
 </div>
 <div>
 <label className="block font-mono text-[10px] uppercase text-text-muted mb-1">
 Notes / Observations
 </label>
 <input
 type="text"
 placeholder="e.g. Tunnel excavation 80% complete"
 value={snapshotNote}
 onChange={(e) => setSnapshotNote(e.target.value)}
 className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-text-primary focus:border-flow-teal focus:outline-none"
 />
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setShowLogSnapshot(false)}
 className="text-xs border-white/10"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isPending}
 className="bg-flow-teal text-black font-semibold text-xs"
 >
 Save Snapshot
 </Button>
 </div>
 </form>
 )}

 <ProgressChart data={snapshots} />
 </div>

 {/* Status Stat Summary */}
 <div className="flex flex-col justify-between glass-card p-6">
 <div>
 <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-flow-teal">
 Current Status
 </span>
 <h3 className="mt-1 font-display text-2xl font-bold text-text-primary">
 Overall Progress
 </h3>
 <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] py-8 shadow-inner">
 <span className="font-display text-6xl font-extrabold text-flow-teal tabular-nums drop-shadow-[0_0_20px_rgba(31,182,166,0.4)]">
 {latestPercent}%
 </span>
 <span className="mt-2 font-mono text-xs text-text-muted">
 {snapshots.length > 0 ? "From latest Progress Snapshot" : "From Project master target"}
 </span>
 </div>
 </div>

 <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-xs text-text-muted">
 <div className="flex justify-between items-center">
 <span>Total Snapshots Logged</span>
 <span className="font-mono font-semibold text-text-primary">{snapshots.length}</span>
 </div>
 <div className="flex justify-between items-center">
 <span>Total Milestones</span>
 <span className="font-mono font-semibold text-text-primary">{milestones.length}</span>
 </div>
 </div>
 </div>
 </div>

 {/* 2. MILESTONES TIMELINE & LIST */}
 <div className="glass-card p-6">
 <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
 <div>
 <h2 className="font-display text-lg font-bold tracking-wide text-text-primary flex items-center gap-2">
 <Flag className="h-5 w-5 text-flow-teal" />
 Project Milestones
 </h2>
 <p className="text-xs text-text-muted">
 Key construction goals and completion deadlines
 </p>
 </div>
 {isElevated && (
 <Button
 onClick={() => setShowAddMilestone(!showAddMilestone)}
 className="bg-white/[0.06] hover:bg-white/10 text-text-primary border border-white/10 text-xs"
 >
 <Plus className="h-4 w-4 mr-1" />
 Add Milestone
 </Button>
 )}
 </div>

 {/* Add Milestone Form Dropdown */}
 {showAddMilestone && (
 <form
 onSubmit={handleAddMilestoneSubmit}
 className="mb-6 rounded-xl border border-flow-teal/30 bg-flow-teal/[0.04] p-4 space-y-4 "
 >
 <h3 className="font-display text-sm font-semibold text-flow-teal">
 Add Project Milestone
 </h3>
 {formError && (
 <p className="text-xs text-signal-red bg-signal-red/10 p-2 rounded-lg border border-signal-red/20">
 {formError}
 </p>
 )}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block font-mono text-[10px] uppercase text-text-muted mb-1">
 Milestone Name
 </label>
 <input
 type="text"
 placeholder="e.g. Turbine Installation Complete"
 value={milestoneName}
 onChange={(e) => setMilestoneName(e.target.value)}
 className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-text-primary focus:border-flow-teal focus:outline-none"
 required
 />
 </div>
 <div>
 <label className="block font-mono text-[10px] uppercase text-text-muted mb-1">
 Target Target Date
 </label>
 <Popover>
 <PopoverTrigger
 className={cn(
 buttonVariants({ variant: "outline" }),
 "w-full justify-start text-left font-normal border-white/10 bg-white/[0.04] text-xs px-3 py-1.5 h-auto",
 !milestoneDate && "text-muted-foreground"
 )}
 >
 <Calendar className="mr-2 h-3.5 w-3.5 text-flow-teal" />
 {milestoneDate ? format(milestoneDate, "MM/dd/yyyy") : <span>Pick a date</span>}
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0" align="start">
 <CalendarPicker
 mode="single"
 selected={milestoneDate}
 onSelect={setMilestoneDate}
 />
 </PopoverContent>
 </Popover>
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setShowAddMilestone(false)}
 className="text-xs border-white/10"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isPending}
 className="bg-flow-teal text-black font-semibold text-xs"
 >
 Save Milestone
 </Button>
 </div>
 </form>
 )}

 {/* Milestones Grid / Timeline */}
 {milestones.length === 0 ? (
 <div className="text-center py-8 text-xs text-text-muted border border-dashed border-white/10 rounded-xl">
 No milestones configured for this project yet.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {milestones.map((m) => {
 const targetDateObj = new Date(m.targetDate);
 const isPastTarget = m.status === "PENDING" && targetDateObj < now;

 let badgeStyle = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
 let statusLabel = "PENDING";

 if (m.status === "COMPLETED") {
 badgeStyle = "bg-flow-teal/15 text-flow-teal border-flow-teal/30";
 statusLabel = "COMPLETED";
 } else if (m.status === "DELAYED" || isPastTarget) {
 badgeStyle = "bg-signal-red/15 text-signal-red border-signal-red/30";
 statusLabel = isPastTarget ? "OVERDUE (DELAYED)" : "DELAYED";
 }

 return (
 <div
 key={m.id}
 className={cn(
 "flex flex-col justify-between rounded-xl border p-4 transition-all duration-300",
 isPastTarget
 ? "border-signal-red/40 bg-signal-red/[0.03] shadow-[0_0_15px_rgba(214,72,63,0.1)]"
 : "border-white/10 bg-white/[0.02] hover:border-white/20"
 )}
 >
 <div>
 <div className="flex items-start justify-between gap-2 mb-2">
 <h4 className="font-display text-sm font-bold text-text-primary leading-snug">
 {m.name}
 </h4>
 <span
 className={cn(
 "shrink-0 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border",
 badgeStyle
 )}
 >
 {statusLabel}
 </span>
 </div>

 <div className="space-y-1 mt-3 font-mono text-[11px] text-text-muted">
 <div className="flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-text-muted" />
 <span>Target: {targetDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
 </div>
 {m.completedDate && (
 <div className="flex items-center gap-1.5 text-flow-teal">
 <CheckCircle2 className="h-3.5 w-3.5" />
 <span>Done: {new Date(m.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
 </div>
 )}
 </div>
 </div>

 {/* Action buttons for PM / Admin */}
 {isElevated && (
 <div className="flex items-center gap-2 pt-4 mt-3 border-t border-white/5">
 {m.status !== "COMPLETED" && (
 <button
 onClick={() => handleStatusUpdate(m.id, MilestoneStatus.COMPLETED)}
 disabled={isPending}
 className="text-[10px] font-semibold text-flow-teal hover:underline"
 >
 Mark Complete
 </button>
 )}
 {m.status !== "DELAYED" && m.status !== "COMPLETED" && (
 <button
 onClick={() => handleStatusUpdate(m.id, MilestoneStatus.DELAYED)}
 disabled={isPending}
 className="text-[10px] font-semibold text-signal-red hover:underline ml-auto"
 >
 Mark Delayed
 </button>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* 3. BOTTOM SECTION: Recent Accomplishments Feed & Photo Timeline */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 {/* Recent Accomplishments Feed */}
 <div className="glass-card p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-display text-base font-bold tracking-wide text-text-primary flex items-center gap-2">
 <FileCheck className="h-4 w-4 text-flow-teal" />
 Approved Accomplishment Reports
 </h2>
 <Link
 href="/dashboard/reports"
 className="text-xs text-flow-teal hover:underline flex items-center gap-1 font-medium"
 >
 View All <ChevronRight className="h-3 w-3" />
 </Link>
 </div>

 {recentAccomplishments.length === 0 ? (
 <p className="text-xs text-text-muted py-6 text-center border border-dashed border-white/10 rounded-xl">
 No approved reports found.
 </p>
 ) : (
 <div className="space-y-3">
 {recentAccomplishments.map((item) => (
 <Link
 key={item.id}
 href={`/dashboard/reports/${item.id}`}
 className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.04] group"
 >
 <div className="flex items-center justify-between">
 <span className="font-display text-xs font-bold text-text-primary group-hover:text-flow-teal transition-colors">
 {item.workArea}
 </span>
 <span className="font-mono text-[10px] text-text-muted">
 {new Date(item.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
 </span>
 </div>
 <p className="mt-1 text-xs text-text-muted line-clamp-2">
 {item.accomplishments}
 </p>
 <p className="mt-2 font-mono text-[9.5px] text-text-muted/70">
 By: {item.submittedByName}
 </p>
 </Link>
 ))}
 </div>
 )}
 </div>

 {/* Photo Timeline Strip */}
 <div className="glass-card p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-display text-base font-bold tracking-wide text-text-primary flex items-center gap-2">
 <ImageIcon className="h-4 w-4 text-flow-teal" />
 Site Photo Timeline
 </h2>
 <span className="font-mono text-[10px] text-text-muted">Newest First</span>
 </div>

 {recentPhotos.length === 0 ? (
 <p className="text-xs text-text-muted py-6 text-center border border-dashed border-white/10 rounded-xl">
 No photos uploaded in approved reports.
 </p>
 ) : (
 <div className="grid grid-cols-2 gap-3">
 {recentPhotos.map((photo) => (
 <Link
 key={photo.id}
 href={`/dashboard/reports/${photo.reportId}`}
 className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
 >
 {photo.signedUrl ? (
 <img
 src={photo.signedUrl}
 alt={photo.caption || photo.workArea}
 className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 ) : (
 <div className="h-28 w-full bg-white/5 flex items-center justify-center text-[10px] text-text-muted">
 No Preview
 </div>
 )}
 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent p-2">
 <p className="font-display text-[11px] font-semibold text-white truncate">
 {photo.workArea}
 </p>
 {photo.caption && (
 <p className="text-[9.5px] text-text-muted truncate">
 {photo.caption}
 </p>
 )}
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

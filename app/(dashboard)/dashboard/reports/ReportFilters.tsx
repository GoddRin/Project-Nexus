"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
 showViewAllToggle: boolean;
 currentUserRole: string;
}

export function ReportFilters({ showViewAllToggle }: ReportFiltersProps) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const [, startTransition] = useTransition();

 const currentStatus = searchParams.get("status") || "";
 const currentStartDate = searchParams.get("startDate") || "";
 const currentEndDate = searchParams.get("endDate") || "";
 const currentViewAll = searchParams.get("viewAll") === "true";

 const [status, setStatus] = useState(currentStatus);
 const [startDate, setStartDate] = useState(currentStartDate);
 const [endDate, setEndDate] = useState(currentEndDate);
 const [viewAll, setViewAll] = useState(currentViewAll);

 const [prevStatus, setPrevStatus] = useState(currentStatus);
 const [prevStartDate, setPrevStartDate] = useState(currentStartDate);
 const [prevEndDate, setPrevEndDate] = useState(currentEndDate);
 const [prevViewAll, setPrevViewAll] = useState(currentViewAll);

 if (
 currentStatus !== prevStatus ||
 currentStartDate !== prevStartDate ||
 currentEndDate !== prevEndDate ||
 currentViewAll !== prevViewAll
 ) {
 setPrevStatus(currentStatus);
 setPrevStartDate(currentStartDate);
 setPrevEndDate(currentEndDate);
 setPrevViewAll(currentViewAll);

 setStatus(currentStatus);
 setStartDate(currentStartDate);
 setEndDate(currentEndDate);
 setViewAll(currentViewAll);
 }

 const applyFilters = (newStatus = status, newStart = startDate, newEnd = endDate, newViewAll = viewAll) => {
 const params = new URLSearchParams();
 if (newStatus) params.set("status", newStatus);
 if (newStart) params.set("startDate", newStart);
 if (newEnd) params.set("endDate", newEnd);
 if (newViewAll) params.set("viewAll", "true");

 startTransition(() => {
 router.replace(`${pathname}?${params.toString()}`);
 });
 };

 const handleClear = () => {
 setStatus("");
 setStartDate("");
 setEndDate("");
 setViewAll(false);
 startTransition(() => {
 router.replace(pathname);
 });
 };

 return (
 <div className="mb-6 flex flex-col gap-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06] p-4 ">
 <div className="flex flex-wrap items-center gap-4">
 {/* Status Filters */}
 <div className="flex items-center gap-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.02] p-1 ring-1 ring-black/[0.05] dark:ring-white/[0.05]">
 <button
 onClick={() => {
 setStatus("");
 applyFilters("");
 }}
 className={cn(
 "px-3 py-1 rounded-md text-xs font-medium transition-all duration-200",
 !status
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/10"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.02] hover:text-text-primary"
 )}
 >
 All Status
 </button>
 {Object.values(ReportStatus).map((s) => (
 <button
 key={s}
 onClick={() => {
 setStatus(s);
 applyFilters(s);
 }}
 className={cn(
 "px-3 py-1 rounded-md text-xs font-medium transition-all duration-200",
 status === s
 ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-white/10 dark:text-white dark:shadow-sm dark:ring-1 dark:ring-white/10"
 : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.02] hover:text-text-primary"
 )}
 >
 {s}
 </button>
 ))}
 </div>

 {/* Date Inputs */}
 <div className="flex items-center gap-2">
 <Input
 type="date"
 value={startDate}
 onChange={(e) => {
 setStartDate(e.target.value);
 applyFilters(status, e.target.value, endDate);
 }}
 className="w-36 h-8 text-xs bg-white/[0.03] border-white/[0.08]"
 />
 <span className="text-xs text-text-muted">to</span>
 <Input
 type="date"
 value={endDate}
 onChange={(e) => {
 setEndDate(e.target.value);
 applyFilters(status, startDate, e.target.value);
 }}
 className="w-36 h-8 text-xs bg-white/[0.03] border-white/[0.08]"
 />
 </div>

 {/* Toggle view all for Engineers/Supervisors */}
 {showViewAllToggle && (
 <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-muted hover:text-text-primary">
 <input
 type="checkbox"
 checked={viewAll}
 onChange={(e) => {
 setViewAll(e.target.checked);
 applyFilters(status, startDate, endDate, e.target.checked);
 }}
 className="rounded border-white/[0.08] bg-white/[0.03] text-flow-teal focus:ring-flow-teal"
 />
 Show other users&apos; reports
 </label>
 )}

 {/* Clear Filters */}
 {(status || startDate || endDate || viewAll) && (
 <Button
 variant="ghost"
 onClick={handleClear}
 className="ml-auto h-8 px-3 text-xs text-text-muted hover:text-text-primary hover:bg-white/[0.04]"
 >
 Clear Filters
 </Button>
 )}
 </div>
 </div>
 );
}

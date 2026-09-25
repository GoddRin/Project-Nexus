"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CircleDot,
  AlertCircle,
  Flag,
  ArrowRight,
  Sparkles,
  PauseCircle,
  HelpCircle,
} from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import { ATLAS_STATUSES } from "./AtlasTokens";
import { cn } from "@/lib/utils";

export interface ProjectTimelineProps {
  project: SCICProject;
  className?: string;
}

export type TimelinePrecision = "year" | "quarter" | "month" | "day";

export interface ParsedTemporalPoint {
  raw: string;
  display: string;
  precision: TimelinePrecision;
  timestamp: number;
  year: number;
}

export interface TimelineNode {
  id: string;
  dateDisplay: string;
  title: string;
  status: "ACHIEVED" | "IN_PROGRESS" | "SCHEDULED" | "CURRENT" | "ON_HOLD";
  isCurrentIndicator?: boolean;
  precision: TimelinePrecision;
  timestamp: number;
  type: "START" | "MILESTONE" | "CURRENT" | "TARGET_COD" | "COMPLETION";
  description?: string;
}

/**
 * Parses verified project temporal strings into a normalized representation
 * preserving the exact source precision (Section 8: Date Formatting).
 * Never infers or fabricates days/months that do not exist in the source.
 */
export function parseTemporalDate(dateStr?: string | null): ParsedTemporalPoint | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!s) return null;

  // 1. Year only: e.g. "2015", "2024"
  if (/^\d{4}$/.test(s)) {
    const yr = parseInt(s, 10);
    return {
      raw: s,
      display: s,
      precision: "year",
      timestamp: new Date(yr, 6, 1).getTime(),
      year: yr,
    };
  }

  // 2. Quarter format: e.g. "Q1 2023", "Q4 2026"
  const qMatch1 = s.match(/^Q([1-4])\s+(\d{4})$/i);
  if (qMatch1) {
    const q = parseInt(qMatch1[1], 10);
    const yr = parseInt(qMatch1[2], 10);
    const midMonth = (q - 1) * 3 + 1;
    return {
      raw: s,
      display: `Q${q} ${yr}`,
      precision: "quarter",
      timestamp: new Date(yr, midMonth, 15).getTime(),
      year: yr,
    };
  }

  // 3. Quarter format alternate: e.g. "2023-Q1", "2026-Q4"
  const qMatch2 = s.match(/^(\d{4})[- ]Q([1-4])$/i);
  if (qMatch2) {
    const yr = parseInt(qMatch2[1], 10);
    const q = parseInt(qMatch2[2], 10);
    const midMonth = (q - 1) * 3 + 1;
    return {
      raw: s,
      display: `Q${q} ${yr}`,
      precision: "quarter",
      timestamp: new Date(yr, midMonth, 15).getTime(),
      year: yr,
    };
  }

  // 4. Month YYYY: e.g. "May 2015", "Feb 2001", "December 2026"
  const mMatch = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (mMatch) {
    const monthName = mMatch[1];
    const yr = parseInt(mMatch[2], 10);
    const parsedDate = new Date(`${monthName} 1, ${yr}`);
    if (!isNaN(parsedDate.getTime())) {
      const shortMonth = parsedDate.toLocaleDateString("en-US", { month: "short" });
      return {
        raw: s,
        display: `${shortMonth} ${yr}`,
        precision: "month",
        timestamp: new Date(yr, parsedDate.getMonth(), 15).getTime(),
        year: yr,
      };
    }
  }

  // 5. YYYY-MM: e.g. "2023-05", "2022-11"
  const ymMatch = s.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const yr = parseInt(ymMatch[1], 10);
    const mo = parseInt(ymMatch[2], 10) - 1;
    const d = new Date(yr, mo, 15);
    return {
      raw: s,
      display: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      precision: "month",
      timestamp: d.getTime(),
      year: yr,
    };
  }

  // 6. ISO or Full Date: e.g. "2026-10-31T00:00:00.000Z" or "2026-10-31"
  if (s.includes("-") && !isNaN(Date.parse(s))) {
    const d = new Date(s);
    return {
      raw: s,
      display: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      precision: "day",
      timestamp: d.getTime(),
      year: d.getFullYear(),
    };
  }

  // 7. Textual targets: e.g. "CY 2028", "Late 2026", "Early 2027"
  const cyMatch = s.match(/^(?:CY|Late|Early|Mid)\s+(\d{4})$/i);
  if (cyMatch) {
    const yr = parseInt(cyMatch[1], 10);
    return {
      raw: s,
      display: s,
      precision: "year",
      timestamp: new Date(yr, 6, 1).getTime(),
      year: yr,
    };
  }

  return null;
}

/**
 * Builds the verified timeline model according to Directive rules:
 * - Omits timeline if dates are insufficient (< 2 distinct points)
 * - Dynamically determines current date from system clock
 * - Formats Level 1, Level 2, or Level 3 appropriately
 */
export function buildProjectTimeline(project: SCICProject): {
  level: 1 | 2 | 3;
  nodes: TimelineNode[];
  hasCurrentMarker: boolean;
  earliestYear: number;
  latestYear: number;
} | null {
  const nodes: TimelineNode[] = [];
  const seenTimestampsAndTitles = new Set<string>();

  // 1. Process Key Milestones (if present)
  if (Array.isArray(project.keyMilestones)) {
    for (const m of project.keyMilestones) {
      if (!m.date || typeof m.date !== "string") continue;
      const parsed = parseTemporalDate(m.date);
      if (!parsed) continue;

      const dedupeKey = `${parsed.timestamp}-${m.title.toLowerCase().trim()}`;
      if (seenTimestampsAndTitles.has(dedupeKey)) continue;
      seenTimestampsAndTitles.add(dedupeKey);

      nodes.push({
        id: `milestone-${nodes.length}`,
        dateDisplay: parsed.display,
        title: m.title,
        status: m.status || "SCHEDULED",
        precision: parsed.precision,
        timestamp: parsed.timestamp,
        type: "MILESTONE",
      });
    }
  }

  // 2. Process Project Start Date (if present)
  if (project.projectStartDate) {
    const parsedStart = parseTemporalDate(project.projectStartDate);
    if (parsedStart) {
      const dedupeKey = `${parsedStart.timestamp}-start`;
      if (!seenTimestampsAndTitles.has(dedupeKey)) {
        seenTimestampsAndTitles.add(dedupeKey);
        nodes.push({
          id: "project-start",
          dateDisplay: parsedStart.display,
          title: "Project Commencement",
          status: "ACHIEVED",
          precision: parsedStart.precision,
          timestamp: parsedStart.timestamp,
          type: "START",
        });
      }
    }
  }

  // 3. Process Target COD / Completion Year / Project End Date (if present)
  const codRaw = project.targetCodDate;
  if (codRaw) {
    const parsedCod = parseTemporalDate(codRaw);
    if (parsedCod) {
      const dedupeKey = `${parsedCod.timestamp}-cod`;
      if (!seenTimestampsAndTitles.has(dedupeKey)) {
        seenTimestampsAndTitles.add(dedupeKey);
        nodes.push({
          id: "project-target-cod",
          dateDisplay: parsedCod.display,
          title: "Target Commercial Operation (COD)",
          status: project.status === "COMPLETED" ? "ACHIEVED" : "SCHEDULED",
          precision: parsedCod.precision,
          timestamp: parsedCod.timestamp,
          type: "TARGET_COD",
        });
      }
    }
  }

  if (project.completionYear) {
    const parsedCompYear = parseTemporalDate(String(project.completionYear));
    if (parsedCompYear) {
      const dedupeKey = `${parsedCompYear.timestamp}-completion`;
      if (!seenTimestampsAndTitles.has(dedupeKey)) {
        seenTimestampsAndTitles.add(dedupeKey);
        nodes.push({
          id: "project-completion-year",
          dateDisplay: parsedCompYear.display,
          title: "Commercial Commissioning",
          status: "ACHIEVED",
          precision: parsedCompYear.precision,
          timestamp: parsedCompYear.timestamp,
          type: "COMPLETION",
        });
      }
    }
  }

  if (project.projectEndDate && !project.targetCodDate) {
    const parsedEnd = parseTemporalDate(project.projectEndDate);
    if (parsedEnd) {
      const dedupeKey = `${parsedEnd.timestamp}-end`;
      if (!seenTimestampsAndTitles.has(dedupeKey)) {
        seenTimestampsAndTitles.add(dedupeKey);
        nodes.push({
          id: "project-end-date",
          dateDisplay: parsedEnd.display,
          title: project.status === "COMPLETED" ? "Project Turnover" : "Target Completion",
          status: project.status === "COMPLETED" ? "ACHIEVED" : "SCHEDULED",
          precision: parsedEnd.precision,
          timestamp: parsedEnd.timestamp,
          type: project.status === "COMPLETED" ? "COMPLETION" : "TARGET_COD",
        });
      }
    }
  }

  // Section 1: Data Integrity Check — If fewer than 2 temporal points, omit timeline
  if (nodes.length < 2) {
    return null;
  }

  // Sort chronologically ascending
  nodes.sort((a, b) => a.timestamp - b.timestamp);

  const earliestTimestamp = nodes[0].timestamp;
  const latestTimestamp = nodes[nodes.length - 1].timestamp;
  const earliestYear = new Date(earliestTimestamp).getFullYear();
  const latestYear = new Date(latestTimestamp).getFullYear();

  // Determine Level: Level 3 if structured milestones exist, else Level 2 / Level 1
  const hasStructuredMilestones = nodes.some((n) => n.type === "MILESTONE");
  const isOngoing = project.status === "ONGOING";
  const isCompleted = project.status === "COMPLETED";
  const isUpcoming = project.status === "UPCOMING" || project.status === "PLANNING";
  const isOnHold = project.status === "ON_HOLD";

  // Section 6: Dynamic Current Date handling
  // Current indicator must be calculated from actual current date (new Date())
  const now = new Date();
  const nowTimestamp = now.getTime();
  const currentMonthYearStr = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  let hasCurrentMarker = false;

  // Insert CURRENT node ONLY for ONGOING projects when now sits within timeline horizon
  if (isOngoing && nowTimestamp >= earliestTimestamp && nowTimestamp <= latestTimestamp) {
    hasCurrentMarker = true;
    const currentNode: TimelineNode = {
      id: "timeline-current-point",
      dateDisplay: currentMonthYearStr,
      title: "Current Execution Stage",
      status: "CURRENT",
      isCurrentIndicator: true,
      precision: "month",
      timestamp: nowTimestamp,
      type: "CURRENT",
    };

    // Find insertion index
    const insertIdx = nodes.findIndex((n) => n.timestamp > nowTimestamp);
    if (insertIdx === -1) {
      nodes.push(currentNode);
    } else {
      nodes.splice(insertIdx, 0, currentNode);
    }
  }

  let level: 1 | 2 | 3 = 1;
  if (hasStructuredMilestones) {
    level = 3;
  } else if (hasCurrentMarker || isOngoing) {
    level = 2;
  } else {
    level = 1;
  }

  return {
    level,
    nodes,
    hasCurrentMarker,
    earliestYear,
    latestYear,
  };
}

export function ProjectTimeline({ project, className }: ProjectTimelineProps) {
  const timelineData = useMemo(() => buildProjectTimeline(project), [project]);

  // Section 1: Data Integrity — omit timeline completely if dates are insufficient
  if (!timelineData) {
    return null;
  }

  const { level, nodes, hasCurrentMarker, earliestYear, latestYear } = timelineData;
  const statusConfig = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/60 p-3.5 space-y-3 shadow-2xs",
        className
      )}
    >
      {/* 1. Header Bar: Timeline Identity & Temporal Horizon */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Project Chronology</span>
              <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400">
                ({earliestYear} &ndash; {latestYear})
              </span>
            </span>
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
              {level === 3
                ? "Level 3 · Verified Milestone Chronology"
                : level === 2
                ? "Level 2 · Execution Timeline Horizon"
                : "Level 1 · Project Lifecycle Span"}
            </span>
          </div>
        </div>

        {/* Current Project Status Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              project.status === "ONGOING"
                ? "bg-emerald-500 animate-pulse"
                : project.status === "COMPLETED"
                ? "bg-sky-400"
                : project.status === "ON_HOLD"
                ? "bg-amber-400"
                : "bg-slate-400"
            )}
          />
          <span className="font-semibold text-slate-700 dark:text-slate-200">{statusConfig.label}</span>
        </div>
      </div>

      {/* 2. Visual Chronological Horizon Rail (Desktop & Tablet) */}
      <div className="pt-1 pb-1">
        {/* Horizontal Continuous Track Container */}
        {(() => {
          const currentIndex = nodes.findIndex((n) => n.isCurrentIndicator);
          const progressPercent =
            project.status === "COMPLETED"
              ? 100
              : currentIndex >= 0 && nodes.length > 1
              ? (currentIndex / (nodes.length - 1)) * 100
              : 25;

          return (
            <div className="relative flex items-center justify-between w-full min-w-[320px] px-1 py-1">
              {/* Background Connecting Rail: Exactly centered through the middle dot slot (28px top slot + 12px middle center = 40px) */}
              <div className="absolute left-3 right-3 top-[40px] -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-white/15" />

              {/* Achieved Segment Overlay */}
              <div
                className="absolute left-3 top-[40px] -translate-y-1/2 h-0.5 bg-emerald-500/80 transition-all duration-500"
                style={{
                  width: `calc(${progressPercent}% - 6px)`,
                }}
              />

              {/* Milestone Nodes on Horizon */}
              {nodes.map((node, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === nodes.length - 1;

                return (
                  <div
                    key={node.id}
                    className="relative z-10 flex flex-col items-center group cursor-default"
                  >
                    {/* Top Tier (h-7): Floating CURRENT pill badge or reserved clearance */}
                    <div className="h-7 flex items-center justify-center">
                      {node.isCurrentIndicator ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/90 border border-sky-400/50 dark:border-[#00E5FF]/50 text-[#0284C7] dark:text-[#00E5FF] text-[9px] font-mono font-bold shadow-xs whitespace-nowrap">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] dark:bg-[#00E5FF] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0284C7] dark:bg-[#00E5FF]"></span>
                          </span>
                          <span>CURRENT</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Middle Tier (h-6): Node Dot / Glyph on Track */}
                    <div className="h-6 flex items-center justify-center">
                      <div
                        className={cn(
                          "flex items-center justify-center transition-transform group-hover:scale-125 duration-200",
                          node.isCurrentIndicator
                            ? "h-4 w-4 rounded-full bg-[#0284C7] dark:bg-[#00E5FF] ring-4 ring-[#0284C7]/20 dark:ring-[#00E5FF]/20 shadow-sm"
                            : node.status === "ACHIEVED"
                            ? "h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 text-slate-950"
                            : node.status === "IN_PROGRESS"
                            ? "h-3.5 w-3.5 rounded-full bg-sky-500 ring-4 ring-sky-500/30 animate-pulse text-white"
                            : "h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500"
                        )}
                        title={`${node.dateDisplay}: ${node.title} (${node.status})`}
                      >
                        {node.isCurrentIndicator ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-950" />
                        ) : node.status === "ACHIEVED" ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-slate-950" />
                        ) : null}
                      </div>
                    </div>

                    {/* Bottom Tier: Date Tag aligned on consistent horizontal baseline */}
                    <div className="pt-1 flex flex-col items-center">
                      <span
                        className={cn(
                          "text-[9px] font-mono select-none whitespace-nowrap",
                          node.isCurrentIndicator
                            ? "font-bold text-[#0284C7] dark:text-[#00E5FF]"
                            : node.status === "ACHIEVED"
                            ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                            : "text-slate-500 dark:text-slate-400 font-medium",
                          isFirst ? "text-left self-start" : isLast ? "text-right self-end" : "text-center"
                        )}
                      >
                        {node.dateDisplay}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 3. Detailed Chronological Milestone Ledger (Vertical Track) */}
      <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
        <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Chronological Milestone Ledger
        </span>

        <div className="space-y-2 border-l border-slate-200 dark:border-white/15 ml-2.5 pl-3.5">
          {nodes.map((node) => {
            const isCurrent = node.isCurrentIndicator;

            return (
              <div
                key={`ledger-${node.id}`}
                className={cn(
                  "relative text-xs transition-colors rounded-lg p-1.5 -ml-1.5",
                  isCurrent
                    ? "bg-[#0284C7]/10 dark:bg-[#0284C7]/15 border border-[#0284C7]/30"
                    : "hover:bg-slate-100/60 dark:hover:bg-white/[0.02]"
                )}
              >
                {/* Node Pin Marker on Vertical Line */}
                <span
                  className={cn(
                    "absolute -left-[19px] top-2.5 rounded-full border-2 border-white dark:border-[#08121E] transition-all",
                    isCurrent
                      ? "h-2.5 w-2.5 bg-[#0284C7] dark:bg-[#00E5FF] ring-2 ring-[#0284C7]/40"
                      : node.status === "ACHIEVED"
                      ? "h-2 w-2 bg-emerald-500 dark:bg-emerald-400"
                      : node.status === "IN_PROGRESS"
                      ? "h-2.5 w-2.5 bg-sky-500 animate-pulse ring-2 ring-sky-500/40"
                      : "h-2 w-2 bg-slate-300 dark:bg-slate-600"
                  )}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "font-sans font-medium leading-snug",
                          isCurrent
                            ? "text-[#0284C7] dark:text-[#38BDF8] font-bold"
                            : "text-slate-800 dark:text-slate-200"
                        )}
                      >
                        {node.title}
                      </span>

                      {/* Status Tag Pill */}
                      {node.type === "TARGET_COD" && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] font-mono font-bold uppercase">
                          COD Target
                        </span>
                      )}
                      {node.type === "COMPLETION" && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-bold uppercase">
                          Turnover
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 border border-sky-500/40 text-sky-600 dark:text-sky-300 text-[9px] font-mono font-bold uppercase">
                          Active Stage
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date Column */}
                  <span
                    className={cn(
                      "text-[10px] font-mono shrink-0 text-right",
                      isCurrent
                        ? "text-[#0284C7] dark:text-[#38BDF8] font-bold"
                        : node.status === "ACHIEVED"
                        ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {node.dateDisplay}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

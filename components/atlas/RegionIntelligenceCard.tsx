"use client";

import React, { useMemo } from "react";
import {
  MapPin,
  X,
  Maximize2,
  Zap,
  Layers,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SCICProject } from "@/lib/data/scicProjectsData";
import {
  computeRegionStatistics,
  RegionStatistics,
} from "./AtlasSearchUtils";

export interface RegionIntelligenceCardProps {
  region: string;
  allProjects: SCICProject[];
  filteredProjects: SCICProject[];
  onZoomToExtent: () => void;
  onClearRegion: () => void;
  className?: string;
}

export function RegionIntelligenceCard({
  region,
  allProjects,
  filteredProjects,
  onZoomToExtent,
  onClearRegion,
  className,
}: RegionIntelligenceCardProps) {
  // Authoritative region statistics computed across the entire SCIC dataset
  const stats: RegionStatistics | null = useMemo(() => {
    return computeRegionStatistics(allProjects, region);
  }, [allProjects, region]);

  // Count how many projects in this region match current directory search/filters
  const matchingCount = useMemo(() => {
    return filteredProjects.filter((p) => p.region === region).length;
  }, [filteredProjects, region]);

  if (!stats) return null;

  return (
    <div
      className={cn(
        "w-80 rounded-2xl bg-white/95 dark:bg-[#081321]/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 p-3.5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 text-slate-800 dark:text-slate-100 text-xs font-sans",
        className
      )}
    >
      {/* 1. Header with Region Name, Island Group & Dismiss */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 dark:bg-sky-500/20 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/30 text-[9px] font-mono font-bold tracking-wider uppercase">
              {stats.islandGroup}
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Regional Jurisdiction
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug">
            {stats.regionName}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClearRegion}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Clear Region Scope"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
          <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
            Total
          </span>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
            {stats.totalProjects}
          </span>
          <span className="block text-[9px] font-mono text-slate-500">
            {matchingCount === stats.totalProjects
              ? "All Match"
              : `${matchingCount} Filtered`}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20">
          <span className="block text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">
            Ongoing
          </span>
          <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
            {stats.statusCounts.ONGOING}
          </span>
          <span className="block text-[9px] font-mono text-emerald-600/80 dark:text-emerald-400/70">
            Active Works
          </span>
        </div>

        <div className="p-2 rounded-xl bg-sky-50 dark:bg-blue-500/10 border border-sky-500/20">
          <span className="block text-[10px] font-mono text-sky-700 dark:text-sky-400 uppercase">
            Completed
          </span>
          <span className="text-base font-bold font-mono text-sky-700 dark:text-sky-400">
            {stats.statusCounts.COMPLETED}
          </span>
          <span className="block text-[9px] font-mono text-sky-600/80 dark:text-sky-400/70">
            Turned Over
          </span>
        </div>
      </div>

      {/* 3. Category Distribution (Directive 24: Direct from project records) */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          <span>Category Distribution</span>
          <span>{stats.categoryCounts.length} Sectors</span>
        </div>
        <div className="space-y-1.5">
          {stats.categoryCounts.map((cat) => (
            <div key={cat.category} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate">{cat.label}</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px] shrink-0">
                  {cat.count} ({cat.percentage}%)
                </span>
              </div>
              <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Provinces In Scope */}
      {stats.provinces.length > 0 && (
        <div className="mb-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate">
            Provinces: {stats.provinces.join(", ")}
          </span>
        </div>
      )}

      {/* 5. Actions: Zoom to Regional Extent */}
      <button
        type="button"
        onClick={onZoomToExtent}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0284C7]/15 hover:bg-[#0284C7]/25 dark:bg-[#0284C7]/20 dark:hover:bg-[#0284C7]/30 border border-[#0284C7]/30 dark:border-[#0284C7]/40 text-[#0284C7] dark:text-[#38BDF8] hover:text-[#0369A1] dark:hover:text-white font-mono text-xs font-semibold transition-all cursor-pointer shadow-2xs"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span>Fit Regional Extent</span>
      </button>
    </div>
  );
}

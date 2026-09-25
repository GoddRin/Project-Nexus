"use client";

import React from "react";
import { ChevronRight, Globe, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AtlasGeographicBreadcrumbProps {
  region: string | "ALL";
  province: string | "ALL";
  selectedProjectName?: string | null;
  onResetNational: () => void;
  onSelectRegion?: (region: string) => void;
  onSelectProvince?: (province: string) => void;
  onClearProject?: () => void;
  className?: string;
}

export function AtlasGeographicBreadcrumb({
  region,
  province,
  selectedProjectName,
  onResetNational,
  onSelectRegion,
  onSelectProvince,
  onClearProject,
  className,
}: AtlasGeographicBreadcrumbProps) {
  const hasRegion = region && region !== "ALL";
  const hasProvince = province && province !== "ALL";
  const hasProject = !!selectedProjectName;

  // Don't render floating pill when at national overview with no selection
  if (!hasRegion && !hasProvince && !hasProject) {
    return null;
  }

  return (
    <nav
      aria-label="Geographic breadcrumb"
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#081321]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 max-w-full overflow-x-auto scrollbar-none",
        className
      )}
    >
      {/* 1. National Level (Philippines) */}
      <button
        type="button"
        onClick={onResetNational}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0",
          !hasRegion && !hasProvince && !hasProject
            ? "bg-[#0284C7]/15 dark:bg-[#0284C7]/25 text-[#0284C7] dark:text-[#38BDF8] font-bold border border-[#0284C7]/30 dark:border-[#0284C7]/40"
            : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        )}
        title="Zoom to Full Philippine Extent"
      >
        <Globe className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
        <span>Philippines</span>
      </button>

      {/* 2. Regional Level */}
      {hasRegion && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
          <button
            type="button"
            onClick={() => onSelectRegion && onSelectRegion(region)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[150px] sm:max-w-[180px] shrink-0",
              hasRegion && !hasProvince && !hasProject
                ? "bg-[#0284C7]/15 dark:bg-[#0284C7]/25 text-[#0284C7] dark:text-[#38BDF8] font-bold border border-[#0284C7]/30 dark:border-[#0284C7]/40"
                : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            )}
            title={`Drill to ${region}`}
          >
            <span className="truncate">{region}</span>
          </button>
        </>
      )}

      {/* 3. Provincial Level */}
      {hasProvince && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
          <button
            type="button"
            onClick={() => onSelectProvince && onSelectProvince(province)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[130px] sm:max-w-[160px] shrink-0",
              hasProvince && !hasProject
                ? "bg-[#0284C7]/15 dark:bg-[#0284C7]/25 text-[#0284C7] dark:text-[#38BDF8] font-bold border border-[#0284C7]/30 dark:border-[#0284C7]/40"
                : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            )}
            title={`Drill to ${province}`}
          >
            <span className="truncate">{province}</span>
          </button>
        </>
      )}

      {/* 4. Project Level */}
      {hasProject && (
        <>
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 truncate max-w-[160px] sm:max-w-[220px] shrink-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{selectedProjectName}</span>
            {onClearProject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearProject();
                }}
                className="hover:text-emerald-900 dark:hover:text-white transition-colors cursor-pointer ml-0.5"
                title="Deselect Project"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}

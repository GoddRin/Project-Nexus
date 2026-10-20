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
  const hasRegion = Boolean(region && region !== "ALL");
  const rawHasProvince = Boolean(province && province !== "ALL");
  // Avoid redundant crumb when province is already part of the region label (e.g. "NCR (Metro Manila)" -> "Metro Manila")
  const hasProvince =
    rawHasProvince &&
    (!hasRegion || !region.toLowerCase().includes(province.toLowerCase().trim()));
  const hasProject = !!selectedProjectName;

  // Don't render floating pill when at national overview with no selection
  if (!hasRegion && !hasProvince && !hasProject) {
    return null;
  }

  return (
    <nav
      aria-label="Geographic breadcrumb"
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#081321]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg text-[10.5px] font-mono text-slate-700 dark:text-slate-300 max-w-full overflow-x-auto no-scrollbar",
        className
      )}
    >
      {/* 1. National Level (Philippines) */}
      <button
        type="button"
        onClick={onResetNational}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap",
          !hasRegion && !hasProvince && !hasProject
            ? "bg-scic-blue/15 dark:bg-scic-blue/25 text-scic-blue dark:text-sky-400 font-bold border border-scic-blue/30 dark:border-scic-blue/40"
            : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        )}
        title="Zoom to Full Philippine Extent"
      >
        <Globe className="h-3 w-3 text-scic-blue dark:text-sky-400 shrink-0" />
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
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer truncate max-w-[120px] xl:max-w-[150px]",
              hasRegion && !hasProvince && !hasProject
                ? "bg-scic-blue/15 dark:bg-scic-blue/25 text-scic-blue dark:text-sky-400 font-bold border border-scic-blue/30 dark:border-scic-blue/40"
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
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer truncate max-w-[110px] xl:max-w-[135px]",
              hasProvince && !hasProject
                ? "bg-scic-blue/15 dark:bg-scic-blue/25 text-scic-blue dark:text-sky-400 font-bold border border-scic-blue/30 dark:border-scic-blue/40"
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
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 min-w-0 max-w-[150px] xl:max-w-[190px]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate" title={selectedProjectName || undefined}>{selectedProjectName}</span>
            {onClearProject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearProject();
                }}
                className="hover:text-emerald-900 dark:hover:text-white transition-colors cursor-pointer ml-0.5 shrink-0"
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

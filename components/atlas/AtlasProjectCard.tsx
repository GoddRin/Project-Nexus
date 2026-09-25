"use client";

import React from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import { ATLAS_STATUSES } from "./AtlasTokens";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "./AtlasMarkerIcons";
import { cn } from "@/lib/utils";

export interface AtlasProjectCardProps {
  project: SCICProject;
  isSelected?: boolean;
  onSelect: (project: SCICProject) => void;
  className?: string;
}

export const AtlasProjectCard = React.forwardRef<HTMLDivElement, AtlasProjectCardProps>(
  function AtlasProjectCard(
    { project, isSelected = false, onSelect, className },
    ref
  ) {
    const canonicalCat = toCanonicalCategory(
      project.sector,
      project.name,
      project.description
    );
    const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
    const status = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

    // Primary engineering metric for clean secondary line
    const primarySpec =
      project.metrics.capacity ||
      project.metrics.roadLength ||
      project.metrics.tunnelLength ||
      project.metrics.contractValue ||
      "Major Works";

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
        aria-label={`${project.name}, ${catConfig.shortLabel}, ${status.label}, in ${project.municipality}, ${project.province}. Metric: ${primarySpec}. Press Enter to select on map.`}
        onClick={() => onSelect(project)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(project);
          }
        }}
        className={cn(
          "group relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none overflow-hidden",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] dark:focus-visible:ring-[#00E5FF] focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#08121E]",
          isSelected
            ? "bg-sky-50/90 dark:bg-[#0C1E33] border-[#0284C7] dark:border-[#00E5FF]/80 shadow-[0_0_16px_rgba(2,132,199,0.2)] dark:shadow-[0_0_16px_rgba(0,229,255,0.18)] ring-1 ring-[#0284C7]/50 dark:ring-[#00E5FF]/50"
            : "bg-white dark:bg-[#0B1726] border-slate-200/90 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#0E1E32] hover:border-slate-300 dark:hover:border-white/20 shadow-xs hover:shadow-md",
          className
        )}
      >
        {/* Glowing Top Discipline Laser Rail */}
        <div
          className="absolute top-0 inset-x-0 h-[2px] rounded-t-xl transition-opacity duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${catConfig.color} 20%, ${catConfig.color} 80%, transparent 100%)`,
            opacity: isSelected ? 1 : 0.6,
          }}
        />

        {/* Ambient Radial Spotlight on Hover/Selected */}
        <div
          className="absolute -top-8 inset-x-0 h-24 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${catConfig.color} 0%, transparent 75%)`,
            opacity: isSelected ? 0.25 : 0.08,
          }}
        />

        {/* Top Row: Discipline Jewel + Operational Status */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-[0.12em] uppercase transition-colors shrink-0"
            style={{
              backgroundColor: `${catConfig.color}15`,
              borderColor: `${catConfig.color}35`,
              borderWidth: "1px",
              color: catConfig.color,
            }}
          >
            <svg
              className="h-3 w-3 shrink-0"
              viewBox="0 0 64 64"
              style={{ fill: catConfig.color, color: catConfig.color }}
              dangerouslySetInnerHTML={{ __html: catConfig.svgInnerPath }}
            />
            <span className="truncate max-w-[120px]">{catConfig.shortLabel}</span>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border transition-colors shrink-0",
              status.bgClass,
              status.textClass,
              status.borderClass
            )}
          >
            {status.hasPulse ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            )}
            <span>{status.label}</span>
          </span>
        </div>

        {/* Project Title */}
        <div className="relative z-10 mb-1.5">
          <h3
            className={cn(
              "text-[12.5px] font-bold leading-[1.32] line-clamp-2 transition-colors font-sans tracking-tight",
              isSelected
                ? "text-[#0284C7] dark:text-white"
                : "text-slate-800 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-white"
            )}
          >
            {project.name}
          </h3>
        </div>

        {/* Location (Municipality, Province) */}
        <div className="relative z-10 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate transition-colors mb-2.5">
          <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">
            {project.municipality}, {project.province}
          </span>
          {project.region && (
            <span className="ml-auto text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 shrink-0">
              {project.region}
            </span>
          )}
        </div>

        {/* Bottom Telemetry Shelf (Recessed Dock) */}
        <div className="relative z-10 -mx-3 -mb-3 px-3 py-2 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.07] bg-slate-50/70 dark:bg-black/30 text-[10px] font-mono transition-colors">
          <div className="min-w-0 pr-2">
            <span className="text-[7.5px] font-mono font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 block leading-none mb-1">
              SPECIFICATION
            </span>
            <span
              className="text-[11px] font-mono font-bold tracking-tight truncate block leading-none"
              style={{ color: catConfig.color }}
            >
              {primarySpec}
            </span>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono font-semibold transition-all shrink-0",
              isSelected
                ? "bg-[#0284C7]/15 dark:bg-[#00E5FF]/15 text-[#0284C7] dark:text-[#00E5FF] border border-[#0284C7]/30 dark:border-[#00E5FF]/30 shadow-xs"
                : "bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 group-hover:bg-[#0284C7]/10 dark:group-hover:bg-sky-500/15 group-hover:text-[#0284C7] dark:group-hover:text-sky-300 group-hover:border-[#0284C7]/30 dark:group-hover:border-sky-500/30"
            )}
          >
            <span>{isSelected ? "Selected" : "Inspect"}</span>
            <ChevronRight className="h-2.5 w-2.5" />
          </div>
        </div>
      </div>
    );
  }
);

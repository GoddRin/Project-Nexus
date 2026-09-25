"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { CATEGORY_ICON_REGISTRY } from "./AtlasMarkerIcons";
import { ProjectCategoryId } from "@/lib/validations/projectAtlasSchema";
import { cn } from "@/lib/utils";

interface AtlasMapLegendProps {
  className?: string;
}

export function AtlasMapLegend({ className }: AtlasMapLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      role="region"
      aria-label="GIS Map Legend"
      className={cn(
        "rounded-xl bg-white/95 dark:bg-[#0B1726]/95 backdrop-blur-md border border-slate-200 dark:border-white/15 shadow-xl text-xs font-sans overflow-hidden transition-all duration-200",
        isOpen ? "w-80 sm:w-[340px]" : "w-auto",
        className
      )}
    >
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
        aria-label={isOpen ? "Collapse GIS map legend" : "Expand GIS map legend"}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
          <span>GIS Legend</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        )}
      </button>

      {/* Expanded Legend Content */}
      {isOpen && (
        <div className="p-3 pt-1 border-t border-slate-200 dark:border-white/10 space-y-3 font-sans text-xs max-h-[380px] overflow-y-auto">
          {/* Group 1: Engineering Disciplines (2-Column Grid with Vector Glyphs) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Engineering Disciplines
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">10 Categories</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
              {(Object.keys(CATEGORY_ICON_REGISTRY) as ProjectCategoryId[]).map((key) => {
                const config = CATEGORY_ICON_REGISTRY[key];
                return (
                  <div key={key} className="flex items-center gap-2 min-w-0" title={config.label}>
                    <div
                      className="h-5 w-5 rounded-full shrink-0 border border-black/10 dark:border-white/30 flex items-center justify-center shadow-2xs overflow-hidden"
                      style={{ backgroundColor: config.color }}
                      aria-hidden="true"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 64 64"
                        dangerouslySetInnerHTML={{ __html: config.svgInnerPath }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                      {config.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: Map Symbology & Status Indicators */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Symbology & Status
            </span>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-2 text-[10px] font-mono text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2" title="Clusters group nearby projects at regional or national scales">
                <span className="h-5 w-5 rounded-full bg-[#0284C7] border border-white flex items-center justify-center text-[9px] text-white font-bold shrink-0 shadow-2xs">
                  18
                </span>
                <span>Cluster [N]</span>
              </div>
              <div className="flex items-center gap-2" title="Individual project site marker">
                <span className="h-5 w-5 rounded-full bg-[#10A51D] border border-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span>Project Marker</span>
              </div>
              <div className="flex items-center gap-2" title="Active construction site with restrained indicator ring">
                <span className="h-5 w-5 rounded-full border border-emerald-500 dark:border-emerald-400 border-dashed flex items-center justify-center shrink-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                </span>
                <span>Active Work</span>
              </div>
              <div className="flex items-center gap-2" title="Selected project highlighted by cyan focus halo">
                <span className="h-5 w-5 rounded-full border-2 border-[#0284C7] dark:border-[#00E5FF] flex items-center justify-center shrink-0 shadow-[0_0_8px_#0284C780] dark:shadow-[0_0_8px_#00E5FF80]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0284C7] dark:bg-[#00E5FF]" />
                </span>
                <span>Selected Halo</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

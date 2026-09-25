"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Globe,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Maximize2,
  Layers,
  CheckCircle2,
  Clock,
  Compass,
  Building2,
  ChevronDown,
  FileText,
} from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import {
  IslandGroupId,
  ProjectCategoryId,
  ProjectStatusId,
} from "@/lib/validations/projectAtlasSchema";
import {
  AtlasDiscoveryScope,
  computeIslandGroupSummaries,
  getRegionDiscoveryDetail,
  RegionSummaryItem,
  IslandGroupSummary,
} from "./AtlasDiscoveryUtils";
import { AtlasProjectSpotlight } from "./AtlasProjectSpotlight";
import { toCanonicalCategory, CATEGORY_ICON_REGISTRY } from "./AtlasMarkerIcons";
import { ATLAS_STATUSES } from "./AtlasTokens";
import { cn } from "@/lib/utils";

export interface AtlasDiscoveryModeProps {
  allProjects: SCICProject[];
  discoveryScope: AtlasDiscoveryScope;
  onScopeChange: (scope: AtlasDiscoveryScope) => void;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onZoomToBounds: (bounds: [[number, number], [number, number]]) => void;
  onBackToNational: () => void;
  className?: string;
}

export function AtlasDiscoveryMode({
  allProjects,
  discoveryScope,
  onScopeChange,
  selectedProjectId,
  onSelectProject,
  onZoomToBounds,
  onBackToNational,
  className,
}: AtlasDiscoveryModeProps) {
  // Mobile / compact Island Group filter tab state for national overview
  const [selectedIslandTab, setSelectedIslandTab] = useState<IslandGroupId | "ALL">("ALL");

  // Dynamic Island Group and Region summaries derived directly from live project records
  const islandSummaries: IslandGroupSummary[] = useMemo(() => {
    return computeIslandGroupSummaries(allProjects);
  }, [allProjects]);

  // Featured projects for editorial spotlight entry point (Phase 11)
  const featuredProjects = useMemo(() => {
    return allProjects.filter((p) => p.featured === true);
  }, [allProjects]);

  // Deep regional intelligence when scope is at region or province level
  const activeRegionKey =
    discoveryScope.level === "region" || discoveryScope.level === "province"
      ? discoveryScope.regionKey
      : null;

  const activeRegionDetail = useMemo(() => {
    if (!activeRegionKey) return null;
    return getRegionDiscoveryDetail(allProjects, activeRegionKey);
  }, [allProjects, activeRegionKey]);

  // Handler for selecting a region row
  const handleSelectRegion = (region: RegionSummaryItem) => {
    const detail = getRegionDiscoveryDetail(allProjects, region.key);
    onScopeChange({
      level: "region",
      regionKey: region.key,
      regionDisplayName: region.displayName,
      islandGroup: region.islandGroup,
    });

    if (detail?.bounds) {
      onZoomToBounds(detail.bounds);
    }
  };

  // Filter island summaries based on tab
  const displayedSummaries = useMemo(() => {
    if (selectedIslandTab === "ALL") return islandSummaries;
    return islandSummaries.filter((s) => s.id === selectedIslandTab);
  }, [islandSummaries, selectedIslandTab]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white dark:bg-[#0B1726] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors",
        className
      )}
    >
      {/* ─────────────────────────────────────────────────────────────
          MODE A: REGIONAL SUMMARY & IN-REGION PROJECTS VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeRegionDetail ? (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200">
          {/* 1. Regional Header & Return Navigation */}
          <div className="p-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/60 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onBackToNational}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-[#0284C7] dark:text-[#38BDF8] hover:bg-sky-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Return to National Overview"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Philippines</span>
              </button>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/10 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/20">
                {activeRegionDetail.islandGroup}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Regional Jurisdiction
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {activeRegionDetail.displayName}
              </h2>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
              <div className="p-2 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">
                  Total
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeRegionDetail.totalProjects}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block uppercase">
                  Ongoing
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {activeRegionDetail.statusCounts.ONGOING}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-sky-50/70 dark:bg-sky-500/10 border border-sky-500/20">
                <span className="text-[9px] text-sky-700 dark:text-sky-400 block uppercase">
                  Completed
                </span>
                <span className="text-sm font-bold text-sky-700 dark:text-sky-400">
                  {activeRegionDetail.statusCounts.COMPLETED}
                </span>
              </div>
            </div>

            {/* Re-center bounds action */}
            {activeRegionDetail.bounds && (
              <button
                type="button"
                onClick={() => onZoomToBounds(activeRegionDetail.bounds!)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                <Maximize2 className="h-3 w-3 text-slate-400" />
                <span>Fit Regional Extent</span>
              </button>
            )}
          </div>

          {/* 2. Scrollable Body: Category Breakdown + Project Cards */}
          <div className="flex-1 overflow-y-auto scic-scrollbar p-3.5 space-y-4">
            {/* Category Distribution (Phase 2 Canonical, Non-Zero Only) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>Sector Distribution</span>
                <span>{activeRegionDetail.categoryCounts.length} Sectors</span>
              </div>

              <div className="space-y-1.5">
                {activeRegionDetail.categoryCounts.map((cat) => (
                  <div key={cat.category} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
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

            {/* Provinces in Scope */}
            {activeRegionDetail.provinces.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Provinces ({activeRegionDetail.provinces.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeRegionDetail.provinces.map((prov) => (
                    <span
                      key={prov.name}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                    >
                      {prov.name} ({prov.projectCount})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Regional Projects List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                <span>Projects in Region</span>
                <span>{activeRegionDetail.projects.length} Total</span>
              </div>

              <div className="space-y-2">
                {activeRegionDetail.projects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  const canonicalCat = toCanonicalCategory(
                    project.sector,
                    project.name,
                    project.description
                  );
                  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
                  const status =
                    ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

                  return (
                    <div
                      key={project.id}
                      onClick={() => onSelectProject(project.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer text-left relative",
                        isSelected
                          ? "bg-sky-50/80 dark:bg-[#0C1E33] border-[#0284C7] dark:border-[#38BDF8] shadow-sm"
                          : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold flex items-center gap-1"
                          style={{
                            color: catConfig.color,
                            backgroundColor: `${catConfig.color}18`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: catConfig.color }}
                          />
                          {catConfig.shortLabel}
                        </span>

                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold",
                            status.textClass,
                            status.bgClass
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {project.name}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2">
                        <div className="flex items-center gap-1 truncate max-w-[190px]">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {project.municipality}, {project.province}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {project.metrics?.capacity && (
                            <span className="font-bold text-[#0284C7] dark:text-[#38BDF8]">
                              {project.metrics.capacity}
                            </span>
                          )}
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Open Project Profile"
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MODE B: NATIONAL EXPLORE BY REGION (ISLAND GROUP ACCORDION)
           ───────────────────────────────────────────────────────────── */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/60 space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                Explore by Region
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Explore Sta. Clara’s national portfolio across Luzon, Visayas, and Mindanao.
            </p>

            {/* Island Group Filter Tabs */}
            <div className="flex items-center gap-1 pt-1 overflow-x-auto scic-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedIslandTab("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-semibold transition-colors cursor-pointer whitespace-nowrap",
                  selectedIslandTab === "ALL"
                    ? "bg-[#0284C7] text-white shadow-xs"
                    : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                All Islands ({allProjects.length})
              </button>
              {islandSummaries.map((isl) => (
                <button
                  key={isl.id}
                  type="button"
                  onClick={() => setSelectedIslandTab(isl.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-semibold transition-colors cursor-pointer whitespace-nowrap",
                    selectedIslandTab === isl.id
                      ? "bg-[#0284C7] text-white shadow-xs"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {isl.name} ({isl.totalProjects})
                </button>
              ))}
            </div>
          </div>

          {/* Island Groups & Region Rows List */}
          <div className="flex-1 overflow-y-auto scic-scrollbar p-3.5 space-y-4">
            {/* Featured Project Spotlight in Discovery Mode (Phase 11) */}
            {featuredProjects.length > 0 && selectedIslandTab === "ALL" && (
              <div className="pb-1">
                <AtlasProjectSpotlight
                  featuredProjects={featuredProjects}
                  onExploreProject={(p) => onSelectProject(p.id)}
                  selectedProjectId={selectedProjectId}
                />
              </div>
            )}

            {displayedSummaries.map((island) => (
              <div key={island.id} className="space-y-2">
                {/* Island Section Title */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                      {island.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold">
                      {island.totalProjects} {island.totalProjects === 1 ? "Project" : "Projects"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    {island.ongoingProjects} Active Works
                  </span>
                </div>

                {/* Region Rows */}
                <div className="space-y-1.5">
                  {island.regions.map((region) => (
                    <button
                      key={region.key}
                      type="button"
                      onClick={() => handleSelectRegion(region)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-[#0284C7]/40 dark:hover:border-[#38BDF8]/40 transition-all cursor-pointer text-left group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-[#0284C7] dark:group-hover:text-[#38BDF8] transition-colors truncate">
                            {region.shortName}
                          </span>
                          {region.topSectorLabel && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold shrink-0"
                              style={{
                                color: region.topSectorColor,
                                backgroundColor: `${region.topSectorColor}18`,
                              }}
                            >
                              {region.topSectorLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block truncate mt-0.5">
                          {region.regionalTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {region.projectCount} {region.projectCount === 1 ? "Project" : "Projects"}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0284C7] dark:group-hover:text-[#38BDF8] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

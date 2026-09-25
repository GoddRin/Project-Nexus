"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Table,
  LayoutGrid,
  Info,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Compass,
} from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import {
  ProjectCategoryId,
  ProjectStatusId,
  IslandGroupId,
} from "@/lib/validations/projectAtlasSchema";
import { AtlasProjectCard } from "./AtlasProjectCard";
import { ATLAS_CATEGORIES, ATLAS_STATUSES } from "./AtlasTokens";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "./AtlasMarkerIcons";
import { AtlasDiscoveryMode } from "./AtlasDiscoveryMode";
import { AtlasDiscoveryScope } from "./AtlasDiscoveryUtils";
import { AtlasProjectSpotlight } from "./AtlasProjectSpotlight";
import { cn } from "@/lib/utils";

export interface AtlasDirectorySidebarProps {
  projects: SCICProject[];
  totalCount: number;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Canonical Filters
  selectedCategory: ProjectCategoryId | "ALL";
  onCategoryChange: (category: ProjectCategoryId | "ALL") => void;
  selectedStatus: ProjectStatusId | "ALL";
  onStatusChange: (status: ProjectStatusId | "ALL") => void;
  selectedIsland: IslandGroupId | "ALL";
  onIslandChange: (island: IslandGroupId | "ALL") => void;
  selectedRegion: string | "ALL";
  onRegionChange: (region: string | "ALL") => void;
  selectedProvince: string | "ALL";
  onProvinceChange: (province: string | "ALL") => void;

  // Dataset-derived options
  availableRegions: string[];
  availableProvinces: string[];

  // Reset & Status
  onResetFilters: () => void;
  hasActiveFilters: boolean;

  // Loading state
  isLoading?: boolean;

  // Discovery Mode (Phase 10)
  sidebarMode?: "DIRECTORY" | "DISCOVERY";
  onSidebarModeChange?: (mode: "DIRECTORY" | "DISCOVERY") => void;
  allProjects?: SCICProject[];
  discoveryScope?: AtlasDiscoveryScope;
  onDiscoveryScopeChange?: (scope: AtlasDiscoveryScope) => void;
  onZoomToBounds?: (bounds: [[number, number], [number, number]]) => void;
  onBackToNationalDiscovery?: () => void;

  // Layout
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

const PAGE_SIZE = 25;

export function AtlasDirectorySidebar({
  projects,
  totalCount,
  selectedProjectId,
  onSelectProject,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  selectedIsland,
  onIslandChange,
  selectedRegion,
  onRegionChange,
  selectedProvince,
  onProvinceChange,
  availableRegions,
  availableProvinces,
  onResetFilters,
  hasActiveFilters,
  isLoading = false,
  sidebarMode = "DIRECTORY",
  onSidebarModeChange,
  allProjects,
  discoveryScope = { level: "national" },
  onDiscoveryScopeChange,
  onZoomToBounds,
  onBackToNationalDiscovery,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: AtlasDirectorySidebarProps) {
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");
  const [isGeoFiltersExpanded, setIsGeoFiltersExpanded] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Card and row element refs for programmatic smooth scroll-into-view
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const directoryHeaderRef = useRef<HTMLDivElement | null>(null);

  // Spotlight collapse & scroll management
  const [isSpotlightCollapsed, setIsSpotlightCollapsed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScrollToDirectory = useCallback(() => {
    directoryHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleScrollToTop = useCallback(() => {
    listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleScrollContainer = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    setShowBackToTop(top > 200);
  }, []);

  // Compute status counts strictly from current filtered results
  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatusId, number> = {
      ONGOING: 0,
      COMPLETED: 0,
      UPCOMING: 0,
      PLANNING: 0,
      ON_HOLD: 0,
    };
    for (const p of projects) {
      const statusKey = p.status as ProjectStatusId;
      if (counts[statusKey] !== undefined) {
        counts[statusKey]++;
      }
    }
    return counts;
  }, [projects]);

  // Formatted status breakdown text
  const statusSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (statusCounts.ONGOING > 0) parts.push(`${statusCounts.ONGOING} Ongoing`);
    if (statusCounts.COMPLETED > 0) parts.push(`${statusCounts.COMPLETED} Completed`);
    if (statusCounts.UPCOMING > 0) parts.push(`${statusCounts.UPCOMING} Upcoming`);
    if (statusCounts.PLANNING > 0) parts.push(`${statusCounts.PLANNING} Planning`);
    if (statusCounts.ON_HOLD > 0) parts.push(`${statusCounts.ON_HOLD} On Hold`);
    return parts.join(" · ") || "0 Results";
  }, [statusCounts]);

  // Featured projects for spotlight entry point (Phase 11)
  const featuredProjects = useMemo(() => {
    const source = allProjects || projects;
    return source.filter((p) => p.featured === true);
  }, [allProjects, projects]);

  // Slice displayed cards for performance (Directive 6: map receives all, directory slices initial 25)
  const visibleProjects = useMemo(() => {
    return projects.slice(0, displayCount);
  }, [projects, displayCount]);

  // Synchronize map selection to directory card: expand displayCount if needed, then scroll into view
  useEffect(() => {
    if (!selectedProjectId) return;

    const selectedIdx = projects.findIndex(
      (p) => p.id === selectedProjectId || p.code === selectedProjectId
    );

    if (selectedIdx >= 0) {
      if (selectedIdx >= displayCount) {
        const needed = Math.ceil((selectedIdx + 1) / PAGE_SIZE) * PAGE_SIZE;
        setDisplayCount((prev) => Math.max(prev, needed));
      }

      // Small delay allows React to mount newly revealed cards before scrolling
      const timer = setTimeout(() => {
        const targetEl = cardRefs.current[selectedProjectId];
        if (targetEl) {
          targetEl.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }, 60);

      return () => clearTimeout(timer);
    }
  }, [selectedProjectId, projects, displayCount]);

  // Load More Handler (Directive 24: appends next batch while preserving scroll position)
  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, projects.length));
  };

  // Collapsed Sidebar Presentation
  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "w-12 h-full bg-white dark:bg-[#0B1726] border border-slate-200 dark:border-white/10 rounded-xl flex flex-col items-center py-3 gap-4 shadow-sm shrink-0 transition-colors",
          className
        )}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Expand Project Directory"
          aria-label="Expand Project Directory"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="[writing-mode:vertical-lr] rotate-180 flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          <span>PROJECT DIRECTORY</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] text-slate-800 dark:text-white font-bold">
            {projects.length}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "w-full lg:w-[390px] xl:w-[420px] h-full bg-white dark:bg-[#0B1726] border border-slate-200 dark:border-white/10 rounded-xl flex flex-col overflow-hidden shadow-sm shrink-0 transition-colors",
        className
      )}
    >
      {/* 0. Top Mode Switcher & Minimize Sidebar Control */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 shrink-0">
        <div className="flex-1 flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#08121E] border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => onSidebarModeChange?.("DIRECTORY")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer",
              sidebarMode === "DIRECTORY"
                ? "bg-white dark:bg-[#0284C7] text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Directory</span>
          </button>
          <button
            type="button"
            onClick={() => onSidebarModeChange?.("DISCOVERY")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer",
              sidebarMode === "DISCOVERY"
                ? "bg-white dark:bg-[#0284C7] text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Discovery</span>
          </button>
        </div>

        {/* Dedicated Top Section Minimize Button (Hides sidebar to expand map) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#08121E] dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shrink-0 shadow-2xs group"
            title="Minimize sidebar to view more map"
            aria-label="Minimize sidebar to view more map"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}
      </div>

      {sidebarMode === "DISCOVERY" ? (
        <AtlasDiscoveryMode
          allProjects={allProjects || projects}
          discoveryScope={discoveryScope}
          onScopeChange={onDiscoveryScopeChange || (() => {})}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          onZoomToBounds={onZoomToBounds || (() => {})}
          onBackToNational={onBackToNationalDiscovery || (() => {})}
          className="flex-1 min-h-0"
        />
      ) : (
        <div
          ref={listContainerRef}
          onScroll={handleScrollContainer}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scic-scrollbar flex flex-col relative"
        >
          {/* 1. Featured Project Spotlight (Phase 11: Grand Architectural Showcase) */}
          {featuredProjects.length > 0 && (
            <div className="p-3 pb-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#08121E]/30 shrink-0">
              <AtlasProjectSpotlight
                featuredProjects={featuredProjects}
                onExploreProject={(p) => onSelectProject(p.id)}
                selectedProjectId={selectedProjectId}
                isCollapsed={isSpotlightCollapsed}
                onToggleCollapse={() => setIsSpotlightCollapsed((prev) => !prev)}
                onScrollToDirectory={handleScrollToDirectory}
              />
            </div>
          )}

          {/* 2. Directory Section Header: Dynamic Result Count & View Mode Toggle (Positioned below spotlight) */}
          <div
            ref={directoryHeaderRef}
            className="sticky top-0 z-20 flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-[#08121E]/95 backdrop-blur-md transition-colors shrink-0 shadow-xs"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <ListFilter className="h-4 w-4 text-[#0284C7] shrink-0" />
                <span className="text-xs font-bold font-mono tracking-wider text-slate-900 dark:text-white uppercase truncate">
                  {projects.length} {projects.length === 1 ? "Project" : "Projects"}
                </span>
                {projects.length < totalCount && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    (of {totalCount})
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {statusSummaryText}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* View Mode Toggle */}
              <div
                className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-[#0B1726] border border-slate-200 dark:border-white/10 transition-colors"
                role="group"
                aria-label="Directory view mode"
              >
                <button
                  onClick={() => setViewMode("CARDS")}
                  title="Cards View"
                  aria-label="Cards view"
                  aria-pressed={viewMode === "CARDS"}
                  className={cn(
                    "p-1 rounded text-xs transition-colors cursor-pointer",
                    viewMode === "CARDS"
                      ? "bg-[#0284C7] text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("TABLE")}
                  title="Ledger Table View"
                  aria-label="Ledger table view"
                  aria-pressed={viewMode === "TABLE"}
                  className={cn(
                    "p-1 rounded text-xs transition-colors cursor-pointer",
                    viewMode === "TABLE"
                      ? "bg-[#0284C7] text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Table className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

      {/* 2. Structured Filter & Search Controls Panel */}
      <div className="p-3 border-b border-slate-200 dark:border-white/10 space-y-2 bg-white dark:bg-[#0B1726] transition-colors">
        {/* Instantaneous Search Input with Clear Action */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, code, municipality, province, or category..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-[#08121E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] font-sans transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm cursor-pointer p-0.5"
              aria-label="Clear search input"
            >
              &times;
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Canonical Phase 2 Statuses) */}
        <div className="flex items-center gap-1 overflow-x-auto scic-scrollbar pb-0.5">
          {(
            [
              { id: "ALL", label: "All" },
              { id: "ONGOING", label: "Ongoing" },
              { id: "COMPLETED", label: "Completed" },
              { id: "UPCOMING", label: "Upcoming" },
              { id: "PLANNING", label: "Planning" },
              { id: "ON_HOLD", label: "On Hold" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => onStatusChange(s.id as ProjectStatusId | "ALL")}
              aria-pressed={selectedStatus === s.id}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-mono uppercase whitespace-nowrap transition-colors cursor-pointer",
                selectedStatus === s.id
                  ? "bg-[#0284C7] dark:bg-white/20 text-white font-bold border border-[#0284C7] dark:border-white/30 shadow-xs"
                  : "bg-slate-100 dark:bg-[#08121E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-transparent"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Canonical Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto scic-scrollbar pt-0.5">
          <button
            onClick={() => onCategoryChange("ALL")}
            aria-pressed={selectedCategory === "ALL"}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap uppercase transition-colors border cursor-pointer",
              selectedCategory === "ALL"
                ? "bg-slate-800 dark:bg-white/20 text-white border-slate-800 dark:border-white/30 font-bold shadow-xs"
                : "bg-slate-100 dark:bg-[#08121E] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            All Categories
          </button>
          {(Object.keys(ATLAS_CATEGORIES) as ProjectCategoryId[]).map((catKey) => {
            const token = ATLAS_CATEGORIES[catKey];
            const isCur = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => onCategoryChange(isCur ? "ALL" : catKey)}
                aria-pressed={isCur}
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap uppercase transition-colors border flex items-center gap-1 cursor-pointer",
                  isCur
                    ? cn(token.bgClass, token.textClass, token.borderClass, "font-bold shadow-xs")
                    : "bg-slate-100 dark:bg-[#08121E] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: token.color }}
                />
                <span>{token.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Geographic Filter Section (Collapsible Accordion) */}
        <div className="pt-1 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsGeoFiltersExpanded(!isGeoFiltersExpanded)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-expanded={isGeoFiltersExpanded}
            >
              <SlidersHorizontal className="h-3 w-3 text-[#0284C7]" />
              <span>
                Geographic Filters
                {selectedIsland !== "ALL" || selectedRegion !== "ALL" || selectedProvince !== "ALL"
                  ? " (Active)"
                  : ""}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isGeoFiltersExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Clear Filters Action Button */}
            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors cursor-pointer"
                title="Reset all search and filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Expanded Geographic Dropdowns */}
          {isGeoFiltersExpanded && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Island Filter (Directive 4: Pure data filter) */}
              <div className="col-span-1 sm:col-span-2 flex items-center gap-1 overflow-x-auto pb-1 scic-scrollbar">
                {(
                  [
                    { id: "ALL", label: "All Islands" },
                    { id: "LUZON", label: "Luzon" },
                    { id: "VISAYAS", label: "Visayas" },
                    { id: "MINDANAO", label: "Mindanao" },
                  ] as const
                ).map((isl) => (
                  <button
                    key={isl.id}
                    onClick={() => onIslandChange(isl.id as IslandGroupId | "ALL")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-colors cursor-pointer",
                      selectedIsland === isl.id
                        ? "bg-[#0284C7] text-white font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-[#08121E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {isl.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Region Selector */}
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                  Region ({availableRegions.length})
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-[#08121E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] font-sans cursor-pointer transition-colors"
                >
                  <option value="ALL">All Regions</option>
                  {availableRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Cascading Province Selector */}
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                  Province ({availableProvinces.length})
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => onProvinceChange(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-[#08121E] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0284C7] font-sans cursor-pointer transition-colors"
                >
                  <option value="ALL">All Provinces</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Directory Content: Cards List or Ledger Table View */}
      <div className="p-3 space-y-2 flex-1">
        {projects.length === 0 ? (
          isLoading ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#0284C7] border-t-transparent animate-spin" />
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Syncing project portfolio...
              </div>
            </div>
          ) : (
            /* Meaningful Empty State with Clear Filters Button (Directive 13, 26) */
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 mb-3">
                <Info className="h-6 w-6 opacity-75 text-amber-500 dark:text-amber-400" />
              </div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                No projects match your current filters.
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                Try adjusting your search keywords or resetting your category, region, and status filters.
              </p>
              <button
                onClick={onResetFilters}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-xs font-mono font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Filters</span>
              </button>
            </div>
          )
        ) : viewMode === "CARDS" ? (
          /* Cards View */
          <>
            {visibleProjects.map((project) => (
              <AtlasProjectCard
                key={project.id}
                ref={(el) => {
                  cardRefs.current[project.id] = el;
                }}
                project={project}
                isSelected={selectedProjectId === project.id}
                onSelect={() => onSelectProject(project.id)}
              />
            ))}

            {/* Load More Button (Directive 24) */}
            {displayCount < projects.length && (
              <div className="pt-2 pb-1 text-center">
                <button
                  onClick={handleLoadMore}
                  className="w-full py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Load More Projects (Showing {visibleProjects.length} of {projects.length})
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Ledger Table View */
          <>
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#0B1726] border-b border-slate-200 dark:border-white/10 text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-2 px-2">Project</th>
                  <th className="py-2 px-1.5">Category</th>
                  <th className="py-2 px-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {visibleProjects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  const canonicalCat = toCanonicalCategory(
                    project.sector,
                    project.name,
                    project.description
                  );
                  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
                  const status = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

                  return (
                    <tr
                      key={project.id}
                      ref={(el) => {
                        cardRefs.current[project.id] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      aria-selected={isSelected}
                      aria-label={`${project.name}, ${catConfig.shortLabel}, ${status.label}, in ${project.municipality}, ${project.province}. Press Enter to view on map.`}
                      onClick={() => onSelectProject(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectProject(project.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-colors focus:outline-none focus:bg-sky-50 dark:focus:bg-[#0F2238]",
                        isSelected
                          ? "bg-sky-50 dark:bg-[#0C1E33] border-l-2 border-[#0284C7] dark:border-[#00E5FF]"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      )}
                    >
                      <td className="py-2 px-2">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[170px]">
                          {project.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[170px]">
                          {project.municipality}, {project.province}
                        </div>
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold"
                          style={{
                            color: catConfig.color,
                            backgroundColor: `${catConfig.color}20`,
                          }}
                        >
                          {catConfig.shortLabel}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap font-mono text-[9px]">
                        <span className={status.textClass}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Load More Button for Table View */}
            {displayCount < projects.length && (
              <div className="pt-2 pb-1 text-center">
                <button
                  onClick={handleLoadMore}
                  className="w-full py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Load More Projects (Showing {visibleProjects.length} of {projects.length})
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Quick Action: Jump Back to Top / Spotlight */}
      {showBackToTop && (
        <div className="sticky bottom-3 z-30 flex justify-center pointer-events-none mt-2 pb-1">
          <button
            type="button"
            onClick={handleScrollToTop}
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0284C7] hover:bg-[#0369a1] text-white text-[11px] font-mono font-bold shadow-lg shadow-[#0284C7]/40 transition-all cursor-pointer active:scale-95 animate-in fade-in slide-in-from-bottom-2"
            title="Scroll back to Spotlight"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span>Top / Spotlight</span>
          </button>
        </div>
      )}
        </div>
      )}
    </aside>
  );
}

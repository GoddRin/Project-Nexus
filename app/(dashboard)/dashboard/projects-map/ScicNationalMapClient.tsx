"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  SCICProject,
  SCIC_PROJECTS,
  computeNationalKPIs,
} from "@/lib/data/scicProjectsData";
import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import {
  ProjectCategoryId,
  ProjectStatusId,
  IslandGroupId,
  PublicProjectDTO,
} from "@/lib/validations/projectAtlasSchema";
import { AtlasHeader } from "@/components/atlas/AtlasHeader";
import { AtlasDirectorySidebar } from "@/components/atlas/AtlasDirectorySidebar";
import { ProjectAtlasMap } from "@/components/atlas/ProjectAtlasMap";
import { ProjectInspectionDrawer } from "./ProjectInspectionDrawer";
import {
  AtlasMapProvider,
  useAtlasMap,
} from "@/components/atlas/AtlasMapContext";
import type { AtlasFeatureCollection } from "@/lib/services/projectAtlasService";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "@/components/atlas/AtlasMarkerIcons";
import {
  projectMatchesSearch,
  extractUniqueRegions,
  extractUniqueProvinces,
  getBoundsForProjects,
} from "@/components/atlas/AtlasSearchUtils";
import { AtlasGeographicBreadcrumb } from "@/components/atlas/AtlasGeographicBreadcrumb";
import { RegionIntelligenceCard } from "@/components/atlas/RegionIntelligenceCard";
import {
  AtlasDiscoveryScope,
  getRegionDiscoveryDetail,
} from "@/components/atlas/AtlasDiscoveryUtils";
import { Search, X, SlidersHorizontal, Loader2, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Adapter converting live PostgreSQL PublicProjectDTO to SCICProject shape for UI rendering.
 */
function convertDtoToScicProject(dto: PublicProjectDTO): SCICProject {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.projectCode || dto.slug,
    shortName: dto.name.length > 25 ? dto.name.slice(0, 22) + "..." : dto.name,
    sector: (dto.category as any) || "HYDRO_RENEWABLE",
    status: (dto.status as any) || "ONGOING",
    islandGroup: (dto.islandGroup as any) || "LUZON",
    region: dto.region,
    province: dto.province,
    municipality: dto.municipality,
    barangay: dto.barangay || undefined,
    coordinates: {
      lat: dto.latitude,
      lng: dto.longitude,
    },
    metrics: {
      capacity: dto.capacity || undefined,
      contractValue: dto.projectValue || undefined,
      ...dto.metrics,
    },
    client: dto.client || "Sta. Clara International Corporation",
    description: dto.description || "",
    imageUrl: dto.featuredImage || "/logo.png",
    galleryImages: dto.gallery || [],
    leadPM: dto.leadPMName
      ? {
          name: dto.leadPMName,
          role: dto.leadPMRole || "Project Manager",
          division: dto.leadPMDivision || "Engineering & Construction",
          licenseNumber: dto.leadPMLicense || undefined,
          contactEmail: dto.leadPMContact || undefined,
          avatarUrl: "/logo.png",
        }
      : undefined,
    engineeringScope: dto.engineeringScope || [],
    keyMilestones: dto.keyMilestones || [],
    featured: dto.featured,
    targetCodDate: dto.targetCodDate || undefined,
    projectStartDate: dto.projectStartDate || undefined,
    projectEndDate: dto.projectEndDate || undefined,
    completionYear: dto.completionYear || (dto.metrics as any)?.completionYear || undefined,
  };
}

function ScicNationalMapContent() {
  const {
    selectedProjectId,
    selectProject,
    flyToProject,
    mapStyle,
    setMapStyle,
    resetToNationalView,
    zoomToBounds,
    isFullscreen,
  } = useAtlasMap();

  const searchParams = useSearchParams();
  const selectParam = searchParams.get("select");

  // Single Runtime Source of Truth: Pre-hydrated with INITIAL_ATLAS_PROJECTS for instant 0ms mount,
  // synchronized continuously in background with PostgreSQL via /api/projects.
  const [activeProjects, setActiveProjects] = useState<SCICProject[]>(() => INITIAL_ATLAS_PROJECTS);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const fetchLiveProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=500");
      if (!res.ok) {
        console.warn(`Project Atlas: Live fetch returned HTTP ${res.status}. Preserving cached/offline projects.`);
        setActiveProjects((prev) => (prev.length > 0 ? prev : INITIAL_ATLAS_PROJECTS));
        return;
      }
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const mapped = json.data.map(convertDtoToScicProject);
        setActiveProjects(mapped);
      } else {
        setActiveProjects((prev) => (prev.length > 0 ? prev : INITIAL_ATLAS_PROJECTS));
      }
    } catch (err: any) {
      console.warn("Project Atlas: Live project load warning (using offline fallback):", err?.message);
      setActiveProjects((prev) => (prev.length > 0 ? prev : INITIAL_ATLAS_PROJECTS));
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveProjects();

    const handleRevalidate = () => fetchLiveProjects();
    window.addEventListener("atlas:revalidate", handleRevalidate);
    return () => window.removeEventListener("atlas:revalidate", handleRevalidate);
  }, [fetchLiveProjects]);

  // Handle URL ?select={id} parameter from Admin Workspace "Inspect on Map"
  useEffect(() => {
    if (selectParam && activeProjects.length > 0) {
      const target = activeProjects.find(
        (p) => p.id === selectParam || p.code === selectParam || (p as any).slug === selectParam
      );
      if (target) {
        selectProject(target.id);
        flyToProject({
          coordinates: { lat: target.coordinates.lat, lng: target.coordinates.lng },
          id: target.id,
        });
      }
    }
  }, [selectParam, activeProjects, selectProject, flyToProject]);

  // 1. Page-level Query & Filter State (Directive 3: Clean separation from map state)
  const [searchInputValue, setSearchInputValue] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryId | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatusId | "ALL">("ALL");
  const [selectedIsland, setSelectedIsland] = useState<IslandGroupId | "ALL">("ALL");
  const [selectedRegion, setSelectedRegion] = useState<string | "ALL">("ALL");
  const [selectedProvince, setSelectedProvince] = useState<string | "ALL">("ALL");

  // Phase 8: Geographic Scope state (camera & regional intelligence context)
  const [geographicScope, setGeographicScope] = useState<{
    region: string | "ALL";
    province: string | "ALL";
  }>({
    region: "ALL",
    province: "ALL",
  });

  // Phase 10: Project Discovery Mode state (Geographic Storytelling & Regional Exploration)
  const [sidebarMode, setSidebarMode] = useState<"DIRECTORY" | "DISCOVERY">("DIRECTORY");
  const [discoveryScope, setDiscoveryScope] = useState<AtlasDiscoveryScope>({
    level: "national",
  });

  // Layout presentation states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDirectoryOpen, setIsMobileDirectoryOpen] = useState(false);

  // 2. Debounce search input by 250ms (Directive 7 & 21)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInputValue);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // 3. Dynamic Region & Province lists extracted from active dataset (Directive 11 & 12)
  const availableRegions = useMemo(() => {
    return extractUniqueRegions(activeProjects);
  }, [activeProjects]);

  const availableProvinces = useMemo(() => {
    return extractUniqueProvinces(activeProjects, selectedRegion);
  }, [activeProjects, selectedRegion]);

  // Cascading Region change: clears province if no longer valid (Directive 12)
  const handleRegionChange = useCallback(
    (newRegion: string | "ALL") => {
      setSelectedRegion(newRegion);
      if (newRegion !== "ALL") {
        setGeographicScope({ region: newRegion, province: "ALL" });
        const regionProjects = activeProjects.filter((p) => p.region === newRegion);
        const bounds = getBoundsForProjects(regionProjects);
        if (bounds) {
          zoomToBounds(bounds);
        }
      } else {
        setGeographicScope({ region: "ALL", province: "ALL" });
      }

      if (newRegion !== "ALL" && selectedProvince !== "ALL") {
        const validProvs = extractUniqueProvinces(activeProjects, newRegion);
        if (!validProvs.includes(selectedProvince)) {
          setSelectedProvince("ALL");
        }
      }
    },
    [activeProjects, selectedProvince, zoomToBounds]
  );

  // Geographic Scope navigation handlers (Directive 18-20: Clean separation from directory filters)
  const handleDrillRegion = useCallback(
    (regionName: string) => {
      const detail = getRegionDiscoveryDetail(activeProjects, regionName);
      if (detail) {
        setDiscoveryScope({
          level: "region",
          regionKey: detail.key,
          regionDisplayName: detail.displayName,
          islandGroup: detail.islandGroup,
        });
      } else {
        setDiscoveryScope({
          level: "region",
          regionKey: regionName,
          regionDisplayName: regionName,
          islandGroup: "LUZON",
        });
      }

      setGeographicScope({ region: regionName, province: "ALL" });
      selectProject(null);
      const regionProjects = activeProjects.filter((p) => p.region === regionName);
      const bounds = detail?.bounds || getBoundsForProjects(regionProjects);
      if (bounds) {
        zoomToBounds(bounds);
      }
    },
    [activeProjects, selectProject, zoomToBounds]
  );

  const handleDrillProvince = useCallback(
    (provName: string) => {
      setGeographicScope((prev) => ({ ...prev, province: provName }));
      selectProject(null);
      const provProjects = activeProjects.filter((p) => p.province === provName);
      const bounds = getBoundsForProjects(provProjects);
      if (bounds) {
        zoomToBounds(bounds);
      }
    },
    [activeProjects, selectProject, zoomToBounds]
  );

  const handleResetNationalScope = useCallback(() => {
    setDiscoveryScope({ level: "national" });
    setGeographicScope({ region: "ALL", province: "ALL" });
    selectProject(null);
    resetToNationalView();
  }, [selectProject, resetToNationalView]);

  // 4. Single Canonical Filter Pipeline (Directive 5)
  const filteredProjects = useMemo(() => {
    return activeProjects.filter((p) => {
      // 1. Category Filter (Canonical Phase 2 categories)
      if (selectedCategory !== "ALL") {
        const cat = toCanonicalCategory(p.sector, p.name, p.description);
        if (cat !== selectedCategory) return false;
      }

      // 2. Status Filter (Canonical Phase 2 statuses)
      if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false;

      // 3. Island Group Filter (Canonical: Luzon, Visayas, Mindanao — MIMAROPA is part of Luzon)
      if (selectedIsland !== "ALL") {
        if (p.islandGroup !== selectedIsland) return false;
      }

      // 4. Region Filter
      if (selectedRegion !== "ALL" && p.region !== selectedRegion) return false;

      // 5. Province Filter
      if (selectedProvince !== "ALL" && p.province !== selectedProvince) return false;

      // 6. Debounced Search Filter across 6 dimensions
      if (debouncedSearchQuery.trim()) {
        if (!projectMatchesSearch(p, debouncedSearchQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeProjects,
    selectedCategory,
    selectedStatus,
    selectedIsland,
    selectedRegion,
    selectedProvince,
    debouncedSearchQuery,
  ]);

  // 5. Pure Alphabetical Sort Order across all sections (Directive: strictly A-Z)
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [filteredProjects]);

  // 6. Selection Invariant Rule (Phase 11: Validates against database truth activeProjects)
  useEffect(() => {
    if (!selectedProjectId) return;
    const exists = activeProjects.some(
      (p) => p.id === selectedProjectId || p.code === selectedProjectId
    );
    if (!exists && activeProjects.length > 0) {
      selectProject(null);
    }
  }, [activeProjects, selectedProjectId, selectProject]);

  // Derive active selected project from authoritative dataset (Single Source of Truth)
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return (
      activeProjects.find(
        (p) => p.id === selectedProjectId || p.code === selectedProjectId
      ) ?? null
    );
  }, [selectedProjectId, activeProjects]);

  // National KPIs (Computed across full dataset for executive ribbon)
  const kpis = useMemo(() => computeNationalKPIs(activeProjects), [activeProjects]);

  // Check if any filter or search query is currently active
  const hasActiveFilters = useMemo(() => {
    return (
      searchInputValue.trim() !== "" ||
      selectedCategory !== "ALL" ||
      selectedStatus !== "ALL" ||
      selectedIsland !== "ALL" ||
      selectedRegion !== "ALL" ||
      selectedProvince !== "ALL"
    );
  }, [
    searchInputValue,
    selectedCategory,
    selectedStatus,
    selectedIsland,
    selectedRegion,
    selectedProvince,
  ]);

  // Phase 11: Detect if selected project is hidden by current directory filters
  const isSelectedProjectFilteredOut = useMemo(() => {
    if (!selectedProject || !hasActiveFilters) return false;
    return !filteredProjects.some((p) => p.id === selectedProject.id);
  }, [selectedProject, hasActiveFilters, filteredProjects]);

  // Unified Reset Filters Action (Directive 13)
  const handleResetFilters = useCallback(() => {
    setSearchInputValue("");
    setDebouncedSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedIsland("ALL");
    setSelectedRegion("ALL");
    setSelectedProvince("ALL");
  }, []);

  // 7. Construct GeoJSON FeatureCollection for MapLibre
  // (Directive 6: Map ALWAYS receives ALL filtered projects, plus active selectedProject if excluded by filters)
  const currentGeoJson: AtlasFeatureCollection = useMemo(() => {
    const projectsToRender = [...filteredProjects];
    if (
      selectedProject &&
      !filteredProjects.some((p) => p.id === selectedProject.id)
    ) {
      projectsToRender.push(selectedProject);
    }

    return {
      type: "FeatureCollection",
      features: projectsToRender.map((p) => {
        const canonicalCat = toCanonicalCategory(p.sector, p.name, p.description);
        const iconConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
        return {
          type: "Feature",
          id: p.id,
          geometry: {
            type: "Point",
            coordinates: [p.coordinates.lng, p.coordinates.lat], // RFC 7946 [lng, lat]
          },
          properties: {
            id: p.id,
            name: p.name,
            slug: p.id,
            projectCode: p.code,
            category: canonicalCat,
            categoryLabel: iconConfig.label,
            color: iconConfig.color,
            status: p.status as any,
            statusLabel: p.status === "ONGOING" ? "Ongoing" : p.status,
            isPulse: p.status === "ONGOING",
            islandGroup: p.islandGroup,
            region: p.region,
            province: p.province,
            municipality: p.municipality,
            capacity:
              p.metrics.capacity ||
              p.metrics.roadLength ||
              p.metrics.contractValue ||
              "Major Project",
            client: p.client,
            projectValue: p.metrics.contractValue || "Enterprise",
            featuredImage: p.imageUrl,
            leadPM: p.leadPM?.name || "",
            featured: !!p.featured,
          },
        };
      }),
    };
  }, [filteredProjects, selectedProject]);

  // Auto-focus camera & highlight when search query narrows down to a single project
  useEffect(() => {
    const query = debouncedSearchQuery.trim();
    if (!query) return;

    if (filteredProjects.length === 1) {
      const p = filteredProjects[0];
      selectProject(p.id);
      flyToProject({
        coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
        id: p.id,
      });
    }
  }, [debouncedSearchQuery, filteredProjects, selectProject, flyToProject]);

  // Project Selection Handler from Directory Sidebar
  const handleSelectProject = useCallback(
    (projectId: string) => {
      const proj = activeProjects.find(
        (p) => p.id === projectId || p.code === projectId
      );
      selectProject(projectId);
      if (proj) {
        flyToProject({
          coordinates: { lat: proj.coordinates.lat, lng: proj.coordinates.lng },
          id: proj.id,
        });
      }
      setIsMobileDirectoryOpen(false);
    },
    [activeProjects, selectProject, flyToProject]
  );

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100vh-5.5rem)] min-h-[640px] text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* 1. Top Executive Corporate Header */}
      <AtlasHeader
        totalProjects={kpis.totalProjects}
        totalOngoing={kpis.totalOngoing}
        renewableCapacityMw={kpis.totalRenewableCapacityMw}
        tunnelLengthKm={kpis.totalTunnelLengthKm}
        waterCapacityMld={kpis.totalWaterCapacityMld}
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {/* 2. Composition: Desktop Sidebar + Central Map + Mobile Drawers */}
      <div className="flex-1 flex gap-3 min-h-0 relative overflow-hidden">
        {/* Desktop Directory Sidebar (Left) */}
        <div className="hidden lg:flex h-full">
          <AtlasDirectorySidebar
            projects={sortedProjects}
            totalCount={activeProjects.length}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            searchQuery={searchInputValue}
            onSearchChange={setSearchInputValue}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedIsland={selectedIsland}
            onIslandChange={setSelectedIsland}
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            selectedProvince={selectedProvince}
            onProvinceChange={setSelectedProvince}
            availableRegions={availableRegions}
            availableProvinces={availableProvinces}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoadingProjects}
            sidebarMode={sidebarMode}
            onSidebarModeChange={setSidebarMode}
            allProjects={activeProjects}
            discoveryScope={discoveryScope}
            onDiscoveryScopeChange={setDiscoveryScope}
            onZoomToBounds={zoomToBounds}
            onBackToNationalDiscovery={handleResetNationalScope}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Center / Right Dominant GIS Map Surface */}
        <main
          className={cn(
            "overflow-hidden bg-slate-100 dark:bg-[#08121E] transition-all duration-150",
            isFullscreen
              ? "fixed inset-0 z-[99999] border-0 rounded-none"
              : "flex-1 h-full relative rounded-xl border border-slate-200 dark:border-white/10"
          )}
        >
          {/* Mobile Pinned Search & Discovery Trigger Bar (< lg) */}
          <div className="lg:hidden absolute top-3 left-3 right-16 z-30 flex items-center gap-2">
            <button
              onClick={() => {
                setSidebarMode("DIRECTORY");
                setIsMobileDirectoryOpen(true);
              }}
              className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/95 dark:bg-[#0B1726]/95 backdrop-blur-md border border-slate-200 dark:border-white/15 text-xs text-slate-700 dark:text-slate-300 shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {searchInputValue.trim()
                    ? `"${searchInputValue}"`
                    : "Search & Filter..."}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="px-1.5 py-0.5 rounded bg-[#0284C7]/20 border border-[#0284C7]/30 text-[10px] font-mono text-[#0284C7] dark:text-[#38BDF8]">
                  {filteredProjects.length}
                </span>
                <SlidersHorizontal className="h-3 w-3 text-slate-400" />
              </div>
            </button>

            <button
              onClick={() => {
                setSidebarMode("DISCOVERY");
                setIsMobileDirectoryOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/95 dark:bg-[#0B1726]/95 backdrop-blur-md border border-slate-200 dark:border-white/15 text-xs font-mono font-semibold text-[#0284C7] dark:text-[#38BDF8] shadow-md cursor-pointer shrink-0"
              title="Explore by Region"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explore</span>
            </button>
          </div>

          {/* Geographic Breadcrumb (Top-Left on Desktop, below search pill on Mobile) */}
          <div className="absolute top-14 lg:top-3 left-3 z-20 pointer-events-auto max-w-[calc(100%-140px)]">
            <AtlasGeographicBreadcrumb
              region={
                selectedProject?.region ||
                (discoveryScope.level === "region" || discoveryScope.level === "province"
                  ? discoveryScope.regionDisplayName
                  : geographicScope.region)
              }
              province={
                selectedProject?.province ||
                (discoveryScope.level === "province"
                  ? discoveryScope.province
                  : geographicScope.province)
              }
              selectedProjectName={selectedProject?.name || null}
              onResetNational={handleResetNationalScope}
              onSelectRegion={handleDrillRegion}
              onSelectProvince={handleDrillProvince}
              onClearProject={() => selectProject(null)}
            />
          </div>

          {/* Region Intelligence Card (Floats when in regional scope, no project selected, and sidebar is not in Discovery mode) */}
          {geographicScope.region !== "ALL" && !selectedProjectId && sidebarMode !== "DISCOVERY" && (
            <div className="absolute top-26 lg:top-14 left-3 z-20 pointer-events-auto">
              <RegionIntelligenceCard
                region={geographicScope.region}
                allProjects={activeProjects}
                filteredProjects={filteredProjects}
                onZoomToExtent={() => {
                  const regionProjects = activeProjects.filter(
                    (p) => p.region === geographicScope.region
                  );
                  const bounds = getBoundsForProjects(regionProjects);
                  if (bounds) zoomToBounds(bounds);
                }}
                onClearRegion={() =>
                  setGeographicScope({ region: "ALL", province: "ALL" })
                }
              />
            </div>
          )}

          {/* Native MapLibre GL WebGL Map Canvas */}
          <ProjectAtlasMap
            geoJson={currentGeoJson}
            selectedProjectId={selectedProjectId}
            onSelectProject={selectProject}
            currentStyle={mapStyle}
            onStyleChange={setMapStyle}
          />
        </main>

        {/* Mobile Directory Slide-Over Drawer (< lg) (Directive 28 & 30) */}
        {isMobileDirectoryOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start">
            <div className="w-full max-w-sm h-full bg-white dark:bg-[#0B1726] border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#08121E]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono tracking-wider text-slate-900 dark:text-white uppercase">
                    {sidebarMode === "DISCOVERY" ? "Project Discovery" : "Project Directory"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-mono text-slate-800 dark:text-white font-bold">
                    {sidebarMode === "DISCOVERY" ? activeProjects.length : filteredProjects.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileDirectoryOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AtlasDirectorySidebar
                  projects={sortedProjects}
                  totalCount={activeProjects.length}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={handleSelectProject}
                  searchQuery={searchInputValue}
                  onSearchChange={setSearchInputValue}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  selectedIsland={selectedIsland}
                  onIslandChange={setSelectedIsland}
                  selectedRegion={selectedRegion}
                  onRegionChange={handleRegionChange}
                  selectedProvince={selectedProvince}
                  onProvinceChange={setSelectedProvince}
                  availableRegions={availableRegions}
                  availableProvinces={availableProvinces}
                  onResetFilters={handleResetFilters}
                  hasActiveFilters={hasActiveFilters}
                  isLoading={isLoadingProjects}
                  sidebarMode={sidebarMode}
                  onSidebarModeChange={setSidebarMode}
                  allProjects={activeProjects}
                  discoveryScope={discoveryScope}
                  onDiscoveryScopeChange={setDiscoveryScope}
                  onZoomToBounds={(bounds) => {
                    zoomToBounds(bounds);
                    setIsMobileDirectoryOpen(false);
                  }}
                  onBackToNationalDiscovery={() => {
                    handleResetNationalScope();
                    setIsMobileDirectoryOpen(false);
                  }}
                  className="w-full h-full border-none rounded-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Project Information Panel (Desktop docked / Mobile bottom-sheet) */}
        <ProjectInspectionDrawer
          project={selectedProject}
          onClose={() => selectProject(null)}
          onFocusCoordinates={(lat, lng) => {
            flyToProject({
              coordinates: { lat, lng },
              id: selectedProjectId ?? undefined,
            });
          }}
          isExcludedByFilters={isSelectedProjectFilteredOut}
          onResetFilters={handleResetFilters}
        />
      </div>
    </div>
  );
}

export default function ScicNationalMapClient() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[calc(100vh-5.5rem)] flex items-center justify-center bg-slate-900 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0284C7]" />
        </div>
      }
    >
      <AtlasMapProvider>
        <ScicNationalMapContent />
      </AtlasMapProvider>
    </Suspense>
  );
}


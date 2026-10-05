"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ATLAS_CATEGORIES, ATLAS_STATUSES } from "@/components/atlas/AtlasTokens";
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
import { convertDtoToScicProject } from "@/lib/data/scicProjectAdapter";
import { AtlasHeader } from "@/components/atlas/AtlasHeader";
import AtlasNewsModal from "@/components/atlas/AtlasNewsModal";
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
  findProjectInDataset,
} from "@/components/atlas/AtlasSearchUtils";
import { AtlasGeographicBreadcrumb } from "@/components/atlas/AtlasGeographicBreadcrumb";
import { RegionIntelligenceCard } from "@/components/atlas/RegionIntelligenceCard";
import {
  AtlasDiscoveryScope,
  getRegionDiscoveryDetail,
  CANONICAL_REGIONS,
} from "@/components/atlas/AtlasDiscoveryUtils";
import { Search, X, SlidersHorizontal, Loader2, Compass, Minimize2, FileText, Sparkles, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AtlasCommandBar,
  AtlasAssistantDrawer,
  AtlasAIWorkspace,
  AtlasAIFloatingTrigger,
  AtlasTourController,
  AtlasNavigatorAvatar,
  useAtlasNavigatorState,
  useAtlasAI,
} from "@/components/atlas/ai";
import { navigatorBus, setNavigatorPeek, setNavigatorAttention, emitNavigatorEvent } from "@/components/atlas/ai/navigatorBus";
import { AtlasMapEffects } from "@/components/atlas/effects/AtlasMapEffects";
import { DayDuskTint } from "@/components/atlas/effects/DayDuskTint";
import { AtlasIntro } from "@/components/atlas/effects/AtlasIntro";
import { AtlasToolDock, type DockPanel } from "@/components/atlas/tools/AtlasToolDock";
import { AtlasPresentationMode } from "@/components/atlas/tools/AtlasPresentationMode";
import { AtlasTimeTravel, type TimeArrival } from "@/components/atlas/tools/AtlasTimeTravel";
import { capacityMwOf, completionYearOf, eraChaptersOf, readStarred, shortLabelOf, underConstructionIn, verificationOf, visibleInYear, writeStarred } from "@/lib/atlas/projectFacts";
import { hasSiteStory, SITE_STORY_PREFIX } from "@/lib/atlas-ai/siteStories";
import { playUiTone } from "@/lib/ui/sounds";
import { toast } from "sonner";
import { rememberProject } from "@/lib/atlas-ai/userMemory";

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
    activeGisLayers,
    toggleGisLayer,
    viewport,
    mapInstance,
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

  // Handle URL ?select={id} (a shared link, or Admin Workspace "Inspect on Map"). Each value is
  // acted on once: the page also WRITES this parameter when a project is selected (see the
  // shareable-view effect below), and that must not fly the camera a second time.
  const handledSelectRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectParam && activeProjects.length > 0 && handledSelectRef.current !== selectParam) {
      const target = activeProjects.find(
        (p) => p.id === selectParam || p.code === selectParam || (p as any).slug === selectParam
      );
      if (target) {
        handledSelectRef.current = selectParam;
        selectProject(target.id);
        flyToProject({
          coordinates: { lat: target.coordinates.lat, lng: target.coordinates.lng },
          id: target.id,
        });
      }
    }
  }, [selectParam, activeProjects, selectProject, flyToProject]);

  // 1. Page-level Query & Filter State (Directive 3: Clean separation from map state)
  // Filters start from the link (?q=&cat=&status=&island=&region=&province=), so a filtered view
  // can be shared or bookmarked; unknown values fall back to "ALL".
  const urlCategory = (searchParams.get("cat") || "").toUpperCase();
  const urlStatus = (searchParams.get("status") || "").toUpperCase();
  const urlIsland = (searchParams.get("island") || "").toUpperCase();
  const [searchInputValue, setSearchInputValue] = useState(() => searchParams.get("q") || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryId | "ALL">(
    urlCategory in ATLAS_CATEGORIES ? (urlCategory as ProjectCategoryId) : "ALL"
  );
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatusId | "ALL">(
    urlStatus in ATLAS_STATUSES ? (urlStatus as ProjectStatusId) : "ALL"
  );
  const [selectedIsland, setSelectedIsland] = useState<IslandGroupId | "ALL">(
    ["LUZON", "VISAYAS", "MINDANAO"].includes(urlIsland) ? (urlIsland as IslandGroupId) : "ALL"
  );
  const [selectedRegion, setSelectedRegion] = useState<string | "ALL">(() => searchParams.get("region") || "ALL");
  const [selectedProvince, setSelectedProvince] = useState<string | "ALL">(() => searchParams.get("province") || "ALL");

  // Map tools (the dock at the foot of the map): timeline year, client, starred, compare, presentation
  const thisYear = useMemo(() => new Date().getFullYear(), []);
  const [yearLimit, setYearLimit] = useState<number | null>(() => {
    const y = Number(searchParams.get("year"));
    return Number.isInteger(y) && y > 1900 && y <= new Date().getFullYear() ? y : null;
  });
  const [clientFilter, setClientFilter] = useState<string | null>(() => searchParams.get("client") || null);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const compareLoadedRef = useRef(false);
  useEffect(() => {
    // (kept for this tab, so a comparison survives a reload or a shared link opening)
    try {
      if (!compareLoadedRef.current) {
        compareLoadedRef.current = true;
        const saved = JSON.parse(window.sessionStorage.getItem("atlas.compare") || "[]");
        if (Array.isArray(saved) && saved.length) return setCompareIds(saved.filter((x) => typeof x === "string").slice(0, 3));
      }
      window.sessionStorage.setItem("atlas.compare", JSON.stringify(compareIds));
    } catch {
      // private window: the tray lasts for this visit only
    }
  }, [compareIds]);
  const [dockPanel, setDockPanel] = useState<DockPanel>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  useEffect(() => {
    setStarredIds(readStarred());
  }, []);
  const toggleStar = useCallback((id: string) => {
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeStarred(next);
      return next;
    });
  }, []);
  const toggleCompare = useCallback((id: string) => {
    // (three fit side by side; a fourth replaces the oldest)
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-3)));
  }, []);
  // Opens a tool panel. With the project panel open on a narrow map there is no room for it, so
  // the project panel closes first (the dock is hidden in exactly that case).
  const openDockPanel = useCallback(
    (p: Exclude<DockPanel, null>, toggle = false) => {
      const dock = document.querySelector<HTMLElement>("[data-atlas-tool-dock] > div");
      if (!dock || dock.offsetParent === null) selectProject(null);
      setDockPanel((cur) => (toggle && cur === p ? null : p));
    },
    [selectProject]
  );
  const yearBounds = useMemo<[number, number]>(() => {
    const years = activeProjects.map(completionYearOf).filter((y): y is number => y !== null);
    return [years.length ? Math.min(...years) : thisYear - 30, thisYear];
  }, [activeProjects, thisYear]);

  // Shareable view: the address bar always describes what is on screen (selected project and
  // filters), without adding history entries. Closing a project removes it from the link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const put = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    const selected = selectedProjectId ? activeProjects.find((p) => p.id === selectedProjectId) : null;
    // (while a shared ?select= link is still waiting for the project list, leave it alone)
    if (selected || !selectParam || handledSelectRef.current === selectParam) {
      const slug = selected ? ((selected as any).slug as string | undefined) || selected.id : null;
      put("select", slug);
      handledSelectRef.current = slug;
    }
    put("q", debouncedSearchQuery.trim() || null);
    put("cat", selectedCategory !== "ALL" ? selectedCategory : null);
    put("status", selectedStatus !== "ALL" ? selectedStatus : null);
    put("island", selectedIsland !== "ALL" ? selectedIsland : null);
    put("region", selectedRegion !== "ALL" ? selectedRegion : null);
    put("province", selectedProvince !== "ALL" ? selectedProvince : null);
    put("year", yearLimit !== null ? String(yearLimit) : null);
    put("client", clientFilter);
    const next = params.toString();
    const current = window.location.search.replace(/^\?/, "");
    if (next !== current) window.history.replaceState(window.history.state, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
  }, [selectedProjectId, activeProjects, selectParam, debouncedSearchQuery, selectedCategory, selectedStatus, selectedIsland, selectedRegion, selectedProvince, yearLimit, clientFilter]);

  // Phase 8: Geographic Scope state (camera & regional intelligence context)
  const [geographicScope, setGeographicScope] = useState<{
    region: string | "ALL";
    province: string | "ALL";
  }>({
    region: "ALL",
    province: "ALL",
  });

  // AI-driven visual highlight on project markers (Phase 17)
  const [highlightedProjectIds, setHighlightedProjectIds] = useState<string[]>([]);

  // ─── SCIC Atlas Navigator Peek Target State ──────
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [clickedCoords, setClickedCoords] = useState<[number, number] | null>(null);

  // AI-driven dynamic GIS overlays (transit corridor & buffer zones)
  const [transitCorridor, setTransitCorridor] = useState<{
    fromProject: { id: string; name: string; coordinates: { lat: number; lng: number } };
    toProject: { id: string; name: string; coordinates: { lat: number; lng: number } };
    distanceKm: number;
  } | null>(null);
  const [bufferZone, setBufferZone] = useState<{
    center: { lat: number; lng: number };
    radiusKm: number;
    label: string;
    projectIdsInside?: string[];
  } | null>(null);

  // Phase 10: Project Discovery Mode state (Geographic Storytelling & Regional Exploration)
  const [sidebarMode, setSidebarMode] = useState<"DIRECTORY" | "DISCOVERY">("DIRECTORY");
  const [discoveryScope, setDiscoveryScope] = useState<AtlasDiscoveryScope>({
    level: "national",
  });

  // Layout presentation states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDirectoryOpen, setIsMobileDirectoryOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

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
    setClickedCoords(null);
    setHoveredProjectId(null);
    resetToNationalView(); // (also tells the navigator)
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

      // 5b. Map tools: timeline year, client, starred only
      if (yearLimit !== null && !visibleInYear(p, yearLimit, thisYear)) return false;
      if (clientFilter && p.client !== clientFilter) return false;
      if (starredOnly && !starredIds.includes(p.id)) return false;

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
    yearLimit,
    thisYear,
    clientFilter,
    starredOnly,
    starredIds,
  ]);

  // Atlas notices the map changing under the tools (timeline, client, starred): he looks at it
  const toolsSignature = `${yearLimit}|${clientFilter}|${starredOnly}`;
  const toolsSignatureRef = useRef(toolsSignature);
  useEffect(() => {
    if (toolsSignatureRef.current === toolsSignature) return;
    toolsSignatureRef.current = toolsSignature;
    const c = navigatorBus.mapCenter;
    if (c) setNavigatorAttention(c.x, c.y);
  }, [toolsSignature]);

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
      (p) => p.id === selectedProjectId || p.code === selectedProjectId || p.slug === selectedProjectId
    );
    if (!exists && activeProjects.length > 0) {
      const matched = findProjectInDataset(activeProjects, selectedProjectId);
      if (matched) {
        if (matched.id !== selectedProjectId) {
          selectProject(matched.id);
        }
      } else {
        selectProject(null);
      }
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

  // Atlas remembers what you look at (in this browser only) so he can pick up where you left off
  useEffect(() => {
    if (selectedProject) rememberProject({ id: selectedProject.id, name: selectedProject.name, region: selectedProject.region });
  }, [selectedProject]);

  // National KPIs (Computed across full dataset for executive ribbon)
  // The header's figures describe what is on the map: with a filter on they re-count to the
  // filtered set (and the header says "of 87 in view"); with none they are the whole portfolio.
  const kpis = useMemo(() => computeNationalKPIs(filteredProjects), [filteredProjects]);

  // Check if any filter or search query is currently active
  const hasActiveFilters = useMemo(() => {
    return (
      searchInputValue.trim() !== "" ||
      selectedCategory !== "ALL" ||
      selectedStatus !== "ALL" ||
      selectedIsland !== "ALL" ||
      selectedRegion !== "ALL" ||
      selectedProvince !== "ALL" ||
      yearLimit !== null ||
      !!clientFilter ||
      starredOnly
    );
  }, [
    searchInputValue,
    selectedCategory,
    selectedStatus,
    selectedIsland,
    selectedRegion,
    selectedProvince,
    yearLimit,
    clientFilter,
    starredOnly,
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
    setYearLimit(null);
    setClientFilter(null);
    setStarredOnly(false);
  }, []);

  // ─── SCIC Atlas AI Assistant Integration (Phase 16) ─────────────
  const atlasAI = useAtlasAI({
    selectedProjectId,
    mapZoom: viewport?.zoom ?? 5.8,
    sidebarMode,
    activeFilters: {
      category: selectedCategory !== "ALL" ? selectedCategory : undefined,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      region: selectedRegion !== "ALL" ? selectedRegion : undefined,
      province: selectedProvince !== "ALL" ? selectedProvince : undefined,
      islandGroup: selectedIsland !== "ALL" ? selectedIsland : undefined,
      searchQuery: debouncedSearchQuery || undefined,
    },
    geographicScope,
    mapStyle,
    activeGisLayers,
    visibleProjectIds: filteredProjects.slice(0, 25).map((p) => p.id),
    allProjectsCount: activeProjects.length,
    onSelectProject: (id) => {
      if (!id) {
        selectProject(null);
        return;
      }
      const p = findProjectInDataset(activeProjects, id);
      if (p) {
        selectProject(p.id);
        flyToProject({
          coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
          id: p.id,
        });
      } else {
        selectProject(id);
      }
    },
    onFlyToProject: (target) => {
      const p = target.id ? findProjectInDataset(activeProjects, target.id) : undefined;
      if (p) {
        selectProject(p.id);
        flyToProject({
          coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
          id: p.id,
          zoom: target.zoom ?? 14.2,
          pitch: target.pitch ?? 45,
          bearing: target.bearing ?? 0,
          padding: (target as any).padding,
          duration: (target as any).duration,
        });
      } else if (target.coordinates) {
        flyToProject({
          coordinates: target.coordinates,
          zoom: target.zoom,
          pitch: target.pitch,
          bearing: target.bearing,
          padding: (target as any).padding,
          duration: (target as any).duration,
        });
      }
    },
    onZoomToBounds: (bounds) => {
      zoomToBounds(bounds);
    },
    onApplyFilters: (filters) => {
      if (filters.category !== undefined) {
        setSelectedCategory(filters.category === "ALL" ? "ALL" : (filters.category as any));
      }
      if (filters.status !== undefined) {
        setSelectedStatus(filters.status === "ALL" ? "ALL" : (filters.status as any));
      }
      if (filters.region !== undefined) {
        handleRegionChange(filters.region);
      }
      if (filters.province !== undefined) {
        setSelectedProvince(filters.province);
      }
      if (filters.islandGroup !== undefined) {
        setSelectedIsland(filters.islandGroup as any);
      }
      if (filters.searchQuery !== undefined) {
        setSearchInputValue(filters.searchQuery);
      }
    },
    onClearFilters: () => {
      handleResetFilters();
    },
    onSetMapStyle: (style) => {
      setMapStyle(style);
    },
    onToggleGisLayer: (layerId, visible) => {
      if (visible !== undefined) {
        const isCurrent = activeGisLayers.has(layerId);
        if (isCurrent !== visible) toggleGisLayer(layerId);
      } else {
        toggleGisLayer(layerId);
      }
    },
    onInspectFootprint: (projId) => {
      const p = findProjectInDataset(activeProjects, projId);
      if (p) {
        selectProject(p.id);
        flyToProject({
          coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
          id: p.id,
          zoom: 14.5,
          pitch: 45,
        });
        if (!activeGisLayers.has("project-footprints")) {
          toggleGisLayer("project-footprints");
        }
      }
    },
    onEnterDiscoveryScope: (scope, targetName, adjustCamera = true) => {
      setSidebarMode("DISCOVERY");
      if (scope === "national") {
        setDiscoveryScope({ level: "national" });
        setGeographicScope({ region: "ALL", province: "ALL" });
        if (adjustCamera) {
          selectProject(null);
          resetToNationalView();
        }
      } else if (scope === "island" && targetName) {
        const island = targetName.toUpperCase() as "LUZON" | "VISAYAS" | "MINDANAO";
        setDiscoveryScope({ level: "island", islandGroup: island });
        setGeographicScope({ region: "ALL", province: "ALL" });
        if (adjustCamera) {
          selectProject(null);
          const islandProjects = activeProjects.filter((p) => p.islandGroup === island);
          const bounds = getBoundsForProjects(islandProjects);
          if (bounds) zoomToBounds(bounds);
        }
      } else if (scope === "region" && targetName) {
        const detail = getRegionDiscoveryDetail(activeProjects, targetName);
        setDiscoveryScope({
          level: "region",
          regionKey: detail?.key || targetName,
          regionDisplayName: detail?.displayName || targetName,
          islandGroup: detail?.islandGroup || "LUZON",
        });
        setGeographicScope({ region: targetName, province: "ALL" });
        if (adjustCamera) {
          selectProject(null);
          const regionProjects = activeProjects.filter((p) => p.region === targetName);
          const bounds = detail?.bounds || getBoundsForProjects(regionProjects);
          if (bounds) zoomToBounds(bounds);
        }
      } else if (scope === "province" && targetName) {
        const provProject = activeProjects.find(
          (p) =>
            p.province.toLowerCase() === targetName.toLowerCase() ||
            p.province.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(p.province.toLowerCase())
        );
        const parentRegion = provProject ? provProject.region : undefined;
        if (parentRegion) {
          const detail = getRegionDiscoveryDetail(activeProjects, parentRegion);
          setDiscoveryScope({
            level: "region",
            regionKey: detail?.key || parentRegion,
            regionDisplayName: detail?.displayName || parentRegion,
            islandGroup: detail?.islandGroup || provProject?.islandGroup || "LUZON",
          });
          setGeographicScope({ region: parentRegion, province: targetName });
        } else {
          setGeographicScope((prev) => ({ ...prev, province: targetName }));
        }
        if (adjustCamera) {
          selectProject(null);
          const provProjects = activeProjects.filter(
            (p) =>
              p.province.toLowerCase() === targetName.toLowerCase() ||
              p.province.toLowerCase().includes(targetName.toLowerCase()) ||
              targetName.toLowerCase().includes(p.province.toLowerCase())
          );
          const bounds = getBoundsForProjects(provProjects);
          if (bounds) zoomToBounds(bounds);
        }
      }
    },
    onHighlightProjects: (projectIds, fitBounds = true) => {
      const resolved = projectIds.map((id) => {
        const p = findProjectInDataset(activeProjects, id);
        return p ? p.id : id;
      });
      setHighlightedProjectIds(resolved);
      if (fitBounds && resolved.length > 0) {
        const matching = activeProjects.filter((x) => resolved.includes(x.id));
        if (matching.length === 1) {
          const p = matching[0];
          flyToProject({
            coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
            id: p.id,
            zoom: 12,
          });
        } else if (matching.length > 1) {
          const bounds = getBoundsForProjects(matching);
          if (bounds) zoomToBounds(bounds, { padding: 60 });
        }
      }
    },
    onDrawTransitCorridor: (corridor) => {
      setTransitCorridor(corridor);
      const minLng = Math.min(corridor.fromProject.coordinates.lng, corridor.toProject.coordinates.lng);
      const maxLng = Math.max(corridor.fromProject.coordinates.lng, corridor.toProject.coordinates.lng);
      const minLat = Math.min(corridor.fromProject.coordinates.lat, corridor.toProject.coordinates.lat);
      const maxLat = Math.max(corridor.fromProject.coordinates.lat, corridor.toProject.coordinates.lat);
      zoomToBounds([[minLat, minLng], [maxLat, maxLng]], { padding: { top: 80, bottom: 80, left: 80, right: 80 } });
    },
    onDrawBufferZone: (zone) => {
      setBufferZone(zone);
      flyToProject({
        coordinates: zone.center,
        zoom: zone.radiusKm > 40 ? 9.5 : zone.radiusKm > 20 ? 10.5 : 11.5,
        pitch: 35,
      });
    },
    onClearGisOverlays: () => {
      setTransitCorridor(null);
      setBufferZone(null);
    },
  });

  // ─── SCIC Atlas Navigator 3D Character Integration (Phase 21) ──────
  const avatarSlotRef = useRef<HTMLDivElement>(null);

  // ── Layout: one panel per side, the map resizes around a docked chat, focus mode ──
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowInsets, setRowInsets] = useState({ top: 56, right: 12, bottom: 12, left: 12 });
  const [chatDock, setChatDock] = useState<{ rightDockWidth: number; dock: string; expanded: boolean }>({
    rightDockWidth: 0,
    dock: "RIGHT",
    expanded: false,
  });
  const [rightTab, setRightTab] = useState<"project" | "chat">("chat");
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = {
        top: Math.round(r.top),
        right: Math.round(window.innerWidth - r.right),
        bottom: Math.round(window.innerHeight - r.bottom),
        left: Math.round(r.left),
      };
      setRowInsets((prev) =>
        prev.top === next.top && prev.right === next.right && prev.bottom === next.bottom && prev.left === next.left
          ? prev
          : next
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isFocusMode]);

  // ── Presentation effects ──
  // Rain radar + typhoon tracks appear when the weather desk is opened and stay until dismissed
  const [weatherLayerOn, setWeatherLayerOn] = useState(false);
  useEffect(() => {
    if (isNewsModalOpen) setWeatherLayerOn(true);
  }, [isNewsModalOpen]);
  useEffect(() => {
    if (weatherLayerOn && !isNewsModalOpen) emitNavigatorEvent("weather-on");
  }, [weatherLayerOn, isNewsModalOpen]);
  // The project highlighted in the list pulses once on the map
  const activeListCoords = useMemo<[number, number] | null>(() => {
    if (!hoveredProjectId) return null;
    const p = activeProjects.find((x) => x.id === hoveredProjectId);
    return p?.coordinates ? [p.coordinates.lng, p.coordinates.lat] : null;
  }, [hoveredProjectId, activeProjects]);
  // Interface tones (off unless the user turns them on) + navigator acknowledgements
  const tourStepKey = atlasAI.activeTour ? `${atlasAI.activeTour.tourId}:${atlasAI.activeTour.stepIndex}` : null;
  const prevTourStepRef = useRef<string | null>(null);
  useEffect(() => {
    if (tourStepKey && prevTourStepRef.current && tourStepKey !== prevTourStepRef.current) {
      playUiTone("success");
      emitNavigatorEvent("tour-step");
    }
    prevTourStepRef.current = tourStepKey;
  }, [tourStepKey]);

  // The panel the user just opened comes to the front
  const prevSelForTabRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== prevSelForTabRef.current) {
      setRightTab("project");
      playUiTone("tap");
      emitNavigatorEvent("panel-open-right");
    }
    prevSelForTabRef.current = selectedProjectId ?? null;
  }, [selectedProjectId]);
  const chatIsOpen = atlasAI.isOpen;
  useEffect(() => {
    if (chatIsOpen) {
      setRightTab("chat");
      playUiTone("open");
    }
  }, [chatIsOpen]);

  const handleChatDockInfo = useCallback(
    (info: { rightDockWidth: number; dock: string; expanded: boolean }) =>
      setChatDock((prev) =>
        prev.rightDockWidth === info.rightDockWidth && prev.dock === info.dock && prev.expanded === info.expanded
          ? prev
          : info
      ),
    []
  );
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [isMapPanning, setIsMapPanning] = useState(false);
  const [isSpotlightActive, setIsSpotlightActive] = useState(false);
  const panTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dock avatar spotlight back to corner companion mode when map navigation or panning starts
  useEffect(() => {
    if (isMapPanning && isSpotlightActive) {
      setIsSpotlightActive(false);
    }
  }, [isMapPanning, isSpotlightActive]);

  // 1. Debounced Map Panning State with 350ms hysteresis (prevents rapid toggle during drag/inertia)
  useEffect(() => {
    if (!mapInstance) return;

    const handleGestureStart = () => {
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      setIsMapPanning(true);
    };

    const handleGestureEnd = () => {
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      panTimerRef.current = setTimeout(() => {
        setIsMapPanning(false);
      }, 350);
    };

    const handleMoveStart = (e: any) => {
      if (e?.originalEvent) {
        if (panTimerRef.current) clearTimeout(panTimerRef.current);
        setIsMapPanning(true);
      }
    };

    const handleMoveEnd = () => {
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      panTimerRef.current = setTimeout(() => {
        setIsMapPanning(false);
      }, 350);
    };

    // Capture direct map clicks for target peeking
    const handleMapClick = (e: any) => {
      if (e?.lngLat) {
        setClickedCoords([e.lngLat.lng, e.lngLat.lat]);
      }
    };

    mapInstance.on("dragstart", handleGestureStart);
    mapInstance.on("dragend", handleGestureEnd);
    mapInstance.on("zoomstart", handleGestureStart);
    mapInstance.on("zoomend", handleGestureEnd);
    mapInstance.on("movestart", handleMoveStart);
    mapInstance.on("moveend", handleMoveEnd);
    mapInstance.on("click", handleMapClick);

    return () => {
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      mapInstance.off("dragstart", handleGestureStart);
      mapInstance.off("dragend", handleGestureEnd);
      mapInstance.off("zoomstart", handleGestureStart);
      mapInstance.off("zoomend", handleGestureEnd);
      mapInstance.off("movestart", handleMoveStart);
      mapInstance.off("moveend", handleMoveEnd);
      mapInstance.off("click", handleMapClick);
    };
  }, [mapInstance]);

  // 2. Resolve Active Geographic Peek Coordinates
  // Priority: hovered project in directory > clicked map point > selected project > AI highlighted projects
  const activePeekCoords = useMemo<[number, number] | null>(() => {
    if (hoveredProjectId) {
      const p = activeProjects.find((x) => x.id === hoveredProjectId);
      if (p?.coordinates) return [p.coordinates.lng, p.coordinates.lat];
    }
    if (clickedCoords) {
      return clickedCoords;
    }
    if (selectedProject?.coordinates) {
      return [selectedProject.coordinates.lng, selectedProject.coordinates.lat];
    }
    if (highlightedProjectIds.length > 0) {
      const first = activeProjects.find((x) => x.id === highlightedProjectIds[0]);
      if (first?.coordinates) return [first.coordinates.lng, first.coordinates.lat];
    }
    return null;
  }, [hoveredProjectId, clickedCoords, selectedProject, highlightedProjectIds, activeProjects]);

  // User map interaction instantly hands Stage Focus back to the map (non-modal, interruptible)
  useEffect(() => {
    if (!mapInstance) return;
    const onInteract = () => emitNavigatorEvent("map-interaction");
    // the navigator's eyes follow where the user is working on the map (throttled bus write)
    let lastLook = 0;
    const look = (e: { originalEvent?: Event; point?: { x: number; y: number } }) => {
      const now = performance.now();
      if (now - lastLook < 60) return;
      lastLook = now;
      const ev = e.originalEvent as (MouseEvent & TouchEvent) | undefined;
      const touch = ev?.touches?.[0] ?? ev?.changedTouches?.[0];
      if (touch) return setNavigatorAttention(touch.clientX, touch.clientY);
      if (ev && typeof ev.clientX === "number") return setNavigatorAttention(ev.clientX, ev.clientY);
      if (e.point) {
        const rect = mapInstance.getContainer().getBoundingClientRect();
        setNavigatorAttention(rect.left + e.point.x, rect.top + e.point.y);
      }
    };
    mapInstance.on("dragstart", onInteract);
    mapInstance.on("zoomstart", onInteract);
    mapInstance.on("click", onInteract);
    mapInstance.on("click", look);
    mapInstance.on("drag", look);
    mapInstance.on("wheel", look);
    return () => {
      mapInstance.off("dragstart", onInteract);
      mapInstance.off("zoomstart", onInteract);
      mapInstance.off("click", onInteract);
      mapInstance.off("click", look);
      mapInstance.off("drag", look);
      mapInstance.off("wheel", look);
    };
  }, [mapInstance]);

  // 3. Continuously project geographic peek coordinates to screen viewport pixels
  useEffect(() => {
    if (!mapInstance || !activePeekCoords) {
      setNavigatorPeek(null);
      return;
    }

    // Writes to the non-React navigator bus (read per-frame by the 3D head) — no re-render per map frame
    const updateScreenPoint = () => {
      try {
        const container = mapInstance.getContainer();
        const rect = container.getBoundingClientRect();
        const pt = mapInstance.project(activePeekCoords);
        setNavigatorPeek({
          x: Math.round(rect.left + pt.x),
          y: Math.round(rect.top + pt.y),
        });
      } catch {
        // Map may be tearing down
      }
    };

    // New peek target (hover/click/select/highlight changed): re-arm the look-at window
    navigatorBus.peekChangedAt = performance.now();
    updateScreenPoint();

    mapInstance.on("move", updateScreenPoint);
    mapInstance.on("zoom", updateScreenPoint);
    mapInstance.on("render", updateScreenPoint);

    return () => {
      setNavigatorPeek(null);
      mapInstance.off("move", updateScreenPoint);
      mapInstance.off("zoom", updateScreenPoint);
      mapInstance.off("render", updateScreenPoint);
    };
  }, [mapInstance, activePeekCoords]);

  const navigatorState = useAtlasNavigatorState({
    isGenerating: atlasAI.isGenerating,
    hasError: atlasAI.hasError,
    currentToolEvents: atlasAI.currentToolEvents,
    isInputFocused: isChatInputFocused,
    isSpeaking: atlasAI.isSpeaking,
    isStreaming: atlasAI.isStreaming,
    isMapPanning,
    lastAppliedAction: atlasAI.lastAppliedAction,
    selectedProjectId: selectedProject?.id,
    selectedProjectName: selectedProject?.name,
    activeRegion: geographicScope.region,
    isTourActive: !!atlasAI.activeTour,
  });

  // Expose runtime state for telemetry & test suites
  if (typeof window !== "undefined") {
    (window as any).__atlasNavigatorRuntime = navigatorState;
  }

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
            // (a project that had started but was not finished in the timeline's year is a live site)
            ...(() => {
              const building = yearLimit !== null && yearLimit < thisYear && underConstructionIn(p, yearLimit, thisYear);
              const status = building ? "ONGOING" : p.status;
              return { status: status as any, statusLabel: status === "ONGOING" ? (building ? "Under construction" : "Ongoing") : status, isPulse: status === "ONGOING" };
            })(),
            islandGroup: p.islandGroup,
            region: p.region,
            province: p.province,
            municipality: p.municipality,
            // (no filler words: an empty value lets the hover card fall back to client or region)
            capacity: p.metrics.capacity || p.metrics.roadLength || "",
            client: p.client,
            projectValue: p.metrics.contractValue || "",
            ...(() => {
              const mw = verificationOf(p) === "unconfirmed" ? null : capacityMwOf(p);
              return mw && mw > 0
                ? { mw, mwLabel: mw.toLocaleString("en-US", { maximumFractionDigits: mw < 10 ? 1 : 0 }) }
                : { mw: 0, mwLabel: "" };
            })(),
            featuredImage: p.imageUrl,
            leadPM: p.leadPM?.name || "",
            featured: !!p.featured,
          },
        };
      }),
    };
  }, [filteredProjects, selectedProject, yearLimit, thisYear]);

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

  // Reversibility & Keyboard Shortcut: ESC immediately reverses camera transitions or resets to National view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPresenting) {
          setIsPresenting(false);
          setIsFocusMode(false);
        } else if (dockPanel) {
          setDockPanel(null);
        } else if (isFocusMode) {
          setIsFocusMode(false);
        } else if (atlasAI.activeTour?.tourId.startsWith(SITE_STORY_PREFIX)) {
          // a site story is about the project on screen: Esc ends the story and leaves you there
          atlasAI.exitTour();
        } else if (atlasAI.activeTour) {
          atlasAI.exitTour();
          selectProject(null);
          handleResetNationalScope();
        } else if (selectedProjectId) {
          selectProject(null);
        } else if (geographicScope.region !== "ALL" || discoveryScope.level !== "national") {
          handleResetNationalScope();
        } else if (isMobileDirectoryOpen) {
          setIsMobileDirectoryOpen(false);
        } else if (mapInstance && !atlasAI.isOpen) {
          // Nothing left to close: Esc always leads back to the full Philippine view, including after
          // a free pan/zoom or once a project panel has been dismissed (the chat owns Esc while open)
          const tag = document.activeElement?.tagName.toLowerCase();
          if (tag === "input" || tag === "textarea") return;
          const awayFromNational =
            mapInstance.getZoom() > 6.2 || Math.abs(mapInstance.getBearing()) > 1 || mapInstance.getPitch() > 1;
          if (awayFromNational) handleResetNationalScope();
        }
        return;
      }

      // Single-key shortcuts (never while typing, never with a modifier held)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) return;
      const togglePanel = (p: Exclude<DockPanel, null>) => openDockPanel(p, true);
      switch (e.key.toLowerCase()) {
        case "t":
          togglePanel("timeline");
          break;
        case "c":
          togglePanel("compare");
          break;
        case "v":
          togglePanel("views");
          break;
        case "?":
          togglePanel("help");
          break;
        case "s":
          if (selectedProjectId) toggleStar(selectedProjectId);
          break;
        case "f":
          if (!isPresenting) setIsFocusMode((v) => !v);
          break;
        case "p":
          setDockPanel(null);
          setIsPresenting(!isPresenting);
          setIsFocusMode(!isPresenting);
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isFocusMode,
    isPresenting,
    dockPanel,
    toggleStar,
    openDockPanel,
    atlasAI,
    selectedProjectId,
    selectProject,
    geographicScope.region,
    discoveryScope.level,
    handleResetNationalScope,
    isMobileDirectoryOpen,
    mapInstance,
  ]);

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

  // Time travel: the works finished in the year the timeline holds (they land on the map)
  const timeArrivals = useMemo<TimeArrival[]>(() => {
    if (yearLimit === null) return [];
    return filteredProjects
      .filter((p) => completionYearOf(p) === yearLimit)
      .map((p) => ({
        id: p.id,
        name: shortLabelOf(p.name),
        lng: p.coordinates.lng,
        lat: p.coordinates.lat,
        color: CATEGORY_ICON_REGISTRY[toCanonicalCategory(p.sector, p.name, p.description)].color,
      }));
  }, [filteredProjects, yearLimit]);

  // The portfolio's eras (read from the records), and the one the timeline is in
  const eraChapters = useMemo(
    () => eraChaptersOf(activeProjects, yearBounds[0], yearBounds[1], (p) => CATEGORY_ICON_REGISTRY[toCanonicalCategory(p.sector, p.name, p.description)].shortLabel),
    [activeProjects, yearBounds]
  );
  const currentChapter = yearLimit === null ? null : eraChapters.find((c) => yearLimit >= c.from && yearLimit <= c.to) || null;

  // Presentation mode shows what is on the map: the flagships among the filtered projects, or,
  // when a filter leaves fewer than two of them, every filtered project.
  const presentationProjects = useMemo(() => {
    const flagships = sortedProjects.filter((p) => p.featured);
    return flagships.length >= 2 ? flagships : sortedProjects;
  }, [sortedProjects]);

  // The right edge holds ONE panel: project details or the docked chat. When both are available,
  // a small tab strip switches between them instead of stacking them over the map.
  const chatOnRight = atlasAI.isOpen && chatDock.dock === "RIGHT" && chatDock.expanded && !atlasAI.activeTour;
  const bothRight = !!selectedProject && chatOnRight && !isFocusMode;
  // While a tour or site story plays, its narration card is the one place the project is described:
  // the project panel (which shows the same overview) steps aside and returns when it ends.
  const showProjectPanel =
    !!selectedProject && !isFocusMode && !atlasAI.activeTour && (!bothRight || rightTab === "project");
  // During a guided tour the narration card owns the bottom of the map; the chat returns when it ends
  const hideChat = isFocusMode || !!atlasAI.activeTour || (bothRight && rightTab === "project");
  const tabStripH = bothRight ? 40 : 0;
  // Matches the project panel's responsive width (md 380 / lg 410 / xl 430)
  const projectPanelWidth =
    typeof window === "undefined" ? 430 : window.innerWidth >= 1280 ? 430 : window.innerWidth >= 1024 ? 410 : window.innerWidth >= 768 ? 380 : 0;

  return (
    <div className="atlas-theme flex flex-col gap-3 w-full h-[calc(100vh-5.5rem)] min-h-[640px] text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Top Executive Corporate Header */}
      {!isFocusMode && (
      <AtlasHeader
        onEnterFocusMode={() => setIsFocusMode(true)}
        tourProgress={atlasAI.activeTour ? (atlasAI.activeTour.stepIndex + 1) / Math.max(1, atlasAI.activeTour.totalSteps) : null}
        totalProjects={kpis.totalProjects}
        totalOngoing={kpis.totalOngoing}
        renewableCapacityMw={kpis.totalRenewableCapacityMw}
        tunnelLengthKm={kpis.totalTunnelLengthKm}
        waterCapacityMld={kpis.totalWaterCapacityMld}
        filteredOf={filteredProjects.length !== activeProjects.length ? activeProjects.length : null}
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
        onOpenNews={() => setIsNewsModalOpen(true)}
      />
      )}

      {/* 2. Composition: Desktop Sidebar + Central Map + Mobile Drawers */}
      <div ref={rowRef} className="flex-1 flex gap-3 min-h-0 relative overflow-hidden">
        {/* Desktop Directory Sidebar (Left) */}
        <div className={cn("hidden h-full", !isFocusMode && "lg:flex")}>
          <AtlasDirectorySidebar
            projects={sortedProjects}
            totalCount={activeProjects.length}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            onHoverProject={setHoveredProjectId}
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
            "overflow-hidden bg-slate-100 dark:bg-atlas-sunken transition-all duration-150",
            isFullscreen
              ? "fixed inset-0 z-[99999] border-0 rounded-none"
              : "flex-1 h-full relative rounded-xl border border-slate-200 dark:border-white/10"
          )}
          style={
            !isFullscreen && chatDock.rightDockWidth > 0 && !hideChat
              ? { marginRight: chatDock.rightDockWidth + 12 }
              : undefined
          }
        >
          {isFocusMode && !isPresenting && (
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              className="absolute top-14 left-3 z-40 flex items-center gap-1.5 h-8 px-3 rounded-full bg-atlas-panel/90 backdrop-blur-md border border-white/15 text-[11px] font-medium text-slate-200 hover:text-white hover:border-emerald-400/50 shadow-lg transition-colors cursor-pointer"
              title="Exit focus mode (Esc)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Exit focus</span>
              <kbd className="ml-1 px-1 rounded bg-white/10 text-[9px] font-mono text-slate-400">Esc</kbd>
            </button>
          )}
          {/* Mobile Pinned Search & Discovery Trigger Bar (< lg) */}
          <div className="lg:hidden absolute top-3 left-3 right-16 z-30 flex items-center gap-2">
            <button
              onClick={() => {
                setSidebarMode("DIRECTORY");
                setIsMobileDirectoryOpen(true);
              }}
              className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-md border border-slate-200 dark:border-white/15 text-xs text-slate-700 dark:text-slate-300 shadow-md cursor-pointer"
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
                <span className="px-1.5 py-0.5 rounded bg-scic-blue/20 border border-scic-blue/30 text-[10px] font-mono text-scic-blue dark:text-sky-400">
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
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-md border border-slate-200 dark:border-white/15 text-xs font-mono font-semibold text-scic-blue dark:text-sky-400 shadow-md cursor-pointer shrink-0"
              title="Explore by Region"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explore</span>
            </button>
          </div>

          {/* Geographic Breadcrumb (Top-Left on Desktop, below search pill on Mobile) */}
          <div className={cn("absolute top-14 lg:top-3 left-3 z-20 pointer-events-auto max-w-[calc(100%-140px)]", isPresenting && "hidden")}>
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

          {/* ✦ SCIC Atlas Command Bar: Top-Center on Map Canvas.
              With the project panel open it drops below the breadcrumb row and centres in the map
              area that is still visible, so it is never cut off by the panel or the breadcrumb. */}
          <div
            className={cn(
              "absolute left-0 right-0 z-30 px-3 pointer-events-none flex justify-center transition-[top,right] duration-300",
              isPresenting && "hidden",
              showProjectPanel
                ? "top-26 lg:top-14 md:right-[380px] lg:right-[410px] xl:right-[430px]"
                : "top-14 lg:top-3"
            )}
          >
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-xl flex justify-center">
            <AtlasCommandBar
              onSend={atlasAI.sendMessage}
              onOpenDrawer={() => atlasAI.setIsOpen(true)}
              suggestions={atlasAI.suggestions}
              isGenerating={atlasAI.isGenerating}
              selectedProjectName={selectedProject?.name}
              activeRegion={geographicScope.region}
              projectCount={activeProjects.length}
              onFocusChange={setIsChatInputFocused}
            />
            </div>
          </div>

          {/* ✦ SCIC ATLAS NAVIGATOR 3D CHARACTER (PHASE 21: Persistent Singleton R3F Canvas) */}
          <AtlasNavigatorAvatar
            state={navigatorState.state}
            reaction={navigatorState.reaction}
            gazeTarget={navigatorState.gazeTarget}
            statusLabel={navigatorState.statusLabel}
            onClickAvatar={() => {
              navigatorState.triggerClickReaction();
              atlasAI.setIsOpen(true);
            }}
            isOpen={atlasAI.isOpen}
            isDrawerOpen={showProjectPanel}
            isInputFocused={isChatInputFocused}
            cancelSpeech={atlasAI.cancelSpeech}
            warmVoice={atlasAI.warmVoice}
            prepareSpeech={atlasAI.prepareSpeech}
            spokenCaption={atlasAI.spokenCaption}
            targetSlotRef={avatarSlotRef}
            lipSyncRef={atlasAI.lipSyncRef}
            isSpeaking={atlasAI.isSpeaking}
            isPreparingSpeech={atlasAI.isPreparingSpeech}
            isTourActive={!!atlasAI.activeTour}
            mapStyle={mapStyle}
            activeVoice={atlasAI.activeVoice}
            voiceEnabled={atlasAI.voiceEnabled}
            toggleVoiceNarration={atlasAI.toggleVoiceNarration}
            selectedProjectName={selectedProject?.name}
            selectedProjectCategory={selectedProject?.sector}
            playAudio={atlasAI.playAudio}
            playHolographicChime={atlasAI.playHolographicChime}
            isSpotlightActive={isSpotlightActive}
            onToggleSpotlight={setIsSpotlightActive}
            speakNarration={atlasAI.speakNarration}
          />

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

          {/* Presentation layer: time-of-day wash, map effects, session intro */}
          <DayDuskTint satellite={mapStyle === "SATELLITE"} dark={mapStyle === "DARK"} />
          <AtlasMapEffects activeCoords={activeListCoords} weatherLayerOn={weatherLayerOn} />
          <AtlasIntro />
          <AtlasTimeTravel
            year={yearLimit}
            minYear={yearBounds[0]}
            maxYear={yearBounds[1]}
            arrivals={timeArrivals}
            dark={mapStyle === "DARK"}
            satellite={mapStyle === "SATELLITE"}
            chapter={currentChapter}
          />

          {/* Map tools: timeline, compare, starred, clients, views, export, presentation */}
          {isPresenting ? (
            <AtlasPresentationMode
              projects={presentationProjects}
              onShow={handleSelectProject}
              onExit={() => {
                setIsPresenting(false);
                setIsFocusMode(false);
              }}
              map={mapInstance}
            />
          ) : (
            !atlasAI.activeTour && (
              <AtlasToolDock
                projects={sortedProjects}
                allProjects={activeProjects}
                panel={dockPanel}
                onPanelChange={setDockPanel}
                year={yearLimit}
                onYearChange={setYearLimit}
                yearBounds={yearBounds}
                starredIds={starredIds}
                starredOnly={starredOnly}
                onToggleStarredOnly={() => setStarredOnly((v) => !v)}
                onToggleStar={toggleStar}
                client={clientFilter}
                onClientChange={setClientFilter}
                compareIds={compareIds}
                onToggleCompare={toggleCompare}
                onClearCompare={() => setCompareIds([])}
                onSelectProject={handleSelectProject}
                besidePanel={showProjectPanel}
                chapters={eraChapters}
                onNarrate={atlasAI.voiceEnabled === false ? undefined : atlasAI.speakNarration}
                speechBusy={atlasAI.isSpeaking || atlasAI.isPreparingSpeech}
                onPresent={() => {
                  setDockPanel(null);
                  setIsPresenting(true);
                  setIsFocusMode(true);
                }}
              />
            )
          )}
          {weatherLayerOn && (
            <button
              type="button"
              onClick={() => setWeatherLayerOn(false)}
              className="absolute bottom-24 left-3 z-20 flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[11px] font-medium text-slate-700 dark:text-slate-200 shadow-md hover:border-emerald-500/50 transition-colors cursor-pointer"
              title="Hide the rain radar and typhoon tracks"
            >
              <CloudRain className="h-3.5 w-3.5 text-sky-500" />
              <span>Rain radar on</span>
              <X className="h-3 w-3 opacity-60" />
            </button>
          )}

          {/* Native MapLibre GL WebGL Map Canvas */}
          <ProjectAtlasMap
            geoJson={currentGeoJson}
            selectedProjectId={selectedProjectId}
            onSelectProject={selectProject}
            currentStyle={mapStyle}
            onStyleChange={setMapStyle}
            transitCorridor={transitCorridor}
            bufferZone={bufferZone}
          />
        </main>

        {/* Mobile Directory Slide-Over Drawer (< lg) (Directive 28 & 30) */}
        {isMobileDirectoryOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start">
            <div className="w-full max-w-sm h-full bg-white dark:bg-atlas-panel border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-atlas-sunken">
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
                  onHoverProject={setHoveredProjectId}
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
        {bothRight && (
          <div
            role="tablist"
            aria-label="Right panel"
            className={cn(
              "hidden md:flex absolute top-0 right-0 z-[52] items-center gap-1 p-1 rounded-xl bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg",
              rightTab === "project" && "md:w-[380px] lg:w-[410px] xl:w-[430px]"
            )}
            style={rightTab === "chat" ? { width: chatDock.rightDockWidth || 430 } : undefined}
          >
            {([
              { id: "project" as const, label: selectedProject?.code || "Project", Icon: FileText },
              { id: "chat" as const, label: "Atlas AI", Icon: Sparkles },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={rightTab === id}
                onClick={() => setRightTab(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-medium transition-colors cursor-pointer truncate",
                  rightTab === id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        )}

        <ProjectInspectionDrawer
          className={bothRight ? "md:!top-[46px] md:!right-0 md:!max-h-[calc(100%-46px)]" : undefined}
          project={showProjectPanel ? selectedProject : null}
          onClose={() => selectProject(null)}
          onFocusCoordinates={(lat, lng) => {
            flyToProject({
              coordinates: { lat, lng },
              id: selectedProjectId ?? undefined,
            });
          }}
          isExcludedByFilters={isSelectedProjectFilteredOut}
          onResetFilters={handleResetFilters}
          isTourActive={!!atlasAI.activeTour}
          tourSpokenWordIndex={atlasAI.spokenWordIndex}
          isTourSpeaking={atlasAI.isSpeaking}
          onTellStory={selectedProject && hasSiteStory(selectedProject) ? () => atlasAI.startStory(selectedProject) : undefined}
          isStarred={!!selectedProject && starredIds.includes(selectedProject.id)}
          onToggleStar={selectedProject ? () => toggleStar(selectedProject.id) : undefined}
          isCompared={!!selectedProject && compareIds.includes(selectedProject.id)}
          onToggleCompare={
            selectedProject
              ? () => {
                  const adding = !compareIds.includes(selectedProject.id);
                  toggleCompare(selectedProject.id);
                  if (adding) {
                    const n = Math.min(compareIds.length + 1, 3);
                    toast.success(`Added to comparison (${n} of 3)`, {
                      description: n < 2 ? "Open another project and add it too." : undefined,
                      action: { label: "View", onClick: () => openDockPanel("compare") },
                    });
                  }
                }
              : undefined
          }
        />

        {/* ✦ SCIC ATLAS AI WORKSPACE (PHASE 20: Movable, Resizable, Dockable, Adjustable Analyst Dashboard) */}
        <AtlasAIWorkspace
          dockInsets={{
            ...rowInsets,
            top: rowInsets.top + tabStripH + (tabStripH ? 6 : 0),
            // the minimised chat pill and bottom dock stay clear of the open project panel
            right: rowInsets.right + (showProjectPanel && !bothRight ? projectPanelWidth + 8 : 0),
          }}
          forceMinimized={!!atlasAI.activeTour}
          compactPill={showProjectPanel}
          hidden={hideChat}
          onDockInfo={handleChatDockInfo}
          isOpen={atlasAI.isOpen}
          onClose={() => atlasAI.setIsOpen(false)}
          messages={atlasAI.messages}
          isGenerating={atlasAI.isGenerating}
          currentToolEvents={atlasAI.currentToolEvents}
          onSendMessage={atlasAI.sendMessage}
          onCancelGeneration={atlasAI.cancelGeneration}
          onClearChat={atlasAI.clearChat}
          suggestions={atlasAI.suggestions}
          onExecuteAction={atlasAI.executeAction}
          onUndoAction={atlasAI.undoLastAction}
          canUndo={atlasAI.canUndo}
          lastAppliedAction={atlasAI.lastAppliedAction}
          selectedProjectName={selectedProject?.name}
          selectedProjectId={selectedProject?.id}
          activeRegion={geographicScope.region}
          totalProjectsCount={activeProjects.length}
          projects={activeProjects}
          onSelectProject={(id) => {
            if (id) handleSelectProject(id);
            else selectProject(null);
          }}
          onFlyToProject={({ id, coordinates, zoom, pitch, bearing }) => {
            if (id) {
              const p = findProjectInDataset(activeProjects, id);
              if (p) {
                flyToProject({
                  coordinates: { lat: p.coordinates.lat, lng: p.coordinates.lng },
                  id: p.id,
                  zoom: zoom ?? 14.5,
                  pitch: pitch ?? 45,
                  bearing: bearing ?? 0,
                });
              }
            } else if (coordinates) {
              flyToProject({ coordinates, zoom: zoom ?? 14.5, pitch: pitch ?? 45, bearing: bearing ?? 0 });
            }
          }}
          highlightedProjectIds={highlightedProjectIds}
          onHighlightProjects={(ids) => setHighlightedProjectIds(ids)}
          onCompareProjects={(ids) => {
            atlasAI.sendMessage(`Compare projects side-by-side: ${ids.join(", ")}`);
          }}
          avatarSlotRef={avatarSlotRef}
          onInputFocusChange={setIsChatInputFocused}
          statusLabel={navigatorState.statusLabel}
          activeVoice={atlasAI.activeVoice}
          setActiveVoice={atlasAI.setActiveVoice}
          availableVoices={atlasAI.availableVoices}
          voiceEnabled={atlasAI.voiceEnabled}
          toggleVoiceNarration={atlasAI.toggleVoiceNarration}
          isSpeaking={atlasAI.isSpeaking}
          cancelSpeech={atlasAI.cancelSpeech}
          speakNarration={atlasAI.speakNarration}
        />

        {/* ✦ SCIC ATLAS GUIDED PORTFOLIO TOUR CONTROLLER HUD */}
        <AtlasTourController
          tour={atlasAI.activeTour}
          onNext={atlasAI.nextTourStep}
          onPrev={atlasAI.prevTourStep}
          onTogglePlay={atlasAI.togglePlayPauseTour}
          onExit={atlasAI.exitTour}
          onStepSelect={atlasAI.jumpToTourStep}
          progressSeconds={atlasAI.progressSeconds}
          tourSpeedSeconds={atlasAI.tourSpeedSeconds}
          onSetSpeed={atlasAI.setTourSpeed}
          voiceEnabled={atlasAI.voiceEnabled}
          onToggleVoice={atlasAI.toggleVoiceNarration}
          isSpeaking={atlasAI.isSpeaking}
          spokenWordIndex={atlasAI.spokenWordIndex}
        />

        {/* ✦ PHILIPPINE WEATHER & TV NEWS DESK BRIEFING MODAL */}
        <AtlasNewsModal
          isOpen={isNewsModalOpen}
          onClose={() => setIsNewsModalOpen(false)}
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
          <Loader2 className="w-8 h-8 animate-spin text-scic-blue" />
        </div>
      }
    >
      <AtlasMapProvider>
        <ScicNationalMapContent />
      </AtlasMapProvider>
    </Suspense>
  );
}


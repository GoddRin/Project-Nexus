"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Zap,
  Camera,
  Layers,
  Compass,
  Building,
  CheckCircle2,
} from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "./AtlasMarkerIcons";
import { ATLAS_STATUSES } from "./AtlasTokens";
import { cn } from "@/lib/utils";

export interface AtlasProjectSpotlightProps {
  featuredProjects: SCICProject[];
  onExploreProject: (project: SCICProject) => void;
  selectedProjectId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onScrollToDirectory?: () => void;
  className?: string;
}

/**
 * Deterministic ordering for management presentation stability:
 * Prioritizes flagship renewable works (e.g. SCIC-HEPP-01 Tumauini HEPP),
 * followed by projects with verified non-placeholder photography,
 * followed by project code alphabetical sorting.
 */
function sortFeaturedProjects(projects: SCICProject[]): SCICProject[] {
  return [...projects].sort((a, b) => {
    // 1. Tumauini HEPP is always the prime management showcase
    if (a.code === "SCIC-HEPP-01") return -1;
    if (b.code === "SCIC-HEPP-01") return 1;

    // 2. Projects with verified custom photography take precedence over placeholder
    const aHasPhoto = a.imageUrl && !a.imageUrl.includes("placeholder") && !a.imageUrl.includes("logo");
    const bHasPhoto = b.imageUrl && !b.imageUrl.includes("placeholder") && !b.imageUrl.includes("logo");
    if (aHasPhoto && !bHasPhoto) return -1;
    if (!aHasPhoto && bHasPhoto) return 1;

    // 3. Deterministic alphabetical fallback by code or name
    return (a.code || a.name).localeCompare(b.code || b.name);
  });
}

function formatTargetDate(val?: string | null): string {
  if (!val) return "Active";
  if (val.includes("-") && !isNaN(Date.parse(val))) {
    try {
      const d = new Date(val);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return val;
    }
  }
  return val;
}

export function AtlasProjectSpotlight({
  featuredProjects,
  onExploreProject,
  selectedProjectId,
  isCollapsed: isCollapsedProp,
  onToggleCollapse: onToggleCollapseProp,
  onScrollToDirectory,
  className,
}: AtlasProjectSpotlightProps) {
  // Sort deterministically
  const sorted = useMemo(() => sortFeaturedProjects(featuredProjects), [featuredProjects]);

  // Active spotlight project index (supports management presentation cycling)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Active photo gallery slide index for multi-image projects
  const [photoIndex, setPhotoIndex] = useState(0);

  // Local collapse state (controlled or uncontrolled fallback)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;
  const toggleCollapse = onToggleCollapseProp || (() => setInternalCollapsed((prev) => !prev));

  // If no projects are marked as featured, gracefully disappear (Test C)
  if (!sorted || sorted.length === 0) {
    return null;
  }

  // Ensure index is within range
  const safeIndex = currentIndex < sorted.length ? currentIndex : 0;
  const project = sorted[safeIndex];

  // Resolve available photos (primary imageUrl + galleryImages)
  const allPhotos: string[] = useMemo(() => {
    const list: string[] = [];
    if (project.imageUrl) list.push(project.imageUrl);
    if (project.galleryImages) {
      for (const img of project.galleryImages) {
        if (!list.includes(img)) list.push(img);
      }
    }
    return list.length > 0 ? list : ["/logo.png"];
  }, [project]);

  const activePhoto = allPhotos[photoIndex < allPhotos.length ? photoIndex : 0];

  const canonicalCat = toCanonicalCategory(
    project.sector,
    project.name,
    project.description
  );
  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
  const statusConfig = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;
  const isSelected = selectedProjectId === project.id;

  const handlePrevProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex(0);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sorted.length - 1));
  };

  const handleNextProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex(0);
    setCurrentIndex((prev) => (prev < sorted.length - 1 ? prev + 1 : 0));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allPhotos.length > 1) {
      setPhotoIndex((prev) => (prev + 1) % allPhotos.length);
    }
  };

  /* ===================================================================
     TOP SECTION HEADER BAR (Clear Unambiguous Option Control)
     =================================================================== */
  const renderTopHeader = (
    <div className="flex items-center justify-between px-0.5 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-[10px] font-mono font-bold tracking-wider uppercase shrink-0">
          <Sparkles className="h-3 w-3 text-amber-500 dark:text-amber-400 animate-pulse" />
          <span>Featured Spotlight</span>
        </div>

        {/* Presentation Carousel Navigation */}
        {sorted.length > 1 && (
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#08121E] border border-slate-200 dark:border-white/10 rounded-full px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <button
              type="button"
              onClick={handlePrevProject}
              aria-label="Previous featured project"
              className="hover:text-slate-900 dark:hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Previous spotlight project"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="px-1 font-bold text-sky-600 dark:text-sky-400 select-none">
              {safeIndex + 1} / {sorted.length}
            </span>
            <button
              type="button"
              onClick={handleNextProject}
              aria-label="Next featured project"
              className="hover:text-slate-900 dark:hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Next spotlight project"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Option Button to Collapse / Expand Spotlight Card */}
      <button
        type="button"
        onClick={toggleCollapse}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer shadow-2xs group shrink-0",
          isCollapsed
            ? "bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 dark:text-sky-300"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
        title={isCollapsed ? "Expand spotlight card" : "Collapse spotlight card to save space"}
        aria-label={isCollapsed ? "Expand spotlight card" : "Collapse spotlight card"}
      >
        {isCollapsed ? (
          <>
            <ChevronDown className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300 transition-transform group-hover:translate-y-0.5" />
            <span>Expand Card</span>
          </>
        ) : (
          <>
            <ChevronUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
            <span>Collapse Card</span>
          </>
        )}
      </button>
    </div>
  );

  /* ===================================================================
     COMPACT COLLAPSED STRIP MODE (Saves ~320px vertical space on demand)
     =================================================================== */
  if (isCollapsed) {
    return (
      <div className={cn("space-y-1", className)}>
        {renderTopHeader}

        <div
          className={cn(
            "group relative rounded-xl overflow-hidden border border-slate-700/60 dark:border-white/15 bg-gradient-to-r from-slate-900 via-[#0B1726] to-slate-950 text-white shadow-md transition-all duration-300 p-2.5 flex items-center justify-between gap-2.5",
            isSelected && "ring-2 ring-[#0284C7] dark:ring-[#38BDF8]"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Thumbnail Image */}
            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-950">
              <img
                src={activePhoto}
                alt={project.name}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
              <span className="absolute top-0.5 left-0.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            </div>

            {/* Metadata */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-sky-400 font-bold truncate">
                  {project.metrics?.capacity || "Flagship"}
                </span>
                <span className="text-[9px] font-mono text-slate-400">·</span>
                <span className="text-[9px] font-mono text-emerald-400 font-semibold truncate">
                  {statusConfig.label}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate leading-tight font-sans">
                {project.name}
              </h4>
              <span className="text-[10px] font-mono text-slate-400 truncate block">
                {project.municipality}, {project.province}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onExploreProject(project)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[11px] font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Explore on Map"
            >
              <span>Explore</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===================================================================
     EXPANDED GRAND ARCHITECTURAL SHOWCASE MODE (Default Hero View)
     =================================================================== */
  return (
    <div className={cn("space-y-1.5", className)}>
      {renderTopHeader}

      <div
        className={cn(
          "group relative rounded-2xl overflow-hidden border border-slate-700/50 dark:border-white/15 bg-gradient-to-b from-slate-900 to-[#08121E] text-white shadow-xl transition-all duration-300",
          isSelected && "ring-2 ring-[#0284C7] dark:ring-[#38BDF8] shadow-[#0284C7]/20 shadow-2xl"
        )}
      >
        {/* 1. CINEMATIC HERO IMAGE STAGE (Expanded High-Definition Photo Area) */}
        <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-slate-950 select-none">
          {/* Project Photography with smooth hover zoom */}
          <img
            key={activePhoto}
            src={activePhoto}
            alt={project.name}
            className="w-full h-full object-cover object-center filter brightness-90 contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo.png";
            }}
          />

          {/* Multi-layered cinematic gradient overlays: subtle top vignette + smooth bottom blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08121E] via-[#08121E]/60 to-transparent pointer-events-none" />

          {/* Bottom Floating Meta Chips on Image Stage */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex items-end justify-between gap-2 z-10">
            {/* Category Chip + Regional Location */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold inline-flex items-center gap-1.5 backdrop-blur-md border shadow-sm"
                style={{
                  color: catConfig.color,
                  backgroundColor: `${catConfig.color}25`,
                  borderColor: `${catConfig.color}50`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: catConfig.color }}
                />
                {catConfig.shortLabel}
              </span>

              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-mono text-slate-300 uppercase font-semibold">
                {project.islandGroup} · {project.region}
              </span>
            </div>

            {/* Interactive Multi-Photo Indicator / Thumbnail Flipper */}
            {allPhotos.length > 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                title="Click to view next photo"
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 hover:bg-black/90 border border-white/20 text-slate-200 hover:text-white text-[10px] font-mono backdrop-blur-md transition-colors cursor-pointer shadow-sm shrink-0"
              >
                <Camera className="h-3 w-3 text-sky-400" />
                <span>
                  {photoIndex + 1}/{allPhotos.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 2. ARCHITECTURAL IDENTITY & ENGINEERING TELEMETRY HUD */}
        <div className="p-3.5 sm:p-4 space-y-3 bg-[#08121E]">
          {/* Code & Real-Time Status Indicator */}
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono text-[10px] font-bold tracking-wider">
              {project.code}
            </span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  project.status === "ONGOING" ? "bg-emerald-400 animate-pulse" : "bg-sky-400"
                )}
              />
              <span className="font-semibold">{statusConfig.label}</span>
            </div>
          </div>

          {/* Project Title & Municipal Location */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-[17px] font-bold font-sans text-white leading-snug tracking-tight line-clamp-2">
              {project.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="truncate">
                {project.municipality}, {project.province}
              </span>
            </div>
          </div>

          {/* Engineering Telemetry HUD: 3 Micro Stat Tiles */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Tile 1: Capacity / Scale */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Capacity
              </span>
              <span className="text-xs font-mono font-bold text-sky-300 truncate mt-0.5">
                {project.metrics?.capacity || "Flagship"}
              </span>
            </div>

            {/* Tile 2: Target / Milestone */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Target COD
              </span>
              <span
                className="text-xs font-mono font-bold text-emerald-300 truncate mt-0.5"
                title={(project as any).targetCodDate || project.metrics?.generationOutput || "Active"}
              >
                {formatTargetDate((project as any).targetCodDate) || project.metrics?.generationOutput || "Active"}
              </span>
            </div>

            {/* Tile 3: Client / Owner */}
            <div className="p-2 rounded-lg bg-slate-900/80 border border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Client
              </span>
              <span
                className="text-xs font-mono font-bold text-slate-200 truncate mt-0.5"
                title={project.client}
              >
                {project.client.split("/")[0].trim() || "National"}
              </span>
            </div>
          </div>

          {/* Authentic Executive Scope Overview */}
          {project.description && (
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-sans pt-0.5">
              {project.description}
            </p>
          )}

          {/* 3. GLOWING ACTION CTA (Explore Project on Map) */}
          <button
            type="button"
            onClick={() => onExploreProject(project)}
            className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0284C7] via-[#0ea5e9] to-emerald-500 hover:from-[#0369a1] hover:to-emerald-400 text-white font-mono text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(2,132,199,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] cursor-pointer active:scale-[0.99]"
          >
            <span>Explore in 3D Map</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* 4. SCROLL DOWN ACTION BUTTON (Scrolls smoothly to Directory Filters & Cards) */}
          {onScrollToDirectory && (
            <button
              type="button"
              onClick={onScrollToDirectory}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-sky-500/40 text-sky-300 hover:text-sky-200 font-mono text-[10px] font-semibold transition-all cursor-pointer group/scroll"
            >
              <ChevronDown className="h-3.5 w-3.5 animate-bounce text-sky-400 group-hover/scroll:translate-y-0.5 transition-transform" />
              <span>Scroll Down to Filters & 65 Projects</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

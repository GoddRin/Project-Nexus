"use client";

import { motion } from "framer-motion";
import { BRAND_SPRING } from "@/components/shared/motion";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  ArrowRight,
  FileText,
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
import { completionYearOf } from "@/lib/atlas/projectFacts";

export interface AtlasProjectSpotlightProps {
  featuredProjects: SCICProject[];
  onExploreProject: (project: SCICProject) => void;
  selectedProjectId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onScrollToDirectory?: () => void;
  /** Projects listed in the directory below the spotlight */
  directoryCount?: number;
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
    // 1. Projects with verified custom photography take precedence over placeholder
    const aHasPhoto = a.imageUrl && !a.imageUrl.includes("placeholder") && !a.imageUrl.includes("logo");
    const bHasPhoto = b.imageUrl && !b.imageUrl.includes("placeholder") && !b.imageUrl.includes("logo");
    if (aHasPhoto && !bHasPhoto) return -1;
    if (!aHasPhoto && bHasPhoto) return 1;

    // 2. Deterministic alphabetical fallback by code or name
    return (a.code || a.name).localeCompare(b.code || b.name);
  });
}

/**
 * Spotlight of the day: the featured project shown first changes once a day (Philippine time),
 * going through the whole featured set in order, so every flagship gets its day and the card is
 * not the same one each visit. Everyone sees the same project on the same day. The arrows still
 * step through the rest.
 */
export function spotlightIndexForToday(count: number, now: Date = new Date()): number {
  if (count <= 0) return 0;
  const manila = new Date(now.getTime() + 8 * 3600 * 1000); // UTC+8, no daylight saving
  const day = Math.floor(manila.getTime() / 86400000);
  return ((day % count) + count) % count;
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
  directoryCount,
  className,
}: AtlasProjectSpotlightProps) {
  // Sort deterministically
  const sorted = useMemo(() => sortFeaturedProjects(featuredProjects), [featuredProjects]);

  // Active spotlight project index (supports management presentation cycling)
  // (starts on today's project once mounted: the server and the first client render must agree)
  const [currentIndex, setCurrentIndex] = useState(0);
  const dailyAppliedRef = useRef(false);
  useEffect(() => {
    if (dailyAppliedRef.current || sorted.length === 0) return;
    dailyAppliedRef.current = true;
    setCurrentIndex(spotlightIndexForToday(sorted.length));
  }, [sorted.length]);

  // Active photo gallery slide index for multi-image projects
  const [photoIndex, setPhotoIndex] = useState(0);

  // Local collapse state (controlled or uncontrolled fallback)
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;
  const toggleCollapse = onToggleCollapseProp || (() => setInternalCollapsed((prev) => !prev));

  // Ensure index is within range. (Every hook below runs on every render, also when there is
  // nothing featured: returning early above them broke React's rule of hooks and would crash the
  // panel the moment the featured list went from empty to filled.)
  const safeIndex = currentIndex < sorted.length ? currentIndex : 0;
  const project: SCICProject | undefined = sorted[safeIndex];

  // Resolve available photos (primary imageUrl + galleryImages)
  const allPhotos: string[] = useMemo(() => {
    const list: string[] = [];
    if (project?.imageUrl) list.push(project.imageUrl);
    if (project?.galleryImages) {
      for (const img of project.galleryImages) {
        if (!list.includes(img)) list.push(img);
      }
    }
    return list.length > 0 ? list : ["/logo.png"];
  }, [project]);

  // Auto-sync spotlight when selectedProjectId changes to a featured project
  useEffect(() => {
    if (!selectedProjectId || !sorted.length) return;
    const matchIndex = sorted.findIndex(
      (p) => p.id === selectedProjectId || p.code === selectedProjectId || (p as any).slug === selectedProjectId
    );
    if (matchIndex !== -1 && matchIndex !== currentIndex) {
      setPhotoIndex(0);
      setCurrentIndex(matchIndex);
    }
  }, [selectedProjectId, sorted, currentIndex]);

  // Listen to AI drive_spotlight custom event
  useEffect(() => {
    const handleDriveSpotlight = (e: Event) => {
      const customEvent = e as CustomEvent<{ projectId?: string; direction?: "next" | "prev" }>;
      const { projectId, direction } = customEvent.detail || {};

      if (direction === "next") {
        setPhotoIndex(0);
        setCurrentIndex((prev) => (prev < sorted.length - 1 ? prev + 1 : 0));
      } else if (direction === "prev") {
        setPhotoIndex(0);
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sorted.length - 1));
      } else if (projectId) {
        const idx = sorted.findIndex(
          (p) =>
            p.id === projectId ||
            p.code?.toLowerCase() === projectId.toLowerCase() ||
            (p as any).slug?.toLowerCase() === projectId.toLowerCase() ||
            p.name.toLowerCase().includes(projectId.toLowerCase())
        );
        if (idx !== -1) {
          setPhotoIndex(0);
          setCurrentIndex(idx);
        }
      }
    };

    window.addEventListener("atlas:drive_spotlight", handleDriveSpotlight);
    return () => window.removeEventListener("atlas:drive_spotlight", handleDriveSpotlight);
  }, [sorted]);

  // If no projects are marked as featured, gracefully disappear (Test C)
  if (!project) {
    return null;
  }

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
          <span>{safeIndex === spotlightIndexForToday(sorted.length) ? "Spotlight of the Day" : "Featured Spotlight"}</span>
        </div>

        {/* Presentation Carousel Navigation */}
        {sorted.length > 1 && (
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-atlas-sunken border border-slate-200 dark:border-white/10 rounded-full px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <button
              type="button"
              onClick={handlePrevProject}
              aria-label="Previous featured project"
              className="hover:text-slate-900 dark:hover:text-white p-0.5 transition-colors cursor-pointer"
              title="Previous spotlight project"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="px-1 font-bold text-emerald-600 dark:text-emerald-400 select-none">
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
            "group relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-atlas-panel dark:to-slate-950 text-slate-900 dark:text-white shadow-md transition-all duration-300 p-2.5 flex items-center justify-between gap-2.5",
            isSelected && "ring-2 ring-scic-blue dark:ring-sky-400"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Thumbnail Image */}
            <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950">
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
                <span className="text-[9px] font-mono text-sky-700 dark:text-sky-400 font-bold truncate">
                  {project.metrics?.capacity || catConfig.label}
                </span>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">·</span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                  {statusConfig.label}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight font-sans">
                {project.name}
              </h4>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                {project.municipality}, {project.province}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onExploreProject(project)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold transition-all shadow-sm cursor-pointer active:scale-95"
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
          "group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-atlas-sunken text-slate-900 dark:text-white shadow-xl transition-all duration-300",
          isSelected && "ring-2 ring-scic-blue dark:ring-sky-400 shadow-scic-blue/20 shadow-2xl"
        )}
      >
        {/* 1. CINEMATIC HERO IMAGE STAGE (Expanded High-Definition Photo Area) */}
        <motion.div layoutId={`project-photo-${project.id}`} transition={BRAND_SPRING} className="photo-brand atlas-skeleton relative w-full h-48 sm:h-52 overflow-hidden bg-slate-950 select-none">
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
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 dark:from-atlas-sunken dark:via-atlas-sunken/60 to-transparent pointer-events-none" />

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
        </motion.div>

        {/* 2. ARCHITECTURAL IDENTITY & ENGINEERING TELEMETRY HUD */}
        <div className="p-3.5 sm:p-4 space-y-3 bg-white dark:bg-atlas-sunken">
          {/* Code & Real-Time Status Indicator */}
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-bold tracking-wider">
              {project.code}
            </span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-300">
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
            <h3 className="text-base sm:text-[17px] font-bold font-sans text-slate-900 dark:text-white leading-snug tracking-tight line-clamp-2">
              {project.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">
                {project.municipality}, {project.province}
              </span>
            </div>
          </div>

          {/* Engineering Telemetry HUD: 3 Micro Stat Tiles */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Tile 1: Capacity / Scale */}
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Capacity
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate mt-0.5">
                {project.metrics?.capacity || "Not on record"}
              </span>
            </div>

            {/* Tile 2: Target / Milestone */}
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {project.status === "COMPLETED" ? "Completed" : "Target date"}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate mt-0.5">
                {/* only what the record holds: no filler words where a date is not published */}
                {project.status === "COMPLETED"
                  ? completionYearOf(project) ?? "Not published"
                  : (project as any).targetCodDate
                    ? formatTargetDate((project as any).targetCodDate)
                    : "Not published"}
              </span>
            </div>

            {/* Tile 3: Client / Owner */}
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Client
              </span>
              <span
                className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate mt-0.5"
                title={project.client}
              >
                {(project.client || "").split("/")[0].trim() || "Not on record"}
              </span>
            </div>
          </div>

          {/* Authentic Executive Scope Overview */}
          {project.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-sans pt-0.5">
              {project.description}
            </p>
          )}

          {/* 3. GLOWING ACTION CTA (Explore Project on Map) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => onExploreProject(project)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-700 hover:to-teal-400 text-white font-mono text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_25px_rgba(16,185,129,0.55)] cursor-pointer active:scale-[0.99]"
            >
              <span>Explore on Map</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>

            <Link
              href={`/dashboard/projects/${project.id}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 hover:border-emerald-500/50 dark:hover:border-emerald-400/50 text-slate-900 dark:text-white font-mono text-xs font-semibold transition-all shadow-xs"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Full Profile</span>
            </Link>
          </div>

          {/* 4. SCROLL DOWN ACTION BUTTON (Scrolls smoothly to Directory Filters & Cards) */}
          {onScrollToDirectory && (
            <button
              type="button"
              onClick={onScrollToDirectory}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-white/10 hover:border-sky-500/40 text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200 font-mono text-[10px] font-semibold transition-all cursor-pointer group/scroll"
            >
              <ChevronDown className="h-3.5 w-3.5 animate-bounce text-sky-700 dark:text-sky-400 group-hover/scroll:translate-y-0.5 transition-transform" />
              <span>Scroll Down to Filters{typeof directoryCount === "number" ? ` & ${directoryCount} Projects` : ""}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

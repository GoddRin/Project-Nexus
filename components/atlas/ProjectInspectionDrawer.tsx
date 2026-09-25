"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Compass,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  User,
  Zap,
  Building,
  Navigation,
  Train,
  Waves,
  Layers,
  Cpu,
  Calendar,
  Award,
  ChevronRight,
  Maximize2,
  Minimize2,
  CloudLightning,
  Sparkles,
  Table,
  Crosshair,
  ZoomIn,
  Satellite,
  ChevronLeft,
  Users,
  CheckCircle2,
  Clock,
  CircleDot,
  FileText,
  Mail,
  AlertCircle,
  Filter,
} from "lucide-react";
import { SCICProject } from "@/lib/data/scicProjectsData";
import { ATLAS_STATUSES } from "./AtlasTokens";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "./AtlasMarkerIcons";
import { useAtlasMap } from "./AtlasMapContext";
import { ProjectTimeline } from "./ProjectTimeline";
import { getProjectGeometry } from "@/lib/data/scicProjectGeometries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ProjectInspectionDrawerProps {
  project: SCICProject | null;
  onClose: () => void;
  onFocusCoordinates?: (lat: number, lng: number, zoomLevel?: number) => void;
  isExcludedByFilters?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

export function ProjectInspectionDrawer({
  project,
  onClose,
  onFocusCoordinates,
  isExcludedByFilters = false,
  onResetFilters,
  className,
}: ProjectInspectionDrawerProps) {
  const {
    flyToProject,
    mapStyle,
    setMapStyle,
    mapInstance,
    activeGisLayers,
    toggleGisLayer,
  } = useAtlasMap();

  // Local UI presentation states
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // References for focus restoration
  const triggerImageRef = useRef<HTMLButtonElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);

  // Reset local state when active project changes (Directive 33 & 55)
  useEffect(() => {
    setActiveGalleryIndex(0);
    setIsLightboxOpen(false);
  }, [project?.id]);

  // Handle global Escape key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLightboxOpen) {
          e.preventDefault();
          setIsLightboxOpen(false);
        } else if (project) {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, project, onClose]);

  // Prevent body scroll when lightbox modal is open (Directive 12 & 41)
  useEffect(() => {
    if (isLightboxOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      if (lightboxCloseRef.current) {
        lightboxCloseRef.current.focus();
      }
      return () => {
        document.body.style.overflow = originalOverflow;
        if (triggerImageRef.current) {
          triggerImageRef.current.focus();
        }
      };
    }
  }, [isLightboxOpen]);

  // Resolve legitimate gallery photos (Directives 5, 10, 11)
  const galleryImages = useMemo(() => {
    if (!project) return [];
    const list: string[] = [];

    // Ensure featured imageUrl is the lead image
    if (project.imageUrl && project.imageUrl.trim()) {
      list.push(project.imageUrl.trim());
    }

    // Append legitimate gallery assets if present
    if (project.galleryImages && Array.isArray(project.galleryImages)) {
      for (const img of project.galleryImages) {
        if (img && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }
    return list;
  }, [project]);

  const activePhotoUrl = galleryImages[activeGalleryIndex] || project?.imageUrl || "";

  // Lightbox keyboard navigation (ArrowLeft, ArrowRight)
  const handleLightboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (galleryImages.length <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveGalleryIndex((prev) =>
          prev === 0 ? galleryImages.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveGalleryIndex((prev) =>
          prev === galleryImages.length - 1 ? 0 : prev + 1
        );
      }
    },
    [galleryImages.length]
  );

  // Resolve verified geometry if available for this project
  const projectGeometry = useMemo(() => {
    if (!project) return null;
    return getProjectGeometry(project.id) || getProjectGeometry(project.code);
  }, [project]);

  // Determine if this project is integrated with Project Nexus Operational Workspace
  const isOperationalNexusProject = useMemo(() => {
    if (!project) return false;
    return (
      project.id === "scic-thepp-isabela" ||
      project.id === "cmqvwzn750000r8w1zidk116i" ||
      project.code === "SCIC-HEPP-01" ||
      project.name.toLowerCase().includes("tumauini")
    );
  }, [project]);

  if (!project) return null;

  // Canonical Phase 2 category & status resolution (Directives 7 & 9)
  const canonicalCat = toCanonicalCategory(
    project.sector,
    project.name,
    project.description
  );
  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
  const status = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

  // Map Quick Actions (Directives 13–18)
  const handleInspectFootprint = () => {
    if (!activeGisLayers.has("project-footprints")) {
      toggleGisLayer("project-footprints");
    }
    if (mapInstance) {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      mapInstance.flyTo({
        center: [project.coordinates.lng, project.coordinates.lat],
        zoom: 14.5,
        bearing: 15,
        pitch: 45,
        duration: 1800,
        essential: true,
        padding: isDesktop ? { top: 60, bottom: 60, left: 60, right: 480 } : { top: 40, bottom: 260, left: 20, right: 20 },
      });
    } else if (onFocusCoordinates) {
      onFocusCoordinates(project.coordinates.lat, project.coordinates.lng, 14.5);
    }
    toast.success("Focusing on site footprint", {
      description: projectGeometry?.metadata.notes || "Displaying verified engineering perimeter.",
    });
  };
  const handleCenterOnProject = () => {
    if (onFocusCoordinates) {
      onFocusCoordinates(project.coordinates.lat, project.coordinates.lng);
    } else {
      flyToProject({
        coordinates: project.coordinates,
        id: project.id,
      });
    }
  };

  const handleSiteView = () => {
    // Zoom in toward project-level view (zoom ≈ 16.2), smooth camera animation
    if (mapInstance) {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      mapInstance.flyTo({
        center: [project.coordinates.lng, project.coordinates.lat],
        zoom: Math.min(16.2, mapInstance.getMaxZoom() || 18),
        bearing: 0,
        pitch: 25,
        duration: 1300,
        essential: true,
        padding: isDesktop ? { top: 0, bottom: 0, left: 0, right: 380 } : undefined,
      });
    } else {
      handleCenterOnProject();
    }
  };

  const handleToggleSatellite = () => {
    // Toggles between DARK and SATELLITE preserving selection & markers (Directive 16)
    const targetStyle = mapStyle === "SATELLITE" ? "DARK" : "SATELLITE";
    setMapStyle(targetStyle);
    toast.success(
      targetStyle === "SATELLITE"
        ? "Switched to High-Resolution Satellite View"
        : "Switched to Corporate Dark Map"
    );
  };

  const handleCopyCoords = () => {
    // Clipboard format: Latitude, Longitude (Directive 8 & 17)
    const coordStr = `${project.coordinates.lat.toFixed(6)}, ${project.coordinates.lng.toFixed(6)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(coordStr)
        .then(() => {
          setCopiedCoords(true);
          toast.success(`Coordinates copied: ${coordStr}`);
          setTimeout(() => setCopiedCoords(false), 2000);
        })
        .catch(() => {
          toast.error("Failed to copy coordinates to clipboard");
        });
    }
  };

  const handleCopyEmail = (email?: string) => {
    if (!email) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(email)
        .then(() => {
          setCopiedEmail(true);
          toast.success(`Copied email: ${email}`);
          setTimeout(() => setCopiedEmail(false), 2000);
        })
        .catch(() => {
          toast.error("Failed to copy email");
        });
    }
  };

  // Google Maps external link (Directive 18)
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${project.coordinates.lat},${project.coordinates.lng}`;

  return (
    <>
      <AnimatePresence>
        <motion.aside
          key={project.id}
          role="dialog"
          aria-label={`Project Intelligence: ${project.name}`}
          aria-modal="false"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={cn(
            "flex flex-col text-slate-800 dark:text-slate-100 shadow-2xl bg-white/95 dark:bg-[#0B1726]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10",
            // Mobile: Bottom sheet with peek vs expanded mode (Directives 29–32)
            "fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-auto",
            isMobileExpanded
              ? "h-[94vh] max-h-[94vh] rounded-t-2xl border-t border-slate-300 dark:border-white/15"
              : "h-[54vh] max-h-[54vh] rounded-t-2xl border-t border-slate-300 dark:border-white/15 md:h-auto",
            // Desktop: Floating side panel docked on the right side of the map (Directives 27 & 28)
            "md:top-3 md:right-3 md:bottom-3 md:w-[380px] lg:w-[410px] xl:w-[430px] md:max-h-[calc(100%-1.5rem)] md:rounded-xl md:z-30",
            className
          )}
        >
          {/* Mobile Top Drag Handle & Expand Toggle */}
          <div className="md:hidden flex items-center justify-between px-4 pt-2.5 pb-1 border-b border-slate-200 dark:border-white/5 shrink-0 bg-slate-50/90 dark:bg-[#08121E]/60">
            <button
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              className="flex-1 flex justify-center py-1 cursor-pointer"
              aria-label={isMobileExpanded ? "Collapse panel" : "Expand panel to full screen"}
            >
              <span className="h-1 w-12 rounded-full bg-slate-300 dark:bg-white/30" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                aria-label={isMobileExpanded ? "Collapse bottom sheet" : "Expand bottom sheet"}
              >
                {isMobileExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                aria-label="Close project panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Desktop Control Bar */}
          <div className="hidden md:flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0284C7] dark:bg-[#00E5FF] shadow-[0_0_8px_#0284C7] dark:shadow-[0_0_8px_#00E5FF]" />
              <span className="text-[11px] font-mono tracking-wider font-bold uppercase text-[#0284C7] dark:text-[#00E5FF]">
                PROJECT INTELLIGENCE
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close intelligence panel (Esc)"
              title="Close panel (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filter Exclusion Notice (Phase 11: Explained graceful state when project is selected via Spotlight/Discovery but hidden by active directory filters) */}
          {isExcludedByFilters && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Filter className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate text-[11px] font-sans">
                  This project is currently hidden by directory filters.
                </span>
              </div>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold uppercase transition-colors shrink-0 cursor-pointer"
                >
                  Show In Directory
                </button>
              )}
            </div>
          )}

          {/* Scrollable Intelligence Body (Directive 32: independent scroll container) */}
          <div className="flex-1 overflow-y-auto overscroll-contain scic-scrollbar p-4 md:p-5 space-y-5">
            {/* ============================================================
                SECTION 1: PRIMARY IDENTITY HIERARCHY (Directive 6)
                1. Project Name
                2. Project Code
                3. Category
                4. Location
                5. Status
                6. Featured Image
                7. Short Overview
                ============================================================ */}
            <div className="space-y-2.5">
              {/* Top Code Badge & Canonical Category Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-[10px] font-mono font-bold text-[#0284C7] dark:text-[#38BDF8]">
                    {project.code}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wide uppercase border"
                    style={{
                      backgroundColor: `${catConfig.color}18`,
                      borderColor: `${catConfig.color}40`,
                      color: catConfig.color,
                    }}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0 flex items-center justify-center p-0.5 overflow-hidden"
                      style={{ backgroundColor: catConfig.color }}
                    >
                      <svg
                        className="h-2 w-2"
                        viewBox="0 0 64 64"
                        dangerouslySetInnerHTML={{ __html: catConfig.svgInnerPath }}
                      />
                    </span>
                    <span>{catConfig.label}</span>
                  </span>
                </div>

                {/* Status Badge (Canonical Phase 2 status with restrained pulse) */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wide uppercase border",
                    status.bgClass,
                    status.textClass,
                    status.borderClass
                  )}
                >
                  {status.hasPulse ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  )}
                  <span>{status.label}</span>
                </span>
              </div>

              {/* Project Title */}
              <h2 className="text-base md:text-lg font-bold font-sans tracking-tight text-slate-900 dark:text-white leading-snug">
                {project.name}
              </h2>

              {/* Primary Location */}
              <div className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-sans">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span className="leading-tight">
                  {project.barangay ? `${project.barangay}, ` : ""}
                  {project.municipality}, {project.province} &bull;{" "}
                  <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{project.region}</span>
                </span>
              </div>

              {/* Featured Project Image (Directives 10 & 11) */}
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-md bg-slate-100 dark:bg-[#08121E]">
                {activePhotoUrl ? (
                  <button
                    ref={triggerImageRef}
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative block w-full h-48 md:h-52 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0284C7] dark:focus:ring-[#00E5FF]"
                    title="Click to expand high-resolution photo in lightbox"
                    aria-label={`View full-size photo: ${project.name}`}
                  >
                    <Image
                      src={activePhotoUrl}
                      alt={`${project.name} project image`}
                      fill
                      unoptimized={activePhotoUrl.startsWith("http")}
                      className="object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                      sizes="(max-width: 768px) 100vw, 470px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded bg-black/75 border border-white/15 text-[10px] font-mono text-slate-200 backdrop-blur-xs">
                      <Maximize2 className="h-3 w-3 text-[#00E5FF]" />
                      <span>Expand Photo</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-40 w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-white/[0.02] text-slate-400 p-4 text-center">
                    <Building className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-1" />
                    <span className="text-xs font-mono">No Image Asset Available</span>
                  </div>
                )}
              </div>

              {/* Gallery Thumbnail Strip (Directive 11: Render ONLY when legitimate gallery exists) */}
              {galleryImages.length > 1 && (
                <div className="pt-1">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Project Image Strip ({galleryImages.length} Verified Assets)
                  </span>
                  <div
                    className="flex items-center gap-2 overflow-x-auto scic-scrollbar pb-1"
                    role="tablist"
                    aria-label="Project photo gallery"
                  >
                    {galleryImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveGalleryIndex(idx)}
                        role="tab"
                        aria-selected={activeGalleryIndex === idx}
                        aria-label={`Show image ${idx + 1} of ${galleryImages.length}`}
                        className={cn(
                          "relative h-12 w-14 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer focus:outline-none",
                          activeGalleryIndex === idx
                            ? "border-[#0284C7] dark:border-[#00E5FF] ring-2 ring-[#0284C7]/40 dark:ring-[#00E5FF]/40 scale-105"
                            : "border-slate-200 dark:border-white/15 opacity-75 hover:opacity-100"
                        )}
                      >
                        <Image
                          src={imgUrl}
                          alt={`${project.name} thumbnail ${idx + 1}`}
                          fill
                          unoptimized={imgUrl.startsWith("http")}
                          className="object-cover"
                          sizes="60px"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Project Overview / Description (Directive 19) */}
              {project.description && (
                <div className="pt-1">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Project Overview
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200/95 font-sans">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            {/* ============================================================
                SECTION 2: MAP QUICK ACTIONS TOOLBAR (Directives 13–18)
                Center · Site View · Satellite · Copy Coordinates · Open in Maps
                ============================================================ */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/80 p-2.5">
              {/* Primary Architecture Action: Open Full Project Profile */}
              <div className="space-y-1.5 mb-2.5">
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-[#0284C7]/15 to-emerald-500/10 dark:from-sky-500/20 dark:via-[#00E5FF]/20 dark:to-emerald-500/15 border border-[#0284C7]/40 dark:border-[#00E5FF]/40 text-[#0284C7] dark:text-[#00E5FF] hover:border-[#0284C7] dark:hover:border-[#00E5FF] transition-all group font-mono text-xs font-bold shadow-2xs cursor-pointer"
                  title="Open full authoritative Project Profile"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF] group-hover:scale-110 transition-transform shrink-0" />
                    <span>Open Project Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                {/* If project has active Nexus operations (Tumauini HEPP) */}
                {isOperationalNexusProject && (
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-all group font-mono text-xs font-bold shadow-2xs cursor-pointer"
                    title="Open live Project Nexus site operations command center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span>Open Nexus Operations</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                )}
              </div>

              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Map Quick Actions
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {/* 1. Center Action */}
                <button
                  onClick={handleCenterOnProject}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer text-center group shadow-2xs"
                  title="Re-center map camera on project coordinates"
                >
                  <Crosshair className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF] mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">Center</span>
                </button>

                {/* 2. Site View Action (Zoom in) */}
                <button
                  onClick={handleSiteView}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer text-center group shadow-2xs"
                  title="Zoom into project site level"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">Site View</span>
                </button>

                {/* 3. Satellite Action (Toggle) */}
                <button
                  onClick={handleToggleSatellite}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer text-center group shadow-2xs",
                    mapStyle === "SATELLITE"
                      ? "bg-[#0284C7]/20 border-[#0284C7] text-[#0284C7] dark:text-white font-bold"
                      : "bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  )}
                  title={
                    mapStyle === "SATELLITE"
                      ? "Switch back to Standard Map"
                      : "Toggle High-Resolution Satellite View"
                  }
                >
                  <Satellite className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">
                    {mapStyle === "SATELLITE" ? "Standard" : "Satellite"}
                  </span>
                </button>

                {/* 4. Copy Coordinates Action */}
                <button
                  onClick={handleCopyCoords}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer text-center group shadow-2xs"
                  title="Copy WGS84 Latitude, Longitude"
                >
                  {copiedCoords ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mb-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-mono">
                    {copiedCoords ? "Copied" : "Copy Lat/Lng"}
                  </span>
                </button>

                {/* 5. External Map Navigation (Google Maps query in separate tab) */}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer text-center group col-span-2 sm:col-span-1 shadow-2xs"
                  title="Open external Google Maps directions for this site"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono">Open in Maps</span>
                </a>
              </div>

              {/* 6. Inspect Engineering Footprint (Directives & Phase 13) */}
              {projectGeometry && (
                <button
                  onClick={handleInspectFootprint}
                  className="w-full mt-2.5 flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors shadow-2xs group cursor-pointer"
                  title="Zoom and focus on verified engineering footprint"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF] group-hover:scale-110 transition-transform shrink-0" />
                    <div className="text-left">
                      <span className="block text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                        Inspect Engineering Footprint
                      </span>
                      <span className="block text-[9px] font-mono text-cyan-700 dark:text-cyan-400 mt-0.5">
                        {projectGeometry.metadata.sourceType.replace(/_/g, " ")} &bull; {projectGeometry.metadata.confidence}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-cyan-700 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )}
            </div>

            {/* ============================================================
                SECTION 3: VERIFIED STRUCTURED METRICS (Directives 20 & 21)
                Display ONLY genuine verified metrics. Omit missing items cleanly.
                ============================================================ */}
            {Boolean(
              project.metrics.capacity ||
                project.metrics.contractValue ||
                project.metrics.tunnelLength ||
                project.metrics.roadLength ||
                project.metrics.generationOutput ||
                project.metrics.safeManHours ||
                project.metrics.workforcePeak
            ) && (
              <div className="space-y-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Engineering & Performance Metrics
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {project.metrics.capacity && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Capacity / Rating
                      </span>
                      <span className="text-sm font-bold font-mono text-[#0284C7] dark:text-[#00E5FF] mt-0.5 block truncate">
                        {project.metrics.capacity}
                      </span>
                    </div>
                  )}

                  {project.metrics.contractValue && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Investment Scope
                      </span>
                      <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block truncate">
                        {project.metrics.contractValue}
                      </span>
                    </div>
                  )}

                  {project.metrics.generationOutput && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Annual Output
                      </span>
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                        {project.metrics.generationOutput}
                      </span>
                    </div>
                  )}

                  {project.metrics.tunnelLength && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Tunnel Alignment
                      </span>
                      <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block truncate">
                        {project.metrics.tunnelLength}
                      </span>
                    </div>
                  )}

                  {project.metrics.roadLength && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Corridor Length
                      </span>
                      <span className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5 block truncate">
                        {project.metrics.roadLength}
                      </span>
                    </div>
                  )}

                  {project.metrics.workforcePeak && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2.5 shadow-2xs">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        Peak Workforce
                      </span>
                      <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-300 mt-0.5 block truncate">
                        {project.metrics.workforcePeak.toLocaleString()} Personnel
                      </span>
                    </div>
                  )}

                  {project.metrics.safeManHours && (
                    <div className="col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                            Safety Milestone Record
                          </span>
                          <span className="text-xs font-bold font-mono text-emerald-900 dark:text-white">
                            {project.metrics.safeManHours}
                          </span>
                        </div>
                      </div>
                      <Award className="h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70 shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================
                SECTION 3.5: PROJECT EXECUTION TIMELINE (Phase 12)
                Chronological horizon & verified milestone timeline
                ============================================================ */}
            <ProjectTimeline project={project} />

            {/* ============================================================
                SECTION 4: TECHNICAL PROJECT LEDGER (Directives 22–26)
                ============================================================ */}
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#08121E]/60 p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
                  Technical Specification Ledger
                </span>
                <span className="text-[9px] font-mono text-slate-400">WGS84 Datum</span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {/* Coordinates */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Coordinates (Lat, Lng)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {project.coordinates.lat.toFixed(6)}, {project.coordinates.lng.toFixed(6)}
                  </span>
                </div>

                {/* Region & Island */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Island / Administrative Region</span>
                  <span className="text-slate-800 dark:text-slate-200 font-sans text-right truncate max-w-[210px]">
                    {project.islandGroup} &bull; {project.region}
                  </span>
                </div>

                {/* Province & Municipality */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Jurisdiction</span>
                  <span className="text-slate-800 dark:text-slate-200 font-sans text-right truncate max-w-[210px]">
                    {project.municipality}, {project.province}
                  </span>
                </div>

                {/* Barangay (Only if present) */}
                {project.barangay && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400">Barangay</span>
                    <span className="text-slate-800 dark:text-slate-200 font-sans text-right">{project.barangay}</span>
                  </div>
                )}

                {/* Client / Owner Entity (Only if present) */}
                {project.client && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400">Contracting Client</span>
                    <span className="text-slate-800 dark:text-slate-200 font-sans text-right font-medium truncate max-w-[210px]">
                      {project.client}
                    </span>
                  </div>
                )}

                {/* Timeline / Target COD (Only if present) */}
                {(project.targetCodDate || project.completionYear) && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">Timeline / Completion Target</span>
                    <span className="text-amber-600 dark:text-amber-400 text-right font-medium">
                      {project.targetCodDate
                        ? (() => {
                            const d = new Date(project.targetCodDate);
                            return isNaN(d.getTime())
                              ? project.targetCodDate
                              : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                          })()
                        : `CY ${project.completionYear}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================
                SECTION 5: ENGINEERING SCOPE (Directive 23)
                ============================================================ */}
            {project.engineeringScope && project.engineeringScope.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Engineering & Construction Scope
                </span>
                <ul className="space-y-1.5">
                  {project.engineeringScope.map((scope, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 font-sans">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0284C7] dark:bg-[#00E5FF] shrink-0 mt-1.5" />
                      <span className="leading-snug">{scope}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ============================================================
                SECTION 6: MILESTONE TRACKER (Directive 25)
                ============================================================ */}
            {project.keyMilestones && project.keyMilestones.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Execution Milestones
                </span>
                <div className="space-y-2 border-l border-slate-200 dark:border-white/15 ml-2 pl-3.5">
                  {project.keyMilestones.map((m, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span
                        className={cn(
                          "absolute -left-[19px] top-1 h-2 w-2 rounded-full border-2 border-white dark:border-slate-900",
                          m.status === "ACHIEVED"
                            ? "bg-emerald-500 dark:bg-emerald-400"
                            : m.status === "IN_PROGRESS"
                            ? "bg-[#0284C7] dark:bg-[#00E5FF] animate-pulse"
                            : "bg-slate-400 dark:bg-slate-500"
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200 font-sans">{m.title}</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                          {m.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================
                SECTION 7: LEAD PROJECT MANAGER (Directive 26)
                ============================================================ */}
            {project.leadPM && project.leadPM.name && (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 space-y-2 shadow-2xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-[#0284C7] dark:text-[#00E5FF]" />
                    Lead Project Manager
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">SCIC Executive</span>
                </span>

                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-white/15 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {project.leadPM.avatarUrl ? (
                      <Image
                        src={project.leadPM.avatarUrl}
                        alt={project.leadPM.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                        {project.leadPM.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">
                      {project.leadPM.name}
                    </h4>
                    <p className="text-[11px] text-[#0284C7] dark:text-[#00E5FF] truncate font-medium">{project.leadPM.role}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{project.leadPM.division}</p>
                  </div>
                </div>

                {project.leadPM.contactEmail && (
                  <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-200/60 dark:border-white/5">
                    <span className="text-slate-500 dark:text-slate-400 truncate text-[10px] font-mono">
                      {project.leadPM.contactEmail}
                    </span>
                    <button
                      onClick={() => project.leadPM?.contactEmail && handleCopyEmail(project.leadPM.contactEmail)}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      {copiedEmail ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedEmail ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================
                SECTION 8: ACTION FOOTER (Directives 34 & 35)
                ============================================================ */}
            <div className="pt-1 space-y-2">
              {/* Specialized deep link for Tumauini HEPP digital twin */}
              {(project.id === "scic-thepp-isabela" || project.code === "SCIC-HEPP-01") && (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-medium text-xs transition-colors shadow-2xs group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">Launch THEPP Digital Twin & Construction Operations Hub</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}

              {/* Site Weather Radar */}
              <Link
                href={`/dashboard/weather/philippines?lat=${project.coordinates.lat}&lng=${project.coordinates.lng}`}
                className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-800 dark:text-sky-300 font-medium text-xs transition-colors shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <CloudLightning className="h-4 w-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                  <span>Launch Live Weather Radar for this Site</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* ============================================================
          SECTION 9: LIGHTBOX MODAL (Directives 12 & 41)
          Full-screen overlay, keyboard accessibility (ArrowLeft, ArrowRight, Esc),
          counter, close button, and focus trap.
          ============================================================ */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={`Image Lightbox: ${project.name}`}
            aria-modal="true"
            onKeyDown={handleLightboxKeyDown}
            tabIndex={0}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 outline-none select-none"
          >
            {/* Top Lightbox Bar */}
            <div className="flex items-center justify-between w-full max-w-5xl mx-auto text-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  {project.name}
                </span>
                {galleryImages.length > 1 && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-[#00E5FF]">
                    {activeGalleryIndex + 1} / {galleryImages.length}
                  </span>
                )}
              </div>

              <button
                ref={lightboxCloseRef}
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close image lightbox (Escape)"
                title="Close (Escape)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Centered High-Resolution Photo */}
            <div className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center my-3">
              {activePhotoUrl && (
                <div className="relative w-full h-full max-h-[78vh]">
                  <Image
                    src={activePhotoUrl}
                    alt={`${project.name} photo ${activeGalleryIndex + 1}`}
                    fill
                    priority
                    unoptimized={activePhotoUrl.startsWith("http")}
                    className="object-contain"
                    sizes="90vw"
                  />
                </div>
              )}

              {/* Prev / Next Navigation Controls */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGalleryIndex((prev) =>
                        prev === 0 ? galleryImages.length - 1 : prev - 1
                      );
                    }}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Previous image (ArrowLeft)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGalleryIndex((prev) =>
                        prev === galleryImages.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Next image (ArrowRight)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Lightbox Controls / Thumbnail Indicators */}
            <div className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Press Escape to exit &bull; Arrow keys to navigate</span>
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveGalleryIndex(i)}
                      className={cn(
                        "h-2 rounded-full transition-all cursor-pointer",
                        activeGalleryIndex === i
                          ? "w-6 bg-[#00E5FF]"
                          : "w-2 bg-white/20 hover:bg-white/40"
                      )}
                      aria-label={`Jump to photo ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

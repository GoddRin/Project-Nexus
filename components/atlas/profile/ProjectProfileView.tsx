"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Compass,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Layers,
  Sparkles,
  Zap,
  HardHat,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Mail,
  ChevronRight,
  FileText,
  Wrench,
  Truck,
  Activity,
  AlertTriangle,
  Camera,
  Maximize2,
  X,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { DetailedProjectProfileDTO } from "@/lib/services/projectProfileService";
import { convertDtoToScicProject } from "@/lib/data/scicProjectAdapter";
import { ProjectTimeline } from "@/components/atlas/ProjectTimeline";
import {
  toCanonicalCategory,
  CATEGORY_ICON_REGISTRY,
} from "@/components/atlas/AtlasMarkerIcons";
import { ATLAS_STATUSES } from "@/components/atlas/AtlasTokens";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProjectProfileViewProps {
  profile: DetailedProjectProfileDTO;
}

export function ProjectProfileView({ profile }: ProjectProfileViewProps) {
  const router = useRouter();
  const { project, operational, verifiedGeometry } = profile;

  // Convert to SCICProject shape for the ProjectTimeline component
  const scicProject = useMemo(() => convertDtoToScicProject(project), [project]);

  // Visual categorization and status styling
  const canonicalCat = toCanonicalCategory(
    project.category,
    project.name,
    project.description || undefined
  );
  const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];
  const status = ATLAS_STATUSES[project.status] || ATLAS_STATUSES.ONGOING;

  // Local interactive UI state
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Gallery images collection
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (project.featuredImage && project.featuredImage.trim()) {
      list.push(project.featuredImage.trim());
    }
    if (Array.isArray(project.gallery)) {
      for (const img of project.gallery) {
        if (img && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }
    return list;
  }, [project.featuredImage, project.gallery]);

  const activePhoto = allImages[activeGalleryIndex] || project.featuredImage || "/logo.png";

  const handleCopyCoords = () => {
    if (project.latitude && project.longitude) {
      navigator.clipboard.writeText(`${project.latitude}, ${project.longitude}`);
      setCopiedCoords(true);
      toast.success("Coordinates copied to clipboard", {
        description: `${project.latitude.toFixed(6)}, ${project.longitude.toFixed(6)} (WGS84)`,
      });
      setTimeout(() => setCopiedCoords(false), 2500);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(project.id);
    setCopiedId(true);
    toast.success("Canonical Project ID copied", {
      description: project.id,
    });
    setTimeout(() => setCopiedId(false), 2500);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${project.name} ${project.municipality} ${project.province}`
  )}`;

  return (
    <div className="min-h-full space-y-6 pb-16">
      {/* ============================================================
          TOP BREADCRUMB NAVIGATION & QUICK ACTIONS
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Link
            href="/dashboard/projects-map"
            className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-[#00E5FF] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Project Atlas</span>
          </Link>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-300">
            {project.islandGroup}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-xs">
            {project.province}
          </span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <span className="text-[#0284C7] dark:text-[#00E5FF] font-semibold truncate max-w-[200px]">
            {project.projectCode || project.slug}
          </span>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Explore on Map */}
          <Link
            href={`/dashboard/projects-map?select=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs"
          >
            <Compass className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
            <span>Explore on Map</span>
          </Link>

          {/* Site Weather */}
          <Link
            href={operational.operationalRoutes.weather || `/dashboard/weather?project=${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs"
          >
            <Activity className="h-3.5 w-3.5 text-amber-500" />
            <span>Site Weather</span>
          </Link>

          {/* Nexus Operational Context CTA (Prominent if active) */}
          {operational.hasNexusOperations ? (
            <Link
              href={operational.operationalRoutes.dashboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0284C7] hover:from-emerald-500 hover:to-[#0369a1] text-white text-xs font-mono font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-200" />
              <span>Open Nexus Operations</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-400 dark:text-slate-500 cursor-default"
              title="Site operations module is not provisioned for this facility"
            >
              <span>Ops Inactive</span>
            </span>
          )}
        </div>
      </div>

      {/* ============================================================
          PROJECT HEADER & IDENTITY BANNER
          ============================================================ */}
      <div className="relative p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#08121E]/90 border border-slate-200/90 dark:border-white/10 backdrop-blur-md overflow-hidden shadow-sm">
        {/* Top Discipline Accent Bar */}
        <div
          className="absolute top-0 inset-x-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${catConfig.color}, #0284C7, transparent)`,
          }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Badges: Category, Status, Island/Region */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${catConfig.color}15`,
                  borderColor: `${catConfig.color}35`,
                  color: catConfig.color,
                }}
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 64 64"
                  style={{ fill: catConfig.color }}
                  dangerouslySetInnerHTML={{ __html: catConfig.svgInnerPath }}
                />
                <span>{catConfig.shortLabel}</span>
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
                  status.bgClass,
                  status.textClass,
                  status.borderClass
                )}
              >
                {status.hasPulse ? (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                )}
                <span>{status.label}</span>
              </span>

              {project.projectCode && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {project.projectCode}
                </span>
              )}

              {project.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>SCIC FLAGSHIP</span>
                </span>
              )}
            </div>

            {/* Project Name */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h1>

            {/* Geographical Hierarchy Line */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
              <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>
                {project.barangay ? `${project.barangay}, ` : ""}
                {project.municipality}, {project.province}
              </span>
              <span>&bull;</span>
              <span>{project.region}</span>
              <span>&bull;</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5 text-[9px] uppercase font-bold text-slate-600 dark:text-slate-300">
                {project.islandGroup}
              </span>
            </div>
          </div>

          {/* Canonical ID & Metadata Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-white/5">
            <div
              onClick={handleCopyId}
              title="Click to copy canonical Project.id"
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-[#0284C7]/50 transition-colors cursor-pointer"
            >
              <span className="text-[10px] font-mono text-slate-400">ID:</span>
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                {project.id}
              </span>
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN TWO-COLUMN WORKSPACE:
          LEFT: Project Information & Timeline
          RIGHT: Operational Context & Quick Geographic Telemetry
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ============================================================
            LEFT COLUMN (2 COLS): PROJECT INFORMATION (Atlas)
            ============================================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Executive Overview */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
              <Building className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                Project Overview & Executive Summary
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
              {project.description ||
                "A major engineering and infrastructure development by Sta. Clara International Corporation, executed according to stringent national civil, hydrological, and structural standards."}
            </p>

            {/* Client & Contractor Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Project Owner / Client
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {project.client || "Sta. Clara International Corporation"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  General Contractor / EPC
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  Sta. Clara International Corporation (AAAA)
                </span>
              </div>
            </div>
          </div>

          {/* 2. Engineering Scope */}
          {project.engineeringScope && project.engineeringScope.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                <Wrench className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Verified Engineering & Construction Scope
                </h2>
              </div>

              <ul className="grid grid-cols-1 gap-2.5">
                {project.engineeringScope.map((scope, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-sans">{scope}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Reusable Phase 12 Interactive Timeline */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Project Execution Timeline & Milestones
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Phase 12 Unified Architecture
              </span>
            </div>

            <ProjectTimeline project={scicProject} />
          </div>

          {/* 4. Media & Field Photography Gallery */}
          {allImages.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                    Site Photography & Engineering Media
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {allImages.length} {allImages.length === 1 ? "Photo" : "Photos"}
                </span>
              </div>

              {/* Lead Image Display */}
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="relative aspect-video sm:aspect-21/9 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group cursor-pointer bg-slate-950"
              >
                <img
                  src={activePhoto}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-4">
                  <span className="text-xs font-mono text-white/90 truncate">
                    {project.name} &bull; Site Photo {activeGalleryIndex + 1}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/80">
                    <Maximize2 className="h-3 w-3" />
                    <span>Enlarge</span>
                  </div>
                </div>
              </div>

              {/* Gallery Thumbnails */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveGalleryIndex(idx)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer bg-slate-950",
                        activeGalleryIndex === idx
                          ? "border-[#0284C7] ring-2 ring-[#0284C7]/50"
                          : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================
            RIGHT COLUMN (1 COL): OPERATIONAL BOUNDARY & GEOGRAPHY
            ============================================================ */}
        <div className="space-y-6">
          {/* 1. NEXUS OPERATIONAL INTEGRATION BOUNDARY (Section 4, 10, 11) */}
          <div
            className={cn(
              "p-5 rounded-2xl border transition-all shadow-sm",
              operational.hasNexusOperations
                ? "bg-emerald-50/50 dark:bg-[#071F17]/40 border-emerald-500/30 dark:border-emerald-500/30"
                : "bg-slate-50 dark:bg-[#0B1522] border-slate-200 dark:border-white/10"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Radio
                  className={cn(
                    "h-4 w-4",
                    operational.hasNexusOperations
                      ? "text-emerald-500 animate-pulse"
                      : "text-slate-400"
                  )}
                />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Nexus Operational Boundary
                </h3>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase",
                  operational.hasNexusOperations
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                )}
              >
                {operational.hasNexusOperations ? "ONLINE" : "NOT PROVISIONED"}
              </span>
            </div>

            {/* Body */}
            {operational.hasNexusOperations ? (
              <div className="space-y-4 pt-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  This facility has an active <strong>Project Nexus Operational Workspace</strong> linked through immutable identity <code className="text-[10px] font-mono bg-white dark:bg-black/30 px-1 py-0.5 rounded border border-emerald-500/20">{project.id}</code>.
                </p>

                {/* Operational Telemetry Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Tickets */}
                  <Link
                    href={operational.operationalRoutes.tickets || "/dashboard/tickets"}
                    className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-mono uppercase">
                      <span>Tickets</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {operational.activeTicketsCount}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {operational.openTicketsCount} Open / Active
                    </span>
                  </Link>

                  {/* Equipment */}
                  <Link
                    href={operational.operationalRoutes.equipment || "/dashboard/equipment"}
                    className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-mono uppercase">
                      <span>Equipment</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-base font-bold font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                      {operational.equipmentCount}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      Plant Units & Heavy Fleet
                    </span>
                  </Link>

                  {/* Daily Logs */}
                  <Link
                    href={operational.operationalRoutes.dailyLogs || "/dashboard/daily-logs"}
                    className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-mono uppercase">
                      <span>Daily Logs</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-base font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                      {operational.dailyLogsCount}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      Supervisor Field Logs
                    </span>
                  </Link>

                  {/* Assets */}
                  <Link
                    href={operational.operationalRoutes.assets || "/dashboard/assets"}
                    className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] font-mono uppercase">
                      <span>Assets</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {operational.assetsCount}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      Registered Fixed Assets
                    </span>
                  </Link>
                </div>

                {/* Operations Launch Links */}
                <div className="pt-2 space-y-2">
                  <Link
                    href={operational.operationalRoutes.dashboard}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Enter Site Operations Center</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={operational.operationalRoutes.sitemap || "/dashboard/sitemap"}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Site Map (2D)
                    </Link>
                    <Link
                      href={operational.operationalRoutes.digitalTwin || "/dashboard/digital-twin"}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Digital Twin (3D)
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  This facility is monitored at the <strong>National Portfolio level</strong> in Project Atlas. On-site operational dispatch (daily shift logs, heavy equipment telematics, and ticket resolution) is currently unprovisioned.
                </p>
                <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0284C7]" />
                    <span>Atlas Geographic Oversight Active</span>
                  </div>
                  <p className="text-[10px]">
                    Project status, location boundaries, and executive KPIs are updated regularly by the SCIC Atlas Administration Team.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. GEOGRAPHIC CONTEXT & COORDINATES */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Geographic Location
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                WGS84 Datum
              </span>
            </div>

            {/* Coordinates Display */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Geodetic Fix
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="flex items-center gap-1 text-[10px] font-mono text-[#0284C7] dark:text-[#00E5FF] hover:underline cursor-pointer"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {project.latitude.toFixed(6)}° N, {project.longitude.toFixed(6)}° E
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-200/50 dark:border-white/5">
                <span>Elevation datum: NAMRIA / GLO-30</span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>

            {/* Administrative Hierarchy Details */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-400">Island Group</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {project.islandGroup}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-400">Region</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">
                  {project.region}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-400">Province</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {project.province}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-400">Municipality</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {project.municipality}
                </span>
              </div>
              {project.barangay && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Barangay</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {project.barangay}
                  </span>
                </div>
              )}
            </div>

            {/* Verified Footprint Status */}
            {verifiedGeometry && (
              <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-bold font-mono">
                  <Layers className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#00E5FF]" />
                  <span>Verified Cadastral Boundary</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                  {verifiedGeometry.metadata.notes ||
                    "Official engineering boundary registered in Project Atlas."}
                </p>
                <Link
                  href={`/dashboard/projects-map?select=${project.id}`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#0284C7] dark:text-[#00E5FF] hover:underline pt-1"
                >
                  <span>Inspect Footprint in GIS Atlas</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* 3. VERIFIED KEY METRICS */}
          {Boolean(
            project.capacity ||
              project.projectValue ||
              project.metrics?.safeManHours ||
              project.metrics?.workforcePeak ||
              project.metrics?.generationOutput
          ) && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                    Verified Key Metrics
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Sta. Clara KPI
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                {project.capacity && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Target Capacity</span>
                    <span className="font-bold text-[#0284C7] dark:text-[#00E5FF]">
                      {project.capacity}
                    </span>
                  </div>
                )}

                {project.projectValue && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Contract Value</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {project.projectValue}
                    </span>
                  </div>
                )}

                {project.metrics?.safeManHours && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Safe Man-Hours</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {project.metrics.safeManHours}
                    </span>
                  </div>
                )}

                {project.metrics?.workforcePeak && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Workforce Peak</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {project.metrics.workforcePeak} personnel
                    </span>
                  </div>
                )}

                {project.metrics?.generationOutput && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Annual Generation</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {project.metrics.generationOutput}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. LEAD PROJECT MANAGER CARD */}
          {project.leadPMName && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#08121E] border border-slate-200 dark:border-white/10 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                <User className="h-4 w-4 text-[#0284C7] dark:text-[#00E5FF]" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white">
                  Lead Project Manager
                </h3>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/20 flex items-center justify-center text-[#0284C7] dark:text-[#00E5FF] font-bold text-sm shrink-0">
                  {project.leadPMName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {project.leadPMName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {project.leadPMRole || "Project Manager"}
                  </div>
                  {project.leadPMDivision && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {project.leadPMDivision}
                    </div>
                  )}
                  {project.leadPMContact && (
                    <a
                      href={`mailto:${project.leadPMContact}`}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0284C7] hover:underline mt-1.5"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{project.leadPMContact}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          PHOTO LIGHTBOX MODAL
          ============================================================ */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePhoto}
              alt=""
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
            <div className="mt-3 text-center text-xs font-mono text-slate-300">
              {project.name} &bull; Image {activeGalleryIndex + 1} of {allImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

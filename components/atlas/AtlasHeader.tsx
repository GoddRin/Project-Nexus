"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Moon, Sun, Globe, Settings } from "lucide-react";
import { AtlasBaseStyle } from "./AtlasMapContext";
import { cn } from "@/lib/utils";

interface AtlasHeaderProps {
  totalProjects: number;
  totalOngoing: number;
  renewableCapacityMw: number;
  tunnelLengthKm: number;
  waterCapacityMld: number;
  currentStyle: AtlasBaseStyle;
  onStyleChange: (style: AtlasBaseStyle) => void;
  className?: string;
}

export function AtlasHeader({
  totalProjects,
  totalOngoing,
  renewableCapacityMw,
  tunnelLengthKm,
  waterCapacityMld,
  currentStyle,
  onStyleChange,
  className,
}: AtlasHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#0B1726] border border-slate-200 dark:border-white/10 shadow-sm transition-colors",
        className
      )}
    >
      {/* Brand & Primary Title */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#08121E] p-1.5 border border-slate-200 dark:border-white/15 overflow-hidden transition-colors">
          <Image
            src="/logo-dark.png"
            alt="Sta. Clara International Corporation"
            width={36}
            height={36}
            className="h-full w-full object-contain"
            priority
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white uppercase transition-colors">
              STA. CLARA PROJECT ATLAS
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE WEBGL GIS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans tracking-normal transition-colors">
            Explore our projects across the Philippines.
          </p>
        </div>
      </div>

      {/* KPI Metrics Strip (Desktop) */}
      <div className="hidden xl:flex items-center gap-4 px-4 py-1.5 rounded-lg bg-slate-50 dark:bg-[#08121E]/80 border border-slate-200 dark:border-white/10 font-mono text-xs transition-colors">
        <div className="text-left">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Portfolio</span>
          <span className="font-bold text-slate-900 dark:text-white text-xs">{totalProjects} Projects</span>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div className="text-left">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Active Works</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{totalOngoing} Ongoing</span>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div className="text-left">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Clean Energy</span>
          <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">~{renewableCapacityMw.toLocaleString()} MW</span>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div className="text-left">
          <span className="text-[10px] text-pink-600 dark:text-pink-400 uppercase tracking-wider block">Tunneling</span>
          <span className="font-bold text-pink-600 dark:text-pink-400 text-xs">~{tunnelLengthKm.toLocaleString()} km</span>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
        <div className="text-left">
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Water Utilities</span>
          <span className="font-bold text-cyan-600 dark:text-cyan-400 text-xs">~{waterCapacityMld.toLocaleString()} MLD</span>
        </div>
      </div>

      {/* Actions: Switch to Local Map & Base Style Switcher */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Style Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#08121E] border border-slate-200 dark:border-white/10 transition-colors">
          <button
            onClick={() => onStyleChange("DARK")}
            title="Dark Engineering Carto"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
              currentStyle === "DARK"
                ? "bg-[#0284C7] text-white font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Moon className="h-3 w-3" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => onStyleChange("LIGHT")}
            title="Corporate Light Carto"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
              currentStyle === "LIGHT"
                ? "bg-[#0284C7] text-white font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Sun className="h-3 w-3" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            onClick={() => onStyleChange("SATELLITE")}
            title="Satellite Hybrid"
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
              currentStyle === "SATELLITE"
                ? "bg-[#0284C7] text-white font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Globe className="h-3 w-3" />
            <span className="hidden sm:inline">Sat</span>
          </button>
        </div>

        {/* Local Map Link */}
        <Link
          href="/dashboard/regional-map"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#08121E] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
        >
          <MapPin className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
          <span className="hidden md:inline">Tumauini HEPP Local Map</span>
          <span className="md:hidden">Local Map</span>
        </Link>

        {/* Project Admin Workspace Link */}
        <Link
          href="/dashboard/projects-admin"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors shadow-xs"
          title="Project Atlas Administration Workspace"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Administer</span>
        </Link>
      </div>
    </header>
  );
}

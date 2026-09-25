"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  ChevronDown,
  Check,
  Globe,
  Sun,
  Moon,
  Building2,
  MapPin,
  Compass,
  Eye,
  EyeOff,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtlasBaseStyle } from "./AtlasMapContext";

export interface AtlasLayerControlProps {
  currentStyle: AtlasBaseStyle;
  onStyleChange: (style: AtlasBaseStyle) => void;
  activeGisLayers: Set<string>;
  onToggleGisLayer: (layerId: string) => void;
  className?: string;
}

export function AtlasLayerControl({
  currentStyle,
  onStyleChange,
  activeGisLayers,
  onToggleGisLayer,
  className,
}: AtlasLayerControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeCount = activeGisLayers.size;

  return (
    <div ref={containerRef} className={cn("relative z-20", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border transition-all duration-200 text-xs font-medium cursor-pointer shadow-lg",
          isOpen
            ? "bg-[#0284C7]/20 border-[#0284C7] dark:border-[#38BDF8]/60 text-[#0284C7] dark:text-white shadow-sky-500/10"
            : "bg-white/90 hover:bg-slate-100 dark:bg-[#0B1726]/90 dark:hover:bg-[#0F2238] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200"
        )}
        title="GIS Map Layer Control"
        aria-label="Toggle map layers panel"
      >
        <Layers className="h-4 w-4 text-[#0284C7] dark:text-[#38BDF8]" />
        <span className="font-mono text-[11px] font-semibold tracking-wide uppercase">
          Layers
        </span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#0284C7] text-[9px] font-mono font-bold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-slate-500 dark:text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-[#0284C7] dark:text-sky-400"
          )}
        />
      </button>

      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          data-testid="atlas-layer-control-panel"
          className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-white/95 dark:bg-[#081321]/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800 dark:text-slate-200 text-xs font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300 font-semibold text-[11px] tracking-wide uppercase font-mono">
              <Layers className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
              <span>Map Layer Control</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {activeCount} Active
            </span>
          </div>

          {/* Section 1: Basemap Selector */}
          <div className="mb-3">
            <span className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Basemap
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => onStyleChange("DARK")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-mono transition-all cursor-pointer",
                  currentStyle === "DARK"
                    ? "bg-[#0284C7] text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5"
                )}
              >
                <Moon className="h-3 w-3" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => onStyleChange("LIGHT")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-mono transition-all cursor-pointer",
                  currentStyle === "LIGHT"
                    ? "bg-[#0284C7] text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5"
                )}
              >
                <Sun className="h-3 w-3" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => onStyleChange("SATELLITE")}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-mono transition-all cursor-pointer",
                  currentStyle === "SATELLITE"
                    ? "bg-[#0284C7] text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5"
                )}
              >
                <Globe className="h-3 w-3" />
                <span>Satellite</span>
              </button>
            </div>
          </div>

          {/* Section 2: Data Layers */}
          <div>
            <span className="block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Data Layers
            </span>
            <div className="space-y-1">
              {/* Layer: Projects (Core) */}
              <label
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeGisLayers.has("projects")
                    ? "bg-[#0284C7]/10 dark:bg-[#0284C7]/15 border-[#0284C7]/30 dark:border-[#0284C7]/40 text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                      activeGisLayers.has("projects")
                        ? "bg-[#0284C7] border-[#0284C7] dark:border-[#38BDF8] text-white"
                        : "border-slate-400 dark:border-slate-500 bg-transparent"
                    )}
                  >
                    {activeGisLayers.has("projects") && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </span>
                  <div>
                    <span className="block text-[11px] font-medium leading-none">
                      Projects & Clusters
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Core Markers (53 Projects)
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activeGisLayers.has("projects")}
                  onChange={() => onToggleGisLayer("projects")}
                />
              </label>

              {/* Layer: Administrative Boundaries */}
              <label
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeGisLayers.has("admin-boundaries")
                    ? "bg-[#0284C7]/10 dark:bg-[#0284C7]/15 border-[#0284C7]/30 dark:border-[#0284C7]/40 text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                      activeGisLayers.has("admin-boundaries")
                        ? "bg-[#0284C7] border-[#0284C7] dark:border-[#38BDF8] text-white"
                        : "border-slate-400 dark:border-slate-500 bg-transparent"
                    )}
                  >
                    {activeGisLayers.has("admin-boundaries") && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </span>
                  <div>
                    <span className="block text-[11px] font-medium leading-none">
                      Administrative Boundaries
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Municipal & Provincial Borders
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activeGisLayers.has("admin-boundaries")}
                  onChange={() => onToggleGisLayer("admin-boundaries")}
                />
              </label>

              {/* Layer: Project Footprints */}
              <label
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeGisLayers.has("project-footprints")
                    ? "bg-[#0284C7]/10 dark:bg-[#0284C7]/15 border-[#0284C7]/30 dark:border-[#0284C7]/40 text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                      activeGisLayers.has("project-footprints")
                        ? "bg-[#0284C7] border-[#0284C7] dark:border-[#38BDF8] text-white"
                        : "border-slate-400 dark:border-slate-500 bg-transparent"
                    )}
                  >
                    {activeGisLayers.has("project-footprints") && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </span>
                  <div>
                    <span className="block text-[11px] font-medium leading-none">
                      Project Footprints
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Verified Engineering Bounds
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activeGisLayers.has("project-footprints")}
                  onChange={() => onToggleGisLayer("project-footprints")}
                />
              </label>

              {/* Layer: Infrastructure Context */}
              <label
                className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeGisLayers.has("infrastructure-context")
                    ? "bg-[#0284C7]/10 dark:bg-[#0284C7]/15 border-[#0284C7]/30 dark:border-[#0284C7]/40 text-slate-900 dark:text-slate-100"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                      activeGisLayers.has("infrastructure-context")
                        ? "bg-[#0284C7] border-[#0284C7] dark:border-[#38BDF8] text-white"
                        : "border-slate-400 dark:border-slate-500 bg-transparent"
                    )}
                  >
                    {activeGisLayers.has("infrastructure-context") && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </span>
                  <div>
                    <span className="block text-[11px] font-medium leading-none">
                      Infrastructure Context
                    </span>
                    <span className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      Road Network & Major Rivers
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activeGisLayers.has("infrastructure-context")}
                  onChange={() => onToggleGisLayer("infrastructure-context")}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

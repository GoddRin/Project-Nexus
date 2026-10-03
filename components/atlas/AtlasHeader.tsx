"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import Link from "next/link";
import { MapPin, Moon, Sun, Globe, Settings, ChevronDown, Check, Presentation } from "lucide-react";
import BroadcastSatelliteIcon from "@/components/weather/icons/BroadcastSatelliteIcon";
import { AtlasBaseStyle } from "./AtlasMapContext";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/shared/CountUp";

interface AtlasHeaderProps {
  totalProjects: number;
  totalOngoing: number;
  renewableCapacityMw: number;
  tunnelLengthKm: number;
  waterCapacityMld: number;
  currentStyle: AtlasBaseStyle;
  onStyleChange: (style: AtlasBaseStyle) => void;
  onOpenNews?: () => void;
  /** Presentation / focus mode: hides the side panels and this header */
  onEnterFocusMode?: () => void;
  /** 0..1 while a guided tour runs: fills the "Renew Your Energy" line along the header */
  tourProgress?: number | null;
  className?: string;
}

const STYLE_OPTIONS: Array<{ id: AtlasBaseStyle; label: string; hint: string; Icon: typeof Moon }> = [
  { id: "DARK", label: "Dark", hint: "Dark engineering map", Icon: Moon },
  { id: "LIGHT", label: "Light", hint: "Corporate light map", Icon: Sun },
  { id: "SATELLITE", label: "Satellite", hint: "Satellite hybrid", Icon: Globe },
];

/** One KPI on the single-line strip: value first, quiet label after. */
function Kpi({
  value,
  label,
  tone,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  label: string;
  tone: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} className={cn("text-[13px] font-semibold", tone)} />
      <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

export function AtlasHeader({
  totalProjects,
  totalOngoing,
  renewableCapacityMw,
  tunnelLengthKm,
  waterCapacityMld,
  currentStyle,
  onStyleChange,
  onOpenNews,
  onEnterFocusMode,
  tourProgress = null,
  className,
}: AtlasHeaderProps) {
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = STYLE_OPTIONS.find((o) => o.id === currentStyle) ?? STYLE_OPTIONS[0];

  useEffect(() => {
    if (!styleMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setStyleMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStyleMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [styleMenuOpen]);

  const actionBtn =
    "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap";

  return (
    <header
      className={cn(
        "relative flex items-center justify-between gap-4 h-12 px-3 rounded-xl bg-white dark:bg-atlas-panel border border-slate-200 dark:border-white/10 shadow-sm transition-colors shrink-0",
        className
      )}
    >
      {tourProgress !== null && (
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full" aria-hidden>
          <div className="energy-line" style={{ width: `${Math.max(2, Math.min(100, tourProgress * 100))}%` }} />
        </div>
      )}
      {/* Brand: official Sta. Clara wordmark (green on light, reversed white on dark) */}
      <div className="flex items-center gap-3 min-w-0">
        <BrandLogo variant="wordmark" height={22} priority />
        <span className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/10" />
        <h1 className="hidden sm:block text-[15px] font-semibold font-display text-slate-900 dark:text-white truncate">
          Project Atlas
        </h1>
        <span
          className="hidden md:inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
          title="Live map data"
          aria-label="Live map data"
        />
      </div>

      {/* KPI strip: one line, values lead */}
      <div className="hidden lg:flex items-center gap-4 xl:gap-5 font-mono min-w-0 overflow-hidden">
        <Kpi value={totalProjects} label="Projects" tone="text-slate-900 dark:text-white" />
        <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
        <Kpi value={totalOngoing} label="Ongoing" tone="text-emerald-600 dark:text-emerald-400" />
        <span className="h-4 w-px bg-slate-200 dark:bg-white/10" />
        <Kpi value={renewableCapacityMw} prefix="~" suffix=" MW" decimals={renewableCapacityMw % 1 ? 1 : 0} label="Clean energy" tone="text-sky-600 dark:text-sky-400" />
        <span className="hidden xl:block h-4 w-px bg-slate-200 dark:bg-white/10" />
        <div className="hidden xl:block">
          <Kpi value={tunnelLengthKm} prefix="~" suffix=" km" decimals={tunnelLengthKm % 1 ? 1 : 0} label="Tunneling" tone="text-pink-600 dark:text-pink-400" />
        </div>
        <span className="hidden 2xl:block h-4 w-px bg-slate-200 dark:bg-white/10" />
        <div className="hidden 2xl:block">
          <Kpi value={waterCapacityMld} prefix="~" suffix=" MLD" label="Water" tone="text-cyan-600 dark:text-cyan-400" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Map style menu (was three always-visible buttons) */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setStyleMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={styleMenuOpen}
            title="Map style"
            className={cn(
              actionBtn,
              "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-atlas-sunken text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
            )}
          >
            <active.Icon className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden sm:inline">{active.label}</span>
            <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", styleMenuOpen && "rotate-180")} />
          </button>
          {styleMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-[60] w-48 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-atlas-panel shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {STYLE_OPTIONS.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={currentStyle === id}
                  onClick={() => {
                    onStyleChange(id);
                    setStyleMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer",
                    currentStyle === id
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">
                    <span className="block font-medium">{label}</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">{hint}</span>
                  </span>
                  {currentStyle === id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/regional-map"
          title="Tumauini HEPP local map"
          className={cn(
            actionBtn,
            "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-atlas-sunken text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
          )}
        >
          <MapPin className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          <span className="hidden xl:inline">Local map</span>
        </Link>

        {onOpenNews && (
          <button
            type="button"
            onClick={onOpenNews}
            title="Philippine weather & satellite radar briefing"
            className={cn(actionBtn, "border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 group")}
          >
            <BroadcastSatelliteIcon size={15} animated={true} className="group-hover:scale-110 transition-transform" />
            <span className="hidden xl:inline">Weather desk</span>
          </button>
        )}

        <Link
          href="/dashboard/projects-admin"
          title="Project Atlas administration"
          className={cn(actionBtn, "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400")}
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Administer</span>
        </Link>

        {onEnterFocusMode && (
          <button
            type="button"
            onClick={onEnterFocusMode}
            title="Focus mode: hide the panels for presenting (Esc to exit)"
            aria-label="Enter focus mode"
            className={cn(
              actionBtn,
              "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-atlas-sunken text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
            )}
          >
            <Presentation className="h-3.5 w-3.5" />
            <span className="hidden 2xl:inline">Focus</span>
          </button>
        )}
      </div>
    </header>
  );
}

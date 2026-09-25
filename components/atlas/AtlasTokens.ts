/**
 * ============================================================
 * AtlasTokens.ts
 * Sta. Clara Project Atlas — Corporate Engineering Design Tokens
 * ============================================================
 */

import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategoryId,
  ProjectStatusId,
} from "@/lib/validations/projectAtlasSchema";
import { ProjectSector, ProjectStatus, IslandGroup } from "@/lib/data/scicProjectsData";
import { AtlasIslandPreset } from "./AtlasMapContext";

export interface CategoryVisualToken {
  id: string;
  label: string;
  shortLabel: string;
  code: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
}

// Canonical Phase 2 Categories mapped to visual tokens
export const ATLAS_CATEGORIES: Record<ProjectCategoryId, CategoryVisualToken> = {
  HYDROPOWER: {
    id: "HYDROPOWER",
    label: "Hydropower & Renewable Energy",
    shortLabel: "Hydropower",
    code: "HYD",
    color: "#10A51D",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    textClass: "text-emerald-500 dark:text-emerald-400",
    borderClass: "border-emerald-500/30",
    badgeBg: "rgba(16, 165, 29, 0.15)",
  },
  WIND_POWER: {
    id: "WIND_POWER",
    label: "Wind Power & Clean Aerogenerators",
    shortLabel: "Wind Power",
    code: "WND",
    color: "#06B6D4",
    bgClass: "bg-cyan-500/10 dark:bg-cyan-500/15",
    textClass: "text-cyan-500 dark:text-cyan-400",
    borderClass: "border-cyan-500/30",
    badgeBg: "rgba(6, 182, 212, 0.15)",
  },
  WATER_RESOURCES: {
    id: "WATER_RESOURCES",
    label: "Water Utilities, Treatment & Reservoirs",
    shortLabel: "Water Resources",
    code: "WTR",
    color: "#00A3E0",
    bgClass: "bg-sky-500/10 dark:bg-sky-500/15",
    textClass: "text-sky-500 dark:text-sky-400",
    borderClass: "border-sky-500/30",
    badgeBg: "rgba(0, 163, 224, 0.15)",
  },
  ROADS_HIGHWAYS: {
    id: "ROADS_HIGHWAYS",
    label: "Highways, Expressways & Roads",
    shortLabel: "Roads & Highways",
    code: "HWY",
    color: "#F59E0B",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
    textClass: "text-amber-500 dark:text-amber-400",
    borderClass: "border-amber-500/30",
    badgeBg: "rgba(245, 158, 11, 0.15)",
  },
  BRIDGES: {
    id: "BRIDGES",
    label: "Major Bridges & Flyovers",
    shortLabel: "Bridges",
    code: "BRG",
    color: "#EC4899",
    bgClass: "bg-pink-500/10 dark:bg-pink-500/15",
    textClass: "text-pink-500 dark:text-pink-400",
    borderClass: "border-pink-500/30",
    badgeBg: "rgba(236, 72, 153, 0.15)",
  },
  RAIL_TRANSIT: {
    id: "RAIL_TRANSIT",
    label: "Railways & Mass Transit",
    shortLabel: "Rail & Transit",
    code: "RAIL",
    color: "#8B5CF6",
    bgClass: "bg-purple-500/10 dark:bg-purple-500/15",
    textClass: "text-purple-500 dark:text-purple-400",
    borderClass: "border-purple-500/30",
    badgeBg: "rgba(139, 92, 246, 0.15)",
  },
  BUILDINGS: {
    id: "BUILDINGS",
    label: "Commercial & Institutional Buildings",
    shortLabel: "Buildings",
    code: "BLD",
    color: "#6366F1",
    bgClass: "bg-indigo-500/10 dark:bg-indigo-500/15",
    textClass: "text-indigo-500 dark:text-indigo-400",
    borderClass: "border-indigo-500/30",
    badgeBg: "rgba(99, 102, 241, 0.15)",
  },
  INDUSTRIAL: {
    id: "INDUSTRIAL",
    label: "Industrial Facilities & Manufacturing",
    shortLabel: "Industrial",
    code: "IND",
    color: "#14B8A6",
    bgClass: "bg-teal-500/10 dark:bg-teal-500/15",
    textClass: "text-teal-500 dark:text-teal-400",
    borderClass: "border-teal-500/30",
    badgeBg: "rgba(20, 184, 166, 0.15)",
  },
  ENERGY_GRID: {
    id: "ENERGY_GRID",
    label: "Power Generation & Grid Substations",
    shortLabel: "Energy Grid",
    code: "GRID",
    color: "#EAB308",
    bgClass: "bg-yellow-500/10 dark:bg-yellow-500/15",
    textClass: "text-yellow-500 dark:text-yellow-400",
    borderClass: "border-yellow-500/30",
    badgeBg: "rgba(234, 179, 8, 0.15)",
  },
  MINING_TUNNELING: {
    id: "MINING_TUNNELING",
    label: "Mining & Heavy Underground Tunneling",
    shortLabel: "Tunnels & Mining",
    code: "TUN",
    color: "#EF4444",
    bgClass: "bg-rose-500/10 dark:bg-rose-500/15",
    textClass: "text-rose-500 dark:text-rose-400",
    borderClass: "border-rose-500/30",
    badgeBg: "rgba(239, 68, 68, 0.15)",
  },
  OTHER: {
    id: "OTHER",
    label: "Specialized Infrastructure & Heavy Civil",
    shortLabel: "Specialized Civil",
    code: "CIV",
    color: "#64748B",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/15",
    textClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-slate-500/30",
    badgeBg: "rgba(100, 116, 139, 0.15)",
  },
};

// Map legacy sector keys to token for full backward compatibility
export const ATLAS_SECTORS: Record<string, CategoryVisualToken> = {
  ...ATLAS_CATEGORIES,
  WIND_POWER: ATLAS_CATEGORIES.WIND_POWER,
  HYDRO_RENEWABLE: ATLAS_CATEGORIES.HYDROPOWER,
  INFRASTRUCTURE_ROADS: ATLAS_CATEGORIES.ROADS_HIGHWAYS,
  RAILWAYS_TRANSIT: ATLAS_CATEGORIES.RAIL_TRANSIT,
  WATER_DAMS: ATLAS_CATEGORIES.WATER_RESOURCES,
  POWER_GRID: ATLAS_CATEGORIES.ENERGY_GRID,
  BUILDINGS_INDUSTRIAL: ATLAS_CATEGORIES.BUILDINGS,
};

export interface StatusVisualToken {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hasPulse: boolean;
}

export const ATLAS_STATUSES: Record<string, StatusVisualToken> = {
  PLANNING: {
    id: "PLANNING",
    label: "PLANNING",
    color: "#A855F7",
    bgClass: "bg-purple-500/15",
    textClass: "text-purple-400",
    borderClass: "border-purple-500/30",
    hasPulse: false,
  },
  UPCOMING: {
    id: "UPCOMING",
    label: "UPCOMING",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    hasPulse: false,
  },
  ONGOING: {
    id: "ONGOING",
    label: "ACTIVE",
    color: "#10B981",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    hasPulse: true,
  },
  COMPLETED: {
    id: "COMPLETED",
    label: "COMPLETED",
    color: "#0284C7",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-400",
    borderClass: "border-sky-500/30",
    hasPulse: false,
  },
  ON_HOLD: {
    id: "ON_HOLD",
    label: "ON HOLD",
    color: "#64748B",
    bgClass: "bg-slate-500/15",
    textClass: "text-slate-400",
    borderClass: "border-slate-500/30",
    hasPulse: false,
  },
};

export const ATLAS_ISLAND_PRESETS_LIST: { id: AtlasIslandPreset; label: string; flag?: string }[] = [
  { id: "PHILIPPINES", label: "National", flag: "🇵🇭" },
  { id: "LUZON", label: "Luzon" },
  { id: "VISAYAS", label: "Visayas" },
  { id: "MINDANAO", label: "Mindanao" },
  { id: "PALAWAN", label: "Palawan" },
];

export const ATLAS_SURFACES = {
  bgBase: "#08121E",
  bgPanel: "#0B1726",
  bgPanelRaised: "#0F2238",
  border: "rgba(255, 255, 255, 0.10)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accentCyan: "#00E5FF",
  accentBlue: "#0284C7",
};

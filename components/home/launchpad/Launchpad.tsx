"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Box,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  CloudLightning,
  Cpu,
  FileText,
  Globe,
  LayoutDashboard,
  MapPin,
  Package,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAGNET_PX, fadeUp, inView, stagger } from "@/components/home/motionPresets";
import { HomeSection } from "@/components/home/primitives/HomeSection";
import { ATLAS_HREF, COMMAND_CENTER_HREF } from "@/lib/home/links";
import { useMobileNav } from "@/components/shared/MobileNavContext";

type Tone = "green" | "cyan" | "blue" | "amber";
interface Tile {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  /** the first two tiles are larger in Admin 18-tile grid */
  lead?: boolean;
  eyebrow?: string;
}

/** Curated 6-card Showcase Bento for Visitor Mode (Zero back-office clutter) */
const VISITOR_SHOWCASE_TILES: Tile[] = [
  {
    href: ATLAS_HREF,
    eyebrow: "01 / GEOSPATIAL ATLAS",
    label: "National Project Atlas",
    hint: "Explore every SCIC infrastructure project across the Philippines in interactive GIS",
    icon: Globe,
    tone: "green",
  },
  {
    href: "/digital-twin",
    eyebrow: "02 / 3D SIMULATION",
    label: "3D Digital Twin",
    hint: "Inspect the Tumauini HEPP powerhouse, intake weir, and turbine hall in real-time 3D",
    icon: Box,
    tone: "blue",
  },
  {
    href: COMMAND_CENTER_HREF,
    eyebrow: "03 / PLANT TELEMETRY",
    label: "Command & Overview",
    hint: "Live 11.3 MW plant metrics, commissioning milestones, and S-Curve progress",
    icon: LayoutDashboard,
    tone: "cyan",
  },
  {
    href: "/dashboard/sitemap",
    eyebrow: "04 / SITE ZONES",
    label: "Interactive Site Map",
    hint: "2D engineering work areas, civil structures, and field photography across Antagan Uno",
    icon: MapPin,
    tone: "green",
  },
  {
    href: "/dashboard/weather/philippines",
    eyebrow: "05 / METEOROLOGY",
    label: "Weather & Storm Monitor",
    hint: "PAGASA tropical cyclone bulletins, Pinacanauan River head, and site forecasts",
    icon: CloudLightning,
    tone: "cyan",
  },
  {
    href: "/dashboard/assistant",
    eyebrow: "06 / PROJECT INTELLIGENCE",
    label: "Nexus AI Guide",
    hint: "Query technical project records, hydro specifications, and engineering standards",
    icon: Sparkles,
    tone: "amber",
  },
];

/** Full 18-tile module directory for Admin Mode */
const ADMIN_TILES: Tile[] = [
  { href: ATLAS_HREF, label: "National Project Atlas", hint: "Every project on the map", icon: Globe, tone: "green", lead: true },
  { href: COMMAND_CENTER_HREF, label: "Command Center", hint: "The Tumauini site today", icon: LayoutDashboard, tone: "cyan", lead: true },
  { href: "/digital-twin", label: "Digital Twin", hint: "The plant in 3D", icon: Box, tone: "blue" },
  { href: "/dashboard/sitemap", label: "Site Map", hint: "Work areas and photos", icon: MapPin, tone: "green" },
  { href: "/dashboard/progress", label: "Progress", hint: "Readings and milestones", icon: TrendingUp, tone: "green" },
  { href: "/dashboard/reports", label: "Daily Reports", hint: "Accomplishment logs", icon: ClipboardList, tone: "amber" },
  { href: "/dashboard/daily-logs", label: "Safety Logs", hint: "Headcount by zone", icon: ClipboardCheck, tone: "amber" },
  { href: "/dashboard/weather", label: "Weather", hint: "Site forecast and signals", icon: CloudLightning, tone: "cyan" },
  { href: "/dashboard/tickets", label: "Helpdesk", hint: "IT and facilities tickets", icon: Ticket, tone: "cyan" },
  { href: "/dashboard/inventory", label: "Inventory", hint: "Materials and requests", icon: Package, tone: "blue" },
  { href: "/dashboard/equipment", label: "Equipment", hint: "Plant and machinery", icon: Cpu, tone: "blue" },
  { href: "/dashboard/maintenance", label: "Maintenance", hint: "Preventive schedule", icon: Wrench, tone: "amber" },
  { href: "/dashboard/documents", label: "Documents", hint: "The QA/QC vault", icon: FileText, tone: "blue" },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", hint: "SOPs and standards", icon: BookOpen, tone: "green" },
  { href: "/dashboard/visitors", label: "Visitors", hint: "Gate log", icon: Shield, tone: "green" },
  { href: "/dashboard/incidents", label: "Incidents", hint: "Emergency response log", icon: ShieldAlert, tone: "amber" },
  { href: "/dashboard/analytics", label: "Analytics", hint: "Trends across modules", icon: BarChart3, tone: "cyan" },
  { href: "/dashboard/assistant", label: "AI Assistant", hint: "Ask the project records", icon: Sparkles, tone: "amber" },
];

/** how many tiles a phone shows before "Show all" in Admin Mode */
const PHONE_TILES = 6;

const ICON_TONE: Record<Tone, string> = {
  green: "bg-scic-green/10 text-scic-green dark:text-scic-green-bright group-hover:bg-scic-green group-hover:text-white",
  cyan: "bg-scic-cyan/10 text-scic-cyan group-hover:bg-scic-cyan group-hover:text-white",
  blue: "bg-scic-blue/10 text-scic-blue group-hover:bg-scic-blue group-hover:text-white",
  amber: "bg-scic-amber/10 text-scic-amber group-hover:bg-scic-amber group-hover:text-white",
};

function MagneticTile({ tile, tucked }: { tile: Tile; tucked: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });
  const ix = useSpring(x, { stiffness: 200, damping: 14, mass: 0.4 });
  const iy = useSpring(y, { stiffness: 200, damping: 14, mass: 0.4 });

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 2 * MAGNET_PX);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 2 * MAGNET_PX);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };
  const Icon = tile.icon;
  return (
    <motion.div variants={fadeUp} className={cn("min-w-0", tile.lead && "col-span-2", tucked && "max-sm:hidden")}>
      <motion.div style={{ x: sx, y: sy }} className="h-full">
        <Link
          ref={ref}
          href={tile.href}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className={cn(
            "glass-scic-card spotlight group h-full p-4 transition-[border-color,box-shadow] duration-300 hover:border-scic-green/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy",
            tile.lead && "justify-center md:p-5"
          )}
        >
          <span className={cn("flex items-center gap-3", !tile.lead && "flex-col items-start gap-3")}>
            <motion.span
              style={{ x: ix, y: iy }}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                tile.lead ? "h-12 w-12" : "h-10 w-10",
                ICON_TONE[tile.tone]
              )}
            >
              <Icon className={tile.lead ? "h-6 w-6" : "h-5 w-5"} aria-hidden />
            </motion.span>
            <span className="min-w-0">
              <span className={cn("block truncate font-display font-bold tracking-[-0.01em] text-text-primary", tile.lead ? "text-lg" : "text-sm")}>
                {tile.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-text-secondary">{tile.hint}</span>
            </span>
          </span>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/**
 * The Launchpad:
 * - In Visitor Mode: Renders a soothing, balanced 6-card Widescreen Showcase Grid of the core
 *   plant & portfolio systems without internal IT/guard/warehouse module clutter.
 * - In Admin Mode: Renders all 18 operational & back-office modules.
 */
export function Launchpad() {
  const [open, setOpen] = useState(false);
  const { isVisitorMode } = useMobileNav();

  if (isVisitorMode) {
    return (
      <HomeSection
        id="launchpad"
        eyebrow="Interactive Systems"
        title="Explore the plant & portfolio"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VISITOR_SHOWCASE_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="glass-scic-card spotlight group flex flex-col justify-between p-5 transition-all duration-200 hover:border-scic-green/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green-energy"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-scic-green dark:text-scic-green-bright">
                      {tile.eyebrow}
                    </span>
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
                        ICON_TONE[tile.tone]
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold tracking-[-0.01em] text-text-primary group-hover:text-scic-green dark:group-hover:text-scic-green-bright transition-colors">
                    {tile.label}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                    {tile.hint}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs font-semibold text-text-primary group-hover:text-scic-green dark:group-hover:text-scic-green-bright transition-colors">
                  <span>Open Workspace</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </HomeSection>
    );
  }

  return (
    <HomeSection id="launchpad" eyebrow="Launchpad" title="Go to work">
      <motion.div
        id="launchpad-tiles"
        variants={stagger(35)}
        {...inView}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5"
      >
        {ADMIN_TILES.map((tile, i) => (
          <MagneticTile key={tile.href} tile={tile} tucked={!open && i >= PHONE_TILES} />
        ))}
      </motion.div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="launchpad-tiles"
        className="home-chip mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-scic-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scic-green/40 dark:text-scic-green-bright sm:hidden"
      >
        {open ? "Show fewer" : `Show all ${ADMIN_TILES.length}`}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
    </HomeSection>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  LayoutDashboard,
  Box,
  MapPin,
  TrendingUp,
  BarChart3,
  Bot,
  CloudRain,
  Map,
  Plane,
  FileText,
  Shield,
  Droplets,
  FlaskConical,
  Truck,
  Package,
  Users,
  HardHat,
  LifeBuoy,
  Settings,
  Zap,
  Building,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Site Zones" | "Operations" | "Resources";
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  keywords?: string[];
  badge?: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  // Navigation
  {
    id: "nav-dashboard",
    title: "Command & Operations Center",
    subtitle: "Executive KPI dashboard & project status",
    category: "Navigation",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "kpi", "summary"],
  },
  {
    id: "nav-digital-twin",
    title: "3D Digital Twin Simulation",
    subtitle: "Interactive Three.js plant model & real-time telemetry",
    category: "Navigation",
    href: "/digital-twin",
    icon: Box,
    keywords: ["model", "3d", "twin", "plant", "camera", "powerhouse"],
    badge: "3D View",
  },
  {
    id: "nav-sitemap",
    title: "Interactive Site Map",
    subtitle: "Civil zones, GPS telemetry & equipment locator",
    category: "Navigation",
    href: "/dashboard/sitemap",
    icon: MapPin,
    keywords: ["map", "zones", "locations", "pins", "aerial"],
  },
  {
    id: "nav-progress",
    title: "Project Progress & S-Curve",
    subtitle: "Physical accomplishments, milestones & schedule",
    category: "Navigation",
    href: "/dashboard/progress",
    icon: TrendingUp,
    keywords: ["s-curve", "schedule", "milestone", "planned", "actual"],
  },
  {
    id: "nav-analytics",
    title: "Project Analytics & Activity Heatmap",
    subtitle: "Daily intensity heatmap, trends & weather correlation",
    category: "Navigation",
    href: "/dashboard/analytics",
    icon: BarChart3,
    keywords: ["heatmap", "charts", "weather correlation", "stats"],
  },
  {
    id: "nav-assistant",
    title: "AI Co-Pilot & Engineering Assistant",
    subtitle: "Tumauini HEPP autonomous knowledge base & 3D camera fly",
    category: "Navigation",
    href: "/dashboard/assistant",
    icon: Bot,
    keywords: ["chat", "copilot", "ask", "fly camera", "ai", "intelligence"],
    badge: "AI Powered",
  },
  {
    id: "nav-weather",
    title: "Philippine Weather & Typhoon Radar",
    subtitle: "Live JTWC cyclone tracking & PAGASA signals",
    category: "Operations",
    href: "/dashboard/weather/philippines",
    icon: CloudRain,
    keywords: ["rain", "storm", "jtwc", "pagasa", "signal", "typhoon", "forecast"],
    badge: "Live",
  },
  {
    id: "nav-regional-map",
    title: "Regional Geospatial Map",
    subtitle: "Isabela & Cagayan Valley catchment GIS",
    category: "Navigation",
    href: "/dashboard/regional-map",
    icon: Map,
    keywords: ["gis", "isabela", "tumauini", "satellite", "river"],
  },
  {
    id: "nav-drone",
    title: "Drone Imagery & Aerial Surveys",
    subtitle: "Orthomosaic flights, excavation slopes & topographic scans",
    category: "Navigation",
    href: "/dashboard/drone",
    icon: Plane,
    keywords: ["aerial", "photos", "uav", "survey", "inspection"],
  },

  // Operations
  {
    id: "ops-accomplishments",
    title: "Daily Accomplishment Reports",
    subtitle: "Civil works logs, contractor field submittals",
    category: "Operations",
    href: "/dashboard/operations/accomplishments",
    icon: FileText,
    keywords: ["daily", "dpr", "work area", "reports", "submittals"],
  },
  {
    id: "ops-safety",
    title: "Safety & HSE Incident Portal",
    subtitle: "1.42M+ Safe Man-Hours, zero-LTI safety compliance",
    category: "Operations",
    href: "/dashboard/operations/safety",
    icon: Shield,
    keywords: ["lti", "incident", "hazard", "ppe", "safe hours", "toolbox"],
  },
  {
    id: "ops-hydrology",
    title: "Hydrology & River Monitoring",
    subtitle: "Pinacanauan River discharge, head level & flow velocity",
    category: "Operations",
    href: "/dashboard/operations/hydrology",
    icon: Droplets,
    keywords: ["pinacanauan", "discharge", "water level", "river", "flow", "weir"],
  },
  {
    id: "ops-qaqc",
    title: "Concrete QA/QC & Material Lab",
    subtitle: "Compressive strength, slump test & batching plant logs",
    category: "Operations",
    href: "/dashboard/operations/qa-qc",
    icon: FlaskConical,
    keywords: ["compressive", "slump", "lab", "batching", "concrete", "cylinder"],
  },

  // Resources
  {
    id: "res-equipment",
    title: "Heavy Equipment & Plant Fleet",
    subtitle: "Excavators, batching plants, drill rigs & fuel telematics",
    category: "Resources",
    href: "/dashboard/resources/equipment",
    icon: Truck,
    keywords: ["excavator", "dump truck", "crane", "fleet", "diesel"],
  },
  {
    id: "res-inventory",
    title: "Materials & Warehouse Inventory",
    subtitle: "Rebar, cement bags, explosives, HDPE pipes & fittings",
    category: "Resources",
    href: "/dashboard/resources/inventory",
    icon: Package,
    keywords: ["rebar", "cement", "stock", "warehouse", "materials", "explosives"],
  },
  {
    id: "res-workforce",
    title: "Workforce & Site Personnel",
    subtitle: "Sta. Clara engineers, skilled labor & subcontractor crews",
    category: "Resources",
    href: "/dashboard/resources/workforce",
    icon: Users,
    keywords: ["crew", "engineers", "labor", "contractors", "staff", "headcount"],
  },
  {
    id: "res-subcontractors",
    title: "Specialized Subcontractors",
    subtitle: "Tunneling drillers, electro-mechanical fabricators & surveying",
    category: "Resources",
    href: "/dashboard/resources/subcontractors",
    icon: HardHat,
    keywords: ["vendors", "drilling", "tunneling", "contractor"],
  },

  // Admin & Helpdesk
  {
    id: "admin-helpdesk",
    title: "Site IT Helpdesk & Support",
    subtitle: "Starlink satellite tickets, radio comms & hardware support",
    category: "Navigation",
    href: "/dashboard/admin/helpdesk",
    icon: LifeBuoy,
    keywords: ["ticket", "issue", "bug", "support", "starlink", "radio"],
  },
  {
    id: "admin-settings",
    title: "System Settings",
    subtitle: "User preferences, account details & permissions",
    category: "Navigation",
    href: "/dashboard/admin/settings",
    icon: Settings,
    keywords: ["preferences", "account", "settings"],
  },

  // Site Zones
  {
    id: "zone-powerhouse",
    title: "Powerhouse Complex (11.3 MW)",
    subtitle: "Francis turbines, generator hall & control room",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=powerhouse",
    icon: Zap,
    keywords: ["generator", "turbine", "machine hall", "powerhouse", "zone"],
    badge: "Zone 1",
  },
  {
    id: "zone-switchyard",
    title: "Switchyard & 69kV Transmission",
    subtitle: "Step-up transformers, switchgear & grid interconnection",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=switchyard",
    icon: Zap,
    keywords: ["transformer", "transmission", "grid", "ngcp", "69kv", "switchyard"],
    badge: "Zone 2",
  },
  {
    id: "zone-surgetank",
    title: "Surge Tank & Steel Penstock",
    subtitle: "Hydraulic pressure surge shaft & penstock slope",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=surge-tank",
    icon: Box,
    keywords: ["shaft", "slope", "steel pipe", "surge tank", "penstock"],
    badge: "Zone 3",
  },
  {
    id: "zone-tunnel",
    title: "Headrace Tunnel (3.2 km)",
    subtitle: "Hydraulic underground tunnel, Adit 1 & Adit 2 excavation",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=tunnel",
    icon: MapPin,
    keywords: ["adit", "excavation", "rock", "tunneling", "headrace"],
    badge: "Zone 4",
  },
  {
    id: "zone-intake",
    title: "Pinacanauan River Intake & Weir Dam",
    subtitle: "Water diversion weir, sluice gates & fish ladder",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=intake",
    icon: Droplets,
    keywords: ["weir", "river", "sluice", "gate", "intake", "dam"],
    badge: "Zone 5",
  },
  {
    id: "zone-tailrace",
    title: "Tailrace Channel & Outfall",
    subtitle: "Water return canal back to Pinacanauan River stream",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=tailrace",
    icon: Droplets,
    keywords: ["channel", "discharge", "downstream", "tailrace", "outfall"],
    badge: "Zone 6",
  },
  {
    id: "zone-temfacil",
    title: "SCIC TEMFACIL Compound",
    subtitle: "Main engineering offices, barracks, clinic & motor pool",
    category: "Site Zones",
    href: "/dashboard/sitemap?zone=temfacil",
    icon: Building,
    keywords: ["office", "barracks", "mess hall", "clinic", "temfacil", "headquarters"],
    badge: "HQ",
  },
];

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard shortcut escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items
  const filteredItems = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      // Return top recommended shortcuts
      return SEARCH_ITEMS.slice(0, 8);
    }
    return SEARCH_ITEMS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(clean);
      const matchSubtitle = item.subtitle.toLowerCase().includes(clean);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(clean));
      const matchCategory = item.category.toLowerCase().includes(clean);
      return matchTitle || matchSubtitle || matchKeywords || matchCategory;
    });
  }, [query]);

  // Reset selected index if search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl mt-12 sm:mt-20 rounded-2xl border border-border-hairline bg-card/95 dark:bg-[#0B131B]/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-hairline">
              <Search className="h-5 w-5 text-scic-green dark:text-scic-green-energy shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search modules, civil zones, weather, reports..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary transition-colors sm:hidden"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Categories Header */}
            <div className="px-4 py-2 border-b border-border-hairline bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>
                {query ? `Found ${filteredItems.length} matching results` : "Recommended Shortcuts"}
              </span>
              <span className="hidden sm:inline">Use ↑↓ to navigate, Enter to open</span>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] sm:max-h-[380px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted space-y-2">
                  <p>No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] text-text-muted/70">
                    Try searching for &quot;Digital Twin&quot;, &quot;Weather&quot;, &quot;Intake&quot;, or &quot;Progress&quot;
                  </p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group",
                        isSelected
                          ? "bg-scic-green/15 text-text-primary border border-scic-green/30 shadow-sm"
                          : "text-text-muted hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border border-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isSelected
                            ? "bg-scic-green/20 text-scic-green dark:text-emerald-400"
                            : "bg-black/[0.04] dark:bg-white/[0.04] text-text-muted group-hover:text-text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-display text-xs font-bold truncate",
                              isSelected ? "text-text-primary" : "text-text-primary/90"
                            )}
                          >
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-scic-green/20 text-scic-green dark:text-emerald-400 border border-scic-green/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-text-muted">
                        <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:inline opacity-70">
                          {item.category}
                        </span>
                        <ArrowRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-150",
                            isSelected
                              ? "text-scic-green dark:text-emerald-400 translate-x-0.5"
                              : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                          )}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border-hairline bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-text-muted">
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <Sparkles className="h-3 w-3 text-scic-green dark:text-emerald-400" />
                <span>Sta. Clara International Corporation · THEPP</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-0.5 rounded text-[10px] font-mono hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-text-muted transition-colors"
              >
                Close (Esc)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

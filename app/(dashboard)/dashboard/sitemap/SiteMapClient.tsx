"use client";

import { useState, useEffect } from "react";
import { SiteMapSVG } from "./SiteMapSVG";
import { PageHeader } from "@/components/shared/PageHeader";
import type {  SiteLocation, SiteLocationPhoto, SiteLocationEngineer, User, PlantEquipment, Ticket  } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  MapPin, 
  Navigation, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  PauseCircle, 
  Wind, 
  Cpu, 
  Zap, 
  Droplet, 
  Settings, 
  Clock, 
  Camera,
  Users,
  Wrench,
  FileText,
  X,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SiteLocationWithRelations extends SiteLocation {
  photos?: SiteLocationPhoto[];
  assignedEngineers?: (SiteLocationEngineer & { user: User })[];
  equipments?: PlantEquipment[];
}

interface SiteMapClientProps {
  locations: SiteLocationWithRelations[];
  tickets: Ticket[];
  equipmentCounts: Record<string, number>;
  isWorkingHours: boolean;
}

export function SiteMapClient({ locations, tickets, equipmentCounts, isWorkingHours }: SiteMapClientProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"completion" | "equipment">("completion");
  
  const router = useRouter();

  // Escape key handler to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSlug(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleHover = (slug: string | null) => {
    setActiveSlug(slug);
  };

  const handleClick = (slug: string) => {
    setSelectedSlug(slug);
  };

  const activeLocation = activeSlug ? locations.find(l => l.slug === activeSlug) : null;
  const selectedLocation = selectedSlug ? locations.find(l => l.slug === selectedSlug) : null;

  // Stats calculation
  const completedCount = locations.filter(l => l.percentComplete === 100 || l.status === "COMPLETED").length;
  const activeCount = locations.filter(l => l.status === "ACTIVE" && (l.percentComplete ?? 0) < 100).length;
  const suspendedCount = locations.filter(l => l.status === "SUSPENDED").length;
  const overallProgress = locations.length > 0
    ? Math.round(locations.reduce((acc, l) => acc + (l.percentComplete ?? 0), 0) / locations.length)
    : 0;

  // Keyword-based ticket matcher for B1 & B2
  const getZoneTickets = (loc: SiteLocation, allTickets: Ticket[]) => {
    const nameParts = loc.name.toLowerCase().split(/[/\s-,]+/).filter(p => p.length > 2);
    const slugParts = loc.slug.toLowerCase().split(/[/\s-,]+/).filter(p => p.length > 2);
    const keywords = Array.from(new Set([...nameParts, ...slugParts, loc.slug.toLowerCase()]));

    return allTickets.filter(t => {
      const title = t.title.toLowerCase();
      const desc = t.description.toLowerCase();
      return keywords.some(kw => title.includes(kw) || desc.includes(kw));
    });
  };

  // Lucide Category Icons Mapping for Equipments
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "TURBINE": return <Wind className="h-3.5 w-3.5 text-flow-teal" />;
      case "GENERATOR": return <Cpu className="h-3.5 w-3.5 text-signal-amber" />;
      case "TRANSFORMER": return <Zap className="h-3.5 w-3.5 text-signal-amber" />;
      case "GATE_VALVE":
      case "PUMP":
        return <Droplet className="h-3.5 w-3.5 text-flow-teal" />;
      default:
        return <Settings className="h-3.5 w-3.5 text-text-muted" />;
    }
  };

  // Hover panel variables
  const hoverTickets = activeLocation ? getZoneTickets(activeLocation, tickets) : [];
  const hoverOpenTickets = hoverTickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS");
  
  // Drawer variables
  const drawerTickets = selectedLocation ? getZoneTickets(selectedLocation, tickets) : [];

  return (
    <div className="space-y-6 pb-[80vh]">
      <PageHeader
        title="Interactive Site Map"
        subtitle={`Tumauini Hydroelectric Power Plant — Schematic Overview ${!isWorkingHours ? "(🌙 Night Mode)" : ""}`}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-panel border border-border-hairline flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-flow-teal/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-flow-teal" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Overall Progress</p>
            <p className="text-xl font-display font-bold text-text-primary">{overallProgress}%</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-bg-panel border border-border-hairline flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-flow-teal/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-flow-teal" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Completed</p>
            <p className="text-xl font-display font-bold text-text-primary">{completedCount} <span className="text-sm text-text-muted font-normal">zones</span></p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-bg-panel border border-border-hairline flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-signal-amber/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-signal-amber" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">In Progress</p>
            <p className="text-xl font-display font-bold text-text-primary">{activeCount} <span className="text-sm text-text-muted font-normal">zones</span></p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-bg-panel border border-border-hairline flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-signal-red/10 flex items-center justify-center shrink-0">
            <PauseCircle className="h-5 w-5 text-signal-red" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Suspended</p>
            <p className="text-xl font-display font-bold text-text-primary">{suspendedCount} <span className="text-sm text-text-muted font-normal">zones</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Map View */}
        <div className="xl:col-span-3">
          <SiteMapSVG
            locations={locations}
            activeSlug={activeSlug}
            selectedSlug={selectedSlug}
            onHover={handleHover}
            onClick={handleClick}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            equipmentCounts={equipmentCounts}
            isWorkingHours={isWorkingHours}
          />
        </div>

        {/* Side Panel (Rich Hover Panel with Live Data) */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="font-display font-semibold tracking-wide text-text-primary text-sm flex items-center gap-2 mb-4">
            <Navigation className="h-4 w-4 text-flow-teal" /> Zone Information
          </h3>

          <AnimatePresence mode="wait">
            {activeLocation ? (
              <motion.div
                key={activeLocation.slug}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="p-5 rounded-2xl dark:bg-white/[0.03] bg-black/[0.03] border border-border-hairline shadow-lg relative overflow-hidden flex flex-col gap-5"
              >
                {/* Header Section */}
                <div>
                  <h4 className="text-lg font-bold text-text-primary font-display mb-1">
                    {activeLocation.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      activeLocation.status === "COMPLETED" ? "bg-flow-teal/10 text-flow-teal border-flow-teal/20" :
                      activeLocation.status === "SUSPENDED" ? "bg-signal-red/10 text-signal-red border-signal-red/20" : 
                      "bg-signal-amber/10 text-signal-amber border-signal-amber/20"
                    )}>
                      {activeLocation.status}
                    </span>
                  </div>
                </div>

                {/* Animated Circular Completion Arc */}
                <div className="flex items-center gap-4 bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-border-hairline">
                  {(() => {
                    const radius = 20;
                    const circumference = 2 * Math.PI * radius;
                    const pctVal = activeLocation.percentComplete ?? 0;
                    const strokeDashoffset = circumference - (pctVal / 100) * circumference;
                    return (
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg width="52" height="52" className="transform -rotate-90">
                          <circle cx="26" cy="26" r={radius} fill="transparent" stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="4.5" />
                          <motion.circle
                            cx="26"
                            cy="26"
                            r={radius}
                            fill="transparent"
                            stroke="#1FB6A6"
                            strokeWidth="4.5"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[10px] font-mono font-bold text-text-primary">{pctVal}%</span>
                      </div>
                    );
                  })()}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">Zone Completion</span>
                    <span className="text-xs text-text-muted mt-0.5 block leading-normal">{activeLocation.description}</span>
                  </div>
                </div>

                {/* Crew List (Assigned Engineers) */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Assigned Crew
                  </h5>
                  {activeLocation.assignedEngineers && activeLocation.assignedEngineers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {activeLocation.assignedEngineers.slice(0, 3).map((eng) => (
                        <div key={eng.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-flow-teal/15 border border-flow-teal/20 text-flow-teal flex items-center justify-center text-[10px] font-bold shrink-0">
                            {eng.user?.name ? eng.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-primary truncate">{eng.user?.name || "Unknown Crew"}</p>
                            <p className="text-[9px] text-text-muted truncate leading-none">{eng.role || "Engineer"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No crew assigned</p>
                  )}
                </div>

                {/* Equipment Density Count */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" /> Equipment
                  </h5>
                  {activeLocation.equipments && activeLocation.equipments.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-text-primary">
                        {activeLocation.equipments.length} piece{activeLocation.equipments.length > 1 ? "s" : ""} of equipment
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeLocation.equipments.slice(0, 4).map((eq) => (
                          <div key={eq.id} className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] border border-border-hairline px-2 py-0.5 rounded-md text-[10px] font-semibold text-text-primary" title={eq.name}>
                            {getCategoryIcon(eq.category)}
                            <span className="font-mono text-[9px]">{eq.equipmentTag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No linked equipment</p>
                  )}
                </div>

                {/* Open Tickets Count */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Open Tickets
                  </h5>
                  {hoverOpenTickets.length > 0 ? (
                    <div className="flex items-center justify-between bg-signal-amber/5 border border-signal-amber/20 p-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-signal-amber" />
                        <span className="text-xs font-bold text-signal-amber">{hoverOpenTickets.length} Active Ticket{hoverOpenTickets.length > 1 ? "s" : ""}</span>
                      </div>
                      <button 
                        onClick={() => router.push("/dashboard/tickets")}
                        className="text-[10px] font-bold text-signal-amber hover:underline flex items-center gap-0.5"
                      >
                        Helpdesk <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No active tickets</p>
                  )}
                </div>

                {/* Latest Site Photo Thumbnail */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Latest Photo
                  </h5>
                  {activeLocation.photos && activeLocation.photos.length > 0 ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={activeLocation.photos[0].storagePath} 
                        alt="Latest structural" 
                        className="w-12 h-12 object-cover rounded-lg border border-border-hairline shrink-0 shadow-sm"
                      />
                      <p className="text-[10px] text-text-muted leading-tight line-clamp-2">
                        {activeLocation.photos[0].caption || "No caption added"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Camera className="h-4 w-4 opacity-40" />
                      <span className="text-xs italic">No site photos</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-5 rounded-2xl border border-dashed border-border-hairline flex flex-col items-center justify-center text-center py-16"
              >
                <div className="w-12 h-12 rounded-full dark:bg-white/[0.03] bg-black/[0.03] flex items-center justify-center mb-4 border border-border-hairline">
                  <MapPin className="h-5 w-5 text-text-muted/60" />
                </div>
                <p className="text-xs text-text-muted leading-relaxed px-4">
                  Hover over a zone on the map to view real-time database progress, or click to expand structural details.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Legend */}
          <div className="p-4 rounded-xl bg-bg-panel border border-border-hairline shadow-sm">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Map Legend</h5>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded bg-flow-teal/20 border border-flow-teal/40" />
                <span className="text-xs font-medium text-text-primary">Completed / Operational</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded bg-signal-amber/20 border border-signal-amber/40" />
                <span className="text-xs font-medium text-text-primary">In Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded bg-signal-red/20 border border-signal-red/40 animate-pulse" />
                <span className="text-xs font-medium text-text-primary">Suspended / Alert</span>
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-border-hairline">
                <div className="w-3.5 h-0.5 bg-[#22D3EE]" />
                <span className="text-xs font-medium text-text-primary">Hydro Flow Circuit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B2 SLIDE-IN DETAIL DRAWER ON CLICK */}
      <AnimatePresence>
        {selectedLocation && (
          <>
            {/* Backdrop dimming overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSlug(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />

            {/* Slide-in drawer container */}
            <motion.div
              initial={{ translateX: "100%" }}
              animate={{ translateX: 0 }}
              exit={{ translateX: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 h-full w-[420px] bg-bg-panel dark:bg-bg-panel border-l border-border-hairline z-50 shadow-2xl pt-6 px-6 pb-24 overflow-y-auto flex flex-col gap-6"
            >
              {/* Close button */}
              <button 
                onClick={() => setSelectedSlug(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-border-hairline bg-black/[0.04] dark:bg-white/[0.04] text-text-muted hover:text-text-primary hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Drawer Header */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                    selectedLocation.status === "COMPLETED" ? "bg-flow-teal/10 text-flow-teal border-flow-teal/20" :
                    selectedLocation.status === "SUSPENDED" ? "bg-signal-red/10 text-signal-red border-signal-red/20" : 
                    "bg-signal-amber/10 text-signal-amber border-signal-amber/20"
                  )}>
                    {selectedLocation.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-text-primary leading-tight">
                  {selectedLocation.name}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {selectedLocation.description}
                </p>
              </div>

              {/* Progress visualizer */}
              <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                  <span className="text-text-muted">Structural Completion</span>
                  <span className="text-text-primary font-mono text-sm">{selectedLocation.percentComplete ?? 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full dark:bg-white/10 bg-black/10 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      selectedLocation.status === "SUSPENDED" ? "bg-signal-red" :
                      selectedLocation.percentComplete === 100 ? "bg-flow-teal" : "bg-signal-amber"
                    )}
                    style={{ width: `${selectedLocation.percentComplete ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Site Photos Gallery */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Zone Gallery
                </h4>
                {selectedLocation.photos && selectedLocation.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedLocation.photos.slice(0, 4).map((p) => (
                      <div 
                        key={p.id} 
                        className="group relative aspect-video rounded-xl overflow-hidden bg-black border border-border-hairline cursor-zoom-in"
                        onClick={() => {
                          // Lightbox can be opened using full detail page or a custom portal
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={p.storagePath} 
                          alt="Zone visual record" 
                          className="object-cover w-full h-full opacity-85 hover:opacity-100 group-hover:scale-102 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[9px] text-white truncate font-medium">{p.caption}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-20 border border-dashed border-border-hairline rounded-xl flex items-center justify-center text-text-muted text-xs italic">
                    No site photos captured yet
                  </div>
                )}
              </div>

              {/* Assigned Crew List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Assigned Crew List
                </h4>
                {selectedLocation.assignedEngineers && selectedLocation.assignedEngineers.length > 0 ? (
                  <div className="divide-y divide-border-hairline border border-border-hairline rounded-xl overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
                    {selectedLocation.assignedEngineers.map((eng) => (
                      <div key={eng.id} className="flex items-center gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-flow-teal/15 border border-flow-teal/20 text-flow-teal flex items-center justify-center text-xs font-bold">
                          {eng.user?.name ? eng.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-text-primary truncate">{eng.user?.name || "Unknown Crew"}</p>
                          <p className="text-[10px] text-text-muted truncate mt-0.5">{eng.role || "Engineer"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No crew assigned to this location</p>
                )}
              </div>

              {/* Linked Equipment list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Wrench className="h-4 w-4" /> Linked Equipments
                </h4>
                {selectedLocation.equipments && selectedLocation.equipments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-border-hairline rounded-xl p-2 bg-black/[0.01] dark:bg-white/[0.01]">
                    {selectedLocation.equipments.map((eq) => (
                      <div 
                        key={eq.id}
                        onClick={() => router.push(`/dashboard/equipment/${eq.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border-hairline cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{eq.name}</p>
                          <span className="text-[9px] font-mono text-text-muted mt-0.5 block">{eq.equipmentTag}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase border px-2 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04] border-border-hairline">
                          {getCategoryIcon(eq.category)}
                          <span className="text-text-muted">{eq.category.toLowerCase().replace("_", " ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No plant equipment registered for this zone</p>
                )}
              </div>

              {/* Recent tickets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Recent Helpdesk Tickets
                </h4>
                {drawerTickets.length > 0 ? (
                  <div className="space-y-2">
                    {drawerTickets.slice(0, 3).map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => router.push(`/dashboard/tickets/${t.id}`)}
                        className="p-3 border border-border-hairline rounded-xl bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-bold text-text-primary leading-snug line-clamp-1">{t.title}</p>
                          <span className={cn(
                            "text-[8px] font-bold border px-1.5 py-0.2 rounded uppercase shrink-0 tracking-wide",
                            t.status === "OPEN" ? "bg-flow-teal/10 text-flow-teal border-flow-teal/20" :
                            t.status === "IN_PROGRESS" ? "bg-signal-amber/10 text-signal-amber border-signal-amber/20" : 
                            "bg-white/5 text-text-muted border-white/10"
                          )}>
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">No helpdesk tickets linked to this zone</p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-auto border-t border-border-hairline pt-4 flex flex-col gap-2">
                <Link
                  href={`/dashboard/sitemap/${selectedLocation.slug}`}
                  className="w-full py-2.5 rounded-xl bg-flow-teal hover:bg-flow-teal/90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-flow-teal/10 transition-colors"
                >
                  View Full Details <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

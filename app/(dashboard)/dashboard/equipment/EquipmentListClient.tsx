"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Zap, Cpu, Shield, ArrowUp, Battery, Flame, Droplet, Settings,
  Search, Plus, Grid, List, Activity
} from "lucide-react";
import { EquipmentCategory, EquipmentStatus, EquipmentCondition } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EquipmentWithLocation {
  id: string;
  equipmentTag: string;
  name: string;
  category: EquipmentCategory;
  manufacturer: string | null;
  model: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  location: string | null;
  siteLocation: { name: string } | null;
  createdAt: Date;
}

interface EquipmentListClientProps {
  initialEquipment: EquipmentWithLocation[];
  isEditor: boolean;
}

const CATEGORY_ICONS: Record<EquipmentCategory, React.ComponentType<{ className?: string }>> = {
  TURBINE: Zap,
  GENERATOR: Zap,
  TRANSFORMER: Zap,
  GOVERNOR: Settings,
  EXCITATION_SYSTEM: Zap,
  CIRCUIT_BREAKER: Zap,
  PROTECTION_RELAY: Shield,
  GATE_VALVE: Settings,
  CRANE_HOIST: ArrowUp,
  SCADA_PLC: Cpu,
  METERING_PANEL: Cpu,
  DC_SYSTEM: Battery,
  FIRE_SUPPRESSION: Flame,
  DIESEL_GENERATOR: Zap,
  PUMP: Droplet,
  OTHER: Settings,
};

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const styles: Record<EquipmentStatus, string> = {
    COMMISSIONED: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
    INSTALLED: "bg-white/5 text-text-muted ring-1 ring-white/10",
    UNDER_MAINTENANCE: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
    DECOMMISSIONED: "bg-white/5 text-text-muted/50 ring-1 ring-white/5 opacity-50",
    PENDING_DELIVERY: "bg-signal-amber/5 text-signal-amber/70 border border-dashed border-signal-amber/30 shadow-none",
  };

  return (
    <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase", styles[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function ConditionDot({ condition }: { condition: EquipmentCondition }) {
  const colors: Record<EquipmentCondition, string> = {
    EXCELLENT: "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]",
    GOOD: "bg-flow-teal/80 shadow-[0_0_6px_rgba(31,182,166,0.3)]",
    FAIR: "bg-signal-amber shadow-[0_0_6px_rgba(232,163,61,0.3)]",
    POOR: "bg-signal-red shadow-[0_0_6px_rgba(227,90,90,0.3)]",
    CRITICAL: "bg-signal-red animate-pulse shadow-[0_0_8px_rgba(227,90,90,0.5)]",
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full", colors[condition])} />
      <span className="text-[10px] uppercase text-text-muted font-medium">{condition}</span>
    </div>
  );
}

export function EquipmentListClient({ initialEquipment, isEditor }: EquipmentListClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isGrouped, setIsGrouped] = useState(false);

  // Categories list for dropdown
  const categoriesList = useMemo(() => {
    const set = new Set(initialEquipment.map((e) => e.category));
    return Array.from(set);
  }, [initialEquipment]);

  const filteredEquipment = useMemo(() => {
    return initialEquipment.filter((eq) => {
      const matchSearch =
        eq.name.toLowerCase().includes(search.toLowerCase()) ||
        eq.equipmentTag.toLowerCase().includes(search.toLowerCase()) ||
        (eq.manufacturer && eq.manufacturer.toLowerCase().includes(search.toLowerCase()));

      const matchCategory = selectedCategory === "all" || eq.category === selectedCategory;
      const matchStatus = selectedStatus === "all" || eq.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [initialEquipment, search, selectedCategory, selectedStatus]);

  // Group by category helper
  const groupedEquipment = useMemo(() => {
    if (!isGrouped) return null;
    const groups = {} as Record<EquipmentCategory, EquipmentWithLocation[]>;
    filteredEquipment.forEach((eq) => {
      if (!groups[eq.category]) {
        groups[eq.category] = [];
      }
      groups[eq.category].push(eq);
    });
    return groups;
  }, [filteredEquipment, isGrouped]);

  const renderCard = (eq: EquipmentWithLocation) => {
    const Icon = CATEGORY_ICONS[eq.category] || Settings;

    return (
      <Link href={`/dashboard/equipment/${eq.id}`} key={eq.id} className="block group">
        <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-5 hover:bg-white/[0.04] transition-all hover:border-white/[0.15] hover:shadow-xl relative overflow-hidden flex flex-col justify-between h-full min-h-[170px]">
          {/* Top Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-flow-teal group-hover:text-flow-teal/80 transition-colors">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="font-mono text-xs text-flow-teal font-semibold bg-flow-teal/10 px-2 py-0.5 rounded border border-flow-teal/20 tracking-wider">
                    {eq.equipmentTag}
                  </span>
                  <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-semibold">
                    {eq.category.replace("_", " ")}
                  </p>
                </div>
              </div>
              <StatusBadge status={eq.status} />
            </div>

            <h3 className="text-base font-semibold text-text-primary mt-4 group-hover:text-flow-teal transition-colors line-clamp-1">
              {eq.name}
            </h3>
            <p className="text-xs text-text-muted line-clamp-1 mt-1">
              {eq.manufacturer ? `${eq.manufacturer} ${eq.model || ""}` : "Generic Manufacturer"}
            </p>
          </div>

          {/* Bottom Info */}
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-3.5 mt-4">
            <ConditionDot condition={eq.condition} />
            <span className="text-xs text-text-muted line-clamp-1 text-right font-medium">
              {eq.siteLocation ? eq.siteLocation.name : (eq.location || "On Site")}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by tag, name, manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none focus:border-flow-teal transition-colors placeholder:text-text-muted/40"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-flow-teal transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-flow-teal transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
          >
            <option value="all">All Statuses</option>
            {Object.keys(EquipmentStatus).map((st) => (
              <option key={st} value={st}>
                {st.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* Group / Flat Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsGrouped(!isGrouped)}
            title={isGrouped ? "Flat List" : "Group by Category"}
            className="rounded-xl border-white/[0.08] hover:bg-white/[0.04] text-text-muted hover:text-text-primary"
          >
            {isGrouped ? <List className="h-4.5 w-4.5" /> : <Grid className="h-4.5 w-4.5" />}
          </Button>

          {/* Add Equipment */}
          {isEditor && (
            <Link href="/dashboard/equipment/new">
              <Button className="rounded-xl bg-flow-teal hover:bg-flow-teal/90 text-bg-panel flex items-center gap-2 py-2.5 px-4 font-semibold text-sm">
                <Plus className="h-4.5 w-4.5" /> Register
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Grid rendering */}
      {isGrouped && groupedEquipment ? (
        <div className="space-y-8">
          {(Object.keys(groupedEquipment) as EquipmentCategory[]).map((cat) => {
            const items = groupedEquipment[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted/80 flex items-center gap-2 pl-1 border-l-2 border-flow-teal">
                  {cat.replace("_", " ")} ({items.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map(renderCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {filteredEquipment.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEquipment.map(renderCard)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
              <Activity className="h-10 w-10 text-text-muted/50 mb-3" />
              <p className="text-sm text-text-muted italic">No plant equipment matches your filter criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

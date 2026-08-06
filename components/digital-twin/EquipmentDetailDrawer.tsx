"use client";

import React from "react";
import Link from "next/link";
import { 
  X, Zap, Cpu, Shield, ArrowUp, Battery, Flame, Droplet, Settings,
  MapPin, ExternalLink
} from "lucide-react";
import type { PlantEquipment, SiteLocation, EquipmentCategory, EquipmentStatus, EquipmentCondition } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EquipmentWithLocation = PlantEquipment & {
  siteLocation?: SiteLocation | null;
  specifications?: Record<string, unknown> | null;
  maintenanceLogs?: Array<{
    id: string;
    type: string;
    description: string;
    findings?: string | null;
    actionTaken?: string | null;
    createdAt: Date;
  }> | null;
};

interface EquipmentDetailDrawerProps {
  equipment: EquipmentWithLocation | null;
  onClose: () => void;
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

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const styles: Record<EquipmentStatus, string> = {
    COMMISSIONED: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
    INSTALLED: "bg-white/5 text-text-muted ring-1 ring-white/10",
    UNDER_MAINTENANCE: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
    DECOMMISSIONED: "bg-white/5 text-text-muted/50 ring-1 ring-white/5 opacity-50",
    PENDING_DELIVERY: "bg-signal-amber/5 text-signal-amber/70 border border-dashed border-signal-amber/30 shadow-none",
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase font-mono", styles[status])}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export function EquipmentConditionDot({ condition }: { condition: EquipmentCondition }) {
  const colors: Record<EquipmentCondition, string> = {
    EXCELLENT: "bg-flow-teal shadow-[0_0_8px_rgba(31,182,166,0.5)]",
    GOOD: "bg-flow-teal/80 shadow-[0_0_6px_rgba(31,182,166,0.3)]",
    FAIR: "bg-signal-amber shadow-[0_0_6px_rgba(232,163,61,0.3)]",
    POOR: "bg-signal-red shadow-[0_0_6px_rgba(227,90,90,0.3)]",
    CRITICAL: "bg-signal-red animate-pulse shadow-[0_0_8px_rgba(227,90,90,0.5)]",
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", colors[condition])} />
      <span className="text-[10px] uppercase text-text-muted font-medium font-mono">{condition}</span>
    </div>
  );
}

export function EquipmentDetailDrawer({ equipment, onClose }: EquipmentDetailDrawerProps) {
  if (!equipment) return null;

  const IconComp = CATEGORY_ICONS[equipment.category] || Settings;
  const specs = (equipment.specifications as Record<string, string>) || {};

  return (
    <Card className="w-80 border border-black/10 dark:border-white/10 bg-black/85 dark:bg-[#0B1013]/95 shadow-2xl backdrop-blur-md p-4 text-text-primary flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-flow-teal/15 border border-flow-teal/20 text-flow-teal shrink-0">
            <IconComp className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-flow-teal">{equipment.equipmentTag}</span>
              {equipment.zone && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 text-text-muted border border-white/10">
                  {equipment.zone}
                </span>
              )}
            </div>
            <h3 className="font-display text-sm font-bold text-white leading-tight mt-0.5">
              {equipment.name}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-text-muted hover:text-white shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status & Condition */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-border-hairline p-2.5 rounded-xl">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-mono tracking-wider text-text-muted">Status</span>
          <EquipmentStatusBadge status={equipment.status} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[9px] uppercase font-mono tracking-wider text-text-muted">Condition</span>
          <EquipmentConditionDot condition={equipment.condition} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2.5 text-xs">
        {equipment.siteLocation && (
          <div className="flex items-center justify-between text-text-muted">
            <span className="flex items-center gap-1.5 text-[11px]">
              <MapPin className="h-3.5 w-3.5 text-flow-teal" /> Location
            </span>
            <span className="font-medium text-white">{equipment.siteLocation.name}</span>
          </div>
        )}

        {equipment.location && (
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px]">Physical Bay</span>
            <span className="font-mono text-white text-[11px]">{equipment.location}</span>
          </div>
        )}

        {(equipment.positionX != null && equipment.positionY != null) && (
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px]">Sitemap Coords</span>
            <span className="font-mono text-flow-teal text-[11px]">
              X: {equipment.positionX}% · Y: {equipment.positionY}%
            </span>
          </div>
        )}

        {(equipment.manufacturer || equipment.model) && (
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px]">Make / Model</span>
            <span className="font-medium text-white truncate max-w-[150px]">
              {[equipment.manufacturer, equipment.model].filter(Boolean).join(" ")}
            </span>
          </div>
        )}
      </div>

      {/* Specifications */}
      {Object.keys(specs).length > 0 && (
        <div className="space-y-1.5 border-t border-black/10 dark:border-white/10 pt-2.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted font-semibold block">
            TECHNICAL SPECS
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(specs).slice(0, 4).map(([key, val]) => (
              <div key={key} className="bg-white/[0.02] border border-white/5 rounded px-2 py-1">
                <span className="text-[9px] text-text-muted uppercase block truncate">{key}</span>
                <span className="text-[11px] font-mono font-medium text-white truncate block">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
        <Link href={`/dashboard/equipment/${equipment.id}`} className="w-full">
          <Button
            variant="default"
            size="sm"
            className="w-full font-sans text-xs font-medium bg-flow-teal hover:bg-flow-teal/90 text-white flex items-center justify-center gap-1.5"
          >
            Full Equipment Record <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

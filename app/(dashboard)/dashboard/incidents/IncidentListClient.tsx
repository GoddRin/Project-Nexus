"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  Shield, 
  Flame, 
  Activity, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2,
  Ambulance,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  MEDICAL: Activity,
  SECURITY: Shield,
  FIRE: Flame,
  OTHER: AlertTriangle,
};

const SEVERITY_COLORS = {
  LOW: "text-green-500 bg-green-500/10 border-green-500/20",
  MEDIUM: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  HIGH: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  CRITICAL: "text-red-500 bg-red-500/10 border-red-500/20",
};

export function IncidentListClient({ initialIncidents }: { initialIncidents: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const filtered = initialIncidents.filter((inc) => {
    const matchesSearch = inc.dispatchFacilityName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.personnelInvolved?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || inc.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search incidents, facilities, personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/5 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-flow-teal"
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "MEDICAL", "SECURITY", "FIRE"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition-all border",
                filterType === t
                  ? "bg-flow-teal text-white border-flow-teal"
                  : "bg-transparent text-text-muted border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <CheckCircle2 className="h-12 w-12 text-flow-teal/50 mb-4" />
            <p className="text-sm font-medium">No incidents found.</p>
            <p className="text-xs">The project site is safe and clear.</p>
          </div>
        ) : (
          filtered.map((inc) => {
            const Icon = TYPE_ICONS[inc.type as keyof typeof TYPE_ICONS] || AlertTriangle;
            return (
              <div
                key={inc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", SEVERITY_COLORS[inc.severity as keyof typeof SEVERITY_COLORS])}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{inc.type} INCIDENT</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", SEVERITY_COLORS[inc.severity as keyof typeof SEVERITY_COLORS])}>
                      {inc.severity}
                    </span>
                    {inc.status === "ACTIVE" && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div> Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2">{inc.description}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Ambulance className="h-3.5 w-3.5 text-flow-teal" />
                    <span>Dispatched to: <strong className="text-white">{inc.dispatchFacilityName || "Unknown"}</strong></span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(inc.createdAt), "MMM d, yyyy h:mm a")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {inc.loggedBy?.name || "System"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

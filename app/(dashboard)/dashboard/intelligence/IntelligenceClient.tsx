"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { CheckCircle2, AlertTriangle, Play, HelpCircle, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {  MilestoneCategory, MilestoneStatus2, LocationStatus  } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  targetDate: string | null;
  completedAt: string | null;
  status: MilestoneStatus2;
  order: number;
  isCritical: boolean;
}

interface LocationData {
  id: string;
  slug: string;
  name: string;
  percentComplete: number;
  status: LocationStatus;
}

interface Snapshot {
  id: string;
  snapshotDate: string;
  percentComplete: number;
}

interface IntelligenceClientProps {
  projectId: string;
  targetCodDate: string | null;
  milestones: Milestone[];
  locations: LocationData[];
  snapshots: Snapshot[];
}

// ─── Isolated Countdown (only this re-renders every second) ──────────────────

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPassed: boolean;
}

const CodCountdown = memo(function CodCountdown({
  targetCodDate,
}: {
  targetCodDate: string | null;
}) {
  const [timeLeft, setTimeLeft] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  });

  useEffect(() => {
    if (!targetCodDate) return;
    const targetTime = new Date(targetCodDate).getTime();

    const tick = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isPassed: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetCodDate]);

  if (!targetCodDate) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-text-muted">Target COD date is not configured yet.</p>
        <Link href="/dashboard/settings">
          <Button className="bg-flow-teal hover:bg-flow-teal/95 text-white">
            Configure Target COD
          </Button>
        </Link>
      </div>
    );
  }

  if (timeLeft.isPassed) {
    return (
      <div className="space-y-2 py-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold font-display text-flow-teal uppercase tracking-widest drop-shadow-[0_0_24px_rgba(31,182,166,0.6)]">
          Commissioned
        </h1>
        <p className="font-mono text-xs text-text-muted uppercase tracking-wider pt-2">
          Congratulations! Commercial Operations achieved.
        </p>
      </div>
    );
  }

  const urgent = timeLeft.days <= 30;
  const colorCls = urgent ? "text-signal-amber" : "text-flow-teal";

  return (
    <div className="flex justify-center items-center gap-4 md:gap-8 flex-wrap">
      {/* Days */}
      <div className="text-center min-w-[70px] sm:min-w-[120px]">
        <div className={cn("text-5xl sm:text-7xl md:text-8xl font-bold font-display tracking-tight leading-none drop-shadow-[0_0_15px_rgba(31,182,166,0.2)]", colorCls)}>
          {timeLeft.days}
        </div>
        <div className="text-[10px] sm:text-xs font-mono font-medium text-text-muted uppercase tracking-widest mt-2">Days</div>
      </div>
      <span className="text-white/20 text-3xl sm:text-5xl font-mono self-start pt-2 select-none">:</span>
      {/* Hours */}
      <div className="text-center min-w-[70px] sm:min-w-[100px]">
        <div className={cn("text-5xl sm:text-7xl md:text-8xl font-bold font-display tracking-tight leading-none drop-shadow-[0_0_15px_rgba(31,182,166,0.2)]", colorCls)}>
          {String(timeLeft.hours).padStart(2, "0")}
        </div>
        <div className="text-[10px] sm:text-xs font-mono font-medium text-text-muted uppercase tracking-widest mt-2">Hours</div>
      </div>
      <span className="text-white/20 text-3xl sm:text-5xl font-mono self-start pt-2 select-none">:</span>
      {/* Minutes */}
      <div className="text-center min-w-[70px] sm:min-w-[100px]">
        <div className={cn("text-5xl sm:text-7xl md:text-8xl font-bold font-display tracking-tight leading-none drop-shadow-[0_0_15px_rgba(31,182,166,0.2)]", colorCls)}>
          {String(timeLeft.minutes).padStart(2, "0")}
        </div>
        <div className="text-[10px] sm:text-xs font-mono font-medium text-text-muted uppercase tracking-widest mt-2">Minutes</div>
      </div>
    </div>
  );
});

// ─── Status Icon (pure, no state) ────────────────────────────────────────────

function StatusIcon({ status }: { status: MilestoneStatus2 }) {
  switch (status) {
    case "COMPLETED":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-flow-teal text-white shadow-[0_0_12px_rgba(31,182,166,0.5)]">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      );
    case "IN_PROGRESS":
      return (
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-flow-teal bg-black shadow-[0_0_15px_rgba(31,182,166,0.3)]">
          {/* CSS-only breathing ring — does NOT cause React re-renders */}
          <span className="absolute inset-0 rounded-full border-2 border-flow-teal opacity-50 animate-ping" style={{ animationDuration: "1.8s" }} />
          <Play className="h-3 w-3 text-flow-teal fill-flow-teal" />
        </div>
      );
    case "UPCOMING":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/30 bg-black">
          <HelpCircle className="h-3.5 w-3.5 text-text-muted" />
        </div>
      );
    case "BLOCKED":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-signal-red bg-black shadow-[0_0_12px_rgba(239,68,68,0.4)]">
          <AlertTriangle className="h-4 w-4 text-signal-red" />
        </div>
      );
    case "LOCKED":
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/10 bg-black/40">
          <Lock className="h-3.5 w-3.5 text-text-muted/30" />
        </div>
      );
  }
}

// ─── Timeline Node — defined OUTSIDE parent so it never remounts on parent renders ──

function TimelineNode({
  m,
  index,
  totalCount,
}: {
  m: Milestone;
  index: number;
  totalCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div
      ref={ref}
      className={cn(
        "relative pl-10 pb-8 last:pb-0 transition-all duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}
      style={{ transitionDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* Connecting line */}
      {index < totalCount - 1 && (
        <div
          className={cn(
            "absolute left-3.5 top-7 w-[2px] h-[calc(100%+16px)] border-l",
            m.status === "COMPLETED" ? "border-flow-teal border-solid" : "border-white/10 border-dashed"
          )}
        />
      )}

      {/* Node Badge */}
      <div className="absolute left-0 top-0.5 z-10">
        <StatusIcon status={m.status} />
      </div>

      {/* Card */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] p-4 transition-colors duration-150 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{m.title}</span>
            {m.isCritical && (
              <span className="rounded bg-signal-red/10 border border-signal-red/20 px-1.5 py-0.5 text-[9px] font-bold text-signal-red uppercase font-mono tracking-wider">
                Critical Path
              </span>
            )}
          </div>
          {m.targetDate && (
            <span className="font-mono text-xs text-text-muted shrink-0">
              Target:{" "}
              {new Date(m.targetDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[9px] font-semibold border font-mono tracking-wide",
              m.category === "CIVIL" && "bg-[#4A6572]/10 border-[#4A6572]/20 text-[#85B9D0]",
              m.category === "MECHANICAL" && "bg-[#5B7A8A]/10 border-[#5B7A8A]/20 text-[#A6CEE1]",
              m.category === "ELECTRICAL" && "bg-signal-amber/10 border-signal-amber/20 text-signal-amber",
              m.category === "TESTING" && "bg-flow-teal/10 border-flow-teal/20 text-flow-teal",
              m.category === "DOCUMENTATION" && "bg-white/5 border-white/10 text-text-muted",
              m.category === "REGULATORY" && "bg-[#8A4A6A]/10 border-[#8A4A6A]/20 text-[#D7A2C5]"
            )}
          >
            {m.category}
          </span>
          {m.completedAt && (
            <span className="text-[10px] text-text-muted">
              Completed{" "}
              {new Date(m.completedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Framer Motion variants (stable references — defined at module scope) ────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const ringVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
};

// ─── Category colour helper ──────────────────────────────────────────────────

function arcColorForPct(pct: number): string {
  if (pct >= 100) return "#1FB6A6";
  if (pct >= 75) return "rgba(31,182,166,0.8)";
  if (pct >= 50) return "#E8A33D";
  if (pct >= 25) return "rgba(232,163,61,0.7)";
  return "rgba(239,68,68,0.6)";
}

// ─── Main Client Component ───────────────────────────────────────────────────

export function IntelligenceClient({
  targetCodDate,
  milestones,
  locations,
  snapshots,
}: IntelligenceClientProps) {
  // Stable computed values — only recalc when milestones/locations change
  const { totalMilestones, completedMilestones, readinessPercent, blockedCriticalMilestone, criticalMilestones, averageCompletion } = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter((m) => m.status === "COMPLETED").length;
    return {
      totalMilestones: total,
      completedMilestones: completed,
      readinessPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      blockedCriticalMilestone: milestones.find((m) => m.isCritical && m.status === "BLOCKED"),
      criticalMilestones: milestones.filter((m) => m.isCritical),
      averageCompletion:
        locations.length > 0
          ? Math.round(locations.reduce((a, c) => a + c.percentComplete, 0) / locations.length)
          : 0,
    };
  }, [milestones, locations]);

  // SVG hover state
  const [hoveredStructure, setHoveredStructure] = useState<{
    slug: string;
    name: string;
    elevation: number;
    completion: number;
    status: string;
    x: number;
    y: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  // once:true → particles start when SVG scrolls into view and keep playing; no restart flicker
  const isSvgInView = useInView(svgRef, { once: true, amount: 0.1 });

  const handleHoverStructure = (slug: string, name: string, elevation: number, x: number, y: number) => {
    const loc = locations.find((l) => l.slug === slug);
    setHoveredStructure({
      slug, name, elevation, x, y,
      completion: loc?.percentComplete ?? 0,
      status: loc?.status ?? "ACTIVE",
    });
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12 rounded-3xl p-1">
      {/* ── SECTION 1: ROAD TO COD ─────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">

          {/* Countdown Panel */}
          <div className="flex-1 rounded-3xl border border-white/[0.06] bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl p-6 flex flex-col justify-between overflow-hidden relative">
            {/* Subtle static gradient — NO animate-pulse here (caused the flicker) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-flow-teal/[0.025] via-transparent to-flow-teal/[0.015] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 z-10">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-flow-teal" style={{ animation: "spin 8s linear infinite" }} />
                <span className="font-mono text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Road to Commercial Operations (COD)
                </span>
              </div>
              <Link
                href="/dashboard/settings"
                className="text-xs text-flow-teal hover:text-flow-teal/80 transition-colors font-semibold"
              >
                Configure Settings →
              </Link>
            </div>

            {/* ← Countdown lives in its own isolated component — only this ticks */}
            <div className="py-8 z-10">
              <CodCountdown targetCodDate={targetCodDate} />
            </div>

            {/* Readiness Bar */}
            <div className="border-t border-white/[0.06] pt-6 z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-display text-text-primary">{readinessPercent}%</span>
                  <span className="text-xs text-text-muted">Commissioning Readiness</span>
                </div>
                <span className="text-xs font-mono text-text-muted">
                  {completedMilestones} of {totalMilestones} milestones complete
                </span>
              </div>
              <div className="h-3 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${readinessPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-flow-teal rounded-full shadow-[0_0_10px_rgba(31,182,166,0.35)]"
                />
              </div>
              {blockedCriticalMilestone && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-signal-red/20 bg-signal-red/5 p-3 text-xs text-signal-red">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>Critical Path Blocked:</strong> &quot;{blockedCriticalMilestone.title}&quot; requires immediate review.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Critical Path + Stats */}
          <div className="w-full md:w-[400px] flex flex-col gap-6">
            <div className="glass-card p-5 border-l-4 border-l-signal-red">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-text-muted mb-4">
                Critical Path Check
              </h3>
              <div className="space-y-3">
                {criticalMilestones.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
                    <span className="truncate max-w-[200px] text-text-primary font-medium">{m.title}</span>
                    <span
                      className={cn(
                        "font-mono font-semibold px-2 py-0.5 rounded text-[10px] shrink-0",
                        m.status === "COMPLETED" && "text-flow-teal bg-flow-teal/10",
                        m.status === "IN_PROGRESS" && "text-flow-teal bg-flow-teal/10 border border-flow-teal/20",
                        m.status === "UPCOMING" && "text-text-muted bg-white/5",
                        m.status === "BLOCKED" && "text-signal-red bg-signal-red/10",
                        m.status === "LOCKED" && "text-text-muted/40 bg-white/[0.02]"
                      )}
                    >
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold font-display text-flow-teal">{averageCompletion}%</p>
                <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1">Avg. Structural Complete</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold font-display text-signal-amber">
                  {milestones.filter((m) => m.status === "IN_PROGRESS" || m.status === "BLOCKED").length}
                </p>
                <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1">Active / Blocked Issues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold font-display text-text-primary mb-6">
            Commissioning Milestone Pipeline
          </h2>
          <div className="relative max-w-3xl mx-auto">
            {milestones.map((m, index) => (
              <TimelineNode key={m.id} m={m} index={index} totalCount={milestones.length} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WATER-TO-WIRE ──────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold font-display text-text-primary">Water-To-Wire Journey</h2>
            <p className="text-xs text-text-muted">Dynamic elevation cross-section · 11.3 MW run-of-river</p>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-xs font-mono text-[#3A8A7A]">
              <span className="h-2 w-2 rounded-full bg-[#3A8A7A] animate-pulse" />
              Water Flow (~14.2 m³/s)
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono text-[#E8A33D]">
              <span className="h-2 w-2 rounded-full bg-[#E8A33D] animate-pulse" />
              Power Transmission (Luzon Grid)
            </span>
          </div>
        </div>

        <div className="glass-card p-6 overflow-x-auto relative">
          <div className="absolute left-6 top-6 bottom-16 w-1 border-r border-white/[0.04] flex flex-col justify-between font-mono text-[9px] text-text-muted/60 select-none">
            <span>450m</span>
            <span>350m</span>
            <span>250m</span>
            <span>150m</span>
          </div>

          <svg ref={svgRef} viewBox="0 0 1200 500" className="w-full min-w-[1000px] h-auto select-none">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Terrain */}
            <path d="M 0,500 L 0,100 L 50,100 L 180,105 L 300,110 L 330,115 L 430,40 L 550,130 L 575,280 L 600,130 L 750,130 L 780,135 L 900,400 L 1200,400 L 1200,500 Z" fill="#0A1208" opacity="0.85" />
            <path d="M 0,100 L 50,100 L 180,105 L 300,110 L 330,115 L 430,40 L 550,130 L 575,280 L 600,130 L 750,130 L 780,135 L 900,400 L 1200,400" fill="none" stroke="#1b2a16" strokeWidth="2.5" />

            {/* Water track */}
            <path id="water-flow-track" d="M 50,80 L 180,85 L 300,90 L 330,95 L 550,110 L 600,112 L 750,115 L 900,380 L 980,380 L 1050,382" fill="none" stroke="rgba(58,138,122,0.15)" strokeWidth="6" strokeLinecap="round" />

            {/* Water Particles — only render once SVG is in view; CSS animation keeps running without re-renders */}
            {isSvgInView && (
              <>
                {[0, 1.25, 2.5, 3.75].map((begin) => (
                  <circle key={begin} r="3.5" fill="#3A8A7A" filter="url(#glow)">
                    <animateMotion
                      dur="5s"
                      repeatCount="indefinite"
                      path="M 50,80 L 180,85 L 300,90 L 330,95 L 550,110 L 600,112 L 750,115 L 900,380 L 980,380 L 1050,382"
                      keyPoints="0; 0.12; 0.23; 0.26; 0.47; 0.51; 0.65; 0.93; 1"
                      keyTimes="0; 0.15; 0.28; 0.32; 0.56; 0.62; 0.79; 0.92; 1"
                      begin={`${begin}s`}
                    />
                  </circle>
                ))}
              </>
            )}

            {/* Electricity track */}
            <path d="M 940,380 L 960,340 L 1010,320 L 1100,220 L 1200,180" fill="none" stroke="rgba(232,163,61,0.08)" strokeWidth="4" />
            {isSvgInView && (
              <>
                {[0, 0.5, 1].map((begin) => (
                  <circle key={begin} r="3" fill="#E8A33D" filter="url(#glow)">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path="M 940,380 L 960,340 L 1010,320 L 1100,220 L 1200,180" begin={`${begin}s`} />
                  </circle>
                ))}
              </>
            )}

            {/* Structures */}
            <polygon points="45,100 55,100 65,70 35,70" className="cursor-pointer fill-[#1e3427] hover:fill-[#2d4d3a] stroke-[#3a8a5f]" strokeWidth="1.5" onMouseEnter={() => handleHoverStructure("dam-intake", "Weir / Intake Structure", 420, 50, 70)} onMouseLeave={() => setHoveredStructure(null)} />
            <rect x="180" y="75" width="120" height="20" className="cursor-pointer fill-[#1e3427] hover:fill-[#2d4d3a] stroke-[#3a8a5f]" strokeWidth="1.5" onMouseEnter={() => handleHoverStructure("desander", "Desander Basin", 415, 240, 75)} onMouseLeave={() => setHoveredStructure(null)} />
            <line x1="330" y1="95" x2="550" y2="110" stroke="#ffea00" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="600" y1="112" x2="750" y2="115" stroke="#ffea00" strokeWidth="2" strokeDasharray="5,5" />
            <rect x="745" y="40" width="10" height="80" className="cursor-pointer fill-[#1e3427] hover:fill-[#2d4d3a] stroke-[#3a8a5f]" strokeWidth="1.5" onMouseEnter={() => handleHoverStructure("surge-tank", "Surge Tank", 410, 750, 40)} onMouseLeave={() => setHoveredStructure(null)} />
            <line x1="750" y1="115" x2="900" y2="380" stroke="#3A8A7A" strokeWidth="5.5" />
            <polygon points="890,400 970,400 970,350 940,320 890,320" className="cursor-pointer fill-[#152e3c] hover:fill-[#1e4255] stroke-[#2c7ca2]" strokeWidth="1.5" onMouseEnter={() => handleHoverStructure("powerhouse", "Powerhouse", 220, 930, 320)} onMouseLeave={() => setHoveredStructure(null)} />
            <circle cx="930" cy="370" r="10" fill="#2c7ca2" opacity="0.8" />
            <path d="M 932,364 L 926,371 L 930,371 L 928,376 L 934,369 L 930,369 Z" fill="#fff" />
            <polygon points="980,340 1020,340 1010,310 990,310" className="cursor-pointer fill-[#293214] hover:fill-[#38451c] stroke-[#7b993a]" strokeWidth="1.5" onMouseEnter={() => handleHoverStructure("switchyard", "Switchyard / Substation", 222, 1000, 310)} onMouseLeave={() => setHoveredStructure(null)} />
            <line x1="1000" y1="320" x2="1100" y2="220" stroke="#555" strokeWidth="1.5" />
            <line x1="1100" y1="220" x2="1200" y2="180" stroke="#555" strokeWidth="1.5" />

            {/* Labels */}
            <text x="50" y="60" textAnchor="middle" fill="rgba(160,180,160,0.6)" fontSize="9" fontFamily="monospace">WEIR (420m)</text>
            <text x="240" y="65" textAnchor="middle" fill="rgba(160,180,160,0.6)" fontSize="9" fontFamily="monospace">DESANDER (415m)</text>
            <text x="440" y="100" textAnchor="middle" fill="rgba(160,180,160,0.3)" fontSize="9" fontFamily="monospace" fontStyle="italic">Tunnel 1 (3km)</text>
            <text x="755" y="30" textAnchor="middle" fill="rgba(160,180,160,0.6)" fontSize="9" fontFamily="monospace">SURGE TANK (410m)</text>
            <text x="830" y="250" textAnchor="middle" fill="rgba(160,180,160,0.6)" fontSize="9" fontFamily="monospace" transform="rotate(62,830,250)">PENSTOCK</text>
            <text x="930" y="312" textAnchor="middle" fill="rgba(160,180,160,0.6)" fontSize="9" fontFamily="monospace">POWERHOUSE (220m)</text>
          </svg>

          {/* Hover Tooltip */}
          <AnimatePresence>
            {hoveredStructure && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute z-30 rounded-2xl border border-white/[0.08] bg-black/90 p-4 shadow-2xl backdrop-blur-xl pointer-events-none max-w-xs"
                style={{
                  left: `${(hoveredStructure.x / 1200) * 100}%`,
                  top: `${(hoveredStructure.y / 500) * 100 - 15}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <h4 className="text-sm font-bold text-text-primary">{hoveredStructure.name}</h4>
                <div className="mt-2 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-text-muted">Elevation:</span>
                    <span className="text-text-primary">~{hoveredStructure.elevation}m ASL</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-text-muted">Completion:</span>
                    <span className="text-flow-teal font-semibold">{hoveredStructure.completion}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-text-muted">Status:</span>
                    <span className={cn("font-semibold", (hoveredStructure.status === "COMPLETED" || hoveredStructure.status === "ACTIVE") ? "text-flow-teal" : "text-signal-amber")}>
                      {hoveredStructure.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Energy conversion cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5 relative border border-white/[0.04]">
            <span className="absolute top-3 right-3 text-xs font-mono text-[#3A8A7A]">01. HYDRAULIC</span>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Penstock Head</h3>
            <p className="font-mono text-xs text-text-muted">Net Head: ~190m</p>
            <p className="font-mono text-xs text-text-muted mt-1">Design Flow: 14.2 m³/s</p>
            <p className="text-[11px] text-text-muted/60 mt-3 leading-relaxed">Water drops diagonally, converting static potential energy to high kinetic pressure.</p>
          </div>
          <div className="glass-card p-5 relative border border-white/[0.04]">
            <span className="absolute top-3 right-3 text-xs font-mono text-[#2c7ca2]">02. MECHANICAL</span>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Powerhouse Generator</h3>
            <p className="font-mono text-xs text-text-muted">Conversion: Mechanical → Electrical</p>
            <p className="font-mono text-xs text-text-muted mt-1">Rated Output: 11.3 MW | Eff: ~92%</p>
            <p className="text-[11px] text-text-muted/60 mt-3 leading-relaxed">Francis turbines spin generators to produce alternating current electricity.</p>
          </div>
          <div className="glass-card p-5 relative border border-white/[0.04]">
            <span className="absolute top-3 right-3 text-xs font-mono text-[#E8A33D]">03. TRANSMISSION</span>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Luzon Grid Link</h3>
            <p className="font-mono text-xs text-text-muted">Output: 11.3 MW to Grid</p>
            <p className="font-mono text-xs text-text-muted mt-1">Interconnection: Step-up 69 kV</p>
            <p className="text-[11px] text-text-muted/60 mt-3 leading-relaxed">Power exits the switchyard via overhead cables directly to grid dispatch.</p>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: COMPLETION RINGS ───────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-display text-text-primary">Zone Completion Gauges</h2>

        {/* Master Ring */}
        <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-8 justify-center">
          <div className="relative h-[200px] w-[200px] flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
              <motion.circle
                cx="50" cy="50" r="40"
                stroke="#1FB6A6" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - averageCompletion / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round" fill="transparent"
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-4xl font-bold font-display text-text-primary">{averageCompletion}%</span>
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mt-1">Average Completion</p>
            </div>
          </div>
          <div className="max-w-md text-center md:text-left space-y-2">
            <h3 className="text-md font-bold text-text-primary">Total Site Summary</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Weighted average physical progress across all sitemap-indexed structures.
            </p>
          </div>
        </div>

        {/* Zone Rings Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
        >
          {locations.map((loc) => {
            const pct = loc.percentComplete;
            const arcColor = arcColorForPct(pct);

            return (
              <motion.div
                key={loc.id}
                variants={ringVariants}
                className="glass-card p-5 flex flex-col justify-between items-center text-center relative hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="relative h-[130px] w-[130px] flex items-center justify-center mb-4">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" />
                    <motion.circle
                      cx="50" cy="50" r="38"
                      stroke={arcColor} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - pct / 100) }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round" fill="transparent"
                    />
                  </svg>
                  <div className="text-center z-10">
                    <span className="text-2xl font-bold font-display text-text-primary">{pct}%</span>
                  </div>
                </div>

                <div className="space-y-1 w-full">
                  <h4 className="text-sm font-semibold text-text-primary truncate">{loc.name}</h4>
                  <p className="text-[10px] text-text-muted font-mono">{loc.slug.toUpperCase()}</p>
                </div>

                {snapshots.length > 0 && (
                  <div className="h-8 w-full mt-4 bg-white/[0.01] rounded-lg overflow-hidden border border-white/[0.02]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={snapshots}>
                        <Line type="monotone" dataKey="percentComplete" stroke={arcColor} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="mt-4">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border",
                    (loc.status === "COMPLETED" || loc.status === "ACTIVE") && "bg-flow-teal/10 border-flow-teal/20 text-flow-teal",
                    loc.status === "SUSPENDED" && "bg-signal-amber/10 border-signal-amber/20 text-signal-amber"
                  )}>
                    {loc.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}

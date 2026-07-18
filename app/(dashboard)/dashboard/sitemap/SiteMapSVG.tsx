"use client";

import { useState, useRef, useEffect } from "react";
import type {  SiteLocation  } from "@prisma/client";
import { Maximize, Minimize } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface SiteMapSVGProps {
  locations: SiteLocation[];
  activeSlug: string | null;
  selectedSlug: string | null;
  onHover: (slug: string | null) => void;
  onClick: (slug: string) => void;
  viewMode: "completion" | "equipment";
  onViewModeChange: (mode: "completion" | "equipment") => void;
  equipmentCounts: Record<string, number>;
  isWorkingHours: boolean;
}

export function SiteMapSVG({
  locations,
  activeSlug,
  selectedSlug,
  onHover,
  onClick,
  viewMode,
  onViewModeChange,
  equipmentCounts,
  isWorkingHours,
}: SiteMapSVGProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showNightTooltip, setShowNightTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  const loc = (slug: string) => locations.find(l => l.slug === slug);
  const isDark = !mounted || resolvedTheme !== "light";
  
  // Hover & selection states
  const effective = activeSlug ?? hoveredSlug;

  const handleEnter = (slug: string) => {
    setHoveredSlug(slug);
    onHover(slug);
  };
  
  const handleLeave = () => {
    setHoveredSlug(null);
    onHover(null);
  };

  const handleClick = (slug: string) => onClick(slug);

  const pct = (slug: string) => `${loc(slug)?.percentComplete ?? 0}%`;

  // Colors based on structure categories
  const getMaterialColors = (slug: string) => {
    switch (slug) {
      // Concrete/Civil
      case "dam-intake":
      case "desander":
      case "feeder-canal":
      case "tunnel-transition":
      case "tunnel-1":
      case "tunnel-2":
        return {
          fill: "#1A2228",
          stroke: "#4A6572",
          details: "#2D3E47"
        };
      // Steel/Mechanical
      case "penstock":
      case "pipe-bridge":
      case "pipe-crossing":
        return {
          fill: "#1C2830",
          stroke: "#5B7A8A",
          details: "#425C6B",
          highlight: "#7A9CAD"
        };
      // Electrical/Power
      case "switchyard":
        return {
          fill: "#2A2010",
          stroke: "#C8882A",
          details: "#45331C"
        };
      case "powerhouse":
        return {
          fill: "#1E1E14",
          stroke: "#8A9A3A",
          details: "#353D1C"
        };
      // Hydraulic
      case "surge-tank":
        return {
          fill: "#1A2228",
          stroke: "#4A6572",
          details: "#2D3E47"
        };
      case "tailrace":
        return {
          fill: "url(#tailraceGrad)",
          stroke: "#4A6572",
          details: "#2D3E47"
        };
      default: // access-road
        return {
          fill: "#1E252B",
          stroke: "#4A6572",
          details: "#2D3E47"
        };
    }
  };

  // Get zone style including A5 working hours and B5 pulse effect
  const zoneStyle = (slug: string): React.CSSProperties => {
    const isSelected = selectedSlug === slug;
    const locObj = loc(slug);
    const status = locObj?.status ?? "ACTIVE";
    const percentComplete = locObj?.percentComplete ?? 0;

    // Normal state opacity
    let opacity = 0.85;
    if (effective !== null || selectedSlug !== null) {
      opacity = (effective === slug || isSelected) ? 1.0 : 0.25;
    }

    // Nighttime dims construction zones
    if (!isWorkingHours && !isSelected && effective !== slug) {
      const isConstruction = !["powerhouse", "switchyard", "access-road"].includes(slug);
      opacity = isConstruction ? 0.55 : 0.9;
    }

    // Custom glow effects
    let filter = "none";
    if (isSelected || effective === slug) {
      const glowColor = status === "SUSPENDED" ? "rgba(214, 72, 63, 0.85)" :
                        (percentComplete >= 100 || status === "COMPLETED" ? "rgba(31, 182, 166, 0.85)" : "rgba(232, 163, 61, 0.85)");
      filter = `drop-shadow(0 0 14px ${glowColor})`;
    } else if (!isWorkingHours && (slug === "powerhouse" || slug === "switchyard")) {
      // Powered zones glow at night
      filter = `drop-shadow(0 0 16px rgba(232, 163, 61, 0.9))`;
    }

    return {
      cursor: "pointer",
      pointerEvents: "all",
      opacity,
      filter,
      transition: "opacity 0.25s ease, filter 0.25s ease",
    };
  };

  // Pulse class based on status
  const getZonePulseClass = (slug: string) => {
    if (selectedSlug === slug || effective === slug) return "";
    const locObj = loc(slug);
    if (!locObj) return "";
    if (locObj.status === "SUSPENDED") return "zone-pulse-red";
    if ((locObj.percentComplete ?? 0) >= 100 || locObj.status === "COMPLETED") return "zone-glow-teal";
    return "zone-pulse-amber"; // IN_PROGRESS
  };

  // Completion based visual configurations (Scaffolding & Helmet placement)
  const renderZoneProgressDecoration = (
    slug: string,
    shapeType: "rect" | "path" | "polygon",
    shapeProps: Record<string, string | number | undefined>
  ) => {
    const locObj = loc(slug);
    if (!locObj) return null;
    const pVal = locObj.percentComplete ?? 0;

    if (pVal >= 90) {
      // Inner highlight overlay
      return (
        <g opacity="0.3" pointerEvents="none">
          {shapeType === "rect" && (
            <rect
              {...shapeProps}
              x={Number(shapeProps.x) + 1}
              y={Number(shapeProps.y) + 1}
              width={Math.max(0, Number(shapeProps.width) - 2)}
              height={Math.max(0, Number(shapeProps.height) - 2)}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          )}
          {shapeType === "path" && (
            <path
              d={shapeProps.d as string | undefined}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              transform="scale(0.98) translate(1%, 1%)"
            />
          )}
        </g>
      );
    }

    return (
      <g pointerEvents="none">
        {/* Fill overlay to lighten unfinished surfaces if heavy construction */}
        {pVal < 50 && (
          <>
            {shapeType === "rect" && <rect {...shapeProps} fill="#ffffff" fillOpacity="0.08" stroke="none" />}
            {shapeType === "path" && <path d={shapeProps.d as string | undefined} fill="#ffffff" fillOpacity="0.08" stroke="none" />}
            {shapeType === "polygon" && <polygon points={shapeProps.points as string | undefined} fill="#ffffff" fillOpacity="0.08" stroke="none" />}
          </>
        )}
        
        {/* Scaffolding pattern removed per user request - relying on dash array & opacity */}
      </g>
    );
  };

  // Stroke dashes configuration
  const getStrokeDash = (slug: string) => {
    const locObj = loc(slug);
    if (locObj && (locObj.percentComplete ?? 0) < 50) {
      return "4 3";
    }
    return "none";
  };

  // Badge coordinate map for B4 Equipment density view
  const badgeCoords: Record<string, { x: number; y: number }> = {
    "dam-intake": { x: 110, y: 210 },
    "feeder-canal": { x: 165, y: 195 },
    "desander": { x: 235, y: 195 },
    "tunnel-transition": { x: 300, y: 195 },
    "tunnel-1": { x: 380, y: 195 },
    "pipe-crossing": { x: 470, y: 195 },
    "tunnel-2": { x: 535, y: 195 },
    "surge-tank": { x: 605, y: 180 },
    "penstock": { x: 625, y: 250 },
    "pipe-bridge": { x: 685, y: 365 },
    "powerhouse": { x: 740, y: 440 },
    "tailrace": { x: 812, y: 450 },
    "switchyard": { x: 840, y: 342 },
    "access-road": { x: 480, y: 490 }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative select-none rounded-2xl border border-border-hairline overflow-hidden shadow-2xl transition-all duration-300",
        isFullscreen ? "w-screen h-screen bg-bg-base flex items-center justify-center" : "w-full h-[65vh] min-h-[500px] bg-bg-base"
      )}
    >
      {/* Self-contained style sheet for status glows and keyframe pulses */}
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        .zone-pulse-amber {
          animation: pulse-opacity 3.5s ease-in-out infinite;
        }
        .zone-glow-teal {
          opacity: 1;
        }
        .zone-pulse-red {
          animation: pulse-opacity 2s ease-in-out infinite;
        }
        @keyframes spin-turbine {
          100% { transform: rotate(360deg); }
        }
        .spin-fast-720 { transform-origin: 720px 447px; animation: spin-turbine 3s linear infinite; }
        .spin-slow-760 { transform-origin: 760px 447px; animation: spin-turbine 4s linear infinite; }
        @keyframes flow-current {
          to {
            stroke-dashoffset: -200;
          }
        }
        .river-flow-fast {
          animation: flow-current 4s linear infinite;
        }
        .river-flow-medium {
          animation: flow-current 6s linear infinite;
        }
        .river-flow-slow {
          animation: flow-current 8s linear infinite;
        }
        /* ═══ ZONE ENHANCEMENT ANIMATIONS ═══ */
        @keyframes water-shimmer { 0%,100% { opacity: 0.15; } 50% { opacity: 0.5; } }
        .water-shimmer { animation: water-shimmer 3s ease-in-out infinite; }
        .water-shimmer-d1 { animation: water-shimmer 3.5s ease-in-out infinite 0.5s; }
        .water-shimmer-d2 { animation: water-shimmer 4s ease-in-out infinite 1.2s; }
        @keyframes gate-vibrate { 0%,100% { transform: translateY(0); } 25% { transform: translateY(0.5px); } 75% { transform: translateY(-0.5px); } }
        .gate-vibrate { animation: gate-vibrate 1.5s ease-in-out infinite; }
        @keyframes bubble-rise { 0% { transform: translateY(0); opacity: 0.6; } 100% { transform: translateY(-18px); opacity: 0; } }
        .bubble-1 { animation: bubble-rise 3s ease-out infinite; }
        .bubble-2 { animation: bubble-rise 4s ease-out infinite 1.2s; }
        .bubble-3 { animation: bubble-rise 3.5s ease-out infinite 2.1s; }
        @keyframes spark-flash { 0%,60%,100% { opacity: 0; } 65%,85% { opacity: 0.9; } }
        .spark-1 { animation: spark-flash 2s ease-in-out infinite; }
        .spark-2 { animation: spark-flash 2.8s ease-in-out infinite 0.4s; }
        .spark-3 { animation: spark-flash 1.6s ease-in-out infinite 1s; }
        .spark-4 { animation: spark-flash 3.2s ease-in-out infinite 0.7s; }
        @keyframes ind-blink { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
        .ind-blink { animation: ind-blink 2s ease-in-out infinite; }
        .ind-blink-d1 { animation: ind-blink 2.5s ease-in-out infinite 0.6s; }
        @keyframes pressure-pulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.7; } }
        .pressure-pulse { animation: pressure-pulse 2s ease-in-out infinite; }
        @keyframes ripple-fade { 0% { opacity: 0.5; } 100% { opacity: 0; } }
        .ripple-1 { animation: ripple-fade 3s ease-out infinite; }
        .ripple-2 { animation: ripple-fade 3s ease-out infinite 1s; }
        .ripple-3 { animation: ripple-fade 3s ease-out infinite 2s; }
        @keyframes sed-fall { 0% { transform: translateY(0); opacity: 0.45; } 100% { transform: translateY(18px); opacity: 0; } }
        .sed-1 { animation: sed-fall 4s ease-in infinite; }
        .sed-2 { animation: sed-fall 5s ease-in infinite 1.5s; }
        .sed-3 { animation: sed-fall 3.5s ease-in infinite 2.8s; }
        @keyframes drip-down { 0% { transform: translateY(0); opacity: 0.5; } 100% { transform: translateY(8px); opacity: 0; } }
        .drip-1 { animation: drip-down 3s ease-in infinite; }
        .drip-2 { animation: drip-down 4.5s ease-in infinite 2s; }
        @keyframes foam-float { 0% { transform: translateX(0); opacity: 0.5; } 100% { transform: translateX(30px); opacity: 0; } }
        .foam-1 { animation: foam-float 2.5s linear infinite; }
        .foam-2 { animation: foam-float 3s linear infinite 0.7s; }
        .foam-3 { animation: foam-float 3.5s linear infinite 1.4s; }
        .foam-4 { animation: foam-float 4s linear infinite 2.1s; }
        @keyframes power-arc { 0%,100% { opacity: 0; } 5% { opacity: 0.9; } 10% { opacity: 0; } 15% { opacity: 0.6; } 25%,100% { opacity: 0; } }
        .arc-1 { animation: power-arc 4s ease-in-out infinite; }
        .arc-2 { animation: power-arc 5.5s ease-in-out infinite 2s; }
        @keyframes penstock-rush { to { stroke-dashoffset: -100; } }
        .penstock-flow { animation: penstock-rush 1.5s linear infinite; }
        @keyframes mist-drift { 0% { transform: translateX(0) translateY(0); opacity: 0.3; } 100% { transform: translateX(8px) translateY(-5px); opacity: 0; } }
        .mist-1 { animation: mist-drift 4s ease-out infinite; }
        .mist-2 { animation: mist-drift 5s ease-out infinite 1.5s; }
        .mist-3 { animation: mist-drift 6s ease-out infinite 3s; }
        @keyframes vehicle-drive { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -1400; } }
        .vehicle-drive { animation: vehicle-drive 20s linear infinite; }
        @keyframes glow-breathe { 0%,100% { opacity: 0.1; } 50% { opacity: 0.4; } }
        .glow-breathe { animation: glow-breathe 3s ease-in-out infinite; }
        .glow-breathe-d1 { animation: glow-breathe 4s ease-in-out infinite 1s; }
      `}</style>

      {/* Toolbar / Overlays Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-bg-panel p-1 border border-border-hairline shadow-lg">
          <button
            onClick={() => onViewModeChange("completion")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200",
              viewMode === "completion"
                ? "bg-white text-text-primary dark:bg-white/10 dark:text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            📊 Completion
          </button>
          <button
            onClick={() => onViewModeChange("equipment")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200",
              viewMode === "equipment"
                ? "bg-white text-text-primary dark:bg-white/10 dark:text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            ⚙️ Equipment
          </button>
        </div>

        <button 
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-bg-panel hover:bg-bg-panel-hover text-text-muted hover:text-text-primary transition-colors border border-border-hairline shadow-lg"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      {/* Dot Grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "24px 24px" }} />

      <svg viewBox="0 0 1000 560" className="w-full h-full max-h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* River Linear Gradient - Static to avoid heavy SVG container repaint lag */}
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#0D4A5A" : "#86efac"} />
            <stop offset="50%" stopColor={isDark ? "#1A7A8A" : "#22d3ee"} />
            <stop offset="100%" stopColor={isDark ? "#0D4A5A" : "#86efac"} />
          </linearGradient>

          {/* Tailrace Linear Gradient */}
          <linearGradient id="tailraceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1A2228" />
            <stop offset="100%" stopColor={isDark ? "#0D4A5A" : "#86efac"} />
          </linearGradient>

          {/* Surge Tank Water Gradient */}
          <linearGradient id="surgeWaterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>

          {/* Mountain Gradient left-to-right (Sierra Madre and Valley transition) */}
          <linearGradient id="leftMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#0A1208" : "#94A3B8"} />
            <stop offset="100%" stopColor={isDark ? "#162018" : "#CBD5E1"} />
          </linearGradient>
          <linearGradient id="rightMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#0E1A10" : "#CBD5E1"} />
            <stop offset="100%" stopColor={isDark ? "#1C241E" : "#E2E8F0"} />
          </linearGradient>

          {/* Terrain Background Gradient */}
          <radialGradient id="terrainBgGrad" cx="10%" cy="10%" r="100%">
            <stop offset="0%" stopColor={isDark ? "#050C0A" : "#F1F5F9"} />
            <stop offset="100%" stopColor={isDark ? "#12241A" : "#E2E8F0"} />
          </radialGradient>

          {/* Water Circuit Glow Filter */}
          <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Premium Water Glow - Soft cyan neon for water elements */}
          <filter id="waterGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Electric Glow - Amber/yellow neon for switchyard */}
          <filter id="electricGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feColorMatrix in="blur1" type="matrix" values="1.2 0.8 0 0 0  0.8 0.6 0 0 0  0 0 0.2 0 0  0 0 0 0.6 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Turbine Glow - Green neon for powerhouse */}
          <filter id="turbineGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
            <feColorMatrix in="blur1" type="matrix" values="0 0.5 0.3 0 0  0.2 0.8 0.5 0 0  0.1 0.5 0.3 0 0  0 0 0 0.5 0" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft Mist Filter */}
          <filter id="mistBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>

          {/* Water Caustics Pattern */}
          <filter id="waterCaustics" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="2" result="noise">
              <animate attributeName="seed" from="1" to="10" dur="8s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>


          {/* Sparkle/Helmet Approximation (✦) */}
          <g id="helmetIcon">
            <path d="M 0,-4 Q 0,0 4,0 Q 0,0 0,4 Q 0,0 -4,0 Q 0,0 0,-4" fill="#C8882A" opacity="0.9" />
          </g>
        </defs>

        {/* ═══ BACKGROUND TERRAIN GRADIENT ═══ */}
        <rect width="1000" height="560" fill="url(#terrainBgGrad)" />

        {/* Sierra Madre foothills - Steeper, dense dark forest profiles */}
        <path d="M0,320 L50,150 L110,250 L170,120 L240,240 L310,170 L390,280 L440,220 L520,340 L520,560 L0,560 Z" fill="url(#leftMountainGrad)" opacity="0.6" />
        
        {/* Triangles for tree silhouettes on leftmost peak */}
        <g fill={isDark ? "#050C0A" : "#64748B"} opacity="0.8">
          <polygon points="45,150 50,140 55,150" />
          <polygon points="51,152 56,142 61,152" />
          <polygon points="38,155 42,146 46,155" />
        </g>

        {/* Cagayan Valley - Flatter, open profiles */}
        <path d="M480,340 L580,280 L680,310 L780,260 L880,290 L960,250 L1000,270 L1000,560 L480,560 Z" fill="url(#rightMountainGrad)" opacity="0.4" />
        <path d="M440,220 L600,220 L740,440 L600,440 Z" fill="var(--bg-panel-raised)" opacity="0.4" />

        {/* ═══ RIVER REALISM ═══ */}
        {/* River main reservoir upstream (narrower) */}
        <path d="M0,175 Q50,170 90,175 L95,225 Q50,230 0,225 Z" fill="url(#riverGrad)" opacity="0.75" />
        <path d="M90,185 L135,185 L135,205 L95,205 Z" fill="url(#riverGrad)" opacity="0.75" />

        {/* Downstream (Wider Cagayan River emerging under powerhouse and tailrace) */}
        <path d="M840,445 Q900,435 1000,430 L1000,495 Q900,490 840,475 Z" fill="url(#riverGrad)" opacity="0.8" />

        {/* Upstream flowing river currents */}
        <path d="M0,195 Q50,190 90,195 T135,195" fill="none" stroke={isDark ? "#22d3ee" : "#0D7A6A"} strokeWidth="1.2" strokeDasharray="8 12" opacity="0.4" className="river-flow-fast" />
        <path d="M0,210 Q50,205 90,210 T135,202" fill="none" stroke={isDark ? "#1FB6A6" : "#0A5C50"} strokeWidth="1.0" strokeDasharray="12 18" opacity="0.3" className="river-flow-medium" />
        {/* Upstream water caustics shimmer */}
        <rect x="0" y="178" width="90" height="45" fill="url(#riverGrad)" opacity="0.15" filter="url(#waterCaustics)" />

        {/* Downstream flowing river currents */}
        <path d="M840,455 Q900,445 1000,440" fill="none" stroke={isDark ? "#22D3EE" : "#0D7A6A"} strokeWidth="1.8" strokeDasharray="14 20" opacity="0.55" className="river-flow-fast" />
        <path d="M840,468 Q900,458 1000,453" fill="none" stroke={isDark ? "#1FB6A6" : "#0A5C50"} strokeWidth="1.2" strokeDasharray="10 15" opacity="0.45" className="river-flow-medium" />
        <path d="M840,480 Q900,473 1000,468" fill="none" stroke={isDark ? "#22D3EE" : "#0D7A6A"} strokeWidth="1.5" strokeDasharray="16 24" opacity="0.4" className="river-flow-slow" />
        {/* Downstream water caustics shimmer */}
        <rect x="840" y="435" width="160" height="55" fill="url(#riverGrad)" opacity="0.12" filter="url(#waterCaustics)" />

        {/* Foam & bubble particles flowing downstream from tailrace */}
        <circle r="2" fill="#22D3EE" opacity="0.5" filter="url(#waterGlow)">
          <animateMotion dur="6s" repeatCount="indefinite" path="M840,455 Q900,445 1000,440" />
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle r="1.5" fill="#1FB6A6" opacity="0.4">
          <animateMotion dur="8s" repeatCount="indefinite" path="M840,468 Q900,458 1000,453" begin="1s" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="1.8" fill="#22D3EE" opacity="0.35" filter="url(#waterGlow)">
          <animateMotion dur="7s" repeatCount="indefinite" path="M840,460 Q900,450 1000,445" begin="2.5s" />
          <animate attributeName="opacity" values="0.35;0.1;0.35" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle r="1" fill="#ffffff" opacity="0.5">
          <animateMotion dur="5s" repeatCount="indefinite" path="M840,475 Q900,465 1000,460" begin="0.5s" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle r="1.2" fill="#1FB6A6" opacity="0.3">
          <animateMotion dur="9s" repeatCount="indefinite" path="M840,480 Q900,473 1000,468" begin="3s" />
        </circle>

        {/* Upstream floating particles */}
        <circle r="1.5" fill="#22D3EE" opacity="0.3">
          <animateMotion dur="7s" repeatCount="indefinite" path="M0,195 Q50,190 90,195" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle r="1" fill="#1FB6A6" opacity="0.25">
          <animateMotion dur="9s" repeatCount="indefinite" path="M0,210 Q50,205 90,210" begin="2s" />
        </circle>

        {/* Static turbulence ripples near tailrace outfall */}
        <g stroke={isDark ? "#22D3EE" : "#0D7A6A"} strokeWidth="1.2" fill="none" opacity="0.6" filter="url(#waterGlow)">
          <path d="M785,456 Q800,458 815,456" />
          <path d="M795,456 Q815,461 835,456" />
          <path d="M805,456 Q830,464 855,456" />
        </g>
        
        {/* Static direction chevrons near outfall */}
        <g stroke={isDark ? "#22D3EE" : "#0D7A6A"} strokeWidth="1.5" fill="none" opacity="0.65">
          <path d="M 846,444 L 850,447 L 846,450" />
          <path d="M 853,450 L 857,454 L 853,458" />
          <path d="M 849,460 L 853,463 L 849,466" />
          <path d="M 861,447 L 865,450 L 861,453" />
        </g>

        {/* ═══ WATER FLOW ARROWS (static) ═══ */}
        <path d="M750,415 L775,415 L775,342 L790,342" fill="none" stroke={isDark ? "#1FB6A6" : "#0D7A6A"} strokeWidth="1.2" strokeDasharray="6 3" opacity="0.4" className="river-flow-fast">
        </path>

        {/* ═══ ZONE: WEIR / INTAKE ═══ */}
        <g 
          className={getZonePulseClass("dam-intake")}
          style={zoneStyle("dam-intake")} 
          onMouseEnter={() => handleEnter("dam-intake")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("dam-intake")}
        >
          <rect x="75" y="140" width="60" height="110" fill="transparent" />
          {/* Weir base concrete shape */}
          <path 
            d="M85,160 L135,160 L130,232 L90,232 Z" 
            fill={getMaterialColors("dam-intake").fill} 
            stroke={getMaterialColors("dam-intake").stroke} 
            strokeWidth={effective === "dam-intake" ? 2.5 : 1.5}
            strokeDasharray={getStrokeDash("dam-intake")}
          />
          {/* Intake Gate details */}
          <rect x="100" y="178" width="22" height="36" rx="2" fill={getMaterialColors("dam-intake").details} stroke={getMaterialColors("dam-intake").stroke} strokeWidth="1" />
          <line x1="105" y1="188" x2="117" y2="188" stroke={getMaterialColors("dam-intake").stroke} strokeWidth="0.8" opacity="0.6" />
          <line x1="105" y1="198" x2="117" y2="198" stroke={getMaterialColors("dam-intake").stroke} strokeWidth="0.8" opacity="0.6" />
          <line x1="105" y1="208" x2="117" y2="208" stroke={getMaterialColors("dam-intake").stroke} strokeWidth="0.8" opacity="0.6" />
          
          {/* Water overflow trickling */}
          <path d="M130,212 Q140,218 133,228" fill="none" stroke="#22D3EE" strokeWidth="1" opacity="0.35" className="zone-pulse-red" />
          
          {/* Animated water overflow - dual trickle */}
          <path d="M88,220 Q82,226 85,234" fill="none" stroke="#22D3EE" strokeWidth="0.8" opacity="0.3" className="water-shimmer-d1" />
          {/* Intake gate hydraulic vibration */}
          <g className="gate-vibrate">
            <rect x="102" y="180" width="18" height="32" rx="1" fill="none" stroke="#22D3EE" strokeWidth="0.5" opacity="0.2" />
          </g>
          {/* Water ripples at dam base - with glow */}
          <g filter="url(#waterGlow)">
            <circle cx="110" cy="232" r="2" fill="none" stroke="#22D3EE" strokeWidth="0.4" className="ripple-1" />
            <circle cx="110" cy="232" r="4" fill="none" stroke="#22D3EE" strokeWidth="0.3" className="ripple-2" />
            <circle cx="110" cy="232" r="6" fill="none" stroke="#22D3EE" strokeWidth="0.2" className="ripple-3" />
          </g>
          {/* Mist spray particles with blur */}
          <g filter="url(#mistBlur)">
            <circle cx="133" cy="222" r="1.8" fill="#22D3EE" className="mist-1" />
            <circle cx="137" cy="218" r="1.4" fill="#22D3EE" className="mist-2" />
            <circle cx="130" cy="216" r="1.2" fill="#22D3EE" className="mist-3" />
            <circle cx="126" cy="220" r="1" fill="#1FB6A6" className="mist-2" />
          </g>
          {/* Animated waterfall cascade - water drops falling over weir face */}
          <circle r="0.8" fill="#22D3EE" opacity="0.6">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M130,175 Q135,195 133,228" />
            <animate attributeName="opacity" values="0.6;0.3;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle r="0.6" fill="#1FB6A6" opacity="0.5">
            <animateMotion dur="2s" repeatCount="indefinite" path="M128,180 Q134,200 132,230" begin="0.5s" />
            <animate attributeName="opacity" values="0.5;0.2;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r="0.7" fill="#22D3EE" opacity="0.4">
            <animateMotion dur="1.8s" repeatCount="indefinite" path="M132,170 Q136,190 134,225" begin="1s" />
            <animate attributeName="opacity" values="0.4;0.15;0" dur="1.8s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("dam-intake", "path", { d: "M85,160 L135,160 L130,232 L90,232 Z" })}

          <text x="107.5" y="150" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8.5" fontWeight="700" letterSpacing="0.8" fontFamily="var(--font-display)">WEIR / INTAKE</text>
          <text x="107.5" y="252" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("dam-intake")}</text>
        </g>

        {/* ═══ ZONE: FEEDER CANAL ═══ */}
        <g 
          className={getZonePulseClass("feeder-canal")}
          style={zoneStyle("feeder-canal")} 
          onMouseEnter={() => handleEnter("feeder-canal")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("feeder-canal")}
        >
          <rect x="135" y="145" width="60" height="95" fill="transparent" />
          {/* Water fill */}
          <rect x="135" y="186" width="60" height="18" fill="url(#riverGrad)" opacity="0.6" />
          
          {/* Concrete border lines */}
          <line x1="135" y1="185" x2="195" y2="185" stroke={getMaterialColors("feeder-canal").stroke} strokeWidth={effective === "feeder-canal" ? 2 : 1.2} strokeDasharray={getStrokeDash("feeder-canal")} />
          <line x1="135" y1="205" x2="195" y2="205" stroke={getMaterialColors("feeder-canal").stroke} strokeWidth={effective === "feeder-canal" ? 2 : 1.2} strokeDasharray={getStrokeDash("feeder-canal")} />
          
          {/* Active Flowing current dash lines */}
          <line x1="135" y1="195" x2="195" y2="195" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.4" className="river-flow-fast" />

          {/* Multi-layer water surface shimmer with caustics */}
          <rect x="137" y="188" width="56" height="14" rx="1" fill="url(#riverGrad)" opacity="0.12" filter="url(#waterCaustics)" />
          <rect x="137" y="190" width="56" height="3" rx="1" fill="#22D3EE" className="water-shimmer" filter="url(#waterGlow)" />
          <rect x="140" y="198" width="50" height="2" rx="1" fill="#22D3EE" className="water-shimmer-d1" />
          {/* Secondary flow current */}
          <line x1="135" y1="200" x2="195" y2="200" stroke="#1FB6A6" strokeWidth="1" strokeDasharray="3 7" opacity="0.3" className="river-flow-medium" />
          {/* Floating debris particles */}
          <circle cx="150" cy="194" r="0.6" fill="#22D3EE" className="foam-1" />
          <circle cx="170" cy="196" r="0.5" fill="#1FB6A6" className="foam-2" />
          {/* Animated water particle flowing through canal */}
          <circle r="1" fill="#22D3EE" opacity="0.4" filter="url(#waterGlow)">
            <animateMotion dur="3s" repeatCount="indefinite" path="M135,195 L195,195" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("feeder-canal", "rect", { x: 135, y: 185, width: 60, height: 20 })}

          <text x="165" y="244" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8" fontWeight="700" letterSpacing="0.6" fontFamily="var(--font-display)">FEEDER CANAL</text>
          <text x="165" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("feeder-canal")}</text>
        </g>

        {/* ═══ ZONE: DESANDER ═══ */}
        <g 
          className={getZonePulseClass("desander")}
          style={zoneStyle("desander")} 
          onMouseEnter={() => handleEnter("desander")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("desander")}
        >
          <rect x="195" y="145" width="80" height="95" fill="transparent" />
          {/* Tapered concrete basin */}
          <path 
            d="M195,175 L265,175 L275,182 L275,208 L265,215 L195,215 Z" 
            fill={getMaterialColors("desander").fill} 
            stroke={getMaterialColors("desander").stroke} 
            strokeWidth={effective === "desander" ? 2.5 : 1.5}
            strokeDasharray={getStrokeDash("desander")}
          />
          {/* Internal concrete joint walls */}
          <path d="M195,188 L265,188 L270,192" fill="none" stroke={getMaterialColors("desander").details} strokeWidth="0.8" opacity="0.6" />
          <path d="M195,202 L265,202 L270,198" fill="none" stroke={getMaterialColors("desander").details} strokeWidth="0.8" opacity="0.6" />
          
          {/* Sediment collector shape */}
          <path d="M201,185 L209,185 L206,192 L206,202 L204,202 L204,192 Z" fill="none" stroke={getMaterialColors("desander").stroke} strokeWidth="1.2" opacity="0.7" />

          {/* Settling sediment particles with amber tint */}
          <circle cx="220" cy="182" r="1" fill="#C8882A" className="sed-1" />
          <circle cx="240" cy="180" r="0.8" fill="#C8882A" className="sed-2" />
          <circle cx="255" cy="183" r="1.1" fill="#C8882A" className="sed-3" />
          {/* Internal flow current through basin */}
          <line x1="197" y1="195" x2="273" y2="195" stroke="#22D3EE" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" className="river-flow-medium" filter="url(#waterGlow)" />
          {/* Clean water outflow shimmer */}
          <rect x="270" y="192" width="5" height="8" rx="1" fill="#22D3EE" className="water-shimmer" filter="url(#waterGlow)" />
          {/* Animated vortex swirl - sediment settling pattern */}
          <circle r="0.6" fill="#C8882A" opacity="0.35">
            <animateMotion dur="5s" repeatCount="indefinite" path="M230,182 Q250,178 260,190 Q250,200 230,198 Q220,190 230,182" />
            <animate attributeName="opacity" values="0.35;0.15;0.35" dur="2.5s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("desander", "path", { d: "M195,175 L265,175 L275,182 L275,208 L265,215 L195,215 Z" })}

          <text x="235" y="162" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8.5" fontWeight="700" letterSpacing="0.8" fontFamily="var(--font-display)">DESANDER</text>
          <text x="235" y="232" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("desander")}</text>
        </g>

        {/* ═══ ZONE: TUNNEL TRANSITION ═══ */}
        <g 
          className={getZonePulseClass("tunnel-transition")}
          style={zoneStyle("tunnel-transition")} 
          onMouseEnter={() => handleEnter("tunnel-transition")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("tunnel-transition")}
        >
          <rect x="275" y="145" width="35" height="95" fill="transparent" />
          {/* Narrowing concrete transition */}
          <path d="M275,175 L297,185 L297,205 L275,215 Z" fill="none" stroke={getMaterialColors("tunnel-transition").stroke} strokeWidth="1.2" />
          <path d="M275,178 L297,187 L297,203 L275,212 Z" fill="url(#riverGrad)" opacity="0.5" />
          
          {/* Main concrete headwall portal */}
          <rect 
            x="297" y="170" width="13" height="50" 
            fill={getMaterialColors("tunnel-transition").fill} 
            stroke={getMaterialColors("tunnel-transition").stroke} 
            strokeWidth={effective === "tunnel-transition" ? 2.2 : 1.5}
            strokeDasharray={getStrokeDash("tunnel-transition")}
            rx="1" 
          />
          {/* Coping slab */}
          <rect x="295" y="167" width="17" height="4" fill={getMaterialColors("tunnel-transition").stroke} stroke="none" opacity="0.8" />
          <line x1="297" y1="180" x2="310" y2="180" stroke={getMaterialColors("tunnel-transition").details} strokeWidth="0.8" opacity="0.6" />
          <line x1="297" y1="210" x2="310" y2="210" stroke={getMaterialColors("tunnel-transition").details} strokeWidth="0.8" opacity="0.6" />
          
          {/* Tunnel entrance void */}
          <path d="M305,187 L300,187 Q297,187 297,195 Q297,203 300,203 L305,203 Z" fill="#0B1418" stroke={getMaterialColors("tunnel-transition").stroke} strokeWidth="0.8" />

          {/* Portal entrance glow - enhanced neon */}
          <rect x="298" y="188" width="6" height="14" rx="1" fill="#22D3EE" className="glow-breathe" filter="url(#waterGlow)" />
          {/* Water flow entering portal */}
          <line x1="280" y1="195" x2="305" y2="195" stroke="#22D3EE" strokeWidth="1" strokeDasharray="3 5" opacity="0.3" className="river-flow-fast" filter="url(#waterGlow)" />
          {/* Moisture drips from ceiling */}
          <circle cx="300" cy="172" r="0.6" fill="#22D3EE" className="drip-1" />
          <circle cx="307" cy="174" r="0.5" fill="#22D3EE" className="drip-2" />
          {/* Animated water rush into portal */}
          <circle r="1" fill="#22D3EE" opacity="0.5" filter="url(#waterGlow)">
            <animateMotion dur="2s" repeatCount="indefinite" path="M280,195 L305,195" />
            <animate attributeName="opacity" values="0.5;0.2;0" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("tunnel-transition", "rect", { x: 297, y: 170, width: 13, height: 50 })}

          <text x="292.5" y="155" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="7" fontWeight="800" letterSpacing="0.5" fontFamily="var(--font-display)">TRANSITION</text>
          <text x="292.5" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("tunnel-transition")}</text>
        </g>

        {/* ═══ ZONE: TUNNEL 1 (3KM) ═══ */}
        <g 
          className={getZonePulseClass("tunnel-1")}
          style={zoneStyle("tunnel-1")} 
          onMouseEnter={() => handleEnter("tunnel-1")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("tunnel-1")}
        >
          <rect x="310" y="155" width="140" height="70" fill="transparent" />
          {/* Underground concrete tunnel */}
          <rect 
            x="310" y="187" width="140" height="16" rx="8" 
            fill={getMaterialColors("tunnel-1").fill} 
            stroke={getMaterialColors("tunnel-1").stroke} 
            strokeWidth={effective === "tunnel-1" ? 2 : 1.2} 
            strokeDasharray={getStrokeDash("tunnel-1")}
          />
          {/* Structural rock bolts / rib indicators */}
          <line x1="340" y1="187" x2="340" y2="203" stroke={getMaterialColors("tunnel-1").details} strokeWidth="0.8" opacity="0.5" />
          <line x1="380" y1="187" x2="380" y2="203" stroke={getMaterialColors("tunnel-1").details} strokeWidth="0.8" opacity="0.5" />
          <line x1="420" y1="187" x2="420" y2="203" stroke={getMaterialColors("tunnel-1").details} strokeWidth="0.8" opacity="0.5" />

          {/* Underground water flow inside tunnel with glow */}
          <line x1="312" y1="195" x2="448" y2="195" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.3" className="river-flow-fast" filter="url(#waterGlow)" />
          {/* Moisture drips from tunnel ceiling */}
          <circle cx="350" cy="188" r="0.5" fill="#22D3EE" className="drip-1" />
          <circle cx="400" cy="189" r="0.5" fill="#22D3EE" className="drip-2" />
          {/* Rock bolt moisture reflections */}
          <circle cx="340" cy="190" r="0.8" fill="#7A9CAD" className="spark-1" filter="url(#waterGlow)" />
          <circle cx="380" cy="190" r="0.8" fill="#7A9CAD" className="spark-3" filter="url(#waterGlow)" />
          <circle cx="420" cy="190" r="0.8" fill="#7A9CAD" className="spark-2" filter="url(#waterGlow)" />
          {/* Animated water particle flowing through tunnel */}
          <circle r="1.5" fill="#22D3EE" opacity="0.35" filter="url(#waterGlow)">
            <animateMotion dur="5s" repeatCount="indefinite" path="M312,195 L448,195" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle r="1" fill="#1FB6A6" opacity="0.25">
            <animateMotion dur="6s" repeatCount="indefinite" path="M312,195 L448,195" begin="2s" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("tunnel-1", "rect", { x: 310, y: 187, width: 140, height: 16, rx: 8 })}

          <text x="380" y="172" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8.5" fontWeight="700" letterSpacing="0.8" fontFamily="var(--font-display)">TUNNEL 1 (3km)</text>
          <text x="380" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("tunnel-1")}</text>
        </g>

        {/* ═══ ZONE: PIPE CROSSING ═══ */}
        <g 
          className={getZonePulseClass("pipe-crossing")}
          style={zoneStyle("pipe-crossing")} 
          onMouseEnter={() => handleEnter("pipe-crossing")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("pipe-crossing")}
        >
          <rect x="440" y="145" width="60" height="110" fill="transparent" />
          {/* Canyon background */}
          <polygon points="440,195 456,255 484,255 500,195" fill="var(--bg-base)" stroke="var(--border-hairline)" strokeWidth="1" />
          
          {/* Concrete abutments */}
          <rect x="442" y="183" width="9" height="24" rx="1" fill="#1A2228" stroke="#4A6572" strokeWidth="1.2" />
          <rect x="489" y="183" width="9" height="24" rx="1" fill="#1A2228" stroke="#4A6572" strokeWidth="1.2" />
          
          {/* Structural steel support columns */}
          <line x1="466" y1="200" x2="463" y2="255" stroke={getMaterialColors("pipe-crossing").stroke} strokeWidth="1.8" opacity="0.85" />
          <line x1="474" y1="200" x2="477" y2="255" stroke={getMaterialColors("pipe-crossing").stroke} strokeWidth="1.8" opacity="0.85" />
          <line x1="465" y1="220" x2="475" y2="220" stroke={getMaterialColors("pipe-crossing").stroke} strokeWidth="1.0" opacity="0.7" />
          
          {/* Thick steel pipe conduit */}
          <line 
            x1="448" y1="195" x2="492" y2="195" 
            stroke={getMaterialColors("pipe-crossing").fill} 
            strokeWidth={effective === "pipe-crossing" ? 7 : 5.5} 
            strokeLinecap="butt" 
            strokeDasharray={getStrokeDash("pipe-crossing")}
          />
          
          {/* Specular highlight on curved pipe */}
          <line x1="448" y1="193.5" x2="492" y2="193.5" stroke={getMaterialColors("pipe-crossing").highlight} strokeWidth="1.2" opacity="0.6" strokeLinecap="butt" />

          {/* Internal pressurized flow with glow */}
          <line x1="450" y1="195" x2="490" y2="195" stroke="#22D3EE" strokeWidth="1.2" strokeDasharray="4 5" opacity="0.3" className="river-flow-fast" filter="url(#waterGlow)" />
          {/* Animated water particle through pipe */}
          <circle r="1.2" fill="#22D3EE" opacity="0.4" filter="url(#waterGlow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M450,195 L490,195" />
            <animate attributeName="opacity" values="0.4;0.15;0.4" dur="0.75s" repeatCount="indefinite" />
          </circle>
          {/* Canyon wind streaks */}
          <line x1="455" y1="230" x2="475" y2="228" stroke="var(--text-primary)" strokeWidth="0.4" strokeDasharray="3 8" opacity="0.12" className="river-flow-slow" />
          <line x1="460" y1="240" x2="480" y2="238" stroke="var(--text-primary)" strokeWidth="0.3" strokeDasharray="4 10" opacity="0.1" className="river-flow-medium" />

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("pipe-crossing", "rect", { x: 448, y: 191, width: 44, height: 8 })}

          <text x="470" y="145" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="7" fontWeight="800" letterSpacing="0.5" fontFamily="var(--font-display)">PIPE CROSSING</text>
          <text x="470" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("pipe-crossing")}</text>
        </g>

        {/* ═══ ZONE: TUNNEL 2 (500M) ═══ */}
        <g 
          className={getZonePulseClass("tunnel-2")}
          style={zoneStyle("tunnel-2")} 
          onMouseEnter={() => handleEnter("tunnel-2")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("tunnel-2")}
        >
          <rect x="490" y="155" width="90" height="70" fill="transparent" />
          {/* Concrete tunnel */}
          <rect 
            x="490" y="187" width="90" height="16" rx="8" 
            fill={getMaterialColors("tunnel-2").fill} 
            stroke={getMaterialColors("tunnel-2").stroke} 
            strokeWidth={effective === "tunnel-2" ? 2 : 1.2} 
            strokeDasharray={getStrokeDash("tunnel-2")}
          />
          <line x1="515" y1="187" x2="515" y2="203" stroke={getMaterialColors("tunnel-2").details} strokeWidth="0.8" opacity="0.5" />
          <line x1="550" y1="187" x2="550" y2="203" stroke={getMaterialColors("tunnel-2").details} strokeWidth="0.8" opacity="0.5" />

          {/* Underground water flow with glow */}
          <line x1="492" y1="195" x2="578" y2="195" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.3" className="river-flow-fast" filter="url(#waterGlow)" />
          {/* Moisture drips */}
          <circle cx="520" cy="188" r="0.5" fill="#22D3EE" className="drip-2" />
          <circle cx="555" cy="189" r="0.4" fill="#22D3EE" className="drip-1" />
          {/* Rock bolt twinkle */}
          <circle cx="515" cy="190" r="0.7" fill="#7A9CAD" className="spark-2" filter="url(#waterGlow)" />
          <circle cx="550" cy="190" r="0.7" fill="#7A9CAD" className="spark-4" filter="url(#waterGlow)" />
          {/* Animated water particle through tunnel 2 */}
          <circle r="1.2" fill="#22D3EE" opacity="0.3" filter="url(#waterGlow)">
            <animateMotion dur="3.5s" repeatCount="indefinite" path="M492,195 L578,195" />
            <animate attributeName="opacity" values="0.35;0.12;0.35" dur="1.8s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("tunnel-2", "rect", { x: 490, y: 187, width: 90, height: 16, rx: 8 })}

          <text x="535" y="172" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8.5" fontWeight="700" letterSpacing="0.8" fontFamily="var(--font-display)">TUNNEL 2 (535m)</text>
          <text x="535" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("tunnel-2")}</text>
        </g>

        {/* ═══ ZONE: SURGE TANK ═══ */}
        <g 
          className={getZonePulseClass("surge-tank")}
          style={zoneStyle("surge-tank")} 
          onMouseEnter={() => handleEnter("surge-tank")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("surge-tank")}
        >
          <rect x="570" y="100" width="70" height="120" fill="transparent" />
          {/* Concrete surge tank */}
          <rect 
            x="580" y="130" width="50" height="80" rx="6" 
            fill={getMaterialColors("surge-tank").fill} 
            stroke={getMaterialColors("surge-tank").stroke} 
            strokeWidth={effective === "surge-tank" ? 2.5 : 1.5} 
            strokeDasharray={getStrokeDash("surge-tank")}
          />
          
          {/* Blue-Teal Gradient Water indicator showing ~60% fill */}
          <rect x="582" y="160" width="46" height="48" rx="3" fill="url(#surgeWaterGrad)" opacity="0.8" className="zone-pulse-amber" />
          <ellipse cx="605" cy="132" rx="25" ry="5" fill="none" stroke={getMaterialColors("surge-tank").stroke} strokeWidth="1.2" opacity="0.5" />

          {/* Water surface ripple line */}
          <line x1="584" y1="160" x2="626" y2="160" stroke="#22D3EE" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" className="river-flow-slow" />
          {/* Rising bubbles with glow */}
          <g filter="url(#waterGlow)">
            <circle cx="595" cy="195" r="1.2" fill="#22D3EE" className="bubble-1" />
            <circle cx="610" cy="190" r="0.9" fill="#22D3EE" className="bubble-2" />
            <circle cx="602" cy="185" r="0.8" fill="#1FB6A6" className="bubble-3" />
          </g>
          {/* Water surface shimmer at fill line */}
          <rect x="583" y="158" width="44" height="4" rx="1" fill="#22D3EE" className="water-shimmer" filter="url(#waterGlow)" />
          {/* Animated water surface wave */}
          <path d="M583,160 Q594,157 605,160 Q616,163 627,160" fill="none" stroke="#22D3EE" strokeWidth="0.8" opacity="0.4">
            <animate attributeName="d" values="M583,160 Q594,157 605,160 Q616,163 627,160;M583,160 Q594,163 605,160 Q616,157 627,160;M583,160 Q594,157 605,160 Q616,163 627,160" dur="3s" repeatCount="indefinite" />
          </path>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("surge-tank", "rect", { x: 580, y: 130, width: 50, height: 80, rx: 6 })}

          <text x="605" y="118" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="var(--font-display)">SURGE TANK</text>
          <text x="605" y="228" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("surge-tank")}</text>
        </g>

        {/* ═══ ZONE: PENSTOCK ═══ */}
        <g 
          className={getZonePulseClass("penstock")}
          style={zoneStyle("penstock")} 
          onMouseEnter={() => handleEnter("penstock")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("penstock")}
        >
          <path d="M610,200 L640,200 L710,420 L680,420 Z" fill="transparent" />
          {/* High-pressure steel penstock conduit */}
          <path 
            d="M630,210 L695,418" 
            fill="none" 
            stroke={getMaterialColors("penstock").fill} 
            strokeWidth="12" 
            strokeLinecap="butt" 
          />
          
          {/* Specular highlight for curved steel pipe */}
          <path d="M628,210 L693,418" fill="none" stroke={getMaterialColors("penstock").highlight} strokeWidth="2.5" strokeLinecap="butt" opacity="0.6" />
          
          {/* Border stroke */}
          <path 
            d="M630,210 L695,418" 
            fill="none" 
            stroke={getMaterialColors("penstock").stroke} 
            strokeWidth={effective === "penstock" ? 2.5 : 1.5} 
            strokeLinecap="butt" 
            strokeDasharray={getStrokeDash("penstock")}
          />

          {/* High-velocity flow inside penstock with glow */}
          <path d="M630,215 L693,413" fill="none" stroke="#22D3EE" strokeWidth="2" strokeDasharray="5 6" opacity="0.35" className="penstock-flow" filter="url(#waterGlow)" />
          {/* Pressure pulse ring at top connection */}
          <circle cx="630" cy="210" r="4" fill="none" stroke="#22D3EE" strokeWidth="0.8" className="pressure-pulse" filter="url(#waterGlow)" />
          {/* Animated pressure wave traveling down penstock */}
          <circle r="2.5" fill="#22D3EE" opacity="0.4" filter="url(#waterGlow)">
            <animateMotion dur="2s" repeatCount="indefinite" path="M630,215 L693,413" />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill="#1FB6A6" opacity="0.3">
            <animateMotion dur="2.5s" repeatCount="indefinite" path="M630,215 L693,413" begin="1s" />
          </circle>
          {/* Flow vibration indicators along pipe */}
          <circle cx="650" cy="270" r="1" fill="#22D3EE" className="water-shimmer" />
          <circle cx="665" cy="320" r="1" fill="#22D3EE" className="water-shimmer-d1" />
          <circle cx="680" cy="370" r="1" fill="#22D3EE" className="water-shimmer-d2" />

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("penstock", "path", { d: "M630,210 L695,418" })}

          <text x="614" y="300" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="var(--font-display)" transform="rotate(-70 614 300)">PENSTOCK</text>
          <text x="622" y="325" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("penstock")}</text>
        </g>

        {/* ═══ ZONE: PENSTOCK PIPE BRIDGE ═══ */}
        <g 
          className={getZonePulseClass("pipe-bridge")}
          style={zoneStyle("pipe-bridge")} 
          onMouseEnter={() => handleEnter("pipe-bridge")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("pipe-bridge")}
        >
          <path d="M643,260 L703,370 L693,450 L653,395 Z" fill="transparent" />
          {/* Steel truss frame */}
          <line x1="647" y1="265" x2="682" y2="376" stroke={getMaterialColors("pipe-bridge").stroke} strokeWidth="2" strokeLinecap="butt" strokeDasharray={getStrokeDash("pipe-bridge")} />
          <line x1="643" y1="275" x2="678" y2="386" stroke={getMaterialColors("pipe-bridge").stroke} strokeWidth="2" strokeLinecap="butt" strokeDasharray={getStrokeDash("pipe-bridge")} />
          
          <line x1="647" y1="265" x2="643" y2="275" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="1" />
          <line x1="656" y1="293" x2="652" y2="303" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="1" />
          <line x1="665" y1="321" x2="661" y2="331" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="1" />
          <line x1="673" y1="349" x2="669" y2="359" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="1" />
          <line x1="682" y1="376" x2="678" y2="386" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="1" />
          
          {/* Truss cross-bracing */}
          <line x1="647" y1="265" x2="652" y2="303" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          <line x1="643" y1="275" x2="656" y2="293" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          <line x1="656" y1="293" x2="661" y2="331" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          <line x1="652" y1="303" x2="665" y2="321" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          <line x1="665" y1="321" x2="669" y2="359" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          <line x1="661" y1="331" x2="673" y2="349" stroke={getMaterialColors("pipe-bridge").details} strokeWidth="0.8" opacity="0.8" />
          
          {/* Specular highlight on structure */}
          <line x1="647" y1="266.5" x2="682" y2="377.5" stroke={getMaterialColors("pipe-bridge").highlight} strokeWidth="0.8" opacity="0.5" />

          {/* Heavy support piers */}
          <line x1="654" y1="303" x2="654" y2="370" stroke="#1A2228" strokeWidth="3" opacity="0.8" strokeLinecap="butt" />
          <rect x="650" y="370" width="8" height="6" fill="#4A6572" opacity="0.9" rx="1" />
          <line x1="670" y1="359" x2="670" y2="425" stroke="#1A2228" strokeWidth="3" opacity="0.8" strokeLinecap="butt" />
          <rect x="666" y="425" width="8" height="6" fill="#4A6572" opacity="0.9" rx="1" />

          {/* Internal flow along bridge corridor with glow */}
          <path d="M648,270 L680,380" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" className="penstock-flow" filter="url(#waterGlow)" />
          {/* Pressure indicator at midpoint */}
          <circle cx="664" cy="325" r="1.5" fill="#1FB6A6" className="ind-blink" filter="url(#turbineGlow)" />
          {/* Animated flow particle through bridge */}
          <circle r="1" fill="#22D3EE" opacity="0.3" filter="url(#waterGlow)">
            <animateMotion dur="2s" repeatCount="indefinite" path="M648,270 L680,380" />
            <animate attributeName="opacity" values="0.35;0.12;0.35" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("pipe-bridge", "path", { d: "M647,265 L682,376 L678,386 L643,275 Z" })}

          <text x="708" y="320" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8.5" fontWeight="700" letterSpacing="0.8" fontFamily="var(--font-display)" transform="rotate(-70 708 320)">PIPE BRIDGE</text>
          <text x="715" y="342" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("pipe-bridge")}</text>
        </g>

        {/* ═══ ZONE: POWERHOUSE ═══ */}
        <g 
          className={getZonePulseClass("powerhouse")}
          style={zoneStyle("powerhouse")} 
          onMouseEnter={() => handleEnter("powerhouse")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("powerhouse")}
        >
          <rect x="685" y="390" width="100" height="90" fill="transparent" />
          {/* Main generating station structure */}
          <rect 
            x="695" y="418" width="90" height="58" rx="4" 
            fill={getMaterialColors("powerhouse").fill} 
            stroke={getMaterialColors("powerhouse").stroke} 
            strokeWidth={effective === "powerhouse" ? 2.5 : 1.5}
            strokeDasharray={getStrokeDash("powerhouse")}
          />
          {/* Pitched roof structure */}
          <path d="M693,418 L740,398 L787,418" fill="none" stroke={getMaterialColors("powerhouse").stroke} strokeWidth="1.5" />
          
          {/* Turbine / Generator status indicators */}
          <circle cx="720" cy="447" r="10" fill="none" stroke={getMaterialColors("powerhouse").stroke} strokeWidth="1" opacity="0.5" />
          <circle cx="720" cy="447" r="3" fill={isDark ? "#1FB6A6" : "#0D7A6A"} opacity="0.6" className="spin-fast-720" />
          <line x1="720" y1="437" x2="720" y2="457" stroke={getMaterialColors("powerhouse").stroke} strokeWidth="0.8" opacity="0.4" className="spin-fast-720" />
          
          <circle cx="760" cy="447" r="10" fill="none" stroke={getMaterialColors("powerhouse").stroke} strokeWidth="1" opacity="0.5" />
          <circle cx="760" cy="447" r="3" fill={isDark ? "#1FB6A6" : "#0D7A6A"} opacity="0.6" className="spin-slow-760" />
          <line x1="760" y1="437" x2="760" y2="457" stroke={getMaterialColors("powerhouse").stroke} strokeWidth="0.8" opacity="0.4" className="spin-slow-760" />

          {/* Turbine operation glow halos with neon filter */}
          <g filter="url(#turbineGlow)">
            <circle cx="720" cy="447" r="13" fill="none" stroke="#1FB6A6" strokeWidth="0.8" className="glow-breathe" />
            <circle cx="760" cy="447" r="13" fill="none" stroke="#1FB6A6" strokeWidth="0.8" className="glow-breathe-d1" />
          </g>
          {/* Electrical output indicators */}
          <circle cx="775" cy="425" r="1.5" fill="#C8882A" className="ind-blink" filter="url(#electricGlow)" />
          <circle cx="700" cy="425" r="1.5" fill="#1FB6A6" className="ind-blink-d1" filter="url(#turbineGlow)" />
          {/* Generator vibration line */}
          <line x1="697" y1="474" x2="783" y2="474" stroke="#8A9A3A" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" className="river-flow-slow" />
          {/* Animated turbine blade sweep highlights */}
          <circle cx="720" cy="447" r="8" fill="none" stroke="#22D3EE" strokeWidth="0.5" opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur="3s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="rotate" from="0 720 447" to="360 720 447" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="760" cy="447" r="8" fill="none" stroke="#22D3EE" strokeWidth="0.5" opacity="0">
            <animate attributeName="opacity" values="0;0.3;0" dur="4s" repeatCount="indefinite" begin="1s" />
            <animateTransform attributeName="transform" type="rotate" from="0 760 447" to="360 760 447" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("powerhouse", "rect", { x: 695, y: 418, width: 90, height: 58, rx: 4 })}

          <text x="740" y="500" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="var(--font-display)">POWERHOUSE</text>
          <text x="740" y="515" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("powerhouse")}</text>
        </g>

        {/* ═══ ZONE: TAILRACE ═══ */}
        <g 
          className={getZonePulseClass("tailrace")}
          style={zoneStyle("tailrace")} 
          onMouseEnter={() => handleEnter("tailrace")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("tailrace")}
        >
          <rect x="775" y="415" width="75" height="55" fill="transparent" />
          {/* Gradient fill showing concrete to river water transition */}
          <path 
            d="M785,430 Q805,428 825,434 Q840,440 840,450 L840,462 Q840,472 825,467 Q805,462 785,464 Z" 
            fill={getMaterialColors("tailrace").fill} 
            stroke={getMaterialColors("tailrace").stroke} 
            strokeWidth={effective === "tailrace" ? 2.5 : 1.5}
            strokeDasharray={getStrokeDash("tailrace")}
          />
          {/* Swirling active discharge channel */}
          <path d="M785,443 Q810,439 840,445 L840,453 Q810,447 785,449 Z" fill="url(#riverGrad)" opacity="0.8" />

          {/* Enhanced turbulent discharge swirls */}
          <path d="M790,448 Q810,444 830,450" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" className="river-flow-fast" />
          <path d="M788,455 Q815,450 838,457" fill="none" stroke="#1FB6A6" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.3" className="river-flow-medium" />
          {/* Whitewater foam particles with glow */}
          <g filter="url(#waterGlow)">
            <circle cx="825" cy="445" r="1.2" fill="#ffffff" className="foam-1" />
            <circle cx="820" cy="450" r="0.9" fill="#ffffff" className="foam-2" />
            <circle cx="830" cy="455" r="1" fill="#ffffff" className="foam-3" />
            <circle cx="815" cy="458" r="0.7" fill="#ffffff" className="foam-4" />
          </g>
          {/* Splash ripple at outfall with glow */}
          <g filter="url(#waterGlow)">
            <circle cx="840" cy="452" r="2" fill="none" stroke="#22D3EE" strokeWidth="0.4" className="ripple-1" />
            <circle cx="840" cy="452" r="5" fill="none" stroke="#22D3EE" strokeWidth="0.3" className="ripple-2" />
          </g>
          {/* Animated splash droplets ejecting from tailrace */}
          <circle r="0.8" fill="#22D3EE" opacity="0.5" filter="url(#waterGlow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M790,445 Q810,435 835,442" />
            <animate attributeName="opacity" values="0.5;0.15;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle r="0.6" fill="#ffffff" opacity="0.4">
            <animateMotion dur="2s" repeatCount="indefinite" path="M792,452 Q815,445 838,450" begin="0.5s" />
            <animate attributeName="opacity" values="0.4;0.1;0" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("tailrace", "path", { d: "M785,430 Q805,428 825,434 Q840,440 840,450 L840,462 Q840,472 825,467 Q805,462 785,464 Z" })}

          <text x="812" y="422" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="var(--font-display)">TAILRACE</text>
          <text x="812" y="482" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("tailrace")}</text>
        </g>

        {/* ═══ ZONE: SWITCHYARD ═══ */}
        <g 
          className={getZonePulseClass("switchyard")}
          style={zoneStyle("switchyard")} 
          onMouseEnter={() => handleEnter("switchyard")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("switchyard")}
        >
          <rect x="780" y="295" width="120" height="90" fill="transparent" />
          {/* Amber-tinted transformer layout substation */}
          <rect 
            x="790" y="310" width="100" height="65" rx="4" 
            fill={getMaterialColors("switchyard").fill} 
            stroke={getMaterialColors("switchyard").stroke} 
            strokeWidth={effective === "switchyard" ? 2.5 : 1.5}
            strokeDasharray={getStrokeDash("switchyard") || (effective === "switchyard" ? "none" : "4 2")} 
          />
          {/* Substation components / transformers */}
          <rect x="805" y="325" width="18" height="24" rx="2" fill={getMaterialColors("switchyard").details} stroke={getMaterialColors("switchyard").stroke} strokeWidth="1" />
          <circle cx="814" cy="333" r="4" fill="none" stroke={getMaterialColors("switchyard").stroke} strokeWidth="0.8" opacity="0.6" />
          
          <rect x="835" y="325" width="18" height="24" rx="2" fill={getMaterialColors("switchyard").details} stroke={getMaterialColors("switchyard").stroke} strokeWidth="1" />
          <circle cx="844" cy="333" r="4" fill="none" stroke={getMaterialColors("switchyard").stroke} strokeWidth="0.8" opacity="0.6" />
          
          {/* Transmission lines extending off-map */}
          <line x1="890" y1="340" x2="940" y2="340" stroke={getMaterialColors("switchyard").stroke} strokeWidth="1.5" opacity="0.5" />
          <line x1="940" y1="340" x2="1000" y2="340" stroke={getMaterialColors("switchyard").stroke} strokeWidth="1.5" opacity="0.3" />
          <line x1="940" y1="325" x2="940" y2="355" stroke={getMaterialColors("switchyard").stroke} strokeWidth="1.5" opacity="0.5" />
          <line x1="934" y1="328" x2="946" y2="328" stroke={getMaterialColors("switchyard").stroke} strokeWidth="1" opacity="0.4" />
          
          {/* Spark energy bolt */}
          <path d="M870,325 L865,334 L869,334 L864,345 L873,331 L869,331 L874,325 Z" fill={getMaterialColors("switchyard").stroke} opacity="0.4" />

          {/* Electrical arc between transformers - with electric glow */}
          <g filter="url(#electricGlow)">
            <path d="M823,335 Q829,328 835,335" fill="none" stroke="#FCD34D" strokeWidth="1.2" className="arc-1" />
            <path d="M825,340 Q830,332 835,340" fill="none" stroke="#FCD34D" strokeWidth="1" className="arc-2" />
          </g>
          {/* Blinking indicator lights on transformers */}
          <circle cx="814" cy="348" r="1.5" fill="#1FB6A6" className="ind-blink" filter="url(#turbineGlow)" />
          <circle cx="844" cy="348" r="1.5" fill="#C8882A" className="ind-blink-d1" filter="url(#electricGlow)" />
          {/* Enhanced spark bolt glow */}
          <path d="M870,325 L865,334 L869,334 L864,345 L873,331 L869,331 L874,325 Z" fill="#FCD34D" className="spark-1" filter="url(#electricGlow)" />
          {/* Transmission line power pulses */}
          <circle cx="910" cy="340" r="1.5" fill="#FCD34D" className="spark-2" filter="url(#electricGlow)" />
          <circle cx="960" cy="340" r="1.2" fill="#FCD34D" className="spark-4" filter="url(#electricGlow)" />
          {/* Transformer hum vibration */}
          <line x1="805" y1="355" x2="853" y2="355" stroke="#C8882A" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.25" className="river-flow-medium" />
          {/* Animated corona discharge - dramatic arcing electricity */}
          <path d="M814,333 Q820,318 828,333" fill="none" stroke="#FCD34D" strokeWidth="0.8" opacity="0" filter="url(#electricGlow)">
            <animate attributeName="opacity" values="0;0.8;0;0.5;0" dur="3s" repeatCount="indefinite" />
            <animate attributeName="d" values="M814,333 Q820,318 828,333;M814,333 Q822,316 828,333;M814,333 Q818,320 828,333" dur="0.3s" repeatCount="indefinite" />
          </path>
          <path d="M835,333 Q841,320 847,333" fill="none" stroke="#FCD34D" strokeWidth="0.6" opacity="0" filter="url(#electricGlow)">
            <animate attributeName="opacity" values="0;0.6;0;0.4;0" dur="4s" repeatCount="indefinite" begin="1.5s" />
          </path>
          {/* Power line energy pulse traveling to grid */}
          <circle r="2" fill="#FCD34D" opacity="0" filter="url(#electricGlow)">
            <animateMotion dur="3s" repeatCount="indefinite" path="M890,340 L940,340 L1000,340" />
            <animate attributeName="opacity" values="0.6;0.3;0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="1.5" fill="#FCD34D" opacity="0">
            <animateMotion dur="4s" repeatCount="indefinite" path="M890,340 L940,340 L1000,340" begin="1.5s" />
            <animate attributeName="opacity" values="0.4;0.15;0" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("switchyard", "rect", { x: 790, y: 310, width: 100, height: 65, rx: 4 })}

          <text x="840" y="300" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="9.5" fontWeight="700" letterSpacing="1" fontFamily="var(--font-display)">SWITCHYARD</text>
          <text x="840" y="390" textAnchor="middle" fill={isDark ? "var(--text-muted)" : "#334155"} fontSize="8.5" fontWeight="600">{pct("switchyard")}</text>
        </g>

        {/* ═══ ZONE: ACCESS ROADS ═══ */}
        <g 
          className={getZonePulseClass("access-road")}
          style={zoneStyle("access-road")} 
          onMouseEnter={() => handleEnter("access-road")} 
          onMouseLeave={handleLeave} 
          onClick={() => handleClick("access-road")}
        >
          <path d="M30,498 Q150,483 280,488 Q400,493 480,468 Q560,443 640,458 Q720,473 800,463 Q880,453 970,468 L970,512 Q880,497 800,507 Q720,517 640,502 Q560,487 480,512 Q400,537 280,532 Q150,527 30,542 Z" fill="transparent" />
          
          {/* Concrete access road path */}
          <path 
            d="M30,520 Q150,505 280,510 Q400,515 480,490 Q560,465 640,480 Q720,495 800,485 Q880,475 970,490" 
            fill="none" 
            stroke={getMaterialColors("access-road").stroke} 
            strokeWidth={effective === "access-road" ? 4 : 2} 
            strokeLinecap="round" 
            strokeDasharray={getStrokeDash("access-road")}
            style={{ transition: "stroke 0.25s, stroke-width 0.25s" }} 
          />
          <path d="M30,520 Q150,505 280,510 Q400,515 480,490 Q560,465 640,480 Q720,495 800,485 Q880,475 970,490" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="6 4" strokeLinecap="round" />

          {/* Moving vehicle indicator along road with headlight glow */}
          <path 
            d="M30,520 Q150,505 280,510 Q400,515 480,490 Q560,465 640,480 Q720,495 800,485 Q880,475 970,490" 
            fill="none" 
            stroke="#FCD34D" 
            strokeWidth="3" 
            strokeDasharray="5 1395" 
            strokeLinecap="round" 
            opacity="0.7"
            className="vehicle-drive" 
            filter="url(#electricGlow)"
          />
          {/* Second vehicle (staggered) */}
          <path 
            d="M30,520 Q150,505 280,510 Q400,515 480,490 Q560,465 640,480 Q720,495 800,485 Q880,475 970,490" 
            fill="none" 
            stroke="#FCD34D" 
            strokeWidth="2" 
            strokeDasharray="4 1396" 
            strokeLinecap="round" 
            opacity="0.5"
            className="vehicle-drive" 
            style={{ animationDelay: '10s' }}
          />
          {/* Road reflective markers */}
          <circle cx="200" cy="512" r="0.8" fill="#FCD34D" className="water-shimmer" filter="url(#electricGlow)" />
          <circle cx="400" cy="508" r="0.8" fill="#FCD34D" className="water-shimmer-d1" filter="url(#electricGlow)" />
          <circle cx="600" cy="475" r="0.8" fill="#FCD34D" className="water-shimmer-d2" filter="url(#electricGlow)" />
          <circle cx="800" cy="485" r="0.8" fill="#FCD34D" className="water-shimmer" filter="url(#electricGlow)" />

          {/* Construction Overlay */}
          {renderZoneProgressDecoration("access-road", "path", { d: "M30,520 Q150,505 280,510 Q400,515 480,490 Q560,465 640,480 Q720,495 800,485 Q880,475 970,490" })}

          <text x="300" y="542" textAnchor="middle" fill={isDark ? "#EDEFF1" : "#020617"} fontSize="8" fontWeight="600" opacity={effective === "access-road" ? 0.8 : 0.35} letterSpacing="1" fontFamily="var(--font-display)" style={{ transition: "opacity 0.25s" }}>
            ACCESS ROAD {effective === "access-road" ? `(${pct("access-road")})` : ""}
          </text>
        </g>

        {/* ═══ B3 FULL WATER CIRCUIT PATH ═══ */}
        {/* Removed animateMotion dots to optimize scroll rendering performance */}

        {/* ═══ MAP ANNOTATIONS ═══ */}
        <g opacity="0.2" transform="translate(940, 30)">
          <line x1="0" y1="30" x2="0" y2="5" stroke="var(--text-primary)" strokeWidth="1.5" />
          <polygon points="0,0 -5,10 5,10" fill="var(--text-primary)" />
          <text x="0" y="42" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontWeight="600">N</text>
        </g>
        
        <g opacity="0.15" transform="translate(30, 30)">
          <line x1="0" y1="0" x2="60" y2="0" stroke="var(--text-primary)" strokeWidth="1" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--text-primary)" strokeWidth="1" />
          <line x1="60" y1="-4" x2="60" y2="4" stroke="var(--text-primary)" strokeWidth="1" />
          <text x="30" y="14" textAnchor="middle" fill="var(--text-primary)" fontSize="7">≈ 200m</text>
        </g>
        
        <text x="45" y="178" fill={isDark ? "#1FB6A6" : "#0D7A6A"} fontSize="7" opacity="0.3" fontFamily="var(--font-display)" letterSpacing="1">RIVER FLOW →</text>
        <text x="870" y="435" fill={isDark ? "#1FB6A6" : "#0D7A6A"} fontSize="7" opacity="0.3" fontFamily="var(--font-display)" letterSpacing="2">→ TO RIVER</text>
        <text x="235" y="145" fill="var(--text-primary)" fontSize="7" opacity="0.15" fontFamily="var(--font-display)">▲ 420m ASL</text>
        <text x="695" y="492" fill="var(--text-primary)" fontSize="7" opacity="0.15" fontFamily="var(--font-display)">▼ 280m ASL</text>

        {/* ═══ A5 NIGHT OPERATIONAL MODE OVERLAY ═══ */}
        {/* Multiplying night shadow overlay */}
        <rect 
          width="1000" 
          height="560" 
          fill="#050C0E" 
          opacity={!isWorkingHours ? 0.42 : 0} 
          style={{ mixBlendMode: "multiply", pointerEvents: "none", transition: "opacity 0.5s" }} 
        />

        {/* 🌙 Night mode moon + star corner indicator with interactive hover tooltip */}
        {!isWorkingHours && (
          <g 
            transform="translate(30, 45)" 
            onMouseEnter={() => setShowNightTooltip(true)}
            onMouseLeave={() => setShowNightTooltip(false)}
            className="cursor-help"
            pointerEvents="all"
          >
            {/* Moon */}
            <path d="M 0,-10 A 10,10 0 1,0 10,0 A 7,7 0 1,1 0,-10 Z" fill="#FCD34D" filter="drop-shadow(0 0 4px rgba(252, 211, 77, 0.4))" />
            {/* Star */}
            <path d="M 12,-12 L 13,-10 L 15,-10 L 13,-9 L 14,-7 L 12,-8 L 10,-7 L 11,-9 L 9,-10 L 11,-10 Z" fill="#FCD34D" transform="scale(0.8) translate(5, -5)" />
            
            {showNightTooltip && (
              <g transform="translate(25, -5)">
                <rect x="0" y="-12" width="220" height="24" rx="6" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <text x="10" y="4" fill="#EDEFF1" fontSize="9" fontWeight="500" fontFamily="var(--font-body)">
                  Construction activity outside working hours
                </text>
              </g>
            )}
          </g>
        )}

        {/* ═══ B4 EQUIPMENT BADGES OVERLAY (crossfading) ═══ */}
        <g 
          style={{
            opacity: viewMode === "equipment" ? 1 : 0,
            pointerEvents: viewMode === "equipment" ? "auto" : "none",
            transition: "opacity 0.25s ease"
          }}
        >
          {Object.entries(badgeCoords).map(([slug, coords]) => {
            const location = locations.find(l => l.slug === slug);
            const count = location ? (equipmentCounts[location.id] ?? 0) : 0;
            if (count === 0) return null; // Only show if at least 1 piece of equipment
            
            const label = `${count}`;
            
            return (
              <g 
                key={slug} 
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(slug);
                }}
              >
                <rect 
                  x="-13" 
                  y="-9" 
                  width="26" 
                  height="18" 
                  rx="5" 
                  fill="#1FB6A6" 
                  stroke="#ffffff" 
                  strokeWidth="1"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                />
                <text 
                  textAnchor="middle" 
                  y="4.5" 
                  fill="#ffffff" 
                  fontSize="9.5" 
                  fontWeight="700" 
                  fontFamily="var(--font-mono)"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

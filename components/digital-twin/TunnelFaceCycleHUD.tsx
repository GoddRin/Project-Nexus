/**
 * TunnelFaceCycleHUD.tsx
 *
 * Interactive Underground Construction HUD Overlay for Project Nexus Digital Twin.
 * Grounded in Philippine Hydroelectric Tunnel Engineering (Tumauini HEPP).
 *
 * Features:
 *  - Live cycle stage progress bar & countdown timer
 *  - 5-stage badge tabs with Filipino subtitles
 *  - Transport controls: Play / Pause, Next / Prev stage, 1x/2x/4x speed
 *  - Canonical advanceMeters scrub slider with instant 3D feedback
 *  - Chainage station readout (e.g. STA 1+257.6)
 *  - Auto-advance & Camera Shake toggles
 *  - Collapsible minimize/expand toggle
 */

"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Gauge,
  Flame,
  Wrench,
  Sparkles,
  Truck,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sliders,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FaceCycleStage,
  FACE_CYCLE_STAGES,
  ORDERED_FACE_STAGES,
  FaceCycleState,
  FaceCycleConfig,
} from "./TunnelFaceCycleTypes";

export interface TunnelFaceCycleHUDProps {
  state: FaceCycleState;
  config: FaceCycleConfig;
  totalLength?: number;
  className?: string;
  onTogglePlay: () => void;
  onSelectStage: (stage: FaceCycleStage) => void;
  onNextStage: () => void;
  onPrevStage: () => void;
  onSetAdvanceMeters: (meters: number) => void;
  onToggleAutoAdvance: () => void;
  onToggleCameraShake: () => void;
  onSetSpeed: (speed: number) => void;
}

export function TunnelFaceCycleHUD({
  state,
  config,
  totalLength = 60.0,
  className,
  onTogglePlay,
  onSelectStage,
  onNextStage,
  onPrevStage,
  onSetAdvanceMeters,
  onToggleAutoAdvance,
  onToggleCameraShake,
  onSetSpeed,
}: TunnelFaceCycleHUDProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const stageInfo = FACE_CYCLE_STAGES[state.currentStage];
  const duration = config.stageDurations?.[state.currentStage] ?? stageInfo.defaultDuration;
  const remainingTime = Math.max(0, duration - state.timeInStage).toFixed(1);

  // Chainage format calculation
  const baseChainage = config.baseChainageMeters ?? 1200;
  const currentStationMeters = baseChainage + state.advanceMeters;
  const km = Math.floor(currentStationMeters / 1000);
  const m = (currentStationMeters % 1000).toFixed(1).padStart(5, "0");
  const stationString = `STA ${km}+${m}`;

  const currentSpeed = config.playbackSpeed ?? 1.0;

  const stageIcons: Record<FaceCycleStage, React.ReactNode> = {
    drilling: <Wrench className="w-4 h-4" />,
    charging_blasting: <Flame className="w-4 h-4 text-red-400" />,
    mucking: <Truck className="w-4 h-4 text-emerald-400" />,
    scaling_support: <Gauge className="w-4 h-4 text-blue-400" />,
    shotcreting: <Sparkles className="w-4 h-4 text-purple-400" />,
  };

  return (
    <div
      className={cn(
        "absolute z-40 select-none pointer-events-none",
        className || "bottom-6 left-6 max-w-xl w-full"
      )}
    >
      <div className="pointer-events-auto bg-card/95 dark:bg-slate-900/90 backdrop-blur-md border border-border-hairline rounded-xl shadow-2xl p-4 text-text-primary dark:text-slate-100 transition-all duration-300">
        {/* ─── HEADER: TITLE, STATION & MINIMIZE BUTTON ────────────────── */}
        <div className="flex items-center justify-between border-b border-border-hairline pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full animate-pulse"
              style={{ backgroundColor: stageInfo.badgeColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-text-primary dark:text-white">
                  TUNNEL FACE CYCLE
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-muted dark:bg-slate-800 border border-border-hairline font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                  {stationString}
                </span>
              </div>
              <span className="text-[11px] text-text-muted dark:text-slate-400">
                Round #{state.roundCount} • Advance: {state.advanceMeters.toFixed(1)}m / {totalLength.toFixed(1)}m
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg bg-muted/80 dark:bg-slate-800/80 hover:bg-muted dark:hover:bg-slate-700 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors"
              title={isMinimized ? "Expand HUD" : "Minimize HUD"}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ─── EXPANDABLE BODY ────────────────────────────────────────── */}
        {!isMinimized && (
          <div className="space-y-3.5">
            {/* 1. STAGE TABS BAR */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-muted/40 dark:bg-slate-950/60 rounded-lg border border-border-hairline">
              {ORDERED_FACE_STAGES.map((stg) => {
                const isCurrent = state.currentStage === stg;
                const info = FACE_CYCLE_STAGES[stg];
                return (
                  <button
                    key={stg}
                    onClick={() => onSelectStage(stg)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md text-xs transition-all ${
                      isCurrent
                        ? "bg-card dark:bg-slate-800 text-text-primary dark:text-white font-semibold shadow-md ring-1 ring-cyan-500/50"
                        : "text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200 hover:bg-muted/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="mb-1">{stageIcons[stg]}</div>
                    <span className="text-[10px] leading-tight text-center truncate w-full">
                      {info.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 2. ACTIVE STAGE HERO & PROGRESS BAR */}
            <div className="bg-muted/30 dark:bg-slate-950/40 rounded-lg p-3 border border-border-hairline">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${stageInfo.badgeColor}22`, color: stageInfo.badgeColor }}
                    >
                      {stageInfo.name}
                    </span>
                    <span className="text-xs text-text-muted dark:text-slate-400 italic">
                      ({stageInfo.filipinoName})
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted dark:text-slate-400 mt-1">
                    {stageInfo.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-text-primary dark:text-white">
                    {remainingTime}s
                  </span>
                  <div className="text-[10px] text-text-muted dark:text-slate-500">remaining</div>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-muted dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-100 ease-linear rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, state.stageProgress * 100))}%`,
                    backgroundColor: stageInfo.badgeColor,
                  }}
                />
              </div>
            </div>

            {/* 3. CANONICAL ADVANCE SCRUB SLIDER */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted dark:text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                  Heading Face Advance Scrub:
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-300">
                  {state.advanceMeters.toFixed(1)}m / {totalLength.toFixed(1)}m
                </span>
              </div>
              <input
                type="range"
                min={10.0}
                max={totalLength}
                step={0.5}
                value={state.advanceMeters}
                onChange={(e) => onSetAdvanceMeters(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 dark:accent-cyan-400 bg-muted dark:bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            {/* 4. TRANSPORT CONTROLS & TOGGLES */}
            <div className="flex items-center justify-between pt-1">
              {/* Playback Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onPrevStage}
                  className="p-2 rounded-lg bg-muted/80 dark:bg-slate-800 hover:bg-muted dark:hover:bg-slate-700 text-text-muted dark:text-slate-300 hover:text-text-primary dark:hover:text-white transition-colors"
                  title="Previous Stage"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-cyan-900/20 transition-colors"
                >
                  {state.isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Run Cycle
                    </>
                  )}
                </button>
                <button
                  onClick={onNextStage}
                  className="p-2 rounded-lg bg-muted/80 dark:bg-slate-800 hover:bg-muted dark:hover:bg-slate-700 text-text-muted dark:text-slate-300 hover:text-text-primary dark:hover:text-white transition-colors"
                  title="Next Stage"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                {/* Speed multipliers */}
                <div className="flex items-center gap-0.5 ml-2 bg-muted/60 dark:bg-slate-950 p-0.5 rounded-md border border-border-hairline">
                  {[1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onSetSpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                        currentSpeed === spd
                          ? "bg-cyan-600 text-white font-bold"
                          : "text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-text-muted dark:text-slate-300 hover:text-text-primary dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.autoAdvance ?? true}
                    onChange={onToggleAutoAdvance}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-[11px]">Auto-Advance (+2m)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-text-muted dark:text-slate-300 hover:text-text-primary dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={config.enableCameraShake ?? true}
                    onChange={onToggleCameraShake}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-[11px]">Blast Shake</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

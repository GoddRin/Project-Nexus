"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Compass,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasTourStepData } from "@/lib/atlas-ai/tools/projectReadTools";

export interface ActiveTourState {
  tourId: string;
  tourTitle: string;
  stepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  currentStep: AtlasTourStepData;
}

export interface AtlasTourControllerProps {
  tour: ActiveTourState | null;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onExit: () => void;
  onStepSelect?: (index: number) => void;
}

export function AtlasTourController({
  tour,
  onNext,
  onPrev,
  onTogglePlay,
  onExit,
  onStepSelect,
}: AtlasTourControllerProps) {
  if (!tour) return null;

  const { stepIndex, totalSteps, isPlaying, currentStep } = tour;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      role="region"
      aria-label="AI Guided Portfolio Tour Controller"
      className={cn(
        "fixed z-40 transition-all duration-300 pointer-events-auto",
        // Positioned at bottom center on desktop, full width bottom sheet on mobile
        "bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 sm:px-0"
      )}
    >
      <div className="relative rounded-2xl border border-sky-500/30 bg-[#0B1726]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 p-4 overflow-hidden">
        {/* Animated ambient glow top bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 animate-pulse" />

        {/* ─── Top Meta Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>PORTFOLIO TOUR</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              STEP {stepIndex + 1} OF {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              ESC to exit
            </span>
            <button
              onClick={onExit}
              title="Exit Tour (Escape)"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Exit tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Step Content & Narration ──────────────────────────── */}
        <div className="py-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
              <Compass className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">{currentStep.title}</span>
            </h3>
            {currentStep.subtitle && (
              <span className="text-[11px] font-mono text-sky-400 shrink-0 hidden md:inline">
                {currentStep.subtitle}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2 sm:line-clamp-3">
            {currentStep.narration}
          </p>

          {/* Key Metrics Chips */}
          {currentStep.keyMetrics && Object.keys(currentStep.keyMetrics).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(currentStep.keyMetrics).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                >
                  <span className="text-slate-400">{key}:</span>
                  <span className="font-semibold text-white">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tour Controls Bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {/* Step dots for quick jumping */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => onStepSelect?.(idx)}
                title={`Jump to Step ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === stepIndex
                    ? "w-6 bg-sky-400 shadow-sm shadow-sky-500/50"
                    : "w-2 bg-slate-600 hover:bg-slate-400"
                )}
                aria-label={`Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Previous / Play-Pause / Next Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              disabled={isFirst}
              title="Previous Step"
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
                isFirst
                  ? "text-slate-600 bg-white/5 cursor-not-allowed"
                  : "text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
              )}
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              onClick={onTogglePlay}
              title={isPlaying ? "Pause Tour" : "Resume Auto-Tour"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-sky-600 hover:bg-sky-500 border border-sky-400/30 transition-all cursor-pointer shadow-md shadow-sky-950/50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={onNext}
              title={isLast ? "Complete Tour" : "Next Step"}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">{isLast ? "Finish" : "Next"}</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

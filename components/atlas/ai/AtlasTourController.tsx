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
  Volume2,
  VolumeX,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasTourStepData } from "@/lib/atlas-ai/portfolioTours";

export interface ActiveTourState {
  tourId: string;
  tourTitle: string;
  stepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  currentStep: AtlasTourStepData;
  durationSeconds?: number;
}

export interface AtlasTourControllerProps {
  tour: ActiveTourState | null;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onExit: () => void;
  onStepSelect?: (index: number) => void;
  progressSeconds?: number;
  tourSpeedSeconds?: number;
  onSetSpeed?: (seconds: number) => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isSpeaking?: boolean;
  spokenWordIndex?: number;
}

export function AtlasTourController({
  tour,
  onNext,
  onPrev,
  onTogglePlay,
  onExit,
  onStepSelect,
  progressSeconds = 0,
  tourSpeedSeconds = 0,
  onSetSpeed,
  voiceEnabled = false,
  onToggleVoice,
  isSpeaking = false,
  spokenWordIndex,
}: AtlasTourControllerProps) {
  if (!tour) return null;

  const { stepIndex, totalSteps, isPlaying, currentStep } = tour;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const duration = tour.durationSeconds !== undefined ? tour.durationSeconds : (tourSpeedSeconds ?? 0);
  const isAuto = duration === 0;
  const effectiveDuration = isAuto ? (voiceEnabled ? 18 : 14) : duration;
  const progressRatio = Math.min(1, Math.max(0, progressSeconds / effectiveDuration));
  const remainingSeconds = Math.max(0, Math.ceil(effectiveDuration - progressSeconds));

  const SPEED_PRESETS = [
    { label: "AUTO", value: 0, title: "Finish speech & reading description before advancing (Default)" },
    { label: "8s", value: 8, title: "Dwell for 8 seconds per project" },
    { label: "12s", value: 12, title: "Dwell for 12 seconds per project" },
    { label: "18s", value: 18, title: "Dwell for 18 seconds per project" },
  ];

  // Split narration into words for real-time word-by-word subtitle display
  const narrationWords = React.useMemo(() => {
    if (!currentStep.narration) return [];
    return currentStep.narration.trim().split(/\s+/).filter(Boolean);
  }, [currentStep.narration]);

  // Real-time subtitle word count: only show words up to spokenWordIndex
  const visibleWordCount = React.useMemo(() => {
    if (spokenWordIndex === undefined) return narrationWords.length;
    return Math.min(narrationWords.length, Math.max(0, spokenWordIndex));
  }, [narrationWords.length, spokenWordIndex]);

  return (
    <div
      role="region"
      aria-label="AI Guided Portfolio Tour Controller"
      className={cn(
        "fixed z-40 transition-all duration-300 pointer-events-auto",
        "bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 sm:px-0"
      )}
    >
      <div className="relative rounded-2xl border border-emerald-500/30 bg-[#0B1726]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 p-4 overflow-hidden">
        {/* Animated ambient glow top bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

        {/* Live Auto-Advance Countdown Bar */}
        {isPlaying && (
          <div
            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-white shadow-sm shadow-emerald-400 transition-all duration-200 ease-linear"
            style={{ width: `${progressRatio * 100}%` }}
          />
        )}

        {/* ─── Top Meta Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>{tour.tourTitle || "GUIDED TOUR"}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              STOP {stepIndex + 1} OF {totalSteps}
            </span>

            {isPlaying && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {isAuto ? (
                  voiceEnabled && isSpeaking ? (
                    <>
                      <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span>Narrating stop...</span>
                    </>
                  ) : (
                    <>
                      <Timer className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span>Reading stop ({remainingSeconds > 0 ? `${remainingSeconds}s` : "completing..."})</span>
                    </>
                  )
                ) : (
                  <>
                    <Timer className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Next in {remainingSeconds}s</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Selector Presets */}
            <div className="hidden md:flex items-center gap-1 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded-lg border border-white/10">
              <span className="text-slate-400 text-[9px] mr-0.5">DWELL:</span>
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onSetSpeed?.(preset.value)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer",
                    duration === preset.value
                      ? "bg-emerald-500 text-black shadow-xs shadow-emerald-400/50 font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                  title={preset.title}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Voice Narration Audio Toggle */}
            {onToggleVoice && (
              <button
                onClick={onToggleVoice}
                title={voiceEnabled ? "Mute Tour Guide Voice" : "Enable Tour Guide Audio Narration (Spoken Guide & Audio Cues)"}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border flex items-center gap-1.5",
                  voiceEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/30"
                    : "text-slate-400 hover:text-white bg-white/5 border-white/10 hover:bg-white/10"
                )}
                aria-label="Toggle voice narration"
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="flex items-center gap-0.5 h-3">
                      <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
                      <span className="w-0.5 h-3 bg-emerald-300 animate-pulse delay-75 rounded-full" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 hidden sm:inline">VOICE ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400 hidden sm:inline">VOICE OFF</span>
                  </>
                )}
              </button>
            )}

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
              <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{currentStep.title}</span>
            </h3>
            {currentStep.subtitle && (
              <span className="text-[11px] font-mono text-emerald-400 shrink-0 hidden md:inline">
                {currentStep.subtitle}
              </span>
            )}
          </div>

          {/* Real-time Cinematic Subtitle Stream Box */}
          <div className="relative rounded-xl border border-white/10 bg-black/40 p-2.5 sm:p-3 backdrop-blur-md min-h-[3.8rem] flex flex-col justify-start">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5 mb-1.5 text-[9px] font-mono">
              <div className="flex items-center gap-1.5">
                {isSpeaking ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold tracking-wider text-emerald-300 uppercase">LIVE AI NARRATION</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-slate-400 uppercase tracking-wider">PROJECT SITE OVERVIEW</span>
                  </>
                )}
              </div>
              <span className="text-slate-500 text-[10px]">
                {visibleWordCount} / {narrationWords.length} words
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans min-h-[1.5rem]">
              {visibleWordCount === 0 && isSpeaking ? (
                <span className="text-slate-400 italic text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Beginning spoken narration...
                </span>
              ) : (
                <>
                  {narrationWords.slice(0, visibleWordCount).map((word, idx) => {
                    const isLatest = idx === visibleWordCount - 1 && isSpeaking;
                    return (
                      <span
                        key={idx}
                        className={cn(
                          "inline-block mr-1 transition-all duration-100",
                          isLatest
                            ? "text-emerald-300 font-bold scale-105 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                            : "text-slate-100"
                        )}
                      >
                        {word}
                      </span>
                    );
                  })}
                  {(isSpeaking || (isPlaying && visibleWordCount < narrationWords.length)) && (
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse rounded-xs align-middle shadow-xs shadow-emerald-400" />
                  )}
                </>
              )}
            </p>
          </div>

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
                title={`Jump to Stop ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  idx === stepIndex
                    ? "w-6 bg-emerald-400 shadow-sm shadow-emerald-500/50"
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
              title={isPlaying ? "Pause Auto-Tour" : "Resume Auto-Tour"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30 transition-all cursor-pointer shadow-md shadow-emerald-950/50"
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

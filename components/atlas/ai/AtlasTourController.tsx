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

/** Renders nothing until a tour is running; the card itself (and its hooks) lives in TourCard. */
export function AtlasTourController(props: AtlasTourControllerProps) {
  if (!props.tour) return null;
  return <TourCard {...props} tour={props.tour} />;
}

/** Keeps the card centred on the part of the map canvas that is actually free (not the whole window),
 *  so it never covers the directory or the project panel. */
function useMapAnchor() {
  const [anchor, setAnchor] = React.useState<{ left: number; width: number } | null>(null);
  React.useEffect(() => {
    const mapEl = document.querySelector(".maplibregl-map");
    if (!mapEl) return;
    const measure = () => {
      const r = mapEl.getBoundingClientRect();
      const drawer = document.querySelector('aside[aria-label^="Project Intelligence"]')?.getBoundingClientRect();
      const freeRight = drawer && drawer.width > 0 && drawer.left > r.left + 360 ? Math.min(r.right, drawer.left) : r.right;
      const free = freeRight - r.left;
      const width = Math.round(Math.min(672, free - 24));
      const left = Math.round(r.left + (free - width) / 2);
      setAnchor((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(mapEl);
    window.addEventListener("resize", measure);
    // The project panel opens and closes as the tour moves between stops
    const poll = window.setInterval(measure, 300);
    return () => {
      ro.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return anchor;
}

function TourCard({
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
}: AtlasTourControllerProps & { tour: ActiveTourState }) {
  const anchor = useMapAnchor();
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

  // Keep the word being spoken in view when the narration is taller than its box
  const narrationRef = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    const box = narrationRef.current;
    const word = box?.querySelector<HTMLElement>("[data-latest]");
    if (!box || !word || box.scrollHeight <= box.clientHeight) return;
    const target = word.offsetTop - box.offsetTop - box.clientHeight / 2 + word.offsetHeight / 2;
    box.scrollTop = Math.max(0, target);
  }, [visibleWordCount]);

  return (
    <div
      role="region"
      aria-label="AI Guided Portfolio Tour Controller"
      className={cn(
        "fixed z-40 pointer-events-auto bottom-6",
        !anchor && "left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 sm:px-0"
      )}
      style={anchor ? { left: anchor.left, width: anchor.width } : undefined}
    >
      <div className="relative rounded-2xl border border-emerald-500/30 bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-2xl shadow-2xl shadow-black/15 dark:shadow-black/80 p-4 overflow-hidden">
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
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>{tour.tourTitle || "GUIDED TOUR"}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              STOP {stepIndex + 1} OF {totalSteps}
            </span>

            {isPlaying && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600/90 dark:text-emerald-400/90 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {isAuto ? (
                  voiceEnabled && isSpeaking ? (
                    <>
                      <Volume2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                      <span>Narrating stop...</span>
                    </>
                  ) : (
                    <>
                      <Timer className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                      <span>Reading stop ({remainingSeconds > 0 ? `${remainingSeconds}s` : "completing..."})</span>
                    </>
                  )
                ) : (
                  <>
                    <Timer className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span>Next in {remainingSeconds}s</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Selector Presets */}
            <div className="hidden md:flex items-center gap-1 text-[10px] font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[9px] mr-0.5">DWELL:</span>
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onSetSpeed?.(preset.value)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer",
                    duration === preset.value
                      ? "bg-emerald-500 text-black shadow-xs shadow-emerald-400/50 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/30"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200/70 dark:hover:bg-white/10"
                )}
                aria-label="Toggle voice narration"
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="flex items-center gap-0.5 h-3">
                      <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
                      <span className="w-0.5 h-3 bg-emerald-300 animate-pulse delay-75 rounded-full" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">VOICE ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">VOICE OFF</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onExit}
              title="Exit Tour (Escape)"
              className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Exit tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Step Content & Narration ──────────────────────────── */}
        <div className="py-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{currentStep.title}</span>
            </h3>
            {currentStep.subtitle && (
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0 hidden md:inline">
                {currentStep.subtitle}
              </span>
            )}
          </div>

          {/* Real-time Cinematic Subtitle Stream Box */}
          <div className="relative rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-2.5 sm:p-3 backdrop-blur-md min-h-[3.8rem] flex flex-col justify-start">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70 dark:border-white/5 mb-1.5 text-[9px] font-mono">
              <div className="flex items-center gap-1.5">
                {isSpeaking ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold tracking-wider text-emerald-700 dark:text-emerald-300 uppercase">LIVE AI NARRATION</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">PROJECT SITE OVERVIEW</span>
                  </>
                )}
              </div>
              <span className="text-slate-500 text-[10px]">
                {visibleWordCount} / {narrationWords.length} words
              </span>
            </div>

            {/* Capped height: on a narrow map the text scrolls (following the voice) instead of
                stretching the card up over the map */}
            <p
              ref={narrationRef}
              className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans min-h-[1.5rem] max-h-[6.5rem] overflow-y-auto scic-scrollbar"
            >
              {/* The whole narration is on screen from the start (dimmed) and lights up as it is spoken,
                  so there is nothing to wait for while the voice is being prepared. */}
              {narrationWords.map((word, idx) => {
                const spoken = idx < visibleWordCount;
                const isLatest = idx === visibleWordCount - 1 && isSpeaking;
                return (
                  <span
                    key={idx}
                    data-latest={idx === visibleWordCount - 1 ? "" : undefined}
                    className={cn(
                      "inline-block mr-1 transition-colors duration-150",
                      isLatest
                        ? "text-emerald-700 dark:text-emerald-300 font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : spoken
                        ? "text-slate-800 dark:text-slate-100"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Key Metrics Chips */}
          {currentStep.keyMetrics && Object.keys(currentStep.keyMetrics).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(currentStep.keyMetrics).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                >
                  <span className="text-slate-500 dark:text-slate-400">{key}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tour Controls Bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
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
                  ? "text-slate-600 bg-slate-100 dark:bg-white/5 cursor-not-allowed"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10"
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
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

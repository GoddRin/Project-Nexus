"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Radar, 
  Satellite, 
  Zap, 
  Activity, 
  Waves, 
  Compass, 
  Layers,
  CloudRain,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PanahonLayerKey = 
  | "cyclone" 
  | "radar" 
  | "satellite" 
  | "lightning" 
  | "aws" 
  | "synop" 
  | "riverbasin" 
  | "nwp";

export interface PanahonTimelineFrame {
  observed_at: string;
  observed_at_unix: number;
  image_url: string;
}

interface PanahonLayerControlProps {
  activeLayers: Set<PanahonLayerKey>;
  onToggleLayer: (layer: PanahonLayerKey) => void;
  timelineFrames: PanahonTimelineFrame[];
  currentFrameIndex: number;
  onSelectFrameIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  panahonSourceStatus: "live" | "cached" | "unavailable";
}

const LAYER_CONFIGS: { key: PanahonLayerKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "cyclone", label: "Cyclone Track", icon: Compass, color: "text-signal-red" },
  { key: "radar", label: "Doppler Radar", icon: Radar, color: "text-cyan-400" },
  { key: "satellite", label: "Himawari IR", icon: Satellite, color: "text-purple-400" },
  { key: "lightning", label: "Lightning", icon: Zap, color: "text-amber-400" },
  { key: "aws", label: "AWS Stations", icon: Activity, color: "text-emerald-400" },
  { key: "synop", label: "SYNOP Stations", icon: CloudRain, color: "text-sky-400" },
  { key: "riverbasin", label: "River Basin", icon: Waves, color: "text-blue-400" },
  { key: "nwp", label: "NWP Model", icon: Layers, color: "text-flow-teal" },
];

export default function PanahonLayerControl({
  activeLayers,
  onToggleLayer,
  timelineFrames,
  currentFrameIndex,
  onSelectFrameIndex,
  isPlaying,
  onTogglePlay,
  panahonSourceStatus,
}: PanahonLayerControlProps) {
  const currentFrame = timelineFrames[currentFrameIndex] || null;

  return (
    <div className="space-y-3">
      {/* 1. Control-Room Dark Panel Header & Layer Chips */}
      <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-flow-teal" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            PANaHON Data Layers
          </span>
          <span className={cn(
            "text-[9px] font-mono px-2 py-0.5 rounded border uppercase",
            panahonSourceStatus === "live"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )}>
            {panahonSourceStatus === "live" ? "PAGASA PANaHON Live" : "PANaHON Cached"}
          </span>
        </div>

        {/* Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {LAYER_CONFIGS.map(({ key, label, icon: Icon, color }) => {
            const isActive = activeLayers.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggleLayer(key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                  isActive
                    ? "bg-[#132228] border-flow-teal/50 text-text-primary shadow-md ring-1 ring-flow-teal/20"
                    : "bg-black/30 border-border-hairline/60 text-text-muted hover:text-text-primary hover:border-border-hairline"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? color : "text-text-muted")} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Timeline Scrubber (Rendered if Radar or Satellite layer is active) */}
      {(activeLayers.has("radar") || activeLayers.has("satellite")) && timelineFrames.length > 0 && (
        <div className="bg-[#0D161A] border border-border-hairline rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectFrameIndex(Math.max(0, currentFrameIndex - 1))}
              disabled={currentFrameIndex <= 0}
              className="p-1.5 rounded-lg bg-black/40 border border-border-hairline text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onTogglePlay}
              className="px-3 py-1.5 rounded-xl bg-flow-teal/20 border border-flow-teal/40 text-flow-teal hover:bg-flow-teal/30 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Timeline"}</span>
            </button>
            <button
              onClick={() => onSelectFrameIndex(Math.min(timelineFrames.length - 1, currentFrameIndex + 1))}
              disabled={currentFrameIndex >= timelineFrames.length - 1}
              className="p-1.5 rounded-lg bg-black/40 border border-border-hairline text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Time Slider */}
          <div className="flex-1 w-full flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={timelineFrames.length - 1}
              value={currentFrameIndex}
              onChange={(e) => onSelectFrameIndex(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-[#1FB6A6]"
            />
          </div>

          {/* Timestamp Display formatted in IBM Plex Mono */}
          {currentFrame && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-black/40 rounded-xl border border-border-hairline/60">
              <Eye className="h-3.5 w-3.5 text-flow-teal animate-pulse" />
              <span className="font-mono text-xs font-bold text-text-primary">
                {currentFrame.observed_at} PHT
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

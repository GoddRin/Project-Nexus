"use client";

import React, { useState, useEffect } from "react";
import {
  SupercarCustomization,
  SUPERCAR_PRESET_COLORS,
  SUPERCAR_RIMS_PRESETS,
  SUPERCAR_CALIPER_PRESETS,
  SUPERCAR_UNDERGLOW_PRESETS,
} from "./SupercarEntity";
import {
  playEngineRev,
  playKeyFobBeep,
  playNosPurge,
  playHornBeep,
} from "./carAudio";
import {
  Sparkles,
  Play,
  Square,
  X,
  Compass,
  Palette,
  ShieldCheck,
  Zap,
  Flame,
  Volume2,
  Key,
  Wind,
  DoorOpen,
  ArrowDownToLine,
  Radio,
} from "lucide-react";

interface SupercarConfiguratorOverlayProps {
  customization: SupercarCustomization;
  onChange: (updates: Partial<SupercarCustomization>) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function SupercarConfiguratorOverlay({
  customization,
  onChange,
  onClose,
  isOpen,
}: SupercarConfiguratorOverlayProps) {
  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(850);
  const [gear, setGear] = useState("P");
  const [activeTab, setActiveTab] = useState<"PAINT" | "NEON" | "PERFORMANCE">("NEON");

  // Simulated live telemetry readout when driving
  useEffect(() => {
    if (!customization.isDriving) {
      setSpeed(0);
      setRpm(850);
      setGear("P");
      return;
    }

    const interval = setInterval(() => {
      const baseSpeed = 42 + Math.sin(Date.now() * 0.002) * 5;
      const roundedSpeed = Math.round(baseSpeed);
      setSpeed(roundedSpeed);

      const simulatedRpm = Math.round(4200 + (baseSpeed - 38) * 140 + Math.random() * 80);
      setRpm(simulatedRpm);
      setGear("3");
    }, 150);

    return () => clearInterval(interval);
  }, [customization.isDriving]);

  if (!isOpen) return null;

  const underglowOn = customization.underglowEnabled ?? true;
  const currentNeonColor = customization.underglowColor || "#00F5FF";
  const currentNeonMode = customization.underglowMode || "PULSE";

  return (
    <div className="absolute top-20 right-6 z-30 w-96 bg-slate-900/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl shadow-2xl p-5 text-white font-sans transition-all duration-300 animate-in fade-in slide-in-from-right-5 select-none max-h-[88vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 via-amber-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
              Ferrari 458 Italia
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                VIP
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Executive Courtyard Customizer</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry / Driving Status Banner */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Speed</span>
            <span className="text-xl font-black text-amber-400 font-mono tracking-tight">
              {speed}
              <span className="text-[10px] text-slate-400 ml-0.5 font-normal">km/h</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Tachometer</span>
            <span className="text-sm font-bold text-slate-200 font-mono tracking-tight">
              {rpm.toLocaleString()}
              <span className="text-[9px] text-slate-400 ml-0.5 font-normal">RPM</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-red-950 border border-red-500/50 flex items-center justify-center font-mono font-bold text-xs text-red-400">
            {gear}
          </div>
          <button
            onClick={() => onChange({ isDriving: !customization.isDriving })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              customization.isDriving
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            }`}
          >
            {customization.isDriving ? (
              <>
                <Square className="w-3 h-3 fill-current" /> Park
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> Drive
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl mb-3.5 border border-slate-800">
        <button
          onClick={() => setActiveTab("NEON")}
          className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "NEON"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Underglow
        </button>
        <button
          onClick={() => setActiveTab("PAINT")}
          className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "PAINT"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Paint & Rims
        </button>
        <button
          onClick={() => setActiveTab("PERFORMANCE")}
          className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "PERFORMANCE"
              ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          FX & Sound
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: 🌟 NEON UNDERGLOW ILLUMINATION
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "NEON" && (
        <div className="space-y-3.5">
          {/* Master Neon Toggle */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-lg transition-colors"
                style={{
                  backgroundColor: underglowOn
                    ? currentNeonColor === "RAINBOW"
                      ? "#00F5FF"
                      : currentNeonColor
                    : "#475569",
                  boxShadow: underglowOn
                    ? `0 0 10px ${currentNeonColor === "RAINBOW" ? "#00F5FF" : currentNeonColor}`
                    : "none",
                }}
              />
              <span className="text-xs font-bold text-slate-200">Neon Underglow System</span>
            </div>
            <button
              onClick={() => onChange({ underglowEnabled: !underglowOn })}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                underglowOn
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {underglowOn ? "ACTIVE" : "OFF"}
            </button>
          </div>

          {/* Underglow Colors */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between mb-2">
              <span>Underglow Color Palette</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {SUPERCAR_UNDERGLOW_PRESETS.find((p) => p.hex === currentNeonColor)?.name || currentNeonColor}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SUPERCAR_UNDERGLOW_PRESETS.map((preset) => {
                const isSelected = currentNeonColor === preset.hex;
                const isRainbow = preset.hex === "RAINBOW";

                return (
                  <button
                    key={preset.name}
                    onClick={() => onChange({ underglowColor: preset.hex, underglowEnabled: true })}
                    className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/15 text-white shadow-lg ring-1 ring-cyan-400/50"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/30 transition-transform"
                      style={{
                        background: isRainbow
                          ? "linear-gradient(135deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF)"
                          : preset.hex,
                        boxShadow: isSelected
                          ? `0 0 12px ${isRainbow ? "#00FFFF" : preset.hex}`
                          : "none",
                      }}
                    />
                    <span className="truncate w-full">{preset.name.replace("🌈 ", "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animation Modes */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Underglow Pulse & Animation
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "PULSE", label: "Breathing Pulse" },
                { id: "STEADY", label: "Hyper Steady" },
                { id: "STROBE", label: "Strobe Flash" },
                { id: "SPEED_REACTIVE", label: "Speed Reactive" },
                { id: "RAINBOW_WAVE", label: "Chromatic Wave" },
              ].map((mode) => {
                const isSelected = currentNeonMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() =>
                      onChange({
                        underglowMode: mode.id as any,
                        underglowEnabled: true,
                      })
                    }
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{mode.label}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Slider */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
              <span>Luminance Intensity</span>
              <span className="font-mono text-cyan-400">
                {(customization.underglowIntensity ?? 1.8).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={customization.underglowIntensity ?? 1.8}
              onChange={(e) => onChange({ underglowIntensity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: 🎨 BODY PAINT & WHEELS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "PAINT" && (
        <div className="space-y-3.5">
          {/* Body Paint Palette */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Body Clearcoat Finish
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SUPERCAR_PRESET_COLORS.map((color) => {
                const isCurrent = customization.bodyColor === color.hex;
                return (
                  <button
                    key={color.name}
                    onClick={() => onChange({ bodyColor: color.hex })}
                    className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center gap-1.5 ${
                      isCurrent
                        ? "border-amber-400 bg-amber-500/15 text-white shadow-lg"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/30"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="truncate w-full">{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alloy Rims Finish */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Alloy Wheel Rims
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUPERCAR_RIMS_PRESETS.map((rim) => {
                const isCurrent = customization.rimsColor === rim.hex;
                return (
                  <button
                    key={rim.name}
                    onClick={() => onChange({ rimsColor: rim.hex })}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all flex items-center gap-2 ${
                      isCurrent
                        ? "bg-amber-500/20 border-amber-400 text-amber-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/40"
                      style={{ backgroundColor: rim.hex }}
                    />
                    {rim.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brake Calipers */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              Ceramic Brake Calipers
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUPERCAR_CALIPER_PRESETS.map((caliper) => {
                const isCurrent = customization.caliperColor === caliper.hex;
                return (
                  <button
                    key={caliper.name}
                    onClick={() => onChange({ caliperColor: caliper.hex })}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all flex items-center gap-2 ${
                      isCurrent
                        ? "bg-red-500/20 border-red-400 text-red-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/40"
                      style={{ backgroundColor: caliper.hex }}
                    />
                    {caliper.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: 🔥 PERFORMANCE FX & SOUND SYNTHESIZER
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "PERFORMANCE" && (
        <div className="space-y-3.5">
          {/* Interactive Sound Synthesizer Controls */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              Interactive Sound FX
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => playEngineRev()}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/50 hover:to-amber-600/50 border border-red-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Flame className="w-4 h-4 text-red-400" />
                Rev 4.5L V8
              </button>
              <button
                onClick={() => playKeyFobBeep()}
                className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Key className="w-4 h-4 text-amber-400" />
                Key Fob Chirp
              </button>
              <button
                onClick={() => playNosPurge()}
                className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Wind className="w-4 h-4 text-cyan-400" />
                NOS Purge Hiss
              </button>
              <button
                onClick={() => playHornBeep()}
                className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                Italian Horn
              </button>
            </div>
          </div>

          {/* Visual Effects & Stance Toggles */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Aero & Visual FX Stance
            </label>
            <div className="space-y-2">
              {/* Exhaust Flames */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-medium text-slate-200">Exhaust Afterburner Flames</span>
                </div>
                <button
                  onClick={() => onChange({ exhaustFlames: !customization.exhaustFlames })}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    customization.exhaustFlames
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {customization.exhaustFlames ? "ACTIVE" : "OFF"}
                </button>
              </div>

              {/* NOS Cryo Purge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-200">NOS Fender Steam Purge</span>
                </div>
                <button
                  onClick={() => {
                    onChange({ nosPurge: !customization.nosPurge });
                    if (!customization.nosPurge) playNosPurge();
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    customization.nosPurge
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {customization.nosPurge ? "PURGING" : "OFF"}
                </button>
              </div>

              {/* Air Suspension Lowered */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-slate-200">Air Suspension Track Stance</span>
                </div>
                <button
                  onClick={() => onChange({ airSuspensionLowered: !customization.airSuspensionLowered })}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    customization.airSuspensionLowered
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {customization.airSuspensionLowered ? "SLAMMED" : "STOCK"}
                </button>
              </div>

              {/* Remote Door Open */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-200">Remote Driver Door</span>
                </div>
                <button
                  onClick={() => onChange({ doorOpen: !customization.doorOpen })}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    customization.doorOpen
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {customization.doorOpen ? "OPEN" : "CLOSED"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standby Status Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Location: Staff Office VIP Bay</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {customization.isDriving ? "Active Circuit" : "Standby Showcase"}
        </span>
      </div>
    </div>
  );
}

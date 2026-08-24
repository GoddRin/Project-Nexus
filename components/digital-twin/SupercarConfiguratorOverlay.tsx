"use client";

import React, { useState, useEffect } from "react";
import {
  SupercarCustomization,
  SUPERCAR_PRESET_COLORS,
  SUPERCAR_RIMS_PRESETS,
  SUPERCAR_CALIPER_PRESETS,
} from "./SupercarEntity";
import { Sparkles, Gauge, Play, Square, X, Compass, Palette, ShieldCheck } from "lucide-react";

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

  // Simulated live telemetry readout when driving
  useEffect(() => {
    if (!customization.isDriving) {
      setSpeed(0);
      setRpm(850);
      setGear("P");
      return;
    }

    const interval = setInterval(() => {
      // Dynamic simulated speed between 38 and 48 km/h on site road
      const baseSpeed = 42 + Math.sin(Date.now() * 0.002) * 5;
      const roundedSpeed = Math.round(baseSpeed);
      setSpeed(roundedSpeed);

      // RPM corresponds to 3rd gear cruise at 4,200 - 5,600 RPM
      const simulatedRpm = Math.round(4200 + (baseSpeed - 38) * 140 + (Math.random() * 80));
      setRpm(simulatedRpm);
      setGear("3");
    }, 150);

    return () => clearInterval(interval);
  }, [customization.isDriving]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-6 z-30 w-84 bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl p-5 text-white font-sans transition-all duration-300 animate-in fade-in slide-in-from-right-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
              Ferrari 458 Italia
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                VIP
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Executive Courtyard Showcase</p>
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
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-4 flex items-center justify-between">
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

      {/* Body Paint Palette */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          Body Paint Finish (Clearcoat)
        </label>
        <div className="grid grid-cols-7 gap-1.5">
          {SUPERCAR_PRESET_COLORS.map((color) => {
            const isCurrent = customization.bodyColor === color.hex;
            return (
              <button
                key={color.name}
                onClick={() => onChange({ bodyColor: color.hex })}
                className={`relative w-8 h-8 rounded-lg transition-transform border ${
                  isCurrent
                    ? "ring-2 ring-amber-400 scale-110 border-white"
                    : "border-slate-700 hover:scale-105"
                }`}
                style={{ backgroundColor: color.hex }}
                title={`${color.name}: ${color.desc}`}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5 italic text-right">
          {SUPERCAR_PRESET_COLORS.find((c) => c.hex === customization.bodyColor)?.name || "Custom"}
        </div>
      </div>

      {/* Alloy Rims Finish */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          5-Spoke Alloy Wheels
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUPERCAR_RIMS_PRESETS.map((rim) => {
            const isCurrent = customization.rimsColor === rim.hex;
            return (
              <button
                key={rim.name}
                onClick={() => onChange({ rimsColor: rim.hex })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? "bg-amber-500/20 border-amber-400 text-amber-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/40"
                  style={{ backgroundColor: rim.hex }}
                />
                {rim.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brake Calipers */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          Ceramic Brake Calipers
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUPERCAR_CALIPER_PRESETS.map((caliper) => {
            const isCurrent = customization.caliperColor === caliper.hex;
            return (
              <button
                key={caliper.name}
                onClick={() => onChange({ caliperColor: caliper.hex })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? "bg-red-500/20 border-red-400 text-red-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border border-white/40"
                  style={{ backgroundColor: caliper.hex }}
                />
                {caliper.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Standby Status Footer */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Location: Staff Office VIP Bay</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {customization.isDriving ? "Active On Route" : "Standby (Lights Off)"}
        </span>
      </div>
    </div>
  );
}

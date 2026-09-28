"use client";

import React, { useEffect } from "react";
import { X, Radio } from "lucide-react";
import BroadcastSatelliteIcon from "@/components/weather/icons/BroadcastSatelliteIcon";
import TyphoonNewsDeskWidget from "@/components/weather/TyphoonNewsDeskWidget";

interface AtlasNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AtlasNewsModal({ isOpen, onClose }: AtlasNewsModalProps) {
  // Allow closing via Escape key (strict Project Atlas GIS Reversibility requirement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Philippine Weather & TV News Briefing"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#08121E]/95 border border-white/15 shadow-2xl scrollbar-thin scrollbar-thumb-white/10"
      >
        {/* Modal Top Control Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 bg-[#08121E]/95 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-center">
              <BroadcastSatelliteIcon size={24} animated={true} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-display uppercase tracking-tight text-white">
                  Philippine Weather Broadcast Desk
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ATLAS GIS BRIEFING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Press [Esc] or click outside to return immediately to GIS exploration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close News Modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: News Desk Widget */}
        <div className="p-4 sm:p-6">
          <TyphoonNewsDeskWidget defaultForceExpand={true} />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasAIFloatingTriggerProps {
  onClick: () => void;
  isOpen: boolean;
  hasUnread?: boolean;
  className?: string;
}

export const AtlasAIFloatingTrigger: React.FC<AtlasAIFloatingTriggerProps> = ({
  onClick,
  isOpen,
  hasUnread,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      title="✦ SCIC Atlas Assistant (Ctrl+K)"
      aria-label="Open SCIC Atlas Assistant"
      className={cn(
        "group relative flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border shadow-xl transition-all duration-300 pointer-events-auto cursor-pointer",
        isOpen
          ? "bg-sky-600/90 text-white border-sky-400/40 ring-2 ring-sky-400/30"
          : "bg-[#0B1726]/90 hover:bg-[#0B1726] text-slate-200 hover:text-white border-white/10 hover:border-sky-500/40 hover:shadow-sky-950/40",
        className
      )}
    >
      {/* Glowing background pulse */}
      <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 opacity-20 group-hover:opacity-40 blur-xs transition-opacity" />

      {/* Icon with rotation effect */}
      <div className="relative flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-sky-400 group-hover:rotate-12 transition-transform duration-300" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </div>

      {/* Button Text */}
      <div className="relative flex flex-col text-left">
        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-white flex items-center gap-1">
          <span>Atlas AI</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono hidden md:inline">
            ✦
          </span>
        </span>
      </div>
    </button>
  );
};

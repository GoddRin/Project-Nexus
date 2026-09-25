"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Search, ArrowRight, CornerDownLeft, X, Layers, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtlasCommandBarProps {
  onSend: (prompt: string) => void;
  onOpenDrawer: () => void;
  suggestions: string[];
  isGenerating?: boolean;
  selectedProjectName?: string | null;
  activeRegion?: string | null;
  className?: string;
}

export const AtlasCommandBar: React.FC<AtlasCommandBarProps> = ({
  onSend,
  onOpenDrawer,
  suggestions,
  isGenerating,
  selectedProjectName,
  activeRegion,
  className,
}) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut: Ctrl+K or / or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in another input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      } else if (e.key === "Escape" && isFocused) {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  // Click outside to collapse suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isGenerating) return;
    const text = query.trim();
    setQuery("");
    setIsFocused(false);
    onSend(text);
  };

  const handleSuggestionClick = (prompt: string) => {
    setQuery("");
    setIsFocused(false);
    onSend(prompt);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full max-w-xl transition-all duration-300 z-30 pointer-events-auto",
        className
      )}
    >
      {/* Primary Input Container */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border transition-all duration-200 shadow-xl",
          isFocused
            ? "bg-[#0B1726]/95 border-sky-500/60 ring-2 ring-sky-500/20 shadow-sky-950/40"
            : "bg-[#0B1726]/85 border-white/10 hover:border-white/20 shadow-black/40"
        )}
      >
        {/* Assistant Logo & Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          title="Open SCIC Atlas Assistant"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors cursor-pointer group shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-mono font-bold tracking-wider hidden sm:inline">
            ATLAS AI
          </span>
        </button>

        {/* Input Field */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={
              selectedProjectName
                ? `Ask about ${selectedProjectName}... (e.g. "What's nearby?")`
                : activeRegion && activeRegion !== "ALL"
                ? `Ask about ${activeRegion}... (e.g. "Show ongoing projects")`
                : `Ask Atlas... (e.g. "Show ongoing hydropower in Region II")`
            }
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-hidden font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-white cursor-pointer mr-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Submit or Shortcut Badge */}
        {query.trim() ? (
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center justify-center p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Execute Atlas Command (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        )}
      </form>

      {/* Suggestion Dropdown on Focus */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 rounded-xl bg-[#0B1726]/95 backdrop-blur-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
          {/* Active Context Header */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-white/5 pb-1.5">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Compass className="w-3 h-3" />
              {selectedProjectName
                ? `Context: ${selectedProjectName}`
                : activeRegion && activeRegion !== "ALL"
                ? `Context: ${activeRegion}`
                : "Context: National Overview (65 Projects)"}
            </span>
            <span className="text-slate-500">Suggested Prompts</span>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {suggestions.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={() => handleSuggestionClick(prompt)}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-white border border-white/5 hover:border-sky-500/30 transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

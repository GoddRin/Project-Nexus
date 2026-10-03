"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Search, ArrowRight, CornerDownLeft, X, Layers, Compass, Mic, MicOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "./useVoiceInput";

interface AtlasCommandBarProps {
  onSend: (prompt: string) => void;
  onOpenDrawer: () => void;
  suggestions: string[];
  isGenerating?: boolean;
  selectedProjectName?: string | null;
  activeRegion?: string | null;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
}

export const AtlasCommandBar: React.FC<AtlasCommandBarProps> = ({
  onSend,
  onOpenDrawer,
  suggestions,
  isGenerating,
  selectedProjectName,
  activeRegion,
  className,
  onFocusChange,
}) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Microphone Voice Input Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    toggleListening,
    stopListening,
    error: voiceError,
  } = useVoiceInput({
    // When you stop speaking, the request is sent straight away
    onTranscriptComplete: (text) => {
      const spoken = text.trim();
      if (!spoken) return;
      if (isGenerating) {
        setQuery(spoken);
        setFocusedState(true);
        return;
      }
      setQuery("");
      setFocusedState(false);
      onSend(spoken);
    },
  });

  // Sync live transcription while speaking
  useEffect(() => {
    if (isListening) {
      const activeText = transcript || interimTranscript;
      if (activeText) {
        setQuery(activeText);
      }
    }
  }, [isListening, transcript, interimTranscript]);

  const setFocusedState = (focused: boolean) => {
    setIsFocused(focused);
    onFocusChange?.(focused);
  };

  // Global Keyboard Shortcut: Ctrl+K or / or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in another input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setFocusedState(true);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        setFocusedState(true);
      } else if (e.key === "Escape" && isFocused) {
        inputRef.current?.blur();
        setFocusedState(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  // Click outside to collapse suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocusedState(false);
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
    setFocusedState(false);
    onSend(text);
  };

  const handleSuggestionClick = (prompt: string) => {
    setQuery("");
    setFocusedState(false);
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
            ? "bg-white/95 dark:bg-atlas-panel/95 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-emerald-950/40"
            : "bg-white/90 dark:bg-atlas-panel/85 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-black/10 dark:shadow-black/40"
        )}
      >
        {/* Assistant Logo & Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          title="Open SCIC Atlas Assistant"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer group shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
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
            onFocus={() => setFocusedState(true)}
            onBlur={() => setFocusedState(false)}
            placeholder={
              selectedProjectName
                ? `Ask about ${selectedProjectName}... (e.g. "What's nearby?")`
                : activeRegion && activeRegion !== "ALL"
                ? `Ask about ${activeRegion}... (e.g. "Show ongoing projects")`
                : `Ask Atlas... (e.g. "Show ongoing hydropower in Region II")`
            }
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer mr-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Microphone Voice Input Button */}
        {isSupported && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleListening();
            }}
            title={isListening ? "Stop voice input" : "Speak to Atlas with Microphone"}
            className={cn(
              "flex items-center gap-1 p-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
              isListening
                ? "bg-rose-500/25 border-rose-500/50 text-rose-300 ring-2 ring-rose-500/30 animate-pulse"
                : "bg-slate-100 dark:bg-white/5 hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-cyan-300"
            )}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span className="text-[10px] font-mono text-rose-300 hidden md:inline">Listening...</span>
              </>
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Submit or Shortcut Badge */}
        {query.trim() ? (
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center justify-center p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Execute Atlas Command (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded-md">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        )}
      </form>

      {/* Voice Error Notification Banner */}
      {voiceError && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-500/40 text-rose-200 text-[11px] font-mono flex items-center justify-between shadow-xl z-40">
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={() => stopListening()}
            className="text-rose-400 hover:text-white ml-2 text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Suggestion Dropdown on Focus */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2.5 rounded-xl bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
          {/* Active Context Header */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1 border-b border-slate-200/70 dark:border-white/5 pb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
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
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-between gap-2 group"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

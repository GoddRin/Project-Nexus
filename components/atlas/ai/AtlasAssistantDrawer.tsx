"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Compass,
  MapPin,
  ExternalLink,
  Undo2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  Loader2,
  FileText,
  Database,
  Cpu,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasAIMessage } from "./useAtlasAI";
import { AtlasAIAction, AtlasAISource } from "@/lib/atlas-ai/tools/types";
import { AtlasMarkdownRenderer } from "./AtlasMarkdownRenderer";

interface AtlasAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AtlasAIMessage[];
  isGenerating: boolean;
  currentToolEvents?: Array<{ step: string; status: "started" | "completed"; toolName: string }>;
  onSendMessage: (prompt: string) => void;
  onClearChat: () => void;
  suggestions: string[];
  onExecuteAction: (action: AtlasAIAction) => void;
  onUndoAction: () => void;
  canUndo: boolean;
  lastAppliedAction: string | null;
  selectedProjectName?: string | null;
  selectedProjectId?: string | null;
  activeRegion?: string | null;
  totalProjectsCount?: number;
}

export const AtlasAssistantDrawer: React.FC<AtlasAssistantDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isGenerating,
  currentToolEvents,
  onSendMessage,
  onClearChat,
  suggestions,
  onExecuteAction,
  onUndoAction,
  canUndo,
  lastAppliedAction,
  selectedProjectName,
  selectedProjectId,
  activeRegion,
  totalProjectsCount = 65,
}) => {
  const [inputText, setInputText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, currentToolEvents]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() || isGenerating) return;
    const text = inputText.trim();
    setInputText("");
    onSendMessage(text);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="SCIC Atlas Assistant"
      className={cn(
        "fixed z-50 transition-all duration-300 flex flex-col pointer-events-auto",
        // Desktop: Docked right slide-over panel
        "hidden md:flex top-12 right-3 bottom-3 rounded-2xl border border-white/10 bg-[#0B1726]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden",
        isExpanded ? "w-[680px]" : "w-[460px] lg:w-[480px]",
        // Mobile: Bottom sheet slide-up
        "max-md:flex max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:rounded-t-2xl max-md:border-t max-md:border-white/15 max-md:bg-[#0B1726]/98 max-md:backdrop-blur-3xl"
      )}
    >
      {/* Mobile Drag Indicator Handle */}
      <div className="md:hidden w-full flex justify-center py-1.5 shrink-0 bg-white/5">
        <div className="w-12 h-1 rounded-full bg-slate-600" />
      </div>

      {/* ─── 1. Header (Identity & Context) ────────────────────── */}
      <div className="flex flex-col border-b border-white/10 bg-slate-900/60 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-white flex items-center gap-1">
                  <span>✦ SCIC ATLAS ASSISTANT</span>
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Explore Sta. Clara&apos;s projects across the Philippines.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={onClearChat}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse panel width" : "Expand panel width"}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle width"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              title="Close Atlas Assistant (Escape)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Active Map Context Pill ─────────────────────────── */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-slate-400">Context:</span>
            <span className="font-semibold text-white truncate">
              {selectedProjectName ? (
                `Viewing: ${selectedProjectName}`
              ) : activeRegion && activeRegion !== "ALL" ? (
                `Scope: ${activeRegion}`
              ) : (
                `National Overview (${totalProjectsCount} Projects)`
              )}
            </span>
          </div>
          {canUndo && (
            <button
              onClick={onUndoAction}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer shrink-0 ml-2"
              title="Undo last map action"
            >
              <Undo2 className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>

        {/* Reversible Action Feedback Banner */}
        {lastAppliedAction && (
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 animate-in fade-in duration-200">
            <span className="flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{lastAppliedAction}</span>
            </span>
            {canUndo && (
              <button
                onClick={onUndoAction}
                className="underline hover:text-emerald-100 cursor-pointer ml-2 shrink-0"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Executive Quick Modes Bar ──────────────────────── */}
      <div className="px-3 py-1.5 bg-[#091522] border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {[
          { label: "Portfolio Tour", prompt: "Start Portfolio Tour", icon: Compass },
          { label: "Portfolio Brief", prompt: "Generate Portfolio Brief", icon: FileText },
          { label: "Explain View", prompt: "Explain Current View", icon: Layers },
          { label: "Nearby", prompt: "What's around here?", icon: MapPin },
        ].map((mode, idx) => {
          const Icon = mode.icon;
          return (
            <button
              key={idx}
              onClick={() => onSendMessage(mode.prompt)}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-white border border-white/5 hover:border-sky-500/30 text-[10px] font-mono tracking-tight transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-sky-400" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 2. Message History Area ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs scroll-smooth">
        {/* Initial Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-6 px-3 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 flex items-center justify-center text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-950/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                ✦ SCIC ATLAS ASSISTANT
              </h3>
              <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                Geographic project intelligence and natural-language map control for Sta. Clara&apos;s nationwide portfolio.
              </p>
            </div>

            {/* Quick Suggestions Cards */}
            <div className="w-full pt-3 space-y-1.5 text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1">
                Suggested Prompts
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-sky-500/15 text-slate-200 hover:text-white border border-white/5 hover:border-sky-500/30 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Executive Management Mode Preview Chips */}
            <div className="w-full pt-2 border-t border-white/5 text-left">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 px-1">
                Executive & Briefing Modes
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[
                  "Generate Portfolio Brief",
                  "Explain Current View",
                  "Which projects have tunneling?",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(chip)}
                    className="text-[10px] font-mono px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    ✦ {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render Conversation Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1.5",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            {/* Message Bubble */}
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 max-w-[92%] leading-relaxed shadow-md",
                msg.role === "user"
                  ? "bg-sky-600 text-white font-sans text-xs ml-8"
                  : "bg-slate-900/90 border border-white/10 text-slate-200 mr-4 w-full"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="space-y-2.5">
                  {/* Tool execution event ticker during streaming */}
                  {msg.isStreaming && msg.toolEvents && msg.toolEvents.length > 0 && (
                    <div className="flex flex-col gap-1 pb-1 border-b border-white/10 text-[10px] font-mono text-sky-400">
                      {msg.toolEvents.map((ev, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {ev.status === "completed" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                          )}
                          <span>
                            {ev.status === "completed" ? "Verified" : "Querying"}: {ev.toolName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render Markdown Answer */}
                  {msg.content ? (
                    <AtlasMarkdownRenderer content={msg.content} />
                  ) : msg.isStreaming ? (
                    <div className="flex items-center gap-2 text-slate-400 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span className="font-mono text-[11px]">Reasoning with Project Atlas GIS...</span>
                    </div>
                  ) : null}

                  {/* ─── 3. Response Action Buttons ─────────────────── */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                      {msg.actions.map((act, actIdx) => {
                        let label = "Execute Action";
                        let icon = <MapPin className="w-3 h-3 text-sky-400" />;

                        if (act.type === "FLY_TO_PROJECT") {
                          label = `Center on ${act.projectId}`;
                          icon = <Compass className="w-3 h-3 text-sky-400" />;
                        } else if (act.type === "SELECT_PROJECT") {
                          label = `Open ${act.projectName || act.projectId}`;
                          icon = <MapPin className="w-3 h-3 text-sky-400" />;
                        } else if (act.type === "ZOOM_TO_REGION") {
                          label = `Explore ${act.region}`;
                          icon = <Compass className="w-3 h-3 text-amber-400" />;
                        } else if (act.type === "FILTER_PROJECTS") {
                          label = "Show Filtered Results";
                          icon = <Layers className="w-3 h-3 text-emerald-400" />;
                        } else if (act.type === "INSPECT_FOOTPRINT") {
                          label = "Inspect Engineering Footprint";
                          icon = <Layers className="w-3 h-3 text-cyan-400" />;
                        } else if (act.type === "HIGHLIGHT_PROJECTS") {
                          label = `Highlight ${act.projectIds.length} Projects`;
                          icon = <Sparkles className="w-3 h-3 text-amber-400" />;
                        } else if (act.type === "START_TOUR") {
                          label = "Launch Guided Portfolio Tour";
                          icon = <Compass className="w-3 h-3 text-sky-400" />;
                        } else if (act.type === "CLEAR_FILTERS") {
                          label = "Clear Filters";
                          icon = <RotateCcw className="w-3 h-3 text-slate-400" />;
                        } else if (act.type === "SET_MAP_STYLE") {
                          label = `Set Basemap: ${act.style}`;
                          icon = <Layers className="w-3 h-3 text-purple-400" />;
                        } else if (act.type === "ENTER_DISCOVERY_SCOPE") {
                          label = `Enter Discovery: ${act.scope}`;
                          icon = <Compass className="w-3 h-3 text-emerald-400" />;
                        }

                        return (
                          <button
                            key={actIdx}
                            onClick={() => onExecuteAction(act)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-mono transition-all cursor-pointer"
                          >
                            {icon}
                            <span>{label}</span>
                          </button>
                        );
                      })}

                      {/* Deep Link to Nexus Project Workspace */}
                      {selectedProjectId && (
                        <Link
                          href={`/dashboard/projects/${selectedProjectId}`}
                          target="_blank"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-mono transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                          <span>Open in Project Nexus ↗</span>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* ─── 4. Source Attribution Badges Footer ────────── */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[9px] font-mono text-slate-400 border-t border-white/5">
                      <span className="text-slate-500">Source:</span>
                      {msg.sources.map((src, srcIdx) => (
                        <span
                          key={srcIdx}
                          title={src.notes || src.name}
                          className={cn(
                            "px-1.5 py-0.5 rounded border flex items-center gap-1",
                            src.provenance === "Verified"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : src.provenance === "Derived"
                              ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
                              : src.provenance === "Approximate"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border-white/10"
                          )}
                        >
                          {src.sourceType === "DATABASE" ? (
                            <Database className="w-2.5 h-2.5" />
                          ) : src.sourceType === "GIS_CALCULATION" ? (
                            <Cpu className="w-2.5 h-2.5" />
                          ) : (
                            <FileText className="w-2.5 h-2.5" />
                          )}
                          <span>{src.name}</span>
                          <span className="text-[8px] opacity-75">[{src.provenance}]</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>

            {/* Timestamp label */}
            <span className="text-[9px] font-mono text-slate-500 px-2">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── 3. Input & Prompt Controls ──────────────────────── */}
      <div className="border-t border-white/10 bg-slate-900/80 p-3 shrink-0 space-y-2">
        {/* Suggestion Chips above input */}
        {messages.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {suggestions.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(prompt)}
                disabled={isGenerating}
                className="whitespace-nowrap text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-white border border-white/5 hover:border-sky-500/30 transition-colors cursor-pointer shrink-0"
              >
                ✦ {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-[#08121E] border border-white/10 focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/20 rounded-xl px-3 py-1.5 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedProjectName
                ? `Ask about ${selectedProjectName}... (e.g. "What's nearby?")`
                : "Ask Atlas anything about Sta. Clara projects..."
            }
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-hidden resize-none max-h-24 py-1"
          />

          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isGenerating}
            className={cn(
              "p-2 rounded-lg transition-all shrink-0 cursor-pointer",
              inputText.trim() && !isGenerating
                ? "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/50"
                : "bg-white/5 text-slate-500 cursor-not-allowed"
            )}
            title="Send query to Atlas Assistant (Enter)"
            aria-label="Send message"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Footer Shortcut Info */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1">
          <span>Enter to send · Shift+Enter for new line · Esc to close</span>
          <span className="text-sky-500/80">Authoritative Project GIS</span>
        </div>
      </div>
    </div>
  );
};

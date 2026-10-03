"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
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
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  MessageSquare,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Move,
  PanelLeftClose,
  PanelRightClose,
  PanelBottomClose,
  Eye,
  Crosshair,
  GitCompare,
  Activity,
  Volume2,
  VolumeX,
  Radio,
  Mic,
  MicOff,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Square,
  Gauge,
  BarChart3,
  Building2,
  History,
} from "lucide-react";
import { AtlasMark, AtlasMarkTile } from "./AtlasMark";
import { findProjectMentions, toNarration, type ProjectMention } from "@/lib/atlas-ai/narration";
import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import { favourites, shortProjectName } from "@/lib/atlas-ai/userMemory";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "./useVoiceInput";
import { AtlasAIMessage } from "./useAtlasAI";
import { AtlasAIAction, AtlasAISource } from "@/lib/atlas-ai/tools/types";
import { AtlasMarkdownRenderer } from "./AtlasMarkdownRenderer";
import {
  ATLAS_Z_INDEX,
  AtlasWorkspaceMode,
  AtlasDockPosition,
  AtlasWorkspacePrefs,
  ATLAS_CATEGORIES,
} from "@/components/atlas/AtlasTokens";
import { SCICProject } from "@/lib/data/scicProjectsData";
import { CATEGORY_ICON_REGISTRY, toCanonicalCategory } from "@/components/atlas/AtlasMarkerIcons";

export interface AtlasAIWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AtlasAIMessage[];
  isGenerating: boolean;
  currentToolEvents?: Array<{ step: string; status: "started" | "completed"; toolName: string; label?: string }>;
  onSendMessage: (prompt: string) => void;
  onCancelGeneration?: () => void;
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
  // Phase 20 enhancements:
  projects?: SCICProject[];
  onSelectProject?: (id: string | null) => void;
  onFlyToProject?: (target: {
    id?: string;
    coordinates?: { lat: number; lng: number };
    zoom?: number;
    pitch?: number;
    bearing?: number;
  }) => void;
  onCompareProjects?: (projectIds: string[]) => void;
  highlightedProjectIds?: string[];
  onHighlightProjects?: (ids: string[]) => void;
  // Phase 21 enhancements:
  avatarSlotRef?: React.RefObject<HTMLDivElement | null>;
  onInputFocusChange?: (focused: boolean) => void;
  statusLabel?: string;
  // Phase 22: High-Fidelity Gemini Voice Narration Controls
  activeVoice?: string;
  setActiveVoice?: (voice: string) => void;
  availableVoices?: Array<{
    id: string;
    name: string;
    trait: string;
    title: string;
    description: string;
    gender: "male" | "female";
    isDefault?: boolean;
  }>;
  voiceEnabled?: boolean;
  toggleVoiceNarration?: () => void;
  isSpeaking?: boolean;
  cancelSpeech?: () => void;
  speakNarration?: (text: string) => Promise<void>;
  /** Viewport insets of the map row, so a docked workspace lines up with it instead of covering the header */
  dockInsets?: { top: number; right: number; bottom: number; left: number };
  /** Collapse to the pill while something else owns the stage (guided tour) */
  forceMinimized?: boolean;
  /** Little room on the map (project panel open): the minimised pill shrinks to its name and buttons */
  compactPill?: boolean;
  /** Keep state but render nothing (the other right-hand tab is showing) */
  hidden?: boolean;
  /** Reports how much room the docked panel takes on the right so the map can resize around it */
  onDockInfo?: (info: { rightDockWidth: number; dock: AtlasDockPosition; expanded: boolean }) => void;
}

// v2: the workspace docks to the right by default (v1 defaulted to a floating window over the map)
const STORAGE_KEY = "scic_atlas_ai_layout_prefs_v2";

export const AtlasAIWorkspace: React.FC<AtlasAIWorkspaceProps> = ({
  isOpen,
  onClose,
  messages,
  isGenerating,
  currentToolEvents,
  onSendMessage,
  onCancelGeneration,
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
  projects = [],
  onSelectProject,
  onFlyToProject,
  onCompareProjects,
  highlightedProjectIds = [],
  onHighlightProjects,
  avatarSlotRef,
  onInputFocusChange,
  statusLabel,
  activeVoice = "Charon",
  setActiveVoice,
  availableVoices = [],
  voiceEnabled = true,
  toggleVoiceNarration,
  isSpeaking = false,
  cancelSpeech,
  speakNarration,
  dockInsets,
  forceMinimized = false,
  compactPill = false,
  hidden = false,
  onDockInfo,
}) => {
  // ─── 1. Workspace Layout & State ───────────────────────────────────────────
  const [mode, setMode] = useState<AtlasWorkspaceMode>("CHAT");
  const [isMaximized, setIsMaximized] = useState(false);
  const [dockPosition, setDockPosition] = useState<AtlasDockPosition>("RIGHT");

  // Floating coordinates & dimensions
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>({ x: 100, y: 70 });
  const [floatingSize, setFloatingSize] = useState<{ width: number; height: number }>({
    width: 490,
    height: 620,
  });

  // Dock dimension adjustments
  const [dockWidthRight, setDockWidthRight] = useState(520);
  const [dockWidthLeft, setDockWidthLeft] = useState(520);
  const [dockHeightBottom, setDockHeightBottom] = useState(380);

  // Active interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [activeResize, setActiveResize] = useState<string | null>(null);
  const [dockTarget, setDockTarget] = useState<AtlasDockPosition | null>(null);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);

  // Mobile bottom-sheet height: "half" | "full"
  const [mobileSheetSnap, setMobileSheetSnap] = useState<"half" | "full">("full");

  // Chat message input
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Microphone Voice Chat Input
  /** The sentence that was just sent by voice: never mirrored back into the box */
  const voiceSentRef = useRef("");
  const {
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    interimTranscript: voiceInterim,
    isSupported: isVoiceSupported,
    toggleListening: toggleVoiceListening,
    stopListening: stopVoiceListening,
    error: voiceInputError,
    phase: voicePhase,
  } = useVoiceInput({
    // When you stop speaking, the request is sent straight away (the box already showed it live;
    // appending it again here is what doubled the text).
    onTranscriptComplete: (text) => {
      const spoken = text.trim();
      if (!spoken) return;
      if (isGenerating) {
        setInputText(spoken);
        return;
      }
      voiceSentRef.current = spoken;
      setInputText("");
      onSendMessage(spoken);
    },
  });

  // Sync live transcription into textarea while speaking
  useEffect(() => {
    if (isVoiceListening) {
      const activeText = voiceTranscript || voiceInterim;
      if (activeText && activeText.trim() !== voiceSentRef.current) {
        setInputText(activeText);
      }
    } else {
      voiceSentRef.current = ""; // the next time the mic opens is a new sentence
    }
  }, [isVoiceListening, voiceTranscript, voiceInterim]);

  // Analyst Table states
  const [tableSearch, setTableSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"name" | "category" | "status" | "region" | "capacity">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    capacity: true,
    client: false,
    scope: false,
  });

  // ─── 2. Hydrate Preferences on Mount ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AtlasWorkspacePrefs = JSON.parse(raw);
        if (parsed.version === 1) {
          if (parsed.dockPosition) setDockPosition(parsed.dockPosition);
          if (parsed.mode) setMode(parsed.mode);
          if (typeof parsed.isMaximized === "boolean") setIsMaximized(parsed.isMaximized);
          if (parsed.dockWidthRight) setDockWidthRight(Math.max(500, parsed.dockWidthRight));
          if (parsed.dockWidthLeft) setDockWidthLeft(Math.max(500, parsed.dockWidthLeft));
          if (parsed.dockHeightBottom) setDockHeightBottom(parsed.dockHeightBottom);
          if (parsed.floatingSize) {
            setFloatingSize({
              width: Math.max(490, parsed.floatingSize.width),
              height: Math.max(420, parsed.floatingSize.height),
            });
          }
          if (parsed.floatingPos) {
            const safeX = Math.max(12, Math.min(window.innerWidth - (parsed.floatingSize?.width || 490) - 12, parsed.floatingPos.x));
            const safeY = Math.max(56, Math.min(window.innerHeight - (parsed.floatingSize?.height || 620) - 12, parsed.floatingPos.y));
            setFloatingPos({ x: safeX, y: safeY });
          }
          return;
        }
      }
    } catch {}

    setFloatingPos({
      x: Math.max(20, window.innerWidth - 510),
      y: 70,
    });
  }, []);

  // ─── 3. Save Layout Preferences (debounced on interaction end) ─────────────
  const persistPreferences = useCallback(
    (overrides?: Partial<AtlasWorkspacePrefs>) => {
      if (typeof window === "undefined") return;
      try {
        const payload: AtlasWorkspacePrefs = {
          version: 1,
          dockPosition,
          mode,
          isMaximized,
          floatingPos,
          floatingSize,
          dockWidthRight,
          dockWidthLeft,
          dockHeightBottom,
          ...overrides,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    },
    [dockPosition, mode, isMaximized, floatingPos, floatingSize, dockWidthRight, dockWidthLeft, dockHeightBottom]
  );

  const handleResetLayout = () => {
    setDockPosition("RIGHT");
    setMode("CHAT");
    setIsMaximized(false);
    setDockWidthRight(480);
    setDockWidthLeft(480);
    setDockHeightBottom(380);
    setFloatingSize({ width: 490, height: 620 });
    const defaultX = Math.max(20, typeof window !== "undefined" ? window.innerWidth - 510 : 700);
    setFloatingPos({ x: defaultX, y: 70 });
    setIsLayoutMenuOpen(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // ─── 4. Auto-scroll on new messages ────────────────────────────────────────
  useEffect(() => {
    if (mode === "CHAT") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, currentToolEvents, mode]);

  // ─── 5. Keyboard Esc & Focus Management ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "CHAT" || mode === "COMPACT") {
      setTimeout(() => inputRef.current?.focus(), 120);
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isMaximized) {
          setIsMaximized(false);
        } else if (mode === "MINIMIZED") {
          onClose();
        } else {
          setMode("MINIMIZED");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, mode, isMaximized, onClose]);

  // ─── 6. Dragging Pointer Handlers ──────────────────────────────────────────
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [role='button'], [data-no-drag]")) {
      return;
    }

    if (window.innerWidth < 768) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: floatingPos.x,
      initY: floatingPos.y,
    };
    setIsDragging(true);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (dockPosition !== "FLOATING") {
      if (Math.hypot(dx, dy) > 12) {
        setDockPosition("FLOATING");
        dragStartRef.current.initX = e.clientX - floatingSize.width / 2;
        dragStartRef.current.initY = Math.max(60, e.clientY - 24);
      }
      return;
    }

    const newX = dragStartRef.current.initX + dx;
    const newY = dragStartRef.current.initY + dy;

    const safeX = Math.max(12, Math.min(window.innerWidth - floatingSize.width - 12, newX));
    const safeY = Math.max(56, Math.min(window.innerHeight - floatingSize.height - 12, newY));

    setFloatingPos({ x: safeX, y: safeY });

    // Edge proximity snapping detection (~60px threshold)
    if (e.clientX < 60) {
      setDockTarget("LEFT");
    } else if (e.clientX > window.innerWidth - 60) {
      setDockTarget("RIGHT");
    } else if (e.clientY > window.innerHeight - 60) {
      setDockTarget("BOTTOM");
    } else {
      setDockTarget(null);
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    setIsDragging(false);
    dragStartRef.current = null;

    if (dockTarget) {
      setDockPosition(dockTarget);
      setDockTarget(null);
      persistPreferences({ dockPosition: dockTarget });
    } else {
      persistPreferences({ dockPosition: "FLOATING", floatingPos });
    }
  };

  // ─── 7. Resizing Pointer Handlers ──────────────────────────────────────────
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    initW: number;
    initH: number;
    initX: number;
    initY: number;
    handle: string;
  } | null>(null);

  const startResize = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initW: dockPosition === "FLOATING" ? floatingSize.width : dockPosition === "RIGHT" ? dockWidthRight : dockWidthLeft,
      initH: dockPosition === "FLOATING" ? floatingSize.height : dockHeightBottom,
      initX: floatingPos.x,
      initY: floatingPos.y,
      handle,
    };
    setActiveResize(handle);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!activeResize || !resizeStartRef.current) return;

    const dx = e.clientX - resizeStartRef.current.startX;
    const dy = e.clientY - resizeStartRef.current.startY;
    const { initW, initH, initX, handle } = resizeStartRef.current;

    const minW = mode === "ANALYST" ? 540 : mode === "COMPACT" ? 360 : 380;
    const minH = mode === "COMPACT" ? 300 : 340;
    const maxW = Math.min(1250, window.innerWidth - 32);
    const maxH = Math.min(900, window.innerHeight - 80);

    if (dockPosition === "FLOATING") {
      if (handle === "se" || handle === "e") {
        const newW = Math.max(minW, Math.min(maxW, initW + dx));
        setFloatingSize((prev) => ({ ...prev, width: newW }));
      }
      if (handle === "se" || handle === "s") {
        const newH = Math.max(minH, Math.min(maxH, initH + dy));
        setFloatingSize((prev) => ({ ...prev, height: newH }));
      }
      if (handle === "w") {
        const newW = Math.max(minW, Math.min(maxW, initW - dx));
        const newX = initX + (initW - newW);
        setFloatingSize((prev) => ({ ...prev, width: newW }));
        setFloatingPos((prev) => ({ ...prev, x: newX }));
      }
    } else if (dockPosition === "RIGHT" && handle === "w") {
      const newW = Math.max(380, Math.min(Math.min(760, window.innerWidth - 300), initW - dx));
      setDockWidthRight(newW);
    } else if (dockPosition === "LEFT" && handle === "e") {
      const newW = Math.max(380, Math.min(Math.min(760, window.innerWidth - 300), initW + dx));
      setDockWidthLeft(newW);
    } else if (dockPosition === "BOTTOM" && handle === "n") {
      const newH = Math.max(240, Math.min(Math.min(640, window.innerHeight - 120), initH - dy));
      setDockHeightBottom(newH);
    }
  };

  const stopResize = (e: React.PointerEvent) => {
    if (!activeResize) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setActiveResize(null);
    resizeStartRef.current = null;
    persistPreferences();
  };

  // ─── 7b. Per-answer tools: copy, rating, the projects an answer names ─────────
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const mentionsById = useMemo(() => {
    const out: Record<string, ProjectMention[]> = {};
    for (const m of messages) {
      if (m.role === "assistant" && !m.isStreaming && m.content) {
        out[m.id] = findProjectMentions(toNarration(m.content), INITIAL_ATLAS_PROJECTS).slice(0, 4);
      }
    }
    return out;
  }, [messages]);
  const [favourite, setFavourite] = useState<ReturnType<typeof favourites>>({});
  useEffect(() => {
    if (messages.length === 0) setFavourite(favourites());
  }, [messages.length]);

  const questionBefore = useCallback(
    (msgId: string) => {
      const i = messages.findIndex((m) => m.id === msgId);
      for (let k = i - 1; k >= 0; k--) if (messages[k].role === "user") return messages[k].content;
      return "";
    },
    [messages]
  );
  const rateAnswer = useCallback(
    (msg: AtlasAIMessage, rating: "up" | "down") => {
      setRatings((r) => ({ ...r, [msg.id]: rating }));
      void fetch("/api/atlas-ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, question: questionBefore(msg.id), answer: msg.content, messageId: msg.id }),
      }).catch(() => {});
    },
    [questionBefore]
  );
  const copyAnswer = useCallback((msg: AtlasAIMessage) => {
    void navigator.clipboard?.writeText(msg.content).then(() => {
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId((id) => (id === msg.id ? null : id)), 1600);
    });
  }, []);

  // ─── 8. Query Submission & Chat ────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() || isGenerating) return;
    const text = inputText.trim();
    setInputText("");
    onSendMessage(text);
  };

  // ─── 9. Structured Results / Analyst Mode Data Model ───────────────────────
  const relevantProjectIds = useMemo(() => {
    if (highlightedProjectIds.length > 0) return highlightedProjectIds;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.actions) {
        const highlightAct = msg.actions.find((a) => a.type === "HIGHLIGHT_PROJECTS");
        if (highlightAct && highlightAct.type === "HIGHLIGHT_PROJECTS" && highlightAct.projectIds.length > 0) {
          return highlightAct.projectIds;
        }
      }
    }
    return [];
  }, [highlightedProjectIds, messages]);

  const analystProjects = useMemo(() => {
    let pool = projects;
    if (relevantProjectIds.length > 0) {
      const matched = projects.filter((p) => relevantProjectIds.includes(p.id) || relevantProjectIds.includes(p.code));
      if (matched.length > 0) pool = matched;
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      pool = pool.filter((p) => {
        const cat = toCanonicalCategory(p.sector, p.name, p.description);
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q)
        );
      });
    }

    if (selectedCategoryFilter !== "ALL") {
      pool = pool.filter((p) => toCanonicalCategory(p.sector, p.name, p.description) === selectedCategoryFilter);
    }

    const sorted = [...pool].sort((a, b) => {
      let valA: any = a.name;
      let valB: any = b.name;

      if (sortField === "category") {
        valA = toCanonicalCategory(a.sector, a.name, a.description);
        valB = toCanonicalCategory(b.sector, b.name, b.description);
      } else if (sortField === "status") {
        valA = a.status;
        valB = b.status;
      } else if (sortField === "region") {
        valA = a.region;
        valB = b.region;
      } else if (sortField === "capacity") {
        valA = a.metrics?.capacity || a.metrics?.roadLength || a.metrics?.tunnelLength || "";
        valB = b.metrics?.capacity || b.metrics?.roadLength || b.metrics?.tunnelLength || "";
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [projects, relevantProjectIds, tableSearch, selectedCategoryFilter, sortField, sortAsc]);

  const analystKPIs = useMemo(() => {
    let totalMw = 0;
    let totalTunnelKm = 0;
    let ongoingCount = 0;
    let completedCount = 0;

    analystProjects.forEach((p) => {
      const capStr = p.metrics?.capacity || "";
      const mwMatch = capStr.match(/([\d.]+)\s*MW/i);
      if (mwMatch) totalMw += parseFloat(mwMatch[1]);

      const tunnelStr = p.metrics?.tunnelLength || "";
      const kmMatch = tunnelStr.match(/([\d.]+)\s*km/i);
      if (kmMatch) totalTunnelKm += parseFloat(kmMatch[1]);

      if (p.status === "ONGOING") ongoingCount++;
      if (p.status === "COMPLETED") completedCount++;
    });

    return {
      total: analystProjects.length,
      totalMw: Math.round(totalMw * 10) / 10,
      totalTunnelKm: Math.round(totalTunnelKm * 10) / 10,
      ongoingCount,
      completedCount,
    };
  }, [analystProjects]);

  // A forced minimise (tour) can be overridden by the user for the rest of that tour
  const [forceOverride, setForceOverride] = useState(false);
  useEffect(() => {
    if (!forceMinimized) setForceOverride(false);
  }, [forceMinimized]);
  const isMinimized = mode === "MINIMIZED" || (forceMinimized && !forceOverride);

  // Tell the page how much of the right edge the docked panel occupies
  useEffect(() => {
    const desktop = typeof window !== "undefined" && window.innerWidth >= 768;
    // `expanded` deliberately ignores `hidden`: the page decides visibility from it, so it must not feed back
    const expanded = isOpen && !isMinimized && mode !== "COMPACT";
    const docksRight = expanded && !hidden && desktop && !isMaximized && dockPosition === "RIGHT";
    onDockInfo?.({ rightDockWidth: docksRight ? dockWidthRight : 0, dock: dockPosition, expanded });
  }, [isOpen, hidden, isMinimized, mode, isMaximized, dockPosition, dockWidthRight, onDockInfo]);

  if (!isOpen || hidden) return null;

  const insetTop = dockInsets?.top ?? 56;
  const insetRight = dockInsets?.right ?? 12;
  const insetBottom = dockInsets?.bottom ?? 12;
  const insetLeft = dockInsets?.left ?? 12;

  // ─── 10. Position & Styling Computations ───────────────────────────────────
  const getContainerStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") return {};
    if (window.innerWidth < 768) {
      return {};
    }

    // 1. Minimized floating HUD pill
    if (isMinimized) {
      return {
        position: "fixed",
        // clear of the navigator's bottom-right stage
        bottom: `${insetBottom + 8}px`,
        right: `${insetRight + 214}px`,
        width: "auto",
        height: "auto",
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE_ACTIVE,
      };
    }

    // 2. Compact floating HUD card
    if (mode === "COMPACT") {
      return {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "360px",
        height: "440px",
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE,
      };
    }

    // 3. Fullscreen maximized
    if (isMaximized) {
      return {
        position: "fixed",
        top: `${insetTop}px`,
        left: `${insetLeft}px`,
        right: `${insetRight}px`,
        bottom: `${insetBottom}px`,
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE_ACTIVE,
      };
    }

    // 4. Docked Positions
    if (dockPosition === "RIGHT") {
      return {
        position: "fixed",
        top: `${insetTop}px`,
        right: `${insetRight}px`,
        bottom: `${insetBottom}px`,
        width: `${dockWidthRight}px`,
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE,
      };
    }

    if (dockPosition === "LEFT") {
      return {
        position: "fixed",
        top: `${insetTop}px`,
        left: `${insetLeft}px`,
        bottom: `${insetBottom}px`,
        width: `${dockWidthLeft}px`,
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE,
      };
    }

    if (dockPosition === "BOTTOM") {
      return {
        position: "fixed",
        bottom: `${insetBottom}px`,
        left: `${insetLeft}px`,
        right: `${insetRight}px`,
        height: `${dockHeightBottom}px`,
        zIndex: ATLAS_Z_INDEX.AI_WORKSPACE,
      };
    }

    // 5. Default Floating
    return {
      position: "fixed",
      left: `${floatingPos.x}px`,
      top: `${floatingPos.y}px`,
      width: `${floatingSize.width}px`,
      height: `${floatingSize.height}px`,
      zIndex: isDragging ? ATLAS_Z_INDEX.AI_WORKSPACE_ACTIVE : ATLAS_Z_INDEX.AI_WORKSPACE,
    };
  };

  // ─── MINIMIZED VIEW RENDERER ───────────────────────────────────────────────
  if (isMinimized) {
    return (
      <aside
        id="scic-atlas-ai-workspace-minimized"
        role="region"
        aria-label="SCIC Atlas AI Workspace (Minimized)"
        aria-expanded={false}
        style={getContainerStyle()}
        className={cn(
          "pointer-events-auto rounded-full border border-emerald-500/40 bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-2xl shadow-xl shadow-black/10 dark:shadow-black/60 px-3.5 py-1.5 flex items-center gap-3 transition-all",
          dockPosition === "BOTTOM" && "w-max mx-auto bottom-4",
          isDragging && "opacity-90 ring-2 ring-emerald-500"
        )}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
          <AtlasMarkTile size={22} state={isGenerating ? "working" : isSpeaking ? "speaking" : "idle"} />
          <span className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white">Atlas</span>
        </div>

        {!compactPill && (
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 truncate max-w-[200px]">
            {selectedProjectName ? selectedProjectName : activeRegion !== "ALL" ? activeRegion : `${totalProjectsCount} Projects`}
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-2">
          <button
            onClick={() => {
              setForceOverride(true);
              setMode("CHAT");
              persistPreferences({ mode: "CHAT" });
            }}
            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:text-slate-900 dark:hover:text-white hover:bg-emerald-500/20 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Restore AI Workspace (Esc)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {!compactPill && <span>Restore</span>}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Workspace"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // ─── Structured Action Card Renderer (Sections 8-14) ──────────────────────
  const renderActionCard = (act: AtlasAIAction, actIdx: number) => {
    if (act.type === "FLY_TO_PROJECT" || act.type === "SELECT_PROJECT") {
      const proj = projects.find((p) => p.id === act.projectId || p.code === act.projectId);
      const cat = proj ? toCanonicalCategory(proj.sector, proj.name, proj.description) : undefined;
      const iconConfig = cat ? CATEGORY_ICON_REGISTRY[cat] : undefined;

      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-3 space-y-2.5 shadow-md hover:border-emerald-500/40 transition-all text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10"
                style={{ backgroundColor: `${iconConfig?.color || "#129450"}20`, color: iconConfig?.color || "#129450" }}
              >
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate font-mono">
                  {proj?.name || (act as any).projectName || act.projectId}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {[proj?.code || (act as any).projectCode, proj?.municipality, proj?.province].filter(Boolean).join(" · ") || "SCIC Infrastructure"}
                </p>
              </div>
            </div>
            {iconConfig && (
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full border shrink-0"
                style={{
                  borderColor: `${iconConfig.color}40`,
                  backgroundColor: `${iconConfig.color}15`,
                  color: iconConfig.color,
                }}
              >
                {iconConfig.label}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70 dark:border-white/5">
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
            >
              <Crosshair className="w-3 h-3" />
              <span>Center on Map</span>
            </button>
            {onSelectProject && (
              <button
                type="button"
                onClick={() => onSelectProject(proj ? proj.id : act.projectId)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Inspect</span>
              </button>
            )}
            {((proj as any)?.hasNexusOperations || (act as any).hasNexusOperations) && (
              <Link
                href={`/dashboard/projects/${proj ? proj.id : act.projectId}`}
                target="_blank"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:text-slate-900 dark:hover:text-white border border-indigo-500/20 transition-all cursor-pointer ml-auto"
                title="Open Project Nexus Operations Workspace"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Nexus Ops</span>
              </Link>
            )}
          </div>
        </div>
      );
    }

    if (act.type === "ENTER_DISCOVERY_SCOPE") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2 shadow-sm text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  Discovery Mode: {act.targetName || act.scope}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Explore regional infrastructure and narrative storytelling
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shrink-0"
            >
              <span>Explore</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    if (act.type === "FILTER_PROJECTS") {
      const filters = act.filters;
      const chips = [
        filters.category && `Category: ${filters.category}`,
        filters.status && `Status: ${filters.status}`,
        filters.region && `Region: ${filters.region}`,
        filters.province && `Province: ${filters.province}`,
        filters.islandGroup && `Island: ${filters.islandGroup}`,
      ].filter(Boolean);

      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5 space-y-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
              Project Scope Filters
            </span>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Apply Scope</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((c, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (act.type === "DRAW_TRANSIT_CORRIDOR") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-2.5 shadow-md text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                  Transit Corridor: {act.fromProject.name} ↔ {act.toProject.name}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Geodesic Distance: <span className="text-sky-700 dark:text-sky-300 font-semibold">{act.distanceKm.toFixed(1)} km</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shrink-0"
            >
              <Crosshair className="w-3 h-3" />
              <span>Draw Corridor</span>
            </button>
          </div>
        </div>
      );
    }

    if (act.type === "DRAW_BUFFER_ZONE") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2.5 shadow-md text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                  Buffer Zone: {act.label || `${act.radiusKm}km Radius`}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Radius: <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{act.radiusKm} km</span> · Captured: <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{act.projectIdsInside.length} Projects</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shrink-0"
            >
              <Crosshair className="w-3 h-3" />
              <span>Inspect Buffer</span>
            </button>
          </div>
        </div>
      );
    }

    if (act.type === "HIGHLIGHT_PROJECTS") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AtlasMark size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                  Highlighted Assets ({act.projectIds.length})
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Spatial cluster spotlight across active map canvas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all cursor-pointer shrink-0"
            >
              <Layers className="w-3 h-3" />
              <span>Highlight</span>
            </button>
          </div>
        </div>
      );
    }

    if (act.type === "START_TOUR") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                  AI Guided Portfolio Tour
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Cinematic fly-through with audio narration & project briefs
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onExecuteAction(act)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer shrink-0"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Start Tour</span>
            </button>
          </div>
        </div>
      );
    }

    if (act.type === "OPEN_NEXUS_OPERATIONS") {
      return (
        <div
          key={actIdx}
          className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                  {act.label || `Nexus Operations: ${act.projectName || act.projectId}`}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Telemetry, engineering CAD, BIM viewer, & live sensors
                </p>
              </div>
            </div>
            <Link
              href={act.destination || `/dashboard/projects/${act.projectId}`}
              target="_blank"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shrink-0"
            >
              <span>Launch Nexus</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      );
    }

    // Default Action Chip
    return (
      <button
        key={actIdx}
        type="button"
        onClick={() => onExecuteAction(act)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:text-slate-900 dark:hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
      >
        <Compass className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>{act.type.replace(/_/g, " ")}</span>
      </button>
    );
  };

  return (
    <>
      {/* ─── Edge Snap Ghost Targets ──────────────────────────────────────── */}
      {isDragging && dockTarget === "LEFT" && (
        <div className="fixed top-14 left-3 bottom-3 w-[460px] rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-500/10 pointer-events-none z-30 animate-pulse backdrop-blur-xs" />
      )}
      {isDragging && dockTarget === "RIGHT" && (
        <div className="fixed top-14 right-3 bottom-3 w-[460px] rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-500/10 pointer-events-none z-30 animate-pulse backdrop-blur-xs" />
      )}
      {isDragging && dockTarget === "BOTTOM" && (
        <div className="fixed bottom-3 left-3 right-3 h-[360px] rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-500/10 pointer-events-none z-30 animate-pulse backdrop-blur-xs" />
      )}

      {/* ─── Main Workspace Container ─────────────────────────────────────── */}
      <aside
        ref={workspaceRef}
        id="scic-atlas-ai-workspace"
        role="region"
        aria-label="SCIC Atlas AI Workspace"
        aria-expanded={true}
        style={getContainerStyle()}
        onPointerMove={activeResize ? handleResizeMove : undefined}
        onPointerUp={activeResize ? stopResize : undefined}
        className={cn(
          "pointer-events-auto flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-2xl shadow-2xl shadow-black/15 dark:shadow-black/80 overflow-hidden transition-all duration-150 select-text",
          // Mobile bottom-sheet layout (<768px)
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-2xl max-md:rounded-b-none max-md:border-t max-md:border-slate-300 dark:max-md:border-white/15 max-md:bg-white/98 dark:max-md:bg-atlas-panel/98 max-md:backdrop-blur-3xl max-md:z-50",
          typeof window !== "undefined" && window.innerWidth < 768 && (mobileSheetSnap === "half" ? "max-md:h-[52vh]" : "max-md:h-[88vh]"),
          isDragging && "opacity-95 shadow-cyan-500/10 ring-1 ring-cyan-500/30"
        )}
      >
        {/* ─── Mobile Touch Drag Indicator ─────────────────────────────────── */}
        <div
          className="md:hidden w-full flex items-center justify-center py-2 shrink-0 bg-slate-100 dark:bg-white/5 cursor-pointer touch-none"
          onClick={() => setMobileSheetSnap((prev) => (prev === "half" ? "full" : "half"))}
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-500" />
        </div>

        {/* ─── 1. Header Toolbar (Pointer Draggable) ────────────────────────── */}
        <div
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          className={cn(
            "relative z-30 flex flex-col border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 px-3 py-2 shrink-0 select-none overflow-visible",
            typeof window !== "undefined" && window.innerWidth >= 768 && "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="flex items-center justify-between gap-1 sm:gap-2 w-full min-w-0">
            {/* Left: Identity + Drag Affordance + Avatar Slot */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
              <div
                ref={avatarSlotRef}
                id="atlas-navigator-slot"
                className="flex items-center justify-center shrink-0"
              >
                <AtlasMarkTile size={30} state={isGenerating ? "working" : isSpeaking ? "speaking" : "idle"} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="flex flex-col min-w-0">
                  <h2 className="flex items-baseline gap-1.5 truncate leading-tight">
                    <span className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white">Atlas</span>
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-[0.14em] text-[#007B3E] dark:text-emerald-400">
                      Field Navigator
                    </span>
                  </h2>
                  <span className="flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[190px] leading-tight">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isGenerating ? "bg-amber-500 animate-pulse" : isSpeaking ? "bg-sky-500 animate-pulse" : "bg-emerald-500"
                      )}
                    />
                    <span className="truncate">{isGenerating ? "Looking it up…" : isSpeaking ? "Speaking" : statusLabel || "Ready"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Mode Tabs Switcher */}
            <div className="flex items-center rounded-lg bg-white dark:bg-black/40 border border-slate-200/70 dark:border-white/5 p-0.5 text-[11px] font-mono shrink-0 mx-0.5 sm:mx-1" data-no-drag>
              <button
                type="button"
                onClick={() => {
                  setMode("CHAT");
                  persistPreferences({ mode: "CHAT" });
                }}
                className={cn(
                  "flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md transition-all cursor-pointer",
                  mode === "CHAT"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                )}
                title="Chat Workspace"
              >
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span className="hidden lg:inline">Chat</span>
                {messages.length > 0 && (
                  <span className="text-[9px] px-1 rounded-full bg-slate-300 dark:bg-white/20">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("ANALYST");
                  // Auto-expand workspace width if narrow so the table has proper room
                  if (dockPosition === "RIGHT") {
                    setDockWidthRight((w) => Math.max(720, w));
                  } else if (dockPosition === "LEFT") {
                    setDockWidthLeft((w) => Math.max(720, w));
                  } else if (dockPosition === "FLOATING") {
                    setFloatingSize((s) => ({ ...s, width: Math.max(720, s.width) }));
                  }
                  persistPreferences({ mode: "ANALYST" });
                }}
                className={cn(
                  "flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md transition-all cursor-pointer",
                  mode === "ANALYST"
                    ? "bg-cyan-600 text-white font-semibold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                )}
                title="Analyst Project Table"
              >
                <TableIcon className="w-3 h-3 shrink-0" />
                <span className="hidden lg:inline">Table</span>
                <span className="text-[9px] px-1 rounded-full bg-slate-300 dark:bg-white/20">
                  {analystProjects.length}
                </span>
              </button>
            </div>

            {/* Right: Window & Layout Controls (Always pinned to right edge, high z-index, never clipped) */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto z-30 relative" data-no-drag>
              {/* ✦ Gemini Neural Voice Narration & Model Voice Selector */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVoiceMenuOpen((prev) => !prev)}
                  title={`Gemini Voice Narration: ${activeVoice} (${voiceEnabled ? "Enabled" : "Muted"})`}
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0",
                    voiceEnabled
                      ? "text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-500/10"
                      : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5",
                    isVoiceMenuOpen && "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/40"
                  )}
                  aria-label="Voice settings"
                >
                  {voiceEnabled ? (
                    <Volume2 className={cn("w-3.5 h-3.5", isSpeaking && "animate-pulse text-cyan-700 dark:text-cyan-300")} />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60 -ml-0.5" />
                </button>

                {isVoiceMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-cyan-500/35 bg-slate-50 dark:bg-atlas-sunken/98 backdrop-blur-2xl shadow-2xl p-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Title & Badge */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 mb-2">
                      <div className="flex items-center gap-1.5">
                        <AtlasMark size={14} className="text-cyan-600 dark:text-cyan-400" />
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Voice Intelligence
                        </span>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                        Gemini voice
                      </span>
                    </div>

                    {/* Master Spoken Answers Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-white/5 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-900 dark:text-white font-medium">Spoken Narration</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">Speak AI answers aloud</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleVoiceNarration?.()}
                        className={cn(
                          "w-9 h-5 rounded-full transition-colors relative cursor-pointer",
                          voiceEnabled ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                            voiceEnabled && "translate-x-4"
                          )}
                        />
                      </button>
                    </div>

                    {/* Voice Selection List */}
                    <div className="space-y-1 mb-2">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                        Select Neural Voice
                      </div>
                      {availableVoices.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setActiveVoice?.(v.id);
                          }}
                          className={cn(
                            "w-full text-left p-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer",
                            activeVoice === v.id
                              ? "bg-cyan-500/15 text-slate-900 dark:text-white border border-cyan-500/30 font-bold"
                              : "text-slate-600 dark:text-slate-300"
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs truncate">{v.name}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal truncate">{v.description}</span>
                          </div>
                          <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-mono shrink-0 px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5">
                            {v.trait || v.gender}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Preview Voice Line Button */}
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          speakNarration?.(
                            `SCIC Atlas Navigator voice calibrated. Current voice preset is ${activeVoice}. Ready to inspect nationwide infrastructure.`
                          );
                        }}
                        disabled={isSpeaking}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/35 text-[10px] font-mono font-semibold text-cyan-800 dark:text-cyan-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Radio className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>{isSpeaking ? "Speaking Preview..." : "Test Voice Preview"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = mode === "COMPACT" ? "CHAT" : "COMPACT";
                  setMode(nextMode);
                  persistPreferences({ mode: nextMode });
                }}
                title={mode === "COMPACT" ? "Expand view" : "Compact HUD view"}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0",
                  mode === "COMPACT"
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10"
                )}
                aria-label="Toggle compact mode"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>

              {/* Layout & Docking Dropdown Menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLayoutMenuOpen((prev) => !prev)}
                  title="Workspace Layout & Docking Options"
                  className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  aria-label="Layout menu"
                >
                  <Move className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2.5 h-2.5 opacity-60 -ml-0.5" />
                </button>

                {isLayoutMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-atlas-panel/98 backdrop-blur-xl shadow-2xl p-1.5 text-xs font-mono text-slate-600 dark:text-slate-300 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200/70 dark:border-white/5 mb-1">
                      Docking Positions
                    </div>
                    <button
                      onClick={() => {
                        setDockPosition("FLOATING");
                        setIsLayoutMenuOpen(false);
                        persistPreferences({ dockPosition: "FLOATING" });
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer",
                        dockPosition === "FLOATING" && "text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-white/5"
                      )}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Float Window</span>
                    </button>
                    <button
                      onClick={() => {
                        setDockPosition("RIGHT");
                        setIsLayoutMenuOpen(false);
                        persistPreferences({ dockPosition: "RIGHT" });
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer",
                        dockPosition === "RIGHT" && "text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-white/5"
                      )}
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                      <span>Dock Right</span>
                    </button>
                    <button
                      onClick={() => {
                        setDockPosition("LEFT");
                        setIsLayoutMenuOpen(false);
                        persistPreferences({ dockPosition: "LEFT" });
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer",
                        dockPosition === "LEFT" && "text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-white/5"
                      )}
                    >
                      <PanelLeftClose className="w-3.5 h-3.5" />
                      <span>Dock Left</span>
                    </button>
                    <button
                      onClick={() => {
                        setDockPosition("BOTTOM");
                        setIsLayoutMenuOpen(false);
                        persistPreferences({ dockPosition: "BOTTOM" });
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer",
                        dockPosition === "BOTTOM" && "text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-white/5"
                      )}
                    >
                      <PanelBottomClose className="w-3.5 h-3.5" />
                      <span>Dock Bottom (Wide)</span>
                    </button>

                    <div className="border-t border-slate-200/70 dark:border-white/5 my-1" />

                    <button
                      onClick={() => {
                        setIsMaximized((prev) => !prev);
                        setIsLayoutMenuOpen(false);
                        persistPreferences({ isMaximized: !isMaximized });
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      <span>{isMaximized ? "Restore Dimensions" : "Maximize Screen"}</span>
                    </button>

                    <button
                      onClick={handleResetLayout}
                      className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Assistant Layout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Maximize / Restore Button */}
              <button
                type="button"
                onClick={() => {
                  setIsMaximized((prev) => !prev);
                  persistPreferences({ isMaximized: !isMaximized });
                }}
                title={isMaximized ? "Restore window size" : "Maximize workspace"}
                className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Toggle maximize"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Minimize to Pill Button */}
              <button
                type="button"
                onClick={() => {
                  setMode("MINIMIZED");
                  persistPreferences({ mode: "MINIMIZED" });
                }}
                title="Minimize to floating pill"
                className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Minimize"
              >
                <div className="w-3 h-0.5 bg-current rounded-full" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                title="Close AI Assistant (Escape)"
                className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer ml-0.5 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Pill & Undo Action Banner */}
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Context:</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
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
                type="button"
                onClick={onUndoAction}
                className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer shrink-0 ml-2"
                title="Undo last map action"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </div>

          {/* Action Feedback Badge (Section 6) */}
          {lastAppliedAction && (
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
              <span className="truncate">✓ {lastAppliedAction}</span>
              {canUndo && (
                <button
                  type="button"
                  onClick={onUndoAction}
                  className="text-[9px] text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:underline shrink-0 ml-1.5 cursor-pointer font-bold"
                >
                  Undo Action
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── 2. Body View Rendering (CHAT / ANALYST / COMPACT) ─────────────── */}
        {mode === "ANALYST" ? (
          // ─── ANALYST MODE: Data-dense Project Intelligence Table ───────────
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-atlas-sunken">
            {/* KPI Bar & Table Controls */}
            <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-atlas-panel/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs font-mono">
              {/* Left: Summary Metrics */}
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{analystKPIs.total} Projects</span>
                </span>
                {analystKPIs.totalMw > 0 && (
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">Cap:</span> {analystKPIs.totalMw} MW
                  </span>
                )}
                {analystKPIs.totalTunnelKm > 0 && (
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500">Tunnel:</span> {analystKPIs.totalTunnelKm} km
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400">{analystKPIs.ongoingCount}</span> ongoing ·{" "}
                  <span className="text-sky-600 dark:text-sky-400">{analystKPIs.completedCount}</span> completed
                </span>
              </div>

              {/* Right: Search, Columns & Batch Actions */}
              <div className="flex items-center gap-2">
                {/* Instant Table Search Filter */}
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search table..."
                    className="pl-7 pr-2.5 py-1 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-cyan-500/50 w-36 sm:w-44"
                  />
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Column Visibility Manager */}
                <div className="relative">
                  <button
                    onClick={() => setIsColumnsMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Columns</span>
                  </button>

                  {isColumnsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-atlas-panel/98 backdrop-blur-xl shadow-2xl p-2 z-50 text-xs font-mono space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold px-1 pb-1 border-b border-slate-200/70 dark:border-white/5">
                        Toggle Columns
                      </div>
                      {[
                        { key: "code", label: "Project Code" },
                        { key: "capacity", label: "Capacity / Metrics" },
                        { key: "client", label: "Client" },
                        { key: "scope", label: "Engineering Scope" },
                      ].map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-1 py-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded cursor-pointer text-slate-600 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key]}
                            onChange={(e) =>
                              setVisibleColumns((prev) => ({ ...prev, [col.key]: e.target.checked }))
                            }
                            className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-0"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Batch Action: Highlight All on Map */}
                {analystProjects.length > 0 && onHighlightProjects && (
                  <button
                    onClick={() => onHighlightProjects(analystProjects.map((p) => p.id))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs transition-colors cursor-pointer"
                    title="Highlight all matching projects on the GIS map"
                  >
                    <AtlasMark size={12} />
                    <span className="hidden sm:inline">Show All on Map</span>
                  </button>
                )}
              </div>
            </div>

            {/* Structured Table Container (Scrollable) */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-atlas-panel border-b border-slate-200 dark:border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10">
                  <tr>
                    <th
                      onClick={() => {
                        if (sortField === "name") setSortAsc(!sortAsc);
                        else {
                          setSortField("name");
                          setSortAsc(true);
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Project</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortField === "category") setSortAsc(!sortAsc);
                        else {
                          setSortField("category");
                          setSortAsc(true);
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortField === "status") setSortAsc(!sortAsc);
                        else {
                          setSortField("status");
                          setSortAsc(true);
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortField === "region") setSortAsc(!sortAsc);
                        else {
                          setSortField("region");
                          setSortAsc(true);
                        }
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Location</span>
                        <ArrowUpDown className="w-3 h-3 opacity-60" />
                      </div>
                    </th>
                    {visibleColumns.code && <th className="py-2.5 px-3">Code</th>}
                    {visibleColumns.capacity && (
                      <th
                        onClick={() => {
                          if (sortField === "capacity") setSortAsc(!sortAsc);
                          else {
                            setSortField("capacity");
                            setSortAsc(true);
                          }
                        }}
                        className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                      >
                        <div className="flex items-center gap-1">
                          <span>Capacity / Metric</span>
                          <ArrowUpDown className="w-3 h-3 opacity-60" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.client && <th className="py-2.5 px-3">Client</th>}
                    {visibleColumns.scope && <th className="py-2.5 px-3">Scope</th>}
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                  {analystProjects.map((p) => {
                    const isSelected = selectedProjectId === p.id;
                    const isHighlighted = highlightedProjectIds.includes(p.id);
                    const canonicalCat = toCanonicalCategory(p.sector, p.name, p.description);
                    const catToken = ATLAS_CATEGORIES[canonicalCat] || ATLAS_CATEGORIES.OTHER;
                    const catConfig = CATEGORY_ICON_REGISTRY[canonicalCat];

                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          onSelectProject?.(p.id);
                          onFlyToProject?.({
                            id: p.id,
                            coordinates: p.coordinates,
                            zoom: 14.5,
                            pitch: 45,
                          });
                        }}
                        className={cn(
                          "hover:bg-white/[0.04] transition-colors group cursor-pointer",
                          isSelected && "bg-cyan-500/10 hover:bg-cyan-500/15 ring-1 ring-inset ring-cyan-500/30",
                          isHighlighted && "bg-amber-500/10 hover:bg-amber-500/15"
                        )}
                      >
                        {/* Project Name + Icon */}
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: catToken.badgeBg,
                                borderColor: `${catToken.color}50`,
                                color: catToken.color,
                              }}
                            >
                              <Layers size={13} />
                            </div>
                            <span className="truncate" title={p.name}>
                              {p.name}
                            </span>
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border"
                            style={{
                              backgroundColor: catToken.badgeBg,
                              borderColor: `${catToken.color}50`,
                              color: catToken.color,
                            }}
                          >
                            {catToken.shortLabel}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border",
                              p.status === "ONGOING"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : p.status === "COMPLETED"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                p.status === "ONGOING" ? "bg-emerald-400 animate-pulse" : "bg-current"
                              )}
                            />
                            <span>{p.status}</span>
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {p.province}, {p.region}
                        </td>

                        {/* Optional Columns */}
                        {visibleColumns.code && (
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {p.code}
                          </td>
                        )}
                        {visibleColumns.capacity && (
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                            {p.metrics?.capacity || p.metrics?.roadLength || p.metrics?.tunnelLength || p.metrics?.contractValue || "—"}
                          </td>
                        )}
                        {visibleColumns.client && (
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]" title={p.client}>
                            {p.client || "—"}
                          </td>
                        )}
                        {visibleColumns.scope && (
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[180px]" title={p.engineeringScope?.join(", ")}>
                            {p.engineeringScope?.join(", ") || "—"}
                          </td>
                        )}

                        {/* Row Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onSelectProject?.(p.id)}
                              className="p-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/20 text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                              title="Inspect Project"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                onFlyToProject?.({
                                  id: p.id,
                                  coordinates: p.coordinates,
                                  zoom: 14.5,
                                  pitch: 45,
                                })
                              }
                              className="p-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                              title="Center on Map"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                            </button>
                            {onCompareProjects && (
                              <button
                                onClick={() => onCompareProjects([p.id])}
                                className="p-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-amber-500/20 text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                title="Compare Project"
                              >
                                <GitCompare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <Link
                              href={`/dashboard/projects/${p.id}`}
                              target="_blank"
                              className="p-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-indigo-500/20 text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                              title="Open in Project Nexus"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {analystProjects.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No projects match your current table filters.
                </div>
              )}
            </div>
          </div>
        ) : mode === "COMPACT" ? (
          // ─── COMPACT MODE: ~420×420 Quick Analysis HUD ─────────────────────
          <div className="flex-1 flex flex-col justify-between p-3.5 bg-slate-50 dark:bg-atlas-sunken space-y-3 font-sans text-xs">
            {/* Quick Action Prompts Bar */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick GIS Actions
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Portfolio Tour", prompt: "Start Portfolio Tour", icon: Compass },
                  { label: "Executive Brief", prompt: "Generate Portfolio Brief", icon: FileText },
                  { label: "Nearby Projects", prompt: "What's around here?", icon: MapPin },
                  { label: "Explore Regions", prompt: "Summarize projects by region", icon: Layers },
                ].map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setMode("CHAT");
                        onSendMessage(act.prompt);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/15 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-white/5 hover:border-emerald-500/30 transition-all text-[11px] font-mono text-left cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Latest Assistant Note Preview */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/5 p-3 text-slate-600 dark:text-slate-300 leading-relaxed font-sans text-xs">
              {messages.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Latest Intelligence:
                  </span>
                  <p className="line-clamp-4 text-slate-700 dark:text-slate-200">
                    {messages[messages.length - 1].content}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 text-slate-500 dark:text-slate-400 space-y-1.5">
                  <AtlasMark size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs">Ask Atlas anything about Sta. Clara projects.</p>
                </div>
              )}
            </div>

            {/* Compact Input */}
            <div className="flex items-center gap-2 bg-white dark:bg-atlas-panel border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => onInputFocusChange?.(true)}
                onBlur={() => onInputFocusChange?.(false)}
                placeholder="Ask Atlas AI..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden resize-none py-1"
              />
              <button
                onClick={() => {
                  setMode("CHAT");
                  handleSubmit();
                }}
                disabled={!inputText.trim() || isGenerating}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          // ─── CHAT MODE ──────────────────────────────────────────────────────────
          <div className="flex-1 flex flex-col min-h-0 bg-[#F7F8F6] dark:bg-atlas-sunken">
            {/* Field kit: the four things people ask for most, always one tap away */}
            {messages.length > 0 && (
              <div className="px-3 py-2 border-b border-slate-200/70 dark:border-white/[0.06] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-white/70 dark:bg-white/[0.02]">
                {[
                  { label: "Tour", prompt: "Start Portfolio Tour", icon: Compass },
                  { label: "Brief", prompt: "Generate Portfolio Brief", icon: FileText },
                  { label: "This view", prompt: "Explain Current View", icon: Layers },
                  { label: "Nearby", prompt: "What's around here?", icon: MapPin },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onSendMessage(item.prompt)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/[0.04] hover:bg-[#007B3E]/10 hover:text-[#007B3E] dark:hover:text-emerald-300 border border-transparent hover:border-[#007B3E]/25 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Conversation */}
            <div role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scroll-smooth">
              {messages.length === 0 && (
                <div className="flex flex-col pt-2 pb-4 animate-in fade-in duration-300">
                  <AtlasMarkTile size={44} className="rounded-2xl" />
                  <h3 className="mt-4 text-[19px] leading-tight font-semibold tracking-tight text-slate-900 dark:text-white">
                    {(() => {
                      const h = new Date().getHours();
                      return h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
                    })()}
                    <br />
                    <span className="text-slate-500 dark:text-slate-400">Where to on the map?</span>
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400 max-w-sm">
                    I&apos;m Atlas, Sta. Clara&apos;s field navigator. Ask me about any project, region or figure and I&apos;ll show you on the map.
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ...(favourite.project
                        ? [{ icon: History, title: `Back to ${shortProjectName(favourite.project.name).split(" ").slice(0, 3).join(" ")}`, sub: "You were looking at it last time", prompt: `Tell me about ${shortProjectName(favourite.project.name)}` }]
                        : []),
                      { icon: Compass, title: "Tour the flagships", sub: "A guided fly-through", prompt: "Start Portfolio Tour" },
                      { icon: FileText, title: "Portfolio brief", sub: "The whole picture in a minute", prompt: "Generate Portfolio Brief" },
                      { icon: Gauge, title: "Megawatts in Luzon", sub: "Capacity, straight from the records", prompt: "How many megawatts do we have in Luzon?" },
                      { icon: BarChart3, title: "Busiest region", sub: "Where most of the work is", prompt: "Which region has the most projects?" },
                      { icon: Building2, title: "About the company", sub: "Head office, leadership, history", prompt: "Tell me about the company" },
                      { icon: Crosshair, title: "What am I looking at?", sub: "Explain the current map view", prompt: "Explain Current View" },
                    ]
                      .slice(0, 6)
                      .map((card) => {
                        const Icon = card.icon;
                        return (
                          <button
                            key={card.title}
                            type="button"
                            onClick={() => onSendMessage(card.prompt)}
                            className="group text-left rounded-xl px-3 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] hover:border-[#007B3E]/40 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-[#007B3E] dark:text-emerald-400 shrink-0" />
                              <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{card.title}</span>
                            </div>
                            <p className="mt-0.5 pl-6 text-[11px] text-slate-500 dark:text-slate-400 truncate">{card.sub}</p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#007B3E] text-white px-3.5 py-2 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-2.5 items-start">
                    <AtlasMarkTile size={26} state={msg.isStreaming ? "working" : "idle"} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">Atlas</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="rounded-2xl rounded-tl-md bg-white dark:bg-white/[0.035] border border-slate-200/80 dark:border-white/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        {/* while he works: what he is doing, step by step */}
                        {msg.isStreaming && msg.toolEvents && msg.toolEvents.length > 0 && (
                          <ul className="mb-2 space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                            {msg.toolEvents.map((ev, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                {ev.status === "completed" ? (
                                  <Check className="w-3.5 h-3.5 text-[#007B3E] dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007B3E] dark:text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate">{ev.label || (ev.status === "completed" ? "Checked" : "Looking it up…")}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {msg.content ? (
                          <AtlasMarkdownRenderer content={msg.content} />
                        ) : msg.isStreaming ? (
                          <div className="flex items-center gap-2 py-0.5 text-slate-500 dark:text-slate-400">
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#007B3E] animate-bounce [animation-delay:-0.2s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-[#007B3E] animate-bounce [animation-delay:-0.1s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-[#007B3E] animate-bounce" />
                            </span>
                            <span className="text-[12px]">Checking the records</span>
                          </div>
                        ) : null}

                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-white/[0.06]">
                            {msg.actions.map((act, actIdx) => renderActionCard(act, actIdx))}
                          </div>
                        )}
                      </div>

                      {/* Where it came from: projects it names (tap to go there) and its sources */}
                      {!msg.isStreaming && msg.content && ((mentionsById[msg.id]?.length ?? 0) > 0 || (msg.sources?.length ?? 0) > 0) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {mentionsById[msg.id]?.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const p = INITIAL_ATLAS_PROJECTS.find((x) => x.id === m.id);
                                onSelectProject?.(m.id);
                                if (p) onFlyToProject?.({ id: m.id, coordinates: p.coordinates });
                              }}
                              title={`Show ${m.name} on the map`}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium text-[#007B3E] dark:text-emerald-300 bg-[#007B3E]/[0.07] hover:bg-[#007B3E]/15 border border-[#007B3E]/20 transition-colors cursor-pointer max-w-[220px]"
                            >
                              <Crosshair className="w-3 h-3 shrink-0" />
                              <span className="truncate">{shortProjectName(m.name)}</span>
                            </button>
                          ))}
                          {msg.sources?.map((src, k) =>
                            src.document && /^https?:\/\//.test(src.document) ? (
                              <a
                                key={`s${k}`}
                                href={src.document}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/[0.08] transition-colors"
                                title="Open the source"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                {src.name}
                              </a>
                            ) : (
                              <span
                                key={`s${k}`}
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]"
                                title={`${src.provenance} source`}
                              >
                                <Database className="w-3 h-3 shrink-0" />
                                {src.name}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Answer tools */}
                      {!msg.isStreaming && msg.content && (
                        <div className="mt-1 flex items-center gap-0.5 text-slate-400">
                          {speakNarration && (
                            <button
                              type="button"
                              onClick={() => (isSpeaking && cancelSpeech ? cancelSpeech() : speakNarration(msg.spoken || msg.content))}
                              title={isSpeaking ? "Stop" : `Listen (${activeVoice})`}
                              aria-label={isSpeaking ? "Stop speaking" : "Listen to this answer"}
                              className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                              {isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                              <span>{isSpeaking ? "Stop" : "Listen"}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => copyAnswer(msg)}
                            title="Copy"
                            aria-label="Copy this answer"
                            className="h-7 w-7 rounded-lg inline-flex items-center justify-center hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-[#007B3E]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => rateAnswer(msg, "up")}
                            title="Good answer"
                            aria-label="Good answer"
                            aria-pressed={ratings[msg.id] === "up"}
                            className={cn(
                              "h-7 w-7 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer",
                              ratings[msg.id] === "up" ? "text-[#007B3E] dark:text-emerald-400" : "hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                          >
                            <ThumbsUp className={cn("w-3.5 h-3.5", ratings[msg.id] === "up" && "fill-current")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => rateAnswer(msg, "down")}
                            title="Not right"
                            aria-label="Not a good answer"
                            aria-pressed={ratings[msg.id] === "down"}
                            className={cn(
                              "h-7 w-7 rounded-lg inline-flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer",
                              ratings[msg.id] === "down" ? "text-rose-600 dark:text-rose-400" : "hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                          >
                            <ThumbsDown className={cn("w-3.5 h-3.5", ratings[msg.id] === "down" && "fill-current")} />
                          </button>
                          {ratings[msg.id] && (
                            <span className="ml-1 text-[10.5px] text-slate-400 animate-in fade-in duration-200">
                              {ratings[msg.id] === "up" ? "Thanks!" : "Noted. I'll learn from it."}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 bg-[#F7F8F6] dark:bg-atlas-sunken">
              {voiceInputError && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200 text-[11.5px] flex items-center justify-between gap-2">
                  <span>{voiceInputError}</span>
                  <button type="button" onClick={() => stopVoiceListening()} className="text-rose-500 hover:text-rose-700 cursor-pointer" aria-label="Dismiss">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl border bg-white dark:bg-white/[0.04] shadow-sm transition-colors",
                  isVoiceListening
                    ? "border-rose-300 dark:border-rose-500/40 ring-4 ring-rose-500/10"
                    : "border-slate-200 dark:border-white/[0.09] focus-within:border-[#007B3E]/60 focus-within:ring-4 focus-within:ring-[#007B3E]/10"
                )}
              >
                {isVoiceListening && (
                  <div className="flex items-center gap-2 px-3.5 pt-2.5 text-[11.5px] text-rose-600 dark:text-rose-300">
                    <span className="flex items-end gap-[3px] h-3">
                      {[0, 1, 2, 3, 4].map((k) => (
                        <span
                          key={k}
                          className="w-[3px] rounded-full bg-rose-500 animate-pulse"
                          style={{ height: `${[6, 11, 8, 12, 5][k]}px`, animationDelay: `${k * 0.12}s` }}
                        />
                      ))}
                    </span>
                    {voicePhase === "transcribing" ? "Got it, sending…" : "Listening. It sends when you stop talking."}
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => onInputFocusChange?.(true)}
                  onBlur={() => onInputFocusChange?.(false)}
                  placeholder={
                    isVoiceListening
                      ? "Go ahead, I'm listening…"
                      : selectedProjectName
                      ? `Ask about ${shortProjectName(selectedProjectName).slice(0, 34)}…`
                      : "Ask about a project, a region or a figure…"
                  }
                  className="block w-full bg-transparent px-3.5 pt-2.5 pb-1 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden resize-none max-h-28"
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="pl-1.5 text-[10.5px] text-slate-400 hidden sm:inline">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    {isGenerating && onCancelGeneration && (
                      <button
                        type="button"
                        onClick={onCancelGeneration}
                        title="Stop"
                        className="h-8 px-2.5 rounded-full text-[11.5px] font-medium inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    )}
                    {isVoiceSupported && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleVoiceListening();
                        }}
                        title={isVoiceListening ? "Stop listening" : "Talk to Atlas"}
                        aria-label={isVoiceListening ? "Stop listening" : "Talk to Atlas"}
                        aria-pressed={isVoiceListening}
                        className={cn(
                          "h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer",
                          isVoiceListening
                            ? "bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.18)]"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07]"
                        )}
                      >
                        {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!inputText.trim() || isGenerating}
                      className="h-8 w-8 rounded-full inline-flex items-center justify-center bg-[#007B3E] hover:bg-[#006633] text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/[0.06] dark:disabled:text-slate-500 transition-colors cursor-pointer"
                      title="Send (Enter)"
                      aria-label="Send"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -translate-x-px translate-y-px" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. Resizing Handles (Desktop Only) ─────────────────────────────── */}
        {typeof window !== "undefined" && window.innerWidth >= 768 && !isMaximized && (
          <>
            {dockPosition === "FLOATING" && (
              <>
                <div
                  onPointerDown={(e) => startResize("e", e)}
                  className="absolute right-0 top-14 bottom-0 w-2.5 cursor-ew-resize hover:bg-emerald-500/30 transition-colors z-10"
                />
                <div
                  onPointerDown={(e) => startResize("s", e)}
                  className="absolute left-0 right-0 bottom-0 h-2.5 cursor-ns-resize hover:bg-emerald-500/30 transition-colors z-10"
                />
                <div
                  onPointerDown={(e) => startResize("w", e)}
                  className="absolute left-0 top-14 bottom-0 w-2.5 cursor-ew-resize hover:bg-emerald-500/30 transition-colors z-10"
                />
                <div
                  onPointerDown={(e) => startResize("se", e)}
                  className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize hover:bg-emerald-500/50 transition-colors z-20 flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 border-r border-b border-slate-400" />
                </div>
              </>
            )}

            {dockPosition === "RIGHT" && (
              <div
                onPointerDown={(e) => startResize("w", e)}
                className="absolute left-0 top-14 bottom-0 w-2.5 cursor-ew-resize hover:bg-emerald-500/40 transition-colors z-10"
              />
            )}

            {dockPosition === "LEFT" && (
              <div
                onPointerDown={(e) => startResize("e", e)}
                className="absolute right-0 top-14 bottom-0 w-2.5 cursor-ew-resize hover:bg-emerald-500/40 transition-colors z-10"
              />
            )}

            {dockPosition === "BOTTOM" && (
              <div
                onPointerDown={(e) => startResize("n", e)}
                className="absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize hover:bg-emerald-500/40 transition-colors z-10"
              />
            )}
          </>
        )}
      </aside>
    </>
  );
};

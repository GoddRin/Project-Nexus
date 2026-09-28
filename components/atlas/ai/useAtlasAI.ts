"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AtlasAIAction, AtlasAISource } from "@/lib/atlas-ai/tools/types";
import { AtlasContextPayload } from "@/lib/atlas-ai/identity";
import {
  getGuidedTourData,
  AtlasTourStepData,
} from "@/lib/atlas-ai/portfolioTours";

export interface AtlasAIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AtlasAIAction[];
  sources?: AtlasAISource[];
  isStreaming?: boolean;
  toolEvents?: Array<{ step: string; status: "started" | "completed"; toolName: string }>;
  timestamp: number;
  appliedActionSummary?: string;
}

// Corporate Audio Chime for Tour Audio Feedback (Web Audio API)
function playAtlasAudioChime(type: "activate" | "step" | "deactivate" = "step") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "activate") {
      // Ascending emerald pleasant chime (C5 -> G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "step") {
      // Subtle spatial transition ping (D5 -> A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Gentle power down (E5 -> E4)
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // AudioContext not allowed or unsupported
  }
}


// Select the highest-quality, most human and cheerful natural tour guide voice (US or Philippine English)
function getBestTourGuideVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase().replace("_", "-");

    // 1. HARD DISQUALIFICATIONS: Strictly eliminate robotic, monotone legacy synths (David, Mark, desktop)
    if (
      name.includes("david") ||
      name.includes("mark") ||
      name.includes("george") ||
      name.includes("hazel") ||
      name.includes("desktop") ||
      uri.includes("desktop")
    ) {
      return -99999;
    }

    // Must be English or Filipino
    if (!lang.startsWith("en") && !lang.includes("fil") && !name.includes("english")) {
      return -99999;
    }

    // 2. HIGHEST TIER: High-fidelity Neural / Natural Cloud & OS Voices
    // Google UK English Female (Extremely articulate, warm, cheerful, and lively tour guide voice)
    if (name.includes("google uk english female")) {
      score += 2000;
    }

    // Google US English (Chrome's high-fidelity neural natural American voice)
    if (name.includes("google us english") || (name.includes("google") && lang.includes("en-us"))) {
      score += 1700;
    }

    // Other Google English Natural / Neural voices
    if (name.includes("google") && lang.startsWith("en")) {
      score += 1400;
    }

    // Microsoft Edge / Windows 11 Natural Neural voices (Jenny, Aria, Guy, etc.)
    if (name.includes("natural") || uri.includes("natural") || name.includes("online")) {
      score += 1300;
      if (name.includes("jenny")) score += 400; // Exceptionally warm, cheerful, clear guide
      if (name.includes("aria")) score += 350;
      if (name.includes("guy")) score += 200;
    }

    // Philippine English Natural Voices (Rosa, Angelo, Blessing)
    if (lang.includes("ph") || name.includes("philippin") || name.includes("filipino")) {
      score += 1100;
      if (name.includes("natural") || name.includes("rosa")) score += 300;
    }

    // Apple / macOS / iOS High-Fidelity Neural Voices
    if (name.includes("samantha") || name.includes("ava") || name.includes("allison") || name.includes("serena")) {
      score += 750;
      if (name.includes("premium") || name.includes("enhanced")) score += 200;
    }

    // General US English preference
    if (lang === "en-us" || lang.startsWith("en-us")) {
      score += 400;
    } else if (lang.startsWith("en")) {
      score += 200;
    }

    // Legacy standard voices (Zira) as last resort
    if (name.includes("zira")) {
      score -= 300;
    }

    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  if (sorted[0] && scoreVoice(sorted[0]) > -5000) {
    return sorted[0];
  }

  // Fallback: any available English voice that is NOT David or Mark
  return (
    voices.find((v) => {
      const n = v.name.toLowerCase();
      return (v.lang.startsWith("en") || n.includes("english")) && !n.includes("david") && !n.includes("mark");
    }) ||
    voices[0] ||
    null
  );
}

export interface ReversibleStateSnapshot {
  filters?: {
    category?: string;
    status?: string;
    region?: string;
    province?: string;
    islandGroup?: string;
    searchQuery?: string;
  };
  selectedProjectId?: string | null;
  mapStyle?: string;
  geographicScope?: { region: string; province: string };
  actionSummary: string;
}

export interface UseAtlasAIOptions {
  selectedProjectId?: string | null;
  mapZoom?: number;
  sidebarMode?: "DIRECTORY" | "DISCOVERY";
  activeFilters?: {
    category?: string;
    status?: string;
    region?: string;
    province?: string;
    islandGroup?: string;
    searchQuery?: string;
  };
  geographicScope?: { region: string; province: string };
  mapStyle?: string;
  activeGisLayers?: Set<string>;
  allProjectsCount?: number;

  // Map & Application Callbacks
  onSelectProject?: (projectId: string | null) => void;
  onFlyToProject?: (target: {
    id?: string;
    coordinates?: { lat: number; lng: number };
    zoom?: number;
    pitch?: number;
    bearing?: number;
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    duration?: number;
  }) => void;
  onZoomToBounds?: (bounds: [[number, number], [number, number]], options?: { padding?: any; maxZoom?: number }) => void;
  onApplyFilters?: (filters: {
    category?: string;
    status?: string;
    region?: string;
    province?: string;
    islandGroup?: string;
    searchQuery?: string;
  }) => void;
  onClearFilters?: () => void;
  onSetMapStyle?: (style: "DARK" | "LIGHT" | "SATELLITE") => void;
  onToggleGisLayer?: (layerId: string, visible?: boolean) => void;
  onInspectFootprint?: (projectId: string) => void;
  onEnterDiscoveryScope?: (scope: "national" | "island" | "region" | "province", targetName?: string, adjustCamera?: boolean) => void;
  onHighlightProjects?: (projectIds: string[], fitBounds?: boolean) => void;
  onDrawTransitCorridor?: (corridor: any) => void;
  onDrawBufferZone?: (zone: any) => void;
  onClearGisOverlays?: () => void;
}

export function useAtlasAI(options: UseAtlasAIOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AtlasAIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentToolEvents, setCurrentToolEvents] = useState<Array<{ step: string; status: "started" | "completed"; toolName: string }>>([]);
  const [undoStack, setUndoStack] = useState<ReversibleStateSnapshot[]>([]);
  const [lastAppliedAction, setLastAppliedAction] = useState<string | null>(null);

  // Active Portfolio Tour State & Auto-Advance Engine
  const [activeTour, setActiveTour] = useState<{
    tourId: string;
    tourTitle: string;
    stepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    currentStep: AtlasTourStepData;
    durationSeconds?: number;
  } | null>(null);
  const [cachedTourSteps, setCachedTourSteps] = useState<AtlasTourStepData[]>([]);
  const cachedStepsRef = useRef<AtlasTourStepData[]>([]);
  useEffect(() => {
    cachedStepsRef.current = cachedTourSteps;
  }, [cachedTourSteps]);
  const [tourSpeedSeconds, setTourSpeedSeconds] = useState<number>(0);
  const [tourProgressSeconds, setTourProgressSeconds] = useState<number>(0);
  const [voiceNarrationEnabled, setVoiceNarrationEnabled] = useState<boolean>(true); // Sound ON by default when touring
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const [spokenWordIndex, setSpokenWordIndex] = useState<number>(0);
  const speechTickerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronous reference to active tour to prevent duplicate action race conditions
  const activeTourRef = useRef(activeTour);
  useEffect(() => {
    activeTourRef.current = activeTour;
  }, [activeTour]);

  // References to latest state
  const stateRef = useRef(options);
  useEffect(() => {
    stateRef.current = options;
  }, [options]);

  // Context-Aware Suggestions based on current runtime view (Phase 17 Requirement 22)
  const suggestions = useCallback((): string[] => {
    const opts = stateRef.current;
    if (opts.selectedProjectId) {
      return [
        "Summarize project",
        "What's around here?",
        "Project timeline",
        "Inspect footprint",
        "Compare with Sabangan",
      ];
    }

    if (opts.geographicScope?.region && opts.geographicScope.region !== "ALL") {
      const reg = opts.geographicScope.region;
      return [
        `Explain this region (${reg})`,
        `Show ongoing projects in ${reg}`,
        `Compare projects in ${reg}`,
        `Which projects have tunneling in ${reg}?`,
        "Show nearby river basins and transmission grid",
      ];
    }

    if (opts.activeFilters?.category && opts.activeFilters.category !== "ALL") {
      return [
        `How many ${opts.activeFilters.category} projects are ongoing?`,
        "Show geographic bounds for these projects",
        "Clear active filters",
        "Explain Current View",
      ];
    }

    // Default National View
    return [
      "Start Portfolio Tour",
      "Generate Portfolio Brief",
      "Explore Region II (Cagayan Valley)",
      "Show ongoing hydropower projects",
      "Which region has the most projects?",
      "What am I looking at?",
    ];
  }, []);

  // Execute a tour step on map canvas
  const executeTourStep = useCallback((step: any) => {
    const opts = stateRef.current;
    if (!step) return;

    // 1. Enter Discovery Scope metadata first (adjustCamera = false preserves project camera flight)
    if (step.discoveryScope) {
      opts.onEnterDiscoveryScope?.(step.discoveryScope.scope, step.discoveryScope.targetName, false);
    }

    // 2. Highlight associated project IDs
    if (step.highlightProjectIds && step.highlightProjectIds.length > 0) {
      opts.onHighlightProjects?.(step.highlightProjectIds, false);
    }

    // 3. Clear or fly to project with single unified camera transition and tour viewport clearance padding
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    // Clearance padding: top 70px (nav/breadcrumbs), bottom 250px (tour controller HUD), left 390px (sidebar), right 440px (drawer)
    const tourPadding = isDesktop
      ? { top: 70, bottom: 250, left: 390, right: 440 }
      : { top: 60, bottom: 270, left: 20, right: 20 };

    if (step.selectedProjectId) {
      opts.onFlyToProject?.({
        id: step.selectedProjectId,
        coordinates: step.camera?.center
          ? { lat: step.camera.center[1], lng: step.camera.center[0] }
          : undefined,
        zoom: step.camera?.zoom ?? 14.2,
        pitch: step.camera?.pitch ?? 45,
        bearing: step.camera?.bearing ?? 0,
        padding: tourPadding,
      });
    } else if (step.camera?.center) {
      opts.onSelectProject?.(null);
      opts.onFlyToProject?.({
        coordinates: { lat: step.camera.center[1], lng: step.camera.center[0] },
        zoom: step.camera.zoom,
        pitch: step.camera.pitch,
        bearing: step.camera.bearing,
        padding: tourPadding,
      });
    } else {
      opts.onSelectProject?.(null);
    }
  }, []);

  // Tour Controller Methods
  const lastStepAdvanceRef = useRef<number>(0);

  const startTour = useCallback(
    (
      tourId: string = "national-flagship-tour",
      initialStep: number = 0,
      durationSeconds: number = 0,
      autoPlay: boolean = true
    ) => {
      try {
        const tourData = getGuidedTourData(tourId);
        const validIndex = Math.max(0, Math.min(initialStep, tourData.steps.length - 1));
        const step = tourData.steps[validIndex];

        // If the tour is already active and on this exact step, avoid duplicate restart
        const current = activeTourRef.current;
        if (
          current &&
          current.tourId === tourData.tourId &&
          current.stepIndex === validIndex &&
          Date.now() - lastStepAdvanceRef.current < 4000
        ) {
          return;
        }

        lastStepAdvanceRef.current = Date.now();
        cachedStepsRef.current = tourData.steps;
        setCachedTourSteps(tourData.steps);
        setVoiceNarrationEnabled(true);
        setTourSpeedSeconds(durationSeconds);
        setTourProgressSeconds(0);
        setSpokenWordIndex(0);
        setActiveTour({
          tourId: tourData.tourId,
          tourTitle: tourData.tourTitle,
          stepIndex: validIndex,
          totalSteps: tourData.totalSteps,
          isPlaying: autoPlay,
          currentStep: step,
          durationSeconds,
        });

        setLastAppliedAction(`Started Portfolio Tour: Step ${validIndex + 1} of ${tourData.totalSteps} (${tourData.tourTitle})`);
      } catch (err) {
        console.error("[useAtlasAI] Failed to start guided tour:", err);
      }
    },
    []
  );

  const nextTourStep = useCallback(() => {
    const now = Date.now();
    if (now - lastStepAdvanceRef.current < 900) {
      return; // Debounce: strictly max 1 step advance per 900ms to eliminate multi-skipping
    }
    lastStepAdvanceRef.current = now;
    setTourProgressSeconds(0);
    setSpokenWordIndex(0);
    setActiveTour((prev) => {
      if (!prev) return null;
      const steps = cachedStepsRef.current.length > 0
        ? cachedStepsRef.current
        : getGuidedTourData(prev.tourId).steps;
      if (!steps || steps.length === 0) return prev;
      if (prev.stepIndex >= prev.totalSteps - 1) {
        // Tour completed
        return null;
      }
      const nextIdx = prev.stepIndex + 1;
      const nextStep = steps[nextIdx] || prev.currentStep;
      return {
        ...prev,
        stepIndex: nextIdx,
        currentStep: nextStep,
      };
    });
  }, []);

  const prevTourStep = useCallback(() => {
    const now = Date.now();
    if (now - lastStepAdvanceRef.current < 500) {
      return;
    }
    lastStepAdvanceRef.current = now;
    setTourProgressSeconds(0);
    setSpokenWordIndex(0);
    setActiveTour((prev) => {
      if (!prev) return null;
      const steps = cachedStepsRef.current.length > 0
        ? cachedStepsRef.current
        : getGuidedTourData(prev.tourId).steps;
      if (!steps || steps.length === 0) return prev;
      if (prev.stepIndex <= 0) return prev;
      const prevIdx = prev.stepIndex - 1;
      const prevStep = steps[prevIdx] || prev.currentStep;
      return {
        ...prev,
        stepIndex: prevIdx,
        currentStep: prevStep,
      };
    });
  }, []);

  const togglePlayPauseTour = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev) return null;
      const nextPlaying = !prev.isPlaying;
      if (nextPlaying) setTourProgressSeconds(0);
      return { ...prev, isPlaying: nextPlaying };
    });
  }, []);

  const exitTour = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (speechTickerRef.current) {
      clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
    }
    setActiveTour(null);
    setTourProgressSeconds(0);
    setSpokenWordIndex(0);
    stateRef.current.onEnterDiscoveryScope?.("national");
    stateRef.current.onSelectProject?.(null);
    setLastAppliedAction("Exited Portfolio Tour");
  }, []);

  const jumpToTourStep = useCallback(
    (index: number) => {
      setTourProgressSeconds(0);
      setSpokenWordIndex(0);
      setActiveTour((prev) => {
        if (!prev) return null;
        const steps = cachedStepsRef.current.length > 0
          ? cachedStepsRef.current
          : getGuidedTourData(prev.tourId).steps;
        if (!steps || steps.length === 0) return prev;
        const validIndex = Math.max(0, Math.min(index, prev.totalSteps - 1));
        const targetStep = steps[validIndex] || prev.currentStep;
        return {
          ...prev,
          stepIndex: validIndex,
          currentStep: targetStep,
        };
      });
    },
    []
  );

  const setTourSpeed = useCallback((seconds: number) => {
    setTourSpeedSeconds(seconds);
    setTourProgressSeconds(0);
    setActiveTour((prev) => (prev ? { ...prev, durationSeconds: seconds } : null));
  }, []);

  // Voice Preload Listener to ensure system voices are primed
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const preload = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
    preload();
    window.speechSynthesis.addEventListener("voiceschanged", preload);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", preload);
    };
  }, []);

  // References for speech lifecycle management and garbage collection prevention
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechHeartbeatRef = useRef<NodeJS.Timeout | null>(null);

interface AlignedSpokenResult {
  displayWords: string[];
  spokenText: string;
  spokenTokens: {
    spokenWord: string;
    start: number;
    end: number;
    displayIndex: number;
  }[];
}

/**
 * Phonetically aligns speech synthesis with display subtitle narration:
 * - Pronounces "MW" as "Megawatts"
 * - Pronounces "Sta." / "Sta" as "Santa"
 * - Pronounces "SCIC" as "Santa Clara" (Sta. Clara)
 * - Pronounces "SCIC's" as "Santa Clara's"
 * - Pronounces "km" as "kilometers"
 * - Pronounces "MLD" as "million liters per day"
 * - Pronounces "HEPP" as "Hydroelectric Project"
 * - Pronounces "WTP" as "Water Treatment Plant"
 *
 * Maps every spoken audio character index to the exact 1-based display word index
 * so that subtitle highlights and physical sound waves remain in 100% lockstep.
 */
function buildSpokenAlignment(displayText: string): AlignedSpokenResult {
  if (!displayText) {
    return { displayWords: [], spokenText: "", spokenTokens: [] };
  }

  const displayWords = displayText.trim().split(/\s+/).filter(Boolean);
  const spokenTokens: AlignedSpokenResult["spokenTokens"] = [];
  let spokenText = "";

  for (let i = 0; i < displayWords.length; i++) {
    const rawWord = displayWords[i];
    const displayIndex = i + 1; // 1-based index matching visibleWordCount

    // Separate leading/trailing punctuation (e.g. "(11.3", "MW)", "Sta.", "SCIC's")
    const match = rawWord.match(/^([(\[{"']*)(.*?)([)\]}",;:!?]*)$/);
    const prefix = match ? match[1] : "";
    const cleanWord = match ? match[2] : rawWord;
    const suffix = match ? match[3] : "";

    let spokenParts: string[] = [];

    if (cleanWord === "MW") {
      spokenParts = [prefix + "Megawatts" + suffix];
    } else if (cleanWord === "Sta." || cleanWord === "Sta") {
      spokenParts = [prefix + "Santa" + suffix.replace(/^\./, "")];
    } else if (cleanWord === "SCIC") {
      spokenParts = [prefix + "Santa", "Clara" + suffix];
    } else if (cleanWord === "SCIC's") {
      spokenParts = [prefix + "Santa", "Clara's" + suffix];
    } else if (cleanWord === "HEPP") {
      spokenParts = [prefix + "Hydroelectric", "Project" + suffix];
    } else if (cleanWord === "WTP") {
      spokenParts = [prefix + "Water", "Treatment", "Plant" + suffix];
    } else if (cleanWord === "km") {
      spokenParts = [prefix + "kilometers" + suffix];
    } else if (cleanWord === "MLD") {
      spokenParts = [prefix + "million", "liters", "per", "day" + suffix];
    } else {
      spokenParts = [rawWord];
    }

    for (const part of spokenParts) {
      if (spokenText.length > 0) spokenText += " ";
      const start = spokenText.length;
      spokenText += part;
      const end = spokenText.length;
      spokenTokens.push({
        spokenWord: part,
        start,
        end,
        displayIndex,
      });
    }
  }

  return { displayWords, spokenText, spokenTokens };
}

  // Soothing, Natural Human Speech Synthesis Engine with speech completion callback
  const speakSoothingNarration = useCallback((rawNarration: string, onSpeechEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      onSpeechEnd?.();
      return;
    }
    if (!rawNarration) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      onSpeechEnd?.();
      return;
    }

    try {
      window.speechSynthesis.resume();
    } catch {}

    window.speechSynthesis.cancel();
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    if (speechTickerRef.current) {
      clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
    }

    const { displayWords, spokenText, spokenTokens } = buildSpokenAlignment(rawNarration);
    const totalDisplayWords = displayWords.length;
    setSpokenWordIndex(0);

    const utterance = new SpeechSynthesisUtterance(spokenText);
    activeUtteranceRef.current = utterance;

    // Pick top-tier natural human tour guide voice (US or Philippine English)
    const bestVoice = getBestTourGuideVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang || "en-US";
    }

    // Lively, cheerful, warm human tour guide delivery
    utterance.rate = 1.04; // Energetic, natural conversational cadence
    utterance.pitch = 1.12; // Bright, warm, cheerful tour guide inflection
    utterance.volume = 1.0;

    let hasHandledEnd = false;
    let hasReceivedBoundary = false;

    const handleEnd = () => {
      if (hasHandledEnd) return;
      hasHandledEnd = true;
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (speechTickerRef.current) {
        clearInterval(speechTickerRef.current);
        speechTickerRef.current = null;
      }
      if (speechHeartbeatRef.current) {
        clearInterval(speechHeartbeatRef.current);
        speechHeartbeatRef.current = null;
      }
      setSpokenWordIndex(totalDisplayWords);
      activeUtteranceRef.current = null;
      onSpeechEnd?.();
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setSpokenWordIndex(1);

      const speechStartTime = Date.now();
      const expectedDurationMs = Math.max(1000, (spokenTokens.length / 2.3) * 1000);

      // Fallback ticker only kicks in if the platform DOES NOT emit onboundary events (e.g. mobile/legacy)
      if (speechTickerRef.current) clearInterval(speechTickerRef.current);
      speechTickerRef.current = setInterval(() => {
        if (!isSpeakingRef.current) {
          if (speechTickerRef.current) clearInterval(speechTickerRef.current);
          return;
        }
        // If onboundary is active and providing real physical audio sync, DO NOT override it!
        if (hasReceivedBoundary) {
          return;
        }
        // Wait at least 1200ms before falling back to clock estimation
        const elapsed = Date.now() - speechStartTime;
        if (elapsed < 1200) return;

        const ratio = Math.min(0.98, elapsed / expectedDurationMs);
        const targetIdx = Math.min(totalDisplayWords, Math.max(1, Math.floor(ratio * totalDisplayWords)));
        setSpokenWordIndex((prev) => Math.max(prev, targetIdx));
      }, 100);
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === "word") {
        hasReceivedBoundary = true;
        const charIdx = event.charIndex;

        // Map charIdx in spokenText directly to the corresponding displayWordIndex
        for (let i = 0; i < spokenTokens.length; i++) {
          const nextStart = i < spokenTokens.length - 1 ? spokenTokens[i + 1].start : Infinity;
          if (charIdx >= spokenTokens[i].start && charIdx < nextStart) {
            setSpokenWordIndex(spokenTokens[i].displayIndex);
            break;
          }
        }
      }
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn("[Atlas Voice] Speech synthesis event finished/interrupted:", e);
      handleEnd();
    };

    // Keepalive heartbeat for Chromium long utterances (>15 seconds)
    speechHeartbeatRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else if (!window.speechSynthesis.speaking && isSpeakingRef.current) {
          handleEnd();
        }
      }
    }, 4000);

    window.speechSynthesis.speak(utterance);
  }, []);

  const toggleVoiceNarration = useCallback(() => {
    setVoiceNarrationEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (!next) {
          window.speechSynthesis.cancel();
          if (speechTickerRef.current) {
            clearInterval(speechTickerRef.current);
            speechTickerRef.current = null;
          }
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          playAtlasAudioChime("deactivate");
        } else {
          // Explicitly resume on user interaction to satisfy browser audio autoplay policy
          try {
            window.speechSynthesis.resume();
          } catch {}
          playAtlasAudioChime("activate");

          // If a tour is active, immediately start narrating the current step
          const current = activeTourRef.current;
          if (current?.currentStep?.narration) {
            speakSoothingNarration(current.currentStep.narration);
          } else {
            // Confirm activation so user knows audio guide is primed
            speakSoothingNarration("Welcome to the Sta. Clara Guided Tour. Voice narration is active.");
          }
        }
      }
      return next;
    });
  }, [speakSoothingNarration]);

  // Synchronize active tour step to map camera and GIS discovery scope safely in effect
  useEffect(() => {
    if (!activeTour?.currentStep) return;
    executeTourStep(activeTour.currentStep);
  }, [activeTour?.tourId, activeTour?.stepIndex, executeTourStep]);

  // When tour concludes naturally by running past the final step, reset to national view safely in effect
  const prevTourRef = useRef(activeTour);
  useEffect(() => {
    if (prevTourRef.current && !activeTour) {
      stateRef.current.onEnterDiscoveryScope?.("national");
      stateRef.current.onSelectProject?.(null);
    }
    prevTourRef.current = activeTour;
  }, [activeTour]);

  // ─── Unified Tour Auto-Advance & Narration Engine ────────────
  // When AUTO mode (durationSeconds = 0):
  // 1. With Voice ON: AI finishes its entire spoken narration + 2.2s visual linger before advancing.
  // 2. With Voice OFF: AI waits for a comfortable human reading duration computed from word count.
  const stepStartTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!activeTour) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    const { isPlaying, currentStep, durationSeconds } = activeTour;
    const effectiveSpeed = durationSeconds !== undefined ? durationSeconds : tourSpeedSeconds;
    const isAuto = effectiveSpeed === 0;

    // Calculate dynamic reading and speaking time based on stop content
    const fullText = `${currentStep?.title || ""} ${currentStep?.subtitle || ""} ${currentStep?.narration || ""}`;
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    // Comfortable adult reading speed (~180 WPM, or 2.7 words/sec) + 3.5s viewer orientation time
    const dynamicReadingDuration = Math.max(9, Math.round(wordCount / 2.7) + 3.5);
    // Estimated speech duration at 0.93 rate (~2.1 words/sec)
    const estimatedSpeechDuration = Math.max(10, Math.round(wordCount / 2.1) + 2.5);

    const totalTargetDuration = isAuto
      ? (voiceNarrationEnabled ? estimatedSpeechDuration + 2.2 : dynamicReadingDuration)
      : Math.max(3, effectiveSpeed);

    stepStartTimeRef.current = Date.now();
    setTourProgressSeconds(0);

    let advanceTimeout: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let safetyTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const triggerAdvance = () => {
      if (isDisposed) return;
      nextTourStep();
    };

    if (voiceNarrationEnabled) {
      playAtlasAudioChime("step");

      if (currentStep?.narration) {
        speakSoothingNarration(currentStep.narration, () => {
          if (isDisposed) return;
          // Voice narration completed its speech!
          if (isPlaying) {
            if (isAuto) {
              // Add a gentle 2.2-second lingering pause so user absorbs the visual scene before camera flies
              advanceTimeout = setTimeout(() => {
                triggerAdvance();
              }, 2200);
            }
          }
        });

        // Safety timeout in case speech synthesis engine hangs or drops onend
        if (isPlaying && isAuto) {
          const maxSafetyMs = (estimatedSpeechDuration + 14) * 1000;
          safetyTimeout = setTimeout(() => {
            if (!isDisposed && isSpeakingRef.current) {
              console.warn("[useAtlasAI] Voice narration max safety timeout reached. Advancing stop.");
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              triggerAdvance();
            }
          }, maxSafetyMs);
        }
      } else {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (isPlaying && isAuto) {
          advanceTimeout = setTimeout(() => {
            triggerAdvance();
          }, 4500);
        }
      }
    } else {
      // Voice narration is off: silent reading mode
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      if (isPlaying) {
        if (isAuto) {
          // Allow full comfortable reading time based on description length
          advanceTimeout = setTimeout(() => {
            triggerAdvance();
          }, dynamicReadingDuration * 1000);
        }
      }
    }

    // If explicit fixed duration (e.g. 8s, 12s, 18s) was selected:
    if (isPlaying && !isAuto) {
      advanceTimeout = setTimeout(() => {
        triggerAdvance();
      }, effectiveSpeed * 1000);
    }

    // Smooth progress bar updates
    if (isPlaying) {
      progressInterval = setInterval(() => {
        if (isDisposed) return;
        const elapsed = (Date.now() - stepStartTimeRef.current) / 1000;
        if (isAuto && voiceNarrationEnabled && isSpeakingRef.current) {
          // While speaking, interpolate progress smoothly up to 92%
          const speechProgress = Math.min(0.92, elapsed / estimatedSpeechDuration);
          setTourProgressSeconds(speechProgress * totalTargetDuration);
        } else {
          setTourProgressSeconds(Math.min(totalTargetDuration, elapsed));
          if (!voiceNarrationEnabled && currentStep?.narration) {
            const rawWords = currentStep.narration.trim().split(/\s+/).filter(Boolean);
            const readRatio = Math.min(1, elapsed / (dynamicReadingDuration * 0.75));
            const targetIdx = Math.min(rawWords.length, Math.max(1, Math.floor(readRatio * rawWords.length)));
            setSpokenWordIndex(targetIdx);
          }
        }
      }, 100);
    }

    return () => {
      isDisposed = true;
      if (advanceTimeout) clearTimeout(advanceTimeout);
      if (progressInterval) clearInterval(progressInterval);
      if (safetyTimeout) clearTimeout(safetyTimeout);
      if (speechTickerRef.current) {
        clearInterval(speechTickerRef.current);
        speechTickerRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };
  }, [
    activeTour?.tourId,
    activeTour?.stepIndex,
    activeTour?.isPlaying,
    activeTour?.durationSeconds,
    tourSpeedSeconds,
    voiceNarrationEnabled,
    speakSoothingNarration,
    nextTourStep,
  ]);

  // Keyboard shortcut listener: ESC exits tour if active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeTour) {
        exitTour();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, exitTour]);

  // Execute a single validated AtlasAIAction
  const executeAction = useCallback((action: AtlasAIAction) => {
    const opts = stateRef.current;

    // Save previous snapshot for Undo
    const snapshot: ReversibleStateSnapshot = {
      filters: opts.activeFilters ? { ...opts.activeFilters } : undefined,
      selectedProjectId: opts.selectedProjectId,
      mapStyle: opts.mapStyle,
      geographicScope: opts.geographicScope ? { ...opts.geographicScope } : undefined,
      actionSummary: `Applied ${action.type}`,
    };

    switch (action.type) {
      case "SELECT_PROJECT": {
        opts.onSelectProject?.(action.projectId);
        setLastAppliedAction(`Selected project: "${action.projectName || action.projectId}"`);
        break;
      }

      case "FLY_TO_PROJECT": {
        opts.onSelectProject?.(action.projectId);
        opts.onFlyToProject?.({
          id: action.projectId,
          coordinates: (action as any).coordinates,
          zoom: action.zoom,
          pitch: action.pitch,
        });
        setLastAppliedAction(`Flying map camera to project "${(action as any).projectName || action.projectId}"`);
        break;
      }

      case "DRIVE_SPOTLIGHT": {
        if (action.projectId) {
          opts.onSelectProject?.(action.projectId);
          opts.onFlyToProject?.({
            id: action.projectId,
            zoom: 13.5,
            pitch: 35,
          });
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("atlas:drive_spotlight", {
              detail: {
                projectId: action.projectId,
                direction: action.direction,
              },
            })
          );
        }
        setLastAppliedAction(`Featured Spotlight focused on "${action.projectId || "featured project"}"`);
        break;
      }

      case "ZOOM_TO_REGION": {
        if (action.bounds) {
          const [minLng, minLat, maxLng, maxLat] = action.bounds;
          opts.onZoomToBounds?.([[minLng, minLat], [maxLng, maxLat]]);
        }
        setLastAppliedAction(`Zoomed map to ${action.region}`);
        break;
      }

      case "FILTER_PROJECTS": {
        opts.onApplyFilters?.(action.filters);
        const parts = [];
        if (action.filters.category) parts.push(`Category: ${action.filters.category}`);
        if (action.filters.status) parts.push(`Status: ${action.filters.status}`);
        if (action.filters.region) parts.push(`Region: ${action.filters.region}`);
        if (action.filters.province) parts.push(`Province: ${action.filters.province}`);
        setLastAppliedAction(`Filtered: ${parts.join(" · ") || "Custom scope"}`);
        break;
      }

      case "CLEAR_FILTERS": {
        opts.onClearFilters?.();
        setLastAppliedAction("Cleared active filters to national portfolio");
        break;
      }

      case "SET_MAP_STYLE": {
        opts.onSetMapStyle?.(action.style);
        setLastAppliedAction(`Changed basemap style to ${action.style}`);
        break;
      }

      case "TOGGLE_GIS_LAYER": {
        opts.onToggleGisLayer?.(action.layerId, action.visible);
        setLastAppliedAction(`Toggled ${action.layerId} layer ${action.visible === false ? "OFF" : "ON"}`);
        break;
      }

      case "INSPECT_FOOTPRINT": {
        opts.onInspectFootprint?.(action.projectId);
        setLastAppliedAction(`Inspecting engineering footprint for "${action.projectId}"`);
        break;
      }

      case "ENTER_DISCOVERY_SCOPE": {
        opts.onEnterDiscoveryScope?.(action.scope, action.targetName);
        setLastAppliedAction(`Entered Discovery Mode: ${action.scope} ${action.targetName ? `(${action.targetName})` : ""}`);
        break;
      }

      case "HIGHLIGHT_PROJECTS": {
        opts.onHighlightProjects?.(action.projectIds, action.fitBounds);
        setLastAppliedAction(`Highlighted ${action.projectIds.length} project(s) on the map`);
        break;
      }

      case "START_TOUR": {
        const current = activeTourRef.current;
        if (current && current.tourId === action.tourId) {
          // Already running this tour, do not clobber ongoing progress
          break;
        }
        startTour(action.tourId, action.stepIndex, action.durationSeconds, action.autoPlay);
        setLastAppliedAction(`Started Guided Portfolio Tour`);
        break;
      }

      case "CONTROL_TOUR": {
        if (action.action === "play") {
          setActiveTour((prev) => (prev ? { ...prev, isPlaying: true } : null));
          if (action.speedSeconds) setTourSpeed(action.speedSeconds);
        } else if (action.action === "pause") {
          setActiveTour((prev) => (prev ? { ...prev, isPlaying: false } : null));
        } else if (action.action === "next") {
          nextTourStep();
        } else if (action.action === "prev") {
          prevTourStep();
        } else if (action.action === "set_speed" && action.speedSeconds) {
          setTourSpeed(action.speedSeconds);
        } else if (action.action === "exit") {
          exitTour();
        }
        setLastAppliedAction(`Tour control: ${action.action}`);
        break;
      }

      case "DRIVE_SPOTLIGHT": {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("atlas:drive_spotlight", {
              detail: {
                projectId: action.projectId,
                direction: action.direction,
              },
            })
          );
        }
        if (action.projectId) {
          opts.onSelectProject?.(action.projectId);
        }
        setLastAppliedAction(`Engaging Spotlight: ${action.projectId || action.direction || "featured"}`);
        break;
      }

      case "DRAW_TRANSIT_CORRIDOR": {
        opts.onDrawTransitCorridor?.(action);
        setLastAppliedAction(`Mapped logistics corridor: ${action.fromProject.name} to ${action.toProject.name} (${action.distanceKm} km)`);
        break;
      }

      case "DRAW_BUFFER_ZONE": {
        opts.onDrawBufferZone?.(action);
        setLastAppliedAction(`Mapped ${action.radiusKm}km buffer zone around project`);
        break;
      }

      case "CLEAR_GIS_OVERLAYS": {
        opts.onClearGisOverlays?.();
        setLastAppliedAction("Cleared GIS corridors and buffers");
        break;
      }

      case "OPEN_NEXUS_OPERATIONS": {
        const dest = action.destination || `/dashboard?project=${action.projectId}`;
        if (typeof window !== "undefined") {
          window.open(dest, "_blank");
        }
        setLastAppliedAction(`Opened Project Nexus operations workspace for "${action.projectName || action.projectId}"`);
        break;
      }
    }

    setUndoStack((prev) => [snapshot, ...prev].slice(0, 10));
  }, [startTour, nextTourStep, prevTourStep, exitTour, setTourSpeed]);

  // Revert last action
  const undoLastAction = useCallback(() => {
    if (undoStack.length === 0) return;
    const [lastSnapshot, ...remaining] = undoStack;
    const opts = stateRef.current;

    if (lastSnapshot.filters) {
      opts.onApplyFilters?.(lastSnapshot.filters);
    } else {
      opts.onClearFilters?.();
    }

    if (lastSnapshot.selectedProjectId !== undefined) {
      opts.onSelectProject?.(lastSnapshot.selectedProjectId);
    }

    if (lastSnapshot.mapStyle && (lastSnapshot.mapStyle === "DARK" || lastSnapshot.mapStyle === "LIGHT" || lastSnapshot.mapStyle === "SATELLITE")) {
      opts.onSetMapStyle?.(lastSnapshot.mapStyle as any);
    }

    setUndoStack(remaining);
    setLastAppliedAction(`Reverted: ${lastSnapshot.actionSummary}`);
  }, [undoStack]);

  // Send a user prompt to Atlas AI
  const sendMessage = useCallback(
    async (promptText: string) => {
      if (!promptText.trim() || isGenerating) return;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `asst-${Date.now()}`;

      const userMessage: AtlasAIMessage = {
        id: userMsgId,
        role: "user",
        content: promptText.trim(),
        timestamp: Date.now(),
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);
      setCurrentToolEvents([]);
      setIsOpen(true);

      const normalizedPrompt = promptText.trim().toLowerCase();

      // ─── Instant Client-Side Tour Intent Dispatcher ───────────
      if (
        normalizedPrompt.includes("tour") ||
        normalizedPrompt.includes("touring") ||
        normalizedPrompt.includes("tour guide")
      ) {
        let dur = 0; // Default: 0 = AUTO mode (finish speech or reading the description)
        const secMatch = normalizedPrompt.match(/(\d+)\s*(?:second|sec|s)/);
        if (secMatch) {
          dur = parseInt(secMatch[1], 10) || 0;
        }

        if (
          normalizedPrompt.includes("continue") ||
          normalizedPrompt.includes("proceed") ||
          normalizedPrompt.includes("resume")
        ) {
          if (activeTour) {
            setTourSpeed(dur);
            setActiveTour((prev) => (prev ? { ...prev, isPlaying: true, durationSeconds: dur } : null));
          } else {
            startTour("national-flagship-tour", 0, dur, true);
          }
        } else if (normalizedPrompt.includes("pause") || normalizedPrompt.includes("stop")) {
          setActiveTour((prev) => (prev ? { ...prev, isPlaying: false } : null));
        } else if (normalizedPrompt.includes("visayas") || normalizedPrompt.includes("bohol") || normalizedPrompt.includes("cebu")) {
          startTour("visayas-tour", 0, dur, true);
        } else if (normalizedPrompt.includes("mindanao") || normalizedPrompt.includes("davao") || normalizedPrompt.includes("bukidnon")) {
          startTour("mindanao-tour", 0, dur, true);
        } else if (
          normalizedPrompt.includes("central") ||
          normalizedPrompt.includes("bataan") ||
          normalizedPrompt.includes("tarlac") ||
          normalizedPrompt.includes("subic") ||
          normalizedPrompt.includes("ncr") ||
          normalizedPrompt.includes("manila")
        ) {
          startTour("central-luzon-tour", 0, dur, true);
        } else if (
          normalizedPrompt.includes("north") ||
          normalizedPrompt.includes("luzon") ||
          normalizedPrompt.includes("cordillera") ||
          normalizedPrompt.includes("benguet") ||
          normalizedPrompt.includes("isabela") ||
          normalizedPrompt.includes("cagayan")
        ) {
          startTour("north-luzon-tour", 0, dur, true);
        } else if (
          normalizedPrompt.includes("hydro") ||
          normalizedPrompt.includes("clean energy") ||
          normalizedPrompt.includes("renewable")
        ) {
          startTour("clean-energy-tour", 0, dur, true);
        } else {
          startTour("national-flagship-tour", 0, dur, true);
        }
      }

      const opts = stateRef.current;
      const contextPayload: AtlasContextPayload = {
        selectedProjectId: opts.selectedProjectId,
        mapZoom: opts.mapZoom,
        sidebarMode: opts.sidebarMode,
        activeFilters: opts.activeFilters,
        visibleProjectIds: undefined,
      };

      try {
        const historyPayload = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/atlas-ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
          },
          body: JSON.stringify({
            query: promptText.trim(),
            message: promptText.trim(),
            context: contextPayload,
            history: historyPayload,
            stream: true,
          }),
        });

        if (!res.ok) {
          throw new Error(`Atlas Assistant server returned HTTP ${res.status}`);
        }

        const contentType = res.headers.get("Content-Type") || "";

        // CASE 1: SSE Streaming Response
        if (contentType.includes("text/event-stream") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let partialAnswer = "";
          let finalActions: AtlasAIAction[] = [];
          let finalSources: AtlasAISource[] = [];
          const stepEvents: Array<{ step: string; status: "started" | "completed"; toolName: string }> = [];

          // Add placeholder assistant message
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: "",
              isStreaming: true,
              toolEvents: [],
              timestamp: Date.now(),
            },
          ]);

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const jsonStr = trimmed.slice(6);
              if (jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "step_start") {
                  stepEvents.push({ step: event.step, status: "started", toolName: event.toolName || event.step });
                  setCurrentToolEvents([...stepEvents]);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, toolEvents: [...stepEvents] } : m
                    )
                  );
                } else if (event.type === "step_complete") {
                  const item = stepEvents.find((e) => e.step === event.step);
                  if (item) item.status = "completed";
                  setCurrentToolEvents([...stepEvents]);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, toolEvents: [...stepEvents] } : m
                    )
                  );
                } else if (event.type === "token") {
                  partialAnswer += event.text || "";
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: partialAnswer } : m
                    )
                  );
                } else if (event.type === "final_answer") {
                  partialAnswer = event.answer || partialAnswer;
                  finalActions = event.actions || [];
                  finalSources = event.sources || [];
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }

          // Complete the message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: partialAnswer || "I processed your request.",
                    actions: finalActions,
                    sources: finalSources,
                    isStreaming: false,
                  }
                : m
            )
          );

          // Auto-execute any primary actions emitted by the model
          if (finalActions.length > 0) {
            finalActions.forEach((act) => executeAction(act));
          }
        } else {
          // CASE 2: JSON Response Fallback
          const data = await res.json();
          const assistantMessage: AtlasAIMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: data.answer || "I processed your request.",
            actions: data.actions || [],
            sources: data.sources || [],
            isStreaming: false,
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          if (data.actions && data.actions.length > 0) {
            data.actions.forEach((act: AtlasAIAction) => executeAction(act));
          }
        }
      } catch (err: any) {
        console.error("[useAtlasAI] Request error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "Atlas Assistant is temporarily experiencing heavy traffic. Please try asking again in a moment.",
            sources: [
              {
                name: "Atlas Assistant Service",
                sourceType: "DATABASE",
                provenance: "Unavailable",
                notes: err.message,
              },
            ],
            isStreaming: false,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsGenerating(false);
        setCurrentToolEvents([]);
      }
    },
    [isGenerating, messages, executeAction]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentToolEvents([]);
    setLastAppliedAction(null);
  }, []);

  return {
    isOpen,
    setIsOpen,
    messages,
    isGenerating,
    currentToolEvents,
    sendMessage,
    clearChat,
    suggestions: suggestions(),
    executeAction,
    undoLastAction,
    canUndo: undoStack.length > 0,
    lastAppliedAction,
    // AI Guided Portfolio Tour
    activeTour,
    startTour,
    nextTourStep,
    prevTourStep,
    togglePlayPauseTour,
    exitTour,
    jumpToTourStep,
    progressSeconds: tourProgressSeconds,
    tourSpeedSeconds,
    setTourSpeed,
    voiceEnabled: voiceNarrationEnabled,
    toggleVoiceNarration,
    isSpeaking,
    spokenWordIndex,
  };
}

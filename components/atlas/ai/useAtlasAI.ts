"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AtlasAIAction, AtlasAISource } from "@/lib/atlas-ai/tools/types";
import { AtlasContextPayload } from "@/lib/atlas-ai/identity";
import {
  getGuidedTourData,
  AtlasTourStepData,
} from "@/lib/atlas-ai/portfolioTours";
import { navigatorBus } from "./navigatorBus";
import { withTourAsides, getPersonality } from "./navigatorLines";
import { buildSiteStory, findStoryProject, hasSiteStory, SITE_STORY_PREFIX } from "@/lib/atlas-ai/siteStories";
import { buildSpokenAlignment, limitSpokenText, MAX_SPOKEN_CHARS, type AlignedSpokenResult } from "@/lib/atlas-ai/spokenText";
import { findEmphasis, findProjectMentions, hideSpokenMarker, needsNarration, splitSpoken, toNarration } from "@/lib/atlas-ai/narration";
import { getLanguage } from "./navigatorLines";
import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import { interestsSummary } from "@/lib/atlas-ai/userMemory";
import { loadLocalVoice, isLocalVoiceReady, localSynthesize, localVoiceCancel, splitSpeechChunks } from "@/lib/atlas-ai/localVoice";
import type { AtlasTourData } from "@/lib/atlas-ai/portfolioTours";
import type { SCICProject } from "@/lib/data/scicProjectsData";
import { classifyNarration, estimateSpeechDuration } from "@/lib/atlas-ai/visemes";
import { useLipSync, LipSyncTelemetry } from "./useLipSync";
import { ATLAS_VOICES, DEFAULT_ATLAS_VOICE } from "@/lib/atlas-ai/speechService";
import { getStaticClip, hasStaticClip, preloadStaticClips } from "@/lib/atlas-ai/staticVoice";

export interface AtlasAIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** What he SAYS for this answer (the written answer stays on screen): see lib/atlas-ai/narration.ts */
  spoken?: string;
  actions?: AtlasAIAction[];
  sources?: AtlasAISource[];
  isStreaming?: boolean;
  toolEvents?: Array<{ step: string; status: "started" | "completed"; toolName: string; label?: string }>;
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


// Select the highest-quality, most human natural tour guide voice matching the selected AI voice persona
function getBestTourGuideVoice(activeVoiceId: string = "Charon"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const isFemalePersona = ATLAS_VOICES[activeVoiceId]?.gender === "female";

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase().replace("_", "-");

    // Must be English or Filipino
    if (!lang.startsWith("en") && !lang.includes("fil") && !name.includes("english")) {
      return -99999;
    }

    // 1. Legacy offline synths (David, Mark, "Desktop") sound robotic: heavily penalised, but still
    //    preferred over a voice of the wrong gender for the character.
    if (
      name.includes("david") ||
      name.includes("mark") ||
      name.includes("george") ||
      name.includes("hazel") ||
      name.includes("zira") ||
      name.includes("desktop") ||
      uri.includes("desktop")
    ) {
      score -= 1200;
    }

    // 2. Gender alignment with the selected AI persona.
    //    NB: "female" contains "male", and Chrome's "Google US English" is a female voice.
    const FEMALE = ["female", "jenny", "aria", "samantha", "zira", "rosa", "ava", "hazel", "susan", "linda", "sonia", "libby", "emma", "michelle", "catherine", "google us english"];
    const MALE = ["guy", "ryan", "angelo", "tom", "david", "mark", "george", "james", "andrew", "brian", "christopher", "eric", "roger", "steffan", "william", "thomas", "liam", "davis", "tony", "jason"];
    const isFemaleVoice = FEMALE.some((n) => name.includes(n));
    const isMaleVoice = !isFemaleVoice && (name.includes("male") || MALE.some((n) => name.includes(n)));

    if (isFemalePersona) {
      if (isFemaleVoice) score += 3000;
      else if (isMaleVoice) score -= 3000;
    } else {
      if (isMaleVoice) score += 3000;
      else if (isFemaleVoice) score -= 3000;
    }

    // 3. HIGHEST TIER: High-fidelity Neural / Natural Cloud & OS Voices
    if (name.includes("natural") || uri.includes("natural") || name.includes("online")) {
      score += 1500;
    }

    // Voices built into the computer report each word as it is spoken, which is what keeps the
    // lips and captions in step. Network voices (Chrome's "Google ..." set) sound a little smoother
    // but report nothing, so the mouth can only guess: prefer the ones that can be followed.
    if (v.localService) {
      score += 900;
    } else if (name.includes("google") && lang.startsWith("en")) {
      score += 300;
    }

    // Philippine English Natural Voices (Rosa, Angelo)
    if (lang.includes("ph") || name.includes("philippin") || name.includes("filipino")) {
      score += 1000;
    }

    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted.length > 0 && scoreVoice(sorted[0]) > -90000 ? sorted[0] : voices[0];
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
  visibleProjectIds?: string[];
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
  const [currentToolEvents, setCurrentToolEvents] = useState<Array<{ step: string; status: "started" | "completed"; toolName: string; label?: string }>>([]);
  const [undoStack, setUndoStack] = useState<ReversibleStateSnapshot[]>([]);
  const [lastAppliedAction, setLastAppliedAction] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setCurrentToolEvents([]);
  }, []);

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
  /** TTS requested but not audible yet (synthesizing / decoding) */
  const [isPreparingSpeech, setIsPreparingSpeech] = useState<boolean>(false);
  const speechSeqRef = useRef(0);
  const ttsBlockedUntilRef = useRef(0);
  /** Learned pace of the browser fallback voice relative to the lip-sync clock (persisted) */
  const browserTtsSpeedRef = useRef(0.95);
  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem("atlas_browser_tts_speed") || "");
      if (v > 0.5 && v < 2) browserTtsSpeedRef.current = v;
    } catch {}
  }, []);
  const speechAbortRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const [spokenWordIndex, setSpokenWordIndex] = useState<number>(0);
  const speechTickerRef = useRef<NodeJS.Timeout | null>(null);

  // Active Voice Selection (Default: Charon, persisted in localStorage)
  const [activeVoice, setActiveVoiceState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("atlas_ai_voice");
        const profile = stored ? ATLAS_VOICES[stored] : undefined;
        // The navigator character is male: ignore a stored female (or removed) voice
        return profile && profile.gender === "male" ? profile.id : DEFAULT_ATLAS_VOICE;
      } catch {}
    }
    return DEFAULT_ATLAS_VOICE;
  });

  const setActiveVoice = useCallback((v: string) => {
    if (ATLAS_VOICES[v]) {
      setActiveVoiceState(v);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("atlas_ai_voice", v);
        } catch {}
      }
    }
  }, []);

  // Web Audio API Lip-Sync & Real-Time Audio Telemetry Hook
  const {
    lipSyncRef,
    playAudio,
    stopAudio,
    playHolographicChime,
    setSpeechText,
    startSyntheticSpeech,
    syncSyntheticChar,
    stopSyntheticSpeech,
    beginSpeechSession,
    endSpeechSession,
  } = useLipSync();

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
  /** When this page itself last started a tour/story for a request (the assistant's own
   *  START_TOUR for that same request is then ignored, instead of restarting the narration) */
  const localTourStartAtRef = useRef(0);
  /** The one voice chosen for the running tour */
  const tourEngineRef = useRef<Promise<SpeechEngine> | null>(null);
  const activeVoiceRef = useRef(activeVoice);
  useEffect(() => {
    activeVoiceRef.current = activeVoice;
  }, [activeVoice]);
  /** Neural voice only if every stop is already generated; otherwise the in-browser voice
   *  throughout (or the browser's own speech if that has not finished loading). */
  const chooseTourEngine = (narrations: string[]): Promise<SpeechEngine> => {
    const offline: SpeechEngine = isLocalVoiceReady() ? "local" : "browser";
    const texts = narrations.map((n) => limitSpokenText(buildSpokenAlignment(n).spokenText, MAX_SPOKEN_CHARS));
    return fetch("/api/atlas-ai/tts/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, voice: activeVoiceRef.current }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { cached?: boolean[] } | null) => (j?.cached?.length === texts.length && j.cached.every(Boolean) ? "neural" : offline))
      .catch(() => offline);
  };

  const startTour = useCallback(
    (
      tourId: string = "national-flagship-tour",
      initialStep: number = 0,
      durationSeconds: number = 0,
      autoPlay: boolean = true,
      /** Ready-made steps (a site story); when omitted the tour is looked up by id */
      data?: AtlasTourData
    ) => {
      try {
        let rawTour = data ?? getGuidedTourData(tourId);
        if (!data && rawTour.tourId.startsWith("dynamic-tour-")) {
          // "Tour Tumauini": one project. Its site story says far more than reading out the same
          // description the project panel already shows.
          const single = findStoryProject(tourId);
          if (single && hasSiteStory(single)) {
            data = buildSiteStory(single, getPersonality());
            rawTour = data;
          }
        }
        // Personality: a guide's occasional aside between the facts (none in Professional mode).
        // A site story already carries its own voice, so it is played as written.
        const tourData = data ?? { ...rawTour, steps: withTourAsides(rawTour.steps) };
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
        tourEngineRef.current = chooseTourEngine(tourData.steps.map((st) => st.narration));
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

  /** Play the narrated site story of one project (runs on the guided-tour player). */
  const startStory = useCallback(
    (project: SCICProject | null | undefined) => {
      if (!project || !hasSiteStory(project)) return false;
      const story = buildSiteStory(project, getPersonality());
      startTour(story.tourId, 0, 0, true, story);
      return true;
    },
    [startTour]
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
    // (the narration itself is stopped by the tour effect's cleanup as the tour goes away)
    if (speechTickerRef.current) {
      clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
    }
    // A site story is about the project on screen: leaving it keeps you on that project
    const wasStory = !!activeTourRef.current?.tourId.startsWith(SITE_STORY_PREFIX);
    setActiveTour(null);
    setTourProgressSeconds(0);
    setSpokenWordIndex(0);
    if (!wasStory) {
      stateRef.current.onEnterDiscoveryScope?.("national");
      stateRef.current.onSelectProject?.(null);
    }
    setLastAppliedAction(wasStory ? "Ended Site Story" : "Exited Portfolio Tour");
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

/** After a failed neural-TTS call (quota, outage) go straight to the browser voice for this long. */
const TTS_BACKOFF_MS = 5 * 60 * 1000;
/** Longest we wait for the neural voice before speaking with the instant browser voice instead.
 *  Measured: a line already generated comes back in ~0.25 s, a new one takes 3 s or more, so past
 *  half a second it is not coming soon. The request keeps running and is cached (browser + server
 *  disk), so the same line is instant, in the neural voice, from then on. */
/** Pause after each newly generated warm-up line: the free speech quota is small and rate-limited. */
const WARM_GAP_MS = 7000;
const NEURAL_WAIT_MS = 500;
const NEURAL_CACHE_MAX = 48;
/** Which voice speaks. "auto": neural if it is ready in time, else the in-browser voice.
 *  A tour or story is given ONE engine for its whole length, so the voice never changes mid-way. */
type SpeechEngine = "auto" | "neural" | "local" | "browser";

/** Shown (and said) when no answer came back at all: honest, and an invitation to ask again */
const NO_ANSWER_TEXT = "Sorry, I lost my train of thought on that one. Could you ask me again?";

/** How much he should say: a run of quick questions gets short replies, "tell me about..." gets more. */
function conversationPace(question: string, recentQuestionTimes: number[]): "brisk" | "normal" | "full" {
  const q = question.trim().toLowerCase();
  if (/^(tell me|explain|describe|walk me|talk me|give me (a|an|the) (brief|overview|rundown|summary|background)|what('?s| is) the story|why\b|how (does|did|do)\b)/.test(q)) return "full";
  const now = Date.now();
  const quick = recentQuestionTimes.filter((t) => now - t < 75000).length >= 3;
  return quick || q.split(/\s+/).length <= 3 ? "brisk" : "normal";
}

/** Tagalog spoken answers need the neural voice, which allows about 30 lines a day in total and is
 *  also filling his stock lines: answers may use only a few of them each day. */
const TAGALOG_ANSWERS_PER_DAY = 6;
const TAGALOG_BUDGET_KEY = "atlas.navigator.tagalogAnswers";
function tagalogAnswersLeft(): number {
  try {
    const raw = JSON.parse(window.localStorage.getItem(TAGALOG_BUDGET_KEY) || "{}") as { day?: string; used?: number };
    return raw.day === new Date().toDateString() ? Math.max(0, TAGALOG_ANSWERS_PER_DAY - (raw.used ?? 0)) : TAGALOG_ANSWERS_PER_DAY;
  } catch {
    return 0;
  }
}
function spendTagalogAnswer(): void {
  try {
    const used = TAGALOG_ANSWERS_PER_DAY - tagalogAnswersLeft() + 1;
    window.localStorage.setItem(TAGALOG_BUDGET_KEY, JSON.stringify({ day: new Date().toDateString(), used }));
  } catch {}
}

/** Dev-only timeline of the voice (window.__atlasSpeechLog): when a line was asked for, which
 *  engine spoke it and when the sound actually started. */
function noteSpeech(event: string, text = ""): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const w = window as unknown as { __atlasSpeechLog?: Array<{ t: number; event: string; text: string }> };
  const log = (w.__atlasSpeechLog ??= []);
  log.push({ t: Math.round(performance.now()), event, text: text.slice(0, 48) });
  if (log.length > 200) log.shift();
}

/**
 * Chat answers are spoken by the in-browser voice. The neural voice allows about 30 lines a day in
 * total and takes about 3 s per new line, so on a one-off answer it never arrived in time anyway,
 * and each attempt used up a line of that allowance. The allowance is kept for text that is said
 * again and again (his stock lines, tours, site stories), where it is generated once and kept.
 */
const ANSWER_ENGINE: Promise<SpeechEngine> = Promise.resolve("local");

  // Secondary Fallback: Local Browser Speech Synthesis Engine
  const fallbackToBrowserSpeech = useCallback(
    (
      spokenText: string,
      spokenTokens: AlignedSpokenResult["spokenTokens"],
      totalDisplayWords: number,
      onSpeechEnd?: () => void
    ) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onSpeechEnd?.();
        return;
      }

      const synth = window.speechSynthesis;
      try {
        synth.resume();
      } catch {}
      // Chrome silently drops an utterance queued in the same tick as cancel() (e.g. skipping to the
      // next tour stop mid-sentence), so only cancel when something is queued and speak a beat later.
      const wasBusy = synth.speaking || synth.pending;
      if (wasBusy) synth.cancel();

      const seq = speechSeqRef.current;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      activeUtteranceRef.current = utterance;
      /** True once a newer line (or a cancel) has taken over from this utterance */
      const isStale = () => seq !== speechSeqRef.current || activeUtteranceRef.current !== utterance;

      const bestVoice = getBestTourGuideVoice(activeVoice);
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || "en-US";
      }

      const isFemale = ATLAS_VOICES[activeVoice]?.gender === "female";
      utterance.rate = 1.0;
      utterance.pitch = isFemale ? 1.06 : 0.93;
      utterance.volume = 1.0;

      let hasHandledEnd = false;

      let startedAtMs = 0;
      const handleEnd = (natural = false) => {
        if (hasHandledEnd) return;
        hasHandledEnd = true;
        // A cancelled line reports its end late, after the next one has begun: it must not tear
        // down the newer line's timers, mouth clock or speaking state.
        if (isStale()) return;
        // Self-calibrate: browser voices differ a lot in pace, and most report no word timings.
        // Learn this voice's real speed from each finished line so the next one stays in step.
        if (natural && startedAtMs > 0) {
          const elapsed = (performance.now() - startedAtMs) / 1000;
          if (elapsed > 1.2) {
            const measured = estimateSpeechDuration(spokenText, 1) / elapsed;
            const next = Math.min(1.7, Math.max(0.6, browserTtsSpeedRef.current * 0.4 + measured * 0.6));
            browserTtsSpeedRef.current = next;
            try {
              localStorage.setItem("atlas_browser_tts_speed", next.toFixed(3));
            } catch {}
          }
        }
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
        stopSyntheticSpeech();
        onSpeechEnd?.();
      };

      let tokenCursor = 0;
      let lastWord = 0;
      const advanceTo = (charIdx: number) => {
        if (charIdx < 0 || spokenTokens.length === 0) return;
        while (tokenCursor < spokenTokens.length - 1 && spokenTokens[tokenCursor + 1].start <= charIdx) tokenCursor++;
        const w = spokenTokens[tokenCursor].displayIndex;
        if (w > lastWord) {
          lastWord = w;
          setSpokenWordIndex(w);
        }
      };

      let started = false;
      let ignoreErrors = false;
      utterance.onstart = () => {
        if (isStale()) return;
        started = true;
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        setSpokenWordIndex(1);
        // No decoded audio for browser TTS: drive lips + subtitles from a synthetic clock,
        // resynced whenever the voice does report a word boundary
        startedAtMs = performance.now();
        noteSpeech("browser-start", spokenText);
        startSyntheticSpeech(spokenText, utterance.rate * browserTtsSpeedRef.current);
        if (speechTickerRef.current) clearInterval(speechTickerRef.current);
        speechTickerRef.current = setInterval(() => {
          if (hasHandledEnd) return;
          advanceTo(lipSyncRef.current.charIndex);
        }, 60);
      };

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === "word") {
          const charIdx = event.charIndex;
          syncSyntheticChar(charIdx, (event as SpeechSynthesisEvent & { charLength?: number }).charLength);
          advanceTo(charIdx);
        }
      };

      utterance.onend = () => handleEnd(true);
      utterance.onerror = (e) => {
        if (ignoreErrors || isStale()) return;
        console.warn("[Atlas Voice] Browser speech synthesis interrupted:", e);
        handleEnd(false);
      };

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

      const speakNow = () => {
        if (isStale() || hasHandledEnd) return;
        synth.speak(utterance);
      };
      if (wasBusy) window.setTimeout(speakNow, 90);
      else speakNow();

      // Watchdog: if the voice never starts, kick the engine once; if it still stays silent,
      // end the line so captions complete and a tour is never left waiting on a dead voice.
      window.setTimeout(() => {
        if (started || hasHandledEnd || isStale()) return;
        ignoreErrors = true;
        try {
          synth.cancel();
        } catch {}
        window.setTimeout(() => {
          ignoreErrors = false;
          speakNow();
        }, 150);
        window.setTimeout(() => {
          if (!started && !hasHandledEnd && !isStale()) handleEnd(false);
        }, 3000);
      }, 1600);
    },
    [activeVoice, lipSyncRef, startSyntheticSpeech, syncSyntheticChar, stopSyntheticSpeech]
  );

  // Neural TTS audio, cached per voice + text. Requests are shared (a prefetch and a later play of the
  // same line use one request) and are never aborted, so a slow answer still warms the cache.
  const neuralCacheRef = useRef<Map<string, Promise<Blob | null>>>(new Map());
  const lastSpeakRequestAtRef = useRef(0);
  // What the server has told us about each line: already generated (served from disk, no quota,
  // about 0.2 s) or not generated yet (asking would take seconds, or fail when the quota is spent).
  const neuralReadyRef = useRef<Set<string>>(new Set());
  const neuralMissingRef = useRef<Set<string>>(new Set());

  const fetchNeuralSpeech = useCallback(
    (spokenText: string, knownCachedArg = false): Promise<Blob | null> => {
      const key = `${activeVoice}::${spokenText}`;
      const knownCached = knownCachedArg || neuralReadyRef.current.has(key);
      const cache = neuralCacheRef.current;
      const hit = cache.get(key);
      if (hit) return hit;
      // A stock line has a static clip on the CDN (no server function, no cold start): try that first
      const request = getStaticClip(activeVoice, spokenText).then(async (clip) => {
        if (clip) {
          neuralReadyRef.current.add(key);
          return clip;
        }
        // Known to be out of quota: don't spend a multi-second failed round trip on every line
        // (a line already generated is served from disk and needs no quota)
        if (!knownCached && Date.now() < ttsBlockedUntilRef.current) return null;
        return fetch("/api/atlas-ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: spokenText, voice: activeVoice }),
        })
          .then(async (res) => {
            if (res.ok) return await res.blob();
            ttsBlockedUntilRef.current = Date.now() + TTS_BACKOFF_MS;
            console.warn("[Atlas Voice] Neural TTS unavailable (HTTP " + res.status + "); using the browser voice for the next few minutes.");
            return null;
          })
          .catch(() => null);
      });
      cache.set(key, request);
      request.then((blob) => {
        if (!blob) cache.delete(key);
      });
      while (cache.size > NEURAL_CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
      return request;
    },
    [activeVoice]
  );

  /** Warm the voice for a line that is about to be needed (e.g. the next tour stop). */
  const prefetchSpeech = useCallback(
    (rawNarration: string | undefined | null) => {
      if (!rawNarration) return;
      const spokenText = limitSpokenText(buildSpokenAlignment(rawNarration).spokenText, MAX_SPOKEN_CHARS);
      if (spokenText) void fetchNeuralSpeech(spokenText);
    },
    [fetchNeuralSpeech]
  );

  // Background warm-up: quietly generate lines that are likely to be needed (a tour's stops, the
  // navigator's stock lines) one at a time, so they are already on the server's disk cache when
  // asked for. Nothing is kept in browser memory, and it stops at the first sign of a spent quota.
  const warmQueueRef = useRef<string[]>([]);
  const warmSeenRef = useRef<Set<string>>(new Set());
  const warmRunningRef = useRef(false);
  const warmVoice = useCallback(
    (lines: Array<string | null | undefined>) => {
      for (const raw of lines) {
        if (!raw) continue;
        const text = limitSpokenText(buildSpokenAlignment(raw).spokenText, MAX_SPOKEN_CHARS);
        const key = `${activeVoice}::${text}`;
        if (!text || warmSeenRef.current.has(key) || neuralCacheRef.current.has(key)) continue;
        warmSeenRef.current.add(key);
        warmQueueRef.current.push(text);
      }
      if (warmRunningRef.current) return;
      warmRunningRef.current = true;
      void (async () => {
        try {
          // Lines with a static clip on the CDN: mark them ready and pull them into memory now,
          // so a tap plays at once (no server round trip at all)
          const staticTexts: string[] = [];
          const rest: string[] = [];
          for (const text of warmQueueRef.current) {
            if (await hasStaticClip(activeVoice, text)) {
              neuralReadyRef.current.add(`${activeVoice}::${text}`);
              neuralMissingRef.current.delete(`${activeVoice}::${text}`);
              staticTexts.push(text);
            } else rest.push(text);
          }
          await preloadStaticClips(activeVoice, staticTexts);
          warmQueueRef.current = rest;
          // Lines already generated need nothing: ask once which ones are, instead of fetching
          // each finished clip again just to find out.
          const queued = warmQueueRef.current.slice();
          const missing: string[] = [];
          for (let i = 0; i < queued.length; i += 50) {
            const batch = queued.slice(i, i + 50);
            const res = await fetch("/api/atlas-ai/tts/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ texts: batch, voice: activeVoice }),
            });
            const ready = res.ok ? ((await res.json()) as { cached?: boolean[] }).cached ?? [] : [];
            batch.forEach((text, k) => {
              const key = `${activeVoice}::${text}`;
              if (ready[k]) {
                neuralReadyRef.current.add(key);
                neuralMissingRef.current.delete(key);
              } else {
                if (res.ok) neuralMissingRef.current.add(key);
                missing.push(text);
              }
            });
          }
          warmQueueRef.current = missing;
          while (warmQueueRef.current.length) {
            if (Date.now() < ttsBlockedUntilRef.current) break;
            const text = warmQueueRef.current.shift() as string;
            const res = await fetch("/api/atlas-ai/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, voice: activeVoice }),
            });
            if (!res.ok) {
              ttsBlockedUntilRef.current = Date.now() + TTS_BACKOFF_MS;
              break;
            }
            const fresh = res.headers.get("X-Audio-Cached") !== "true";
            await res.arrayBuffer();
            neuralReadyRef.current.add(`${activeVoice}::${text}`);
            neuralMissingRef.current.delete(`${activeVoice}::${text}`);
            if (fresh) await new Promise((r) => window.setTimeout(r, WARM_GAP_MS));
          }
        } catch {
          // offline / navigation: try again on the next call
        } finally {
          warmQueueRef.current = [];
          warmRunningRef.current = false;
        }
      })();
    },
    [activeVoice]
  );

  // Immediate cancel speech for user interruption, map navigation, or mute
  const cancelSpeech = useCallback(() => {
    speechSeqRef.current += 1;
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;
    setIsPreparingSpeech(false);
    localVoiceCancel();
    stopAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    if (speechTickerRef.current) {
      clearInterval(speechTickerRef.current);
      speechTickerRef.current = null;
    }
    stopSyntheticSpeech();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, [stopAudio, stopSyntheticSpeech]);

  // Second voice: the in-browser voice (Kokoro). Unlike the browser's built-in speech it returns real
  // audio, so lips and captions follow the sound exactly (same path as the neural voice), it needs
  // no quota, and it speaks sentence by sentence: the first one starts while the rest are prepared.
  const speakWithLocalVoice = useCallback(
    (
      spokenText: string,
      spokenTokens: AlignedSpokenResult["spokenTokens"],
      totalDisplayWords: number,
      onSpeechEnd: (() => void) | undefined,
      seq: number,
      /** first sentence, already being synthesized while the neural voice was given its head start */
      head?: Promise<Blob | null>
    ) => {
      const chunks = splitSpeechChunks(spokenText);
      // queued in order in the worker
      const audio = chunks.map((chunk, i) => (i === 0 && head ? head : localSynthesize(chunk.text)));
      let tokenCursor = 0;
      let lastWord = 0;
      const wordIndexForChar = (charIdx: number): number => {
        if (charIdx < 0 || spokenTokens.length === 0) return 0;
        while (tokenCursor < spokenTokens.length - 1 && spokenTokens[tokenCursor + 1].start <= charIdx) tokenCursor++;
        return spokenTokens[tokenCursor].displayIndex;
      };
      const stale = () => seq !== speechSeqRef.current;
      const finish = () => {
        endSpeechSession();
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setSpokenWordIndex(totalDisplayWords);
        onSpeechEnd?.();
      };
      /** The local voice gave up part-way. One line, one voice: the rest is shown as text rather
       *  than picked up by a different voice (only a line that never started goes to the browser's). */
      const handOver = (from: number) => {
        noteSpeech("local-failed", spokenText);
        if (from > 0) return finish();
        endSpeechSession();
        fallbackToBrowserSpeech(spokenText, spokenTokens, totalDisplayWords, onSpeechEnd);
      };

      beginSpeechSession(spokenText.length);
      let index = 0;
      const playNext = async () => {
        if (stale()) return;
        if (index >= chunks.length) return finish();
        const chunk = chunks[index];
        let blob = await audio[index];
        // a head prepared in advance can have been dropped by a cancel: make it again
        if (!blob && index === 0 && head) blob = await localSynthesize(chunk.text);
        index += 1;
        if (stale()) return;
        if (!blob) return handOver(chunk.start);
        setSpeechText(chunk.text);
        await playAudio(blob, {
          charBase: chunk.start,
          onStart: () => {
            if (chunk.start === 0) noteSpeech("local-start", spokenText);
            setIsPreparingSpeech(false);
            setIsSpeaking(true);
            isSpeakingRef.current = true;
          },
          onTimeUpdate: (_curr, _dur, charIdx) => {
            const w = wordIndexForChar(charIdx);
            if (w > lastWord) {
              lastWord = w;
              setSpokenWordIndex(w);
            }
          },
          onEnded: () => {
            void playNext();
          },
          onError: () => {
            if (!stale()) handOver(chunk.start);
          },
        });
      };
      void playNext();
    },
    [beginSpeechSession, endSpeechSession, fallbackToBrowserSpeech, playAudio, setSpeechText]
  );

  // First sentences prepared ahead of time (the next tour stop, while the current one is spoken),
  // so the in-browser voice can start the moment it is needed.
  const localHeadsRef = useRef<Map<string, Promise<Blob | null>>>(new Map());
  const prepareLocalHead = useCallback((rawNarration: string | null | undefined) => {
    if (!rawNarration || !isLocalVoiceReady()) return;
    const spoken = limitSpokenText(buildSpokenAlignment(rawNarration).spokenText, MAX_SPOKEN_CHARS);
    const headText = splitSpeechChunks(spoken)[0]?.text;
    const heads = localHeadsRef.current;
    if (!headText || heads.has(headText)) return;
    heads.set(headText, localSynthesize(headText));
    while (heads.size > 6) {
      const oldest = heads.keys().next().value;
      if (oldest === undefined) break;
      heads.delete(oldest);
    }
  }, []);

  /**
   * Get the voice ready for a line that is about to be spoken (he is being hovered: a tap or a
   * hint is likely within a second), so the sound starts with no wait. A line that is already
   * generated in the neural voice is fetched into memory; any other has its first sentence made
   * by the in-browser voice.
   */
  const prepareSpeech = useCallback(
    (rawNarration: string | null | undefined) => {
      if (!rawNarration) return;
      const spoken = limitSpokenText(buildSpokenAlignment(rawNarration).spokenText, MAX_SPOKEN_CHARS);
      if (!spoken) return;
      if (neuralReadyRef.current.has(`${activeVoice}::${spoken}`)) void fetchNeuralSpeech(spoken, true);
      else prepareLocalHead(rawNarration);
    },
    [activeVoice, fetchNeuralSpeech, prepareLocalHead]
  );

  // Primary: Gemini neural TTS, played through the audio-aligned lip-sync engine.
  // Sync contract: nothing "speaks" (lips, gestures, subtitle highlight, bubble text) until the
  // audio is actually audible, and everything afterwards is read from the audio clock.
  const speakSoothingNarration = useCallback(
    async (rawInput: string, onSpeechEnd?: () => void, enginePromise?: Promise<SpeechEngine> | null) => {
      // Marks that guide the eye (asterisks, table pipes, source tags...) are never pronounced:
      // anything written for the screen is first retold as plain sentences.
      const rawNarration = needsNarration(rawInput) ? toNarration(rawInput) : rawInput;
      if (!rawNarration) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onSpeechEnd?.();
        return;
      }

      // Stop any prior speech/audio cleanly (also invalidates older in-flight requests)
      cancelSpeech();
      const seq = ++speechSeqRef.current;

      const aligned = buildSpokenAlignment(rawNarration);
      const { displayWords, spokenTokens } = aligned;
      const totalDisplayWords = displayWords.length;
      // Never let the server silently truncate: cut at a sentence end we know about, so the text
      // the lips/subtitles follow is exactly the text that is voiced.
      const spokenText = limitSpokenText(aligned.spokenText, MAX_SPOKEN_CHARS);
      setSpokenWordIndex(0);

      setSpeechText(spokenText);
      navigatorBus.narrationHint = classifyNarration(spokenText);
      setIsPreparingSpeech(true);

      /** spoken-text char index -> 1-based display word index */
      let tokenCursor = 0;
      const wordIndexForChar = (charIdx: number): number => {
        if (charIdx < 0 || spokenTokens.length === 0) return 0;
        while (tokenCursor < spokenTokens.length - 1 && spokenTokens[tokenCursor + 1].start <= charIdx) tokenCursor++;
        return spokenTokens[tokenCursor].displayIndex;
      };

      // 1. Primary engine: neural TTS (cached / prefetched lines resolve immediately).
      //    It gets a short head start; past that the browser voice speaks now rather than leaving
      //    the user waiting, while the neural audio finishes in the background for next time.
      noteSpeech("request", spokenText);
      lastSpeakRequestAtRef.current = performance.now();
      let engine: SpeechEngine = enginePromise ? await enginePromise : "auto";
      if (seq !== speechSeqRef.current) return;
      if (engine === "auto") {
        const key = `${activeVoice}::${spokenText}`;
        if (neuralReadyRef.current.has(key)) engine = "neural";
        // not generated yet (or the quota is spent): waiting for the neural voice would only add
        // a delay before the in-browser voice speaks it anyway
        else if (isLocalVoiceReady() && (neuralMissingRef.current.has(key) || Date.now() < ttsBlockedUntilRef.current)) engine = "local";
      }
      if (engine === "browser") {
        setIsPreparingSpeech(false);
        fallbackToBrowserSpeech(spokenText, spokenTokens, totalDisplayWords, onSpeechEnd);
        return;
      }
      // (the in-browser voice starts on the first sentence at the same moment, so if the neural
      //  voice is not ready in time nothing has been lost waiting for it)
      const headText = splitSpeechChunks(spokenText)[0]?.text ?? "";
      const prepared = localHeadsRef.current.get(headText);
      localHeadsRef.current.delete(headText);
      const localHead = engine !== "neural" && isLocalVoiceReady() ? prepared ?? localSynthesize(headText) : undefined;
      const outcome: Blob | null | "slow" =
        engine === "local"
          ? "slow" // this tour is in the in-browser voice from start to finish
          : engine === "neural"
          ? await fetchNeuralSpeech(spokenText, true) // every stop is already generated: no race
          : await Promise.race<Blob | null | "slow">([
              fetchNeuralSpeech(spokenText),
              new Promise<"slow">((resolve) => window.setTimeout(() => resolve("slow"), NEURAL_WAIT_MS)),
            ]);
      if (seq !== speechSeqRef.current) return; // a newer line superseded this one

      if (outcome && outcome !== "slow") {
        if (localHead && !prepared) localVoiceCancel();
        let lastWord = 0;
        await playAudio(outcome, {
          onStart: () => {
            noteSpeech("neural-start", spokenText);
            setIsPreparingSpeech(false);
            setIsSpeaking(true);
            isSpeakingRef.current = true;
          },
          onTimeUpdate: (_curr, _dur, charIdx) => {
            const w = wordIndexForChar(charIdx);
            if (w > lastWord) {
              lastWord = w;
              setSpokenWordIndex(w);
            }
          },
          onEnded: () => {
            noteSpeech("end", spokenText);
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setSpokenWordIndex(totalDisplayWords);
            onSpeechEnd?.();
          },
          onError: () => {
            if (seq !== speechSeqRef.current) return;
            noteSpeech("neural-error", spokenText);
            setIsPreparingSpeech(false);
            // Web Audio blocked/failed: hand over to the browser synth
            fallbackToBrowserSpeech(spokenText, spokenTokens, totalDisplayWords, onSpeechEnd);
          },
        });
        return;
      }

      // 2. Not available in time (new line, or quota spent): the in-browser voice speaks it now.
      //    Only if that voice has not finished loading yet does the browser's own speech step in.
      if (isLocalVoiceReady()) {
        speakWithLocalVoice(spokenText, spokenTokens, totalDisplayWords, onSpeechEnd, seq, localHead);
        return;
      }
      loadLocalVoice();
      setIsPreparingSpeech(false);
      noteSpeech("browser-voice", spokenText);
      fallbackToBrowserSpeech(spokenText, spokenTokens, totalDisplayWords, onSpeechEnd);
    },
    [activeVoice, cancelSpeech, fallbackToBrowserSpeech, fetchNeuralSpeech, playAudio, setSpeechText, speakWithLocalVoice]
  );

  // ── Speaking a chat answer ──────────────────────────────────────────────────
  const recentSubjectsRef = useRef<string[]>([]);
  const questionTimesRef = useRef<number[]>([]);
  const answerSeqRef = useRef(0);
  /** What he is saying for the current answer: the navigator's bubble shows it as he speaks */
  const [spokenCaption, setSpokenCaption] = useState<{ id: string; text: string } | null>(null);

  const speakAnswer = useCallback(
    async (spokenEnglish: string, sayTl: string | null) => {
      const mine = ++answerSeqRef.current;
      const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

      // 1. A line he is in the middle of (the "one second, pulling that up" remark) is allowed to
      //    finish: an answer that cut it off mid-word is what made him sound interrupted.
      const waitingSince = performance.now();
      while (
        (isSpeakingRef.current || lipSyncRef.current.isPlaying || performance.now() - lastSpeakRequestAtRef.current < 700) &&
        performance.now() - waitingSince < 4500
      ) {
        await wait(80);
        if (mine !== answerSeqRef.current) return;
      }

      // 2. In Taglish he answers in Tagalog when the neural voice can deliver it (the only voice
      //    that can pronounce it), within a small daily allowance; otherwise in English.
      let text = spokenEnglish;
      let engine: Promise<SpeechEngine> = ANSWER_ENGINE;
      if (sayTl && getLanguage() === "taglish" && tagalogAnswersLeft() > 0 && Date.now() >= ttsBlockedUntilRef.current) {
        const tagalog = toNarration(sayTl);
        const spokenTl = limitSpokenText(buildSpokenAlignment(tagalog).spokenText, MAX_SPOKEN_CHARS);
        const clip = await Promise.race<Blob | null>([fetchNeuralSpeech(spokenTl, true), wait(6000).then(() => null)]);
        if (mine !== answerSeqRef.current) return;
        if (clip) {
          text = tagalog;
          engine = Promise.resolve<SpeechEngine>("neural");
          spendTagalogAnswer();
        }
      }
      if (!text) return;

      // 3. Cues for his body: what to stress, and which projects he names (he looks and points
      //    at each one on the map as he says it).
      const spoken = limitSpokenText(buildSpokenAlignment(text).spokenText, MAX_SPOKEN_CHARS);
      const mentions = findProjectMentions(spoken, INITIAL_ATLAS_PROJECTS);
      navigatorBus.speechCues = { emphasis: findEmphasis(spoken, mentions) };
      setSpokenCaption({ id: `answer-${mine}-${Date.now()}`, text });
      void speakSoothingNarration(
        text,
        () => {
          if (mine === answerSeqRef.current) navigatorBus.speechCues = null;
        },
        engine
      );

      if (mentions.length) {
        const pending = [...mentions];
        const began = performance.now();
        const timer = window.setInterval(() => {
          const lip = lipSyncRef.current;
          const age = performance.now() - began;
          if (mine !== answerSeqRef.current || age > 90000 || (!lip.isPlaying && !isSpeakingRef.current && age > 8000)) {
            window.clearInterval(timer);
            return;
          }
          if (!lip.isPlaying) return;
          while (pending.length && lip.charIndex >= pending[0].at - 2) {
            const m = pending.shift()!;
            stateRef.current.onHighlightProjects?.([m.id], false);
          }
          if (!pending.length) window.clearInterval(timer);
        }, 120);
      }
    },
    [fetchNeuralSpeech, lipSyncRef, speakSoothingNarration]
  );

  const toggleVoiceNarration = useCallback(() => {
    setVoiceNarrationEnabled((prev) => {
      const next = !prev;
      if (!next) {
        cancelSpeech();
        playAtlasAudioChime("deactivate");
      } else {
        playAtlasAudioChime("activate");
        const current = activeTourRef.current;
        if (current?.currentStep?.narration) {
          speakSoothingNarration(current.currentStep.narration, undefined, tourEngineRef.current);
        } else {
          speakSoothingNarration("SCIC Atlas Navigator online. Voice narration is active.");
        }
      }
      return next;
    });
  }, [cancelSpeech, speakSoothingNarration]);

  // Synchronize active tour step to map camera and GIS discovery scope safely in effect
  useEffect(() => {
    if (!activeTour?.currentStep) return;
    executeTourStep(activeTour.currentStep);
  }, [activeTour?.tourId, activeTour?.stepIndex, executeTourStep]);

  // When tour concludes naturally by running past the final step, reset to national view safely in effect
  const prevTourRef = useRef(activeTour);
  useEffect(() => {
    // (a site story is about one project: when it ends, stay on that project)
    if (prevTourRef.current && !activeTour && !prevTourRef.current.tourId.startsWith(SITE_STORY_PREFIX)) {
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
        // have the next stop's opening sentence ready before it is reached
        window.setTimeout(() => {
          if (!isDisposed) prepareLocalHead(cachedStepsRef.current[activeTour.stepIndex + 1]?.narration);
        }, 1200);
        const tourEngine = tourEngineRef.current;
        speakSoothingNarration(currentStep.narration, () => {
          if (isDisposed) return;
          // Voice narration completed its speech!
          if (isPlaying) {
            // When voice narration is ON, we ALWAYS ensure the narration has completely finished.
            // In AUTO mode: add a gentle 2.2-second lingering pause so user absorbs the visual scene before flying.
            // In fixed timer mode: linger until the timer has elapsed or at least 1.5 seconds.
            const elapsedOnSpeechEnd = (Date.now() - stepStartTimeRef.current) / 1000;
            const lingerMs = isAuto
              ? 2200
              : Math.max(1500, Math.round((Math.max(8, effectiveSpeed) - elapsedOnSpeechEnd) * 1000));

            advanceTimeout = setTimeout(() => {
              triggerAdvance();
            }, lingerMs);
          }
        }, tourEngine);

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
        } else {
          // Explicit fixed duration (e.g. 8s, 12s, 18s) with voice muted
          advanceTimeout = setTimeout(() => {
            triggerAdvance();
          }, Math.max(8, effectiveSpeed) * 1000);
        }
      }
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
      // Leaving this stop (Next, Prev, Pause, Finish, Exit): whatever voice is speaking stops now
      cancelSpeech();
    };
  }, [
    activeTour?.tourId,
    activeTour?.stepIndex,
    activeTour?.isPlaying,
    activeTour?.durationSeconds,
    tourSpeedSeconds,
    voiceNarrationEnabled,
    speakSoothingNarration,
    prepareLocalHead,
    cancelSpeech,
    nextTourStep,
  ]);

  // Get the in-browser voice ready in the background (one-off model download, then cached)
  useEffect(() => {
    if (!voiceNarrationEnabled) return;
    const id = window.setTimeout(() => loadLocalVoice(), 3500);
    return () => window.clearTimeout(id);
  }, [voiceNarrationEnabled]);

  // Warm the voice for the rest of a tour as soon as it starts (and, shortly after the page opens,
  // for the opening stops of the default tour), so each stop's narration is ready before it is reached.
  useEffect(() => {
    if (!activeTour?.tourId || !voiceNarrationEnabled) return;
    warmVoice(cachedStepsRef.current.map((step) => step.narration));
  }, [activeTour?.tourId, voiceNarrationEnabled, warmVoice]);
  useEffect(() => {
    if (!voiceNarrationEnabled) return;
    const id = window.setTimeout(() => {
      try {
        warmVoice(withTourAsides(getGuidedTourData("national-flagship-tour").steps).slice(0, 2).map((step) => step.narration));
      } catch {}
    }, 6000);
    return () => window.clearTimeout(id);
  }, [voiceNarrationEnabled, warmVoice]);

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
        if (current && Date.now() - localTourStartAtRef.current < 90000) {
          // The page already started a tour for this same request. Starting the assistant's
          // version too would cut the narration off mid-sentence and begin again in another voice.
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

    if (lastSnapshot.geographicScope) {
      if (lastSnapshot.geographicScope.region && lastSnapshot.geographicScope.region !== "ALL") {
        opts.onEnterDiscoveryScope?.("region", lastSnapshot.geographicScope.region, true);
      } else {
        opts.onEnterDiscoveryScope?.("national", undefined, true);
      }
    }

    setUndoStack(remaining);
    setLastAppliedAction(`Reverted: ${lastSnapshot.actionSummary}`);
  }, [undoStack]);

  // Send a user prompt to Atlas AI (supports user interrupt)
  const sendMessage = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return;

      // Gracefully interrupt existing in-flight generation if user asks another question (Section 16)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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
      setHasError(false);
      setCurrentToolEvents([]);
      setIsOpen(true);

      const normalizedPrompt = promptText.trim().toLowerCase();

      // ─── "Tell me the story" → play the project's site story ───────────
      if (/\bstor(y|ies)\b/.test(normalizedPrompt) && !normalizedPrompt.includes("tour")) {
        if (startStory(findStoryProject(promptText, stateRef.current.selectedProjectId))) localTourStartAtRef.current = Date.now();
      }

      // ─── Instant Client-Side Tour Intent Dispatcher ───────────
      if (
        normalizedPrompt.includes("tour") ||
        normalizedPrompt.includes("touring") ||
        normalizedPrompt.includes("tour guide")
      ) {
        localTourStartAtRef.current = Date.now();
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
        } else if (
          /\b(?:region\s*(?:ii|2|02)|cagayan\s*valley|cagayan|isabela)\b/i.test(normalizedPrompt)
        ) {
          startTour("region-ii-tour", 0, dur, true);
        } else if (
          /\b(?:region\s*(?:iii|3|03)|central\s*luzon|bataan|tarlac|bulacan|subic)\b/i.test(normalizedPrompt)
        ) {
          startTour("central-luzon-tour", 0, dur, true);
        } else if (/\b(?:visayas|bohol|cebu|leyte|iloilo|panay)\b/i.test(normalizedPrompt)) {
          startTour("visayas-tour", 0, dur, true);
        } else if (/\b(?:mindanao|davao|bukidnon|sarangani|misamis)\b/i.test(normalizedPrompt)) {
          startTour("mindanao-tour", 0, dur, true);
        } else if (/\b(?:ncr|metro\s*manila|manila|quezon\s*city)\b/i.test(normalizedPrompt)) {
          startTour("central-luzon-tour", 0, dur, true);
        } else if (
          /\b(?:north\s*luzon|cordillera|car|benguet|mountain\s*province|ilocos)\b/i.test(normalizedPrompt)
        ) {
          startTour("north-luzon-tour", 0, dur, true);
        } else if (
          /\b(?:hydro|clean\s*energy|renewable|wind|solar)\b/i.test(normalizedPrompt)
        ) {
          startTour("clean-energy-tour", 0, dur, true);
        } else {
          // A project named in the request ("tour Tumauini") gets that project's site story;
          // anything else is the national tour.
          const named = findStoryProject(promptText.replace(/\b(tour(ing)?|guide|start|begin|take|show|around|through|a|an|quick|give)\b/gi, " "));
          if (!named || !startStory(named)) startTour("national-flagship-tour", 0, dur, true);
        }
      }

      const opts = stateRef.current;
      const contextPayload: AtlasContextPayload = {
        selectedProjectId: opts.selectedProjectId,
        mapZoom: opts.mapZoom,
        sidebarMode: opts.sidebarMode,
        activeFilters: opts.activeFilters,
        geographicScope: opts.geographicScope,
        mapStyle: (opts.mapStyle as any) || "DARK",
        activeLayers: opts.activeGisLayers ? Array.from(opts.activeGisLayers) : undefined,
        visibleProjectIds: opts.visibleProjectIds,
        persona: getPersonality(),
        recentSubjects: recentSubjectsRef.current,
        pace: conversationPace(promptText, questionTimesRef.current),
        language: getLanguage(),
        portfolioCount: opts.allProjectsCount,
        userInterests: interestsSummary(),
      };
      questionTimesRef.current = [...questionTimesRef.current.slice(-5), Date.now()];

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
          signal: abortController.signal,
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
          const stepEvents: Array<{ step: string; status: "started" | "completed"; toolName: string; label?: string }> = [];

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
                  const toolName = event.tool || event.toolName || event.step || "atlas_tool";
                  const label = event.label || `Querying ${toolName}...`;
                  stepEvents.push({ step: toolName, status: "started", toolName, label });
                  setCurrentToolEvents([...stepEvents]);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, toolEvents: [...stepEvents] } : m
                    )
                  );
                } else if (event.type === "step_complete") {
                  const toolName = event.tool || event.toolName || event.step || "atlas_tool";
                  const item = stepEvents.find((e) => e.step === toolName || e.toolName === toolName);
                  if (item) {
                    item.status = "completed";
                    if (event.label) item.label = event.label;
                  }
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
                      m.id === assistantMsgId ? { ...m, content: hideSpokenMarker(partialAnswer) } : m
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

          // The written answer goes on screen; what he says is the short spoken version the
          // assistant added (or, failing that, the written answer retold as plain sentences)
          const { display: writtenAnswer, say: spokenVersion, sayTl } = splitSpoken(partialAnswer);
          // (an answer that came back as only the spoken line is still an answer)
          partialAnswer = writtenAnswer || spokenVersion || "";
          const spokenAnswer = toNarration(spokenVersion || writtenAnswer || NO_ANSWER_TEXT);
          // what "it" and "that one" will mean in the next question
          const discussed = findProjectMentions(toNarration(writtenAnswer), INITIAL_ATLAS_PROJECTS).map((m) => m.name);
          if (discussed.length) recentSubjectsRef.current = [...new Set([...discussed, ...recentSubjectsRef.current])].slice(0, 5);

          // Complete the message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: partialAnswer || NO_ANSWER_TEXT,
                    spoken: spokenAnswer,
                    actions: finalActions,
                    sources: finalSources,
                    isStreaming: false,
                  }
                : m
            )
          );

          // Auto-execute any primary actions emitted by the model
          let isTourActionStarted = false;
          if (finalActions.length > 0) {
            finalActions.forEach((act) => {
              if (act.type === "START_TOUR") isTourActionStarted = true;
              executeAction(act);
            });
          }

          // Automatically speak answer if voice narration is enabled,
          // BUT suppress chat text speech if a tour was started so it doesn't talk over the tour narration!
          if (voiceNarrationEnabled && spokenAnswer && !isTourActionStarted && !activeTourRef.current) {
            void speakAnswer(spokenAnswer, sayTl);
          }
        } else {
          // CASE 2: JSON Response Fallback
          const data = await res.json();
          const parts = splitSpoken(data.answer || "");
          const assistantMessage: AtlasAIMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: parts.display || parts.say || NO_ANSWER_TEXT,
            spoken: toNarration(parts.say || parts.display),
            actions: data.actions || [],
            sources: data.sources || [],
            isStreaming: false,
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          let isTourActionStartedJson = false;
          if (data.actions && data.actions.length > 0) {
            data.actions.forEach((act: AtlasAIAction) => {
              if (act.type === "START_TOUR") isTourActionStartedJson = true;
              executeAction(act);
            });
          }

          // Automatically speak answer if voice narration is enabled
          const discussedJson = findProjectMentions(toNarration(parts.display), INITIAL_ATLAS_PROJECTS).map((m) => m.name);
          if (discussedJson.length) recentSubjectsRef.current = [...new Set([...discussedJson, ...recentSubjectsRef.current])].slice(0, 5);
          if (voiceNarrationEnabled && assistantMessage.spoken && !isTourActionStartedJson && !activeTourRef.current) {
            void speakAnswer(assistantMessage.spoken, parts.sayTl);
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError" || abortController.signal.aborted) {
          // Request was safely aborted by user interrupt
          return;
        }
        console.error("[useAtlasAI] Request error:", err);
        setHasError(true);
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
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
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
    setHasError(false);
  }, []);

  return {
    isOpen,
    setIsOpen,
    messages,
    isGenerating,
    hasError,
    currentToolEvents,
    sendMessage,
    clearChat,
    cancelGeneration,
    isStreaming: messages.some((m) => m.isStreaming && m.content.length > 0),
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
    isPreparingSpeech,
    spokenWordIndex,
    // High-Fidelity Gemini TTS & Lip-Sync Controls
    activeVoice,
    setActiveVoice,
    availableVoices: Object.values(ATLAS_VOICES),
    lipSyncRef,
    playAudio,
    playHolographicChime,
    cancelSpeech,
    prefetchSpeech,
    warmVoice,
    startStory,
    speakNarration: speakSoothingNarration,
    prepareSpeech,
    spokenCaption,
  };
}

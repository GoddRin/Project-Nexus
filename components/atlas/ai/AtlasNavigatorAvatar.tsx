"use client";

import { ATLAS_INTRO_DONE_EVENT, atlasIntroFinished } from "@/components/atlas/effects/AtlasIntro";
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  CornerDownRight,
  MessageCircle,
  MessageCircleOff,
  Smile,
  Laugh,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AtlasNavigatorState,
  AtlasNavigatorReaction,
  AtlasNavigatorGazeTarget,
  ATLAS_Z_INDEX,
} from "@/components/atlas/AtlasTokens";
import { AtlasNavigatorModel } from "./AtlasNavigatorModel";
import type { LipSyncTelemetry } from "./useLipSync";
import { navigatorBus, subscribeNavigatorEvents, type NavigatorBusEvent } from "./navigatorBus";
import { buildSpokenAlignment, limitSpokenText, MAX_SPOKEN_CHARS } from "@/lib/atlas-ai/spokenText";
import { favourites, shortProjectName } from "@/lib/atlas-ai/userMemory";
import { hasStaticClip } from "@/lib/atlas-ai/staticVoice";

/** The project this user keeps coming back to, by a name that can be said */
const favouriteName = (): string | null => {
  const f = favourites().project;
  return f ? shortProjectName(f.name) : null;
};
import {
  greetingLine,
  nextTapLine,
  hoverHint,
  proactiveTip,
  projectSelectedLine,
  eventQuip,
  warmupLines,
  personalityIntro,
  getPersonality,
  setPersonality as storePersonality,
  noteVisit,
  PERSONALITY_ORDER,
  PERSONALITY_LABEL,
  LISTENING_LINE,
  LANGUAGE_LABEL,
  getLanguage,
  setLanguage as storeLanguage,
  setVoicedFilipino,
  filipinoLines,
  type NavigatorLanguage,
  type NavigatorLine,
  type NavigatorPersonality,
  type OverlayId,
  type QuipKind,
} from "./navigatorLines";

/** A tenth of a second of silence: playing it tells us whether the browser allows sound yet */
const SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
async function browserAllowsSound(): Promise<boolean> {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua?.hasBeenActive) return true;
  try {
    const probe = new Audio(SILENT_WAV);
    probe.volume = 0.01;
    await probe.play();
    probe.pause();
    return true;
  } catch {
    return false;
  }
}

export interface AtlasNavigatorAvatarProps {
  state: AtlasNavigatorState;
  reaction: AtlasNavigatorReaction;
  gazeTarget: AtlasNavigatorGazeTarget;
  statusLabel: string;
  onClickAvatar: () => void;
  isOpen: boolean;
  isDrawerOpen?: boolean;
  /** Command bar / chat input currently focused (soft Stage Focus) */
  isInputFocused?: boolean;
  targetSlotRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  disabled?: boolean;
  // Live Voice Narration, Lip-Sync & Heroic Spotlight Controls
  lipSyncRef?: React.MutableRefObject<LipSyncTelemetry>;
  isSpeaking?: boolean;
  activeVoice?: string;
  voiceEnabled?: boolean;
  toggleVoiceNarration?: () => void;
  selectedProjectName?: string | null;
  /** Sector / category of the selected project (flavours his remark about it) */
  selectedProjectCategory?: string | null;
  playAudio?: (source: string | Blob) => Promise<boolean>;
  /** TTS requested but not audible yet */
  isPreparingSpeech?: boolean;
  /** A guided tour is running: its card owns the narration text, so the bubble stays out of the way */
  isTourActive?: boolean;
  /** Base map style: drives the ground shadow and the character's rim light */
  mapStyle?: "DARK" | "LIGHT" | "SATELLITE";
  playHolographicChime?: (variant?: "wake" | "acknowledge" | "deactivate") => void;
  isSpotlightActive?: boolean;
  onToggleSpotlight?: (active: boolean) => void;
  speakNarration?: (text: string, onEnd?: () => void) => void;
  cancelSpeech?: () => void;
  /** Quietly pre-generates the voice for lines he is likely to say (see useAtlasAI.warmVoice) */
  warmVoice?: (lines: string[]) => void;
  /** Gets the voice ready for a line he is about to say (see useAtlasAI.prepareSpeech) */
  prepareSpeech?: (line: string) => void;
  /** What he is saying for the chat answer in progress: shown in the bubble as he speaks it */
  spokenCaption?: { id: string; text: string } | null;
}

// Kept for backwards compatibility with earlier imports
export const NAVIGATOR_ASSISTANT_LINES = [
  { id: "welcome", text: "Hello! How can I help you explore Sta. Clara's national infrastructure projects today?" },
  { id: "tour", text: "I can guide you through our major engineering works. Say 'Start tour' or ask for any region anytime." },
  { id: "portfolio", text: "Sta. Clara operates 65+ major civil, clean energy, and water utilities across Luzon, Visayas, and Mindanao." },
  { id: "specs", text: "Ask me anything about project capacities, dam tunneling, river basins, or provincial contractors." },
];

const TALKATIVE_KEY = "atlas.navigator.talkative";
const HOVER_DWELL_MS = 1200;
/** With Talkative on he speaks sooner (the voice is being prepared during this time) */
const TALKATIVE_DWELL_MS = 700;
const TALKATIVE_COOLDOWN_MS = 8000;
const AUTO_DOCK_IDLE_MS = 8000;
const PROACTIVE_TIP_MS = 30000;
const RETURN_AFTER_MS = 120000;
const BUBBLE_LINGER_MS = 9000;
/** Minimum gap between two unprompted remarks of any kind */
const QUIP_GAP_MS = 8000;
/** ...and before he reacts to the same thing again */
const QUIP_REPEAT_MS = 45000;
/** This many pans / zooms / clicks on the map within MAP_FRENZY_WINDOW_MS gets a remark */
const MAP_FRENZY_COUNT = 5;
const MAP_FRENZY_WINDOW_MS = 6000;
/** How often to re-check which Tagalog lines have their neural clip */
const FILIPINO_RECHECK_MS = 90000;
const IDLE_QUIP_MS = 150000;

type LayoutStyle = {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  width: number;
  height: number;
  visualMode: "companion" | "bust" | "heroic_center";
  /** Which edge of the avatar the speech bubble lines up with (it always opens toward free map) */
  bubbleSide?: "left" | "right";
  /** The visible map is too narrow for him: he steps off stage instead of standing on a panel */
  hidden?: boolean;
  /** Widest the speech bubble may be without spilling over the panels beside a narrow map */
  bubbleMax?: number;
};

const sameLayout = (a: LayoutStyle, b: LayoutStyle) =>
  a.top === b.top &&
  a.left === b.left &&
  a.bottom === b.bottom &&
  a.right === b.right &&
  a.width === b.width &&
  a.height === b.height &&
  a.bubbleSide === b.bubbleSide &&
  a.hidden === b.hidden &&
  a.bubbleMax === b.bubbleMax &&
  a.visualMode === b.visualMode;

export const AtlasNavigatorAvatar: React.FC<AtlasNavigatorAvatarProps> = ({
  state,
  reaction,
  gazeTarget,
  statusLabel,
  onClickAvatar,
  isOpen,
  isDrawerOpen = false,
  isInputFocused = false,
  className,
  disabled = false,
  lipSyncRef,
  isSpeaking = false,
  isPreparingSpeech = false,
  isTourActive = false,
  mapStyle = "DARK",
  activeVoice = "Charon",
  voiceEnabled = true,
  toggleVoiceNarration,
  selectedProjectName,
  selectedProjectCategory,
  playAudio,
  playHolographicChime,
  isSpotlightActive: externalSpotlightActive,
  onToggleSpotlight,
  speakNarration,
  cancelSpeech,
  warmVoice,
  prepareSpeech,
  spokenCaption,
}) => {
  // Client mount check to avoid SSR hydration mismatches
  const [mounted, setMounted] = useState(false);
  const [hasWebGlError, setHasWebGlError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Heroic center "Stage Focus" (internal state or controlled)
  const [internalSpotlight, setInternalSpotlight] = useState(false);
  const isSpotlight = externalSpotlightActive !== undefined ? externalSpotlightActive : internalSpotlight;
  const autoFocusedRef = useRef(false);
  // Auto Stage Focus docks toward the right third so it never covers the command bar / suggestion chips
  const [autoStage, setAutoStage] = useState(false);
  const dockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSpotlight = useCallback(
    (val: boolean, opts?: { silent?: boolean; auto?: boolean }) => {
      setInternalSpotlight(val);
      onToggleSpotlight?.(val);
      autoFocusedRef.current = !!(val && opts?.auto);
      setAutoStage(!!(val && opts?.auto));
      if (!opts?.silent) playHolographicChime?.(val ? "wake" : "deactivate");
    },
    [onToggleSpotlight, playHolographicChime]
  );

  // Reaction trigger for the 3D model (tap / hover / events)
  const [reactionNonce, setReactionNonce] = useState(0);
  const [isTapInteracting, setIsTapInteracting] = useState(false);
  const fireReaction = useCallback((id: OverlayId) => {
    navigatorBus.pendingReaction = { id, at: performance.now() };
    setReactionNonce((n) => n + 1);
  }, []);

  // Speech bubble
  const [line, setLine] = useState<NavigatorLine | null>(null);
  const [typedLen, setTypedLen] = useState(0);
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(true);
  const [talkative, setTalkative] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(TALKATIVE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [personality, setPersonalityState] = useState<NavigatorPersonality>("friendly");
  const [language, setLanguageState] = useState<NavigatorLanguage>("taglish");
  const lastQuipByKindRef = useRef<Partial<Record<QuipKind, number>>>({});
  const visitRef = useRef<"first" | "same-day" | "earlier-day">("first");
  const lastQuipAtRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);
  const lastLineIdRef = useRef<string | undefined>(undefined);
  const tapCountRef = useRef(0);
  const lastSpokeAtRef = useRef(0);
  const lastActivityRef = useRef(0);
  const proactiveShownRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setPersonalityState(getPersonality());
    setLanguageState(getLanguage());
    visitRef.current = noteVisit();
    lastActivityRef.current = performance.now();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  /** A line shown now would also be spoken (voice on and available) */
  const canSpeak = !!speakNarration && voiceEnabled !== false;

  // Tagalog lines can only be SPOKEN by the neural voice: find out which of them are ready
  useEffect(() => {
    if (!mounted || language !== "taglish") {
      setVoicedFilipino([]);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const lines = filipinoLines();
        const texts = lines.map((l) => limitSpokenText(buildSpokenAlignment(l).spokenText, MAX_SPOKEN_CHARS));
        // static clips on the CDN answer at once; only ask the server about the rest
        const onCdn = await Promise.all(texts.map((t) => hasStaticClip(activeVoice, t)));
        if (cancelled) return;
        if (onCdn.every(Boolean)) {
          setVoicedFilipino(lines);
          return;
        }
        const res = await fetch("/api/atlas-ai/tts/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts, voice: activeVoice }),
        });
        if (!res.ok || cancelled) return;
        const ready = ((await res.json()) as { cached?: boolean[] }).cached ?? [];
        if (!cancelled) setVoicedFilipino(lines.filter((_, k) => ready[k] || onCdn[k]));
      } catch {
        // offline: Tagalog lines stay text-only for now
      }
    };
    void check();
    const id = setInterval(check, FILIPINO_RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mounted, language, activeVoice]);

  // Show a line (bubble + reaction) and optionally speak it.
  // A spoken line is "voiced": its text and gesture wait for the audio and then follow the audio
  // clock, so the bubble never runs ahead of (or behind) the voice.
  const [voiced, setVoiced] = useState(false);
  const voicedRef = useRef<{ reaction: OverlayId; started: boolean; requestedAt: number } | null>(null);

  // THE RULE: words in his bubble are words he says. Every line is spoken when the voice is on;
  // a line is shown without sound only when the voice is muted, when the browser does not allow
  // sound yet (nothing on the page has been clicked or typed since it loaded), or when the caller
  // explicitly asks for silence (the microphone is open).
  const presentLine = useCallback(
    (l: NavigatorLine, opts?: { speak?: boolean; showBubble?: boolean; soundChecked?: boolean }) => {
      lastLineIdRef.current = l.id;
      setLine(l);
      setTypedLen(0);
      if (opts?.showBubble !== false) setSpeechBubbleVisible(true);
      const soundAllowed =
        // (the caller has already tested that the browser will play sound without a click)
        opts?.soundChecked === true ||
        typeof navigator === "undefined" ||
        !(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation ||
        (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation!.hasBeenActive;
      const willSpeak = !!(opts?.speak !== false && speakNarration && voiceEnabled !== false && soundAllowed);
      if (willSpeak) {
        lastSpokeAtRef.current = performance.now();
        voicedRef.current = { reaction: l.reaction, started: false, requestedAt: performance.now() };
        setVoiced(true);
        speakNarration!(l.text);
      } else {
        voicedRef.current = null;
        setVoiced(false);
        fireReaction(l.reaction);
      }
    },
    [fireReaction, speakNarration, voiceEnabled]
  );

  // A chat answer he is speaking: the bubble shows what he SAYS (not the written answer) and lights
  // it up as he goes. The voice was started by the assistant, so nothing is spoken from here.
  const lastCaptionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!spokenCaption || spokenCaption.id === lastCaptionRef.current) return;
    lastCaptionRef.current = spokenCaption.id;
    if (voiceEnabled === false) return;
    const l: NavigatorLine = { id: spokenCaption.id, text: spokenCaption.text, reaction: "nod" };
    lastLineIdRef.current = l.id;
    lastSpokeAtRef.current = performance.now();
    lastQuipAtRef.current = performance.now();
    voicedRef.current = { reaction: l.reaction, started: false, requestedAt: performance.now() };
    setLine(l);
    setTypedLen(0);
    setSpeechBubbleVisible(true);
    setVoiced(true);
  }, [spokenCaption, voiceEnabled]);

  // Voiced line: reveal text from the audio clock (word by word, as it is spoken)
  useEffect(() => {
    if (!voiced || !line) return;
    let raf = 0;
    const tick = () => {
      const v = voicedRef.current;
      const lip = lipSyncRef?.current;
      if (!v) return;
      const waited = performance.now() - v.requestedAt;
      if (lip?.isPlaying) {
        if (!v.started) {
          v.started = true;
          fireReaction(v.reaction); // the gesture lands with the first word
        }
        const total = Math.max(1, lip.textLength);
        const frac = Math.min(1, Math.max(0, (lip.charIndex + 1) / total));
        // snap forward to the end of the word being spoken
        let n = Math.round(frac * line.text.length);
        const nextSpace = line.text.indexOf(" ", n);
        n = lip.charIndex < 0 ? 0 : nextSpace === -1 ? line.text.length : nextSpace;
        setTypedLen((prev) => (n > prev ? n : prev));
      } else if (v.started || waited > 9000) {
        // finished (or the voice never arrived): show the whole line and release
        if (!v.started) fireReaction(v.reaction);
        setTypedLen(line.text.length);
        voicedRef.current = null;
        setVoiced(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voiced, line, lipSyncRef, fireReaction]);

  // The bubble steps aside once its line has been read: it reappears on the next tap / event.
  // (A permanently open bubble was one more panel competing with the map.)
  useEffect(() => {
    if (!speechBubbleVisible || !line || voiced || isSpeaking || isPreparingSpeech) return;
    if (typedLen < line.text.length) return;
    const id = setTimeout(() => setSpeechBubbleVisible(false), BUBBLE_LINGER_MS);
    return () => clearTimeout(id);
  }, [speechBubbleVisible, line, voiced, isSpeaking, isPreparingSpeech, typedLen]);

  // Silent line: typewriter reveal
  useEffect(() => {
    if (voiced || !line || prefersReducedMotion || typedLen >= line.text.length) return;
    const perChar = Math.max(14, Math.min(34, 4200 / line.text.length));
    const id = setTimeout(() => setTypedLen((n) => n + 1), perChar);
    return () => clearTimeout(id);
  }, [voiced, line, typedLen, prefersReducedMotion]);

  // First impression: a wave and a spoken greeting, once the opening animation has finished.
  // Browsers may refuse sound until something on the page has been clicked: that is tested first
  // (a silent clip). If sound is refused, the greeting is shown and then SPOKEN at the first
  // click or key press, so his first line is never left without a voice.
  const presentLineRef = useRef(presentLine);
  useEffect(() => {
    presentLineRef.current = presentLine;
  }, [presentLine]);
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let removeGesture: (() => void) | undefined;
    const greet = async () => {
      if (cancelled) return;
      const now = new Date();
      const l = greetingLine({ hour: now.getHours(), day: now.getDay(), tapCount: 0, personality: getPersonality(), visit: visitRef.current, speak: true, favourite: favouriteName() });
      const allowed = await browserAllowsSound();
      if (cancelled) return;
      if (allowed) return presentLineRef.current(l, { soundChecked: true });
      presentLineRef.current(l, { speak: false });
      const onGesture = () => {
        removeGesture?.();
        // (only if he has not moved on to another line in the meantime)
        if (!cancelled && lastLineIdRef.current === l.id) presentLineRef.current(l);
      };
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("keydown", onGesture, { once: true });
      removeGesture = () => {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      };
    };
    const afterIntro = () => {
      window.removeEventListener(ATLAS_INTRO_DONE_EVENT, afterIntro);
      clearTimeout(timer);
      timer = setTimeout(greet, 450);
    };
    if (atlasIntroFinished()) timer = setTimeout(greet, 900);
    else {
      window.addEventListener(ATLAS_INTRO_DONE_EVENT, afterIntro);
      // (a page without the opening, or one that never reports: greet anyway)
      timer = setTimeout(afterIntro, 9000);
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener(ATLAS_INTRO_DONE_EVENT, afterIntro);
      removeGesture?.();
    };
  }, [mounted]);

  // Have his stock lines ready in the neural voice before they are needed
  useEffect(() => {
    if (!mounted || !warmVoice || voiceEnabled === false) return;
    // (stock lines come from static clips on the CDN: cheap, so start soon after the page settles)
    const id = setTimeout(() => warmVoice(warmupLines(personality, new Date().getHours())), 2500);
    return () => clearTimeout(id);
  }, [mounted, warmVoice, voiceEnabled, personality, language]);

  // React to a newly selected project
  const prevProjectRef = useRef<string | null | undefined>(selectedProjectName);
  useEffect(() => {
    if (selectedProjectName && selectedProjectName !== prevProjectRef.current && !isTourActive) {
      presentLine(projectSelectedLine(selectedProjectName, lastLineIdRef.current, personality, selectedProjectCategory));
    }
    prevProjectRef.current = selectedProjectName;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectName]);

  // Pointer tracking → navigator bus only (no React state, no re-render while moving the mouse/map)
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const onMove = (e: PointerEvent) => {
      lastActivityRef.current = performance.now();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const p = navigatorBus.pointer;
      if (inside) {
        p.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        p.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      } else {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        p.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (winW * 0.7)));
        p.y = -Math.max(-1, Math.min(1, (e.clientY - cy) / (winH * 0.7)));
      }
      p.isHovering = true;
      p.isDirectHover = inside;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [prefersReducedMotion]);

  const busyNowRef = useRef(false);
  const idleQuipShownRef = useRef(false);

  // Activity tracking for "welcome back" / proactive tip
  useEffect(() => {
    const onActivity = () => {
      const now = performance.now();
      const away = now - lastActivityRef.current;
      lastActivityRef.current = now;
      idleQuipShownRef.current = false; // he may remark on the next quiet spell too
      if (away > RETURN_AFTER_MS && !busyNowRef.current && !voicedRef.current) {
        presentLine(greetingLine({ hour: new Date().getHours(), tapCount: 0, returning: true, personality, speak: canSpeak }), { speak: true });
      }
    };
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity);
    return () => {
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
    };
  }, [presentLine, personality, canSpeak]);

  // A remark about something the user just did: shown in the bubble AND spoken (when the voice is
  // on). Never over a tour or a line already being spoken; a short gap between any two remarks and
  // a longer one before the same kind again. Professional mode has remarks only where a plain,
  // factual one exists (rain radar, working on an answer).
  useEffect(() => {
    busyNowRef.current = isSpeaking || isPreparingSpeech || isTourActive;
  }, [isSpeaking, isPreparingSpeech, isTourActive]);
  const sayQuip = useCallback(
    (kind: QuipKind, opts?: { force?: boolean }) => {
      const now = performance.now();
      if (busyNowRef.current || voicedRef.current) return false;
      if (!opts?.force) {
        if (now - lastQuipAtRef.current < QUIP_GAP_MS) return false;
        if (now - (lastQuipByKindRef.current[kind] ?? -Infinity) < QUIP_REPEAT_MS) return false;
      }
      const l = eventQuip(kind, personality, lastLineIdRef.current, canSpeak);
      if (!l) return false;
      lastQuipAtRef.current = now;
      lastQuipByKindRef.current[kind] = now;
      presentLine(l, { speak: true });
      return true;
    },
    [personality, presentLine, canSpeak]
  );

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      if (isSpeaking || isTourActive) return;
      const quiet = performance.now() - lastActivityRef.current;
      if (!proactiveShownRef.current && quiet > PROACTIVE_TIP_MS) {
        proactiveShownRef.current = true;
        if (!busyNowRef.current && !voicedRef.current) presentLine(proactiveTip());
      } else if (!idleQuipShownRef.current && quiet > IDLE_QUIP_MS) {
        idleQuipShownRef.current = sayQuip("idle", { force: true });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [mounted, isSpeaking, isTourActive, presentLine, sayQuip]);

  // While the assistant works on an answer he says so, like a person reaching for a folder
  const prevStateRef = useRef(state);
  const lastThinkAtRef = useRef(0);
  useEffect(() => {
    const was = prevStateRef.current;
    prevStateRef.current = state;
    // (browsing the map also reads as "SEARCHING", with his eyes on the map: that is the user
    //  looking around, not the assistant working, and must not be answered with "one second...")
    const working = state === "THINKING" || (state === "SEARCHING" && gazeTarget !== "MAP");
    const wasWorking = was === "THINKING" || was === "SEARCHING";
    if (working && !wasWorking && performance.now() - lastThinkAtRef.current > 8000) {
      lastThinkAtRef.current = performance.now();
      sayQuip("thinking", { force: true });
    }
  }, [state, gazeTarget, sayQuip]);

  // Light / dark switch
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    let wasDark = root.classList.contains("dark");
    const mo = new MutationObserver(() => {
      const isDark = root.classList.contains("dark");
      if (isDark === wasDark) return;
      wasDark = isDark;
      sayQuip(isDark ? "theme-dark" : "theme-light");
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [mounted, sayQuip]);

  // ── Stage Focus: soft, non-modal centering when the user is about to chat / talk ──
  const scheduleAutoDock = useCallback(
    (ms: number) => {
      if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
      dockTimerRef.current = setTimeout(() => {
        if (autoFocusedRef.current && !navigatorBus.voiceActive) setSpotlight(false, { silent: true });
      }, ms);
    },
    [setSpotlight]
  );

  const requestStageFocus = useCallback(() => {
    if (isOpen) return;
    if (!isSpotlight) setSpotlight(true, { silent: true, auto: true });
    if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
  }, [isOpen, isSpotlight, setSpotlight]);

  const mapBurstRef = useRef<number[]>([]);
  useEffect(() => {
    const handle = (e: NavigatorBusEvent) => {
      switch (e) {
        case "voice-start":
          requestStageFocus();
          // silent on purpose: the microphone is open and would record him
          presentLine(LISTENING_LINE, { speak: false });
          break;
        case "chat-focus":
          requestStageFocus();
          break;
        case "voice-end":
        case "chat-blur":
          if (autoFocusedRef.current) scheduleAutoDock(AUTO_DOCK_IDLE_MS);
          break;
        case "panel-open-right":
          fireReaction("presentRight");
          break;
        case "panel-open-left":
          fireReaction("presentLeft");
          break;
        case "tour-start":
          // a tour guide's hello
          fireReaction("wave");
          break;
        case "tour-end":
          // and a short bow to close
          fireReaction("bow");
          break;
        case "tour-step":
          // a small hard-hat tap as each tour stop completes
          fireReaction("salute");
          break;
        case "map-interaction": {
          // Any pan/zoom/click hands the stage straight back to the map (reversible + interruptible)
          if (autoFocusedRef.current) setSpotlight(false, { silent: true });
          // A burst of panning and zooming gets a remark
          const now = performance.now();
          const burst = mapBurstRef.current.filter((t) => now - t < MAP_FRENZY_WINDOW_MS);
          burst.push(now);
          mapBurstRef.current = burst;
          if (burst.length >= MAP_FRENZY_COUNT && sayQuip("map-frenzy")) mapBurstRef.current = [];
          break;
        }
        case "weather-on":
          sayQuip("weather-on");
          break;
        case "national-view":
          sayQuip("national-view");
          break;
      }
    };
    return subscribeNavigatorEvents(handle);
  }, [requestStageFocus, scheduleAutoDock, setSpotlight, presentLine, fireReaction, sayQuip]);

  const prevFocusedRef = useRef(false);
  useEffect(() => {
    if (isInputFocused && !prevFocusedRef.current) requestStageFocus();
    if (!isInputFocused && prevFocusedRef.current && autoFocusedRef.current && !navigatorBus.voiceActive) {
      scheduleAutoDock(AUTO_DOCK_IDLE_MS);
    }
    prevFocusedRef.current = isInputFocused;
  }, [isInputFocused, requestStageFocus, scheduleAutoDock]);

  useEffect(() => () => {
    if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
  }, []);

  // Escape: dock + stop talking instantly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isSpotlight) setSpotlight(false);
      if (isSpeaking) cancelSpeech?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSpotlight, isSpeaking, setSpotlight, cancelSpeech]);

  // ── Layout engine ───────────────────────────────────────────────────────────
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>({
    bottom: 20,
    right: 16,
    width: 190,
    height: 250,
    visualMode: "companion",
  });
  const layoutRef = useRef(layoutStyle);

  const syncLayout = useCallback(() => {
    if (!mounted) return;
    const winW = window.innerWidth;
    const isDesktop = winW >= 768;
    // On a phone the app's bottom navigation bar covers the foot of the screen: he stands above it
    const barLift = isDesktop ? 0 : Math.round(document.querySelector('nav[aria-label="Mobile Navigation"]')?.getBoundingClientRect().height ?? 0);
    let next: LayoutStyle;

    if (isSpotlight && !isOpen) {
      const w = isDesktop ? 260 : 200;
      const h = isDesktop ? 330 : 260;
      const left = autoStage && isDesktop
        ? Math.max(16, Math.round(winW - w - Math.max(24, winW * 0.1)))
        : Math.round((winW - w) / 2);
      next = { bottom: (isDesktop ? 36 : 24) + barLift, left, width: w, height: h, visualMode: "heroic_center" };
    } else if (isTourActive || isOpen) {
      // Never sit on top of the directory / sidebar: stay inside the map canvas.
      let w = isDesktop ? 190 : 160;
      let h = isDesktop ? 250 : 210;
      let hidden = false;
      let bubbleMax: number | undefined;
      const mapEl = document.querySelector(".maplibregl-map");
      const mapRect = mapEl?.getBoundingClientRect();
      const mapLeft = mapRect ? Math.round(mapRect.left) : 16;
      // Left spot starts past the GIS legend button so the legend stays reachable
      let left = mapLeft + 12 + (isDesktop ? 128 : 0);
      let bottom = (isDesktop ? 24 : 16) + barLift;
      let bubbleSide: "left" | "right" = "left";
      if (mapRect && isDesktop) {
        // Prefer the usual bottom-right corner of the visible map: the map's right edge, or the
        // project panel's left edge when that panel is open (he must never stand on the panel)
        const drawer = isDrawerOpen
          ? document.querySelector('aside[aria-label^="Project Intelligence"]')?.getBoundingClientRect()
          : undefined;
        const freeRight = drawer && drawer.width > 0 ? Math.min(mapRect.right, drawer.left - 8) : mapRect.right;
        const rightSpot = Math.round(freeRight - w - 16);
        const chat = document.getElementById("scic-atlas-ai-workspace")?.getBoundingClientRect();
        const chatCovers = !!chat && chat.width > 0 && chat.left < rightSpot + w && chat.right > rightSpot && chat.bottom > window.innerHeight - bottom - h;
        if (!chatCovers && rightSpot > left) {
          left = rightSpot;
          bubbleSide = "right";
        }
        // A narrow map (directory and chat both open on a laptop): he must not spill over onto
        // the panels. Stand at the map's left edge, smaller; if even that does not fit, step off.
        if (left + w > freeRight - 8) {
          const room = Math.round(freeRight - mapLeft - 20);
          if (room >= 130) {
            w = Math.min(w, room);
            h = Math.round((w * 250) / 190);
            left = mapLeft + 12;
            bubbleSide = "left";
            bubbleMax = Math.max(180, room);
          } else {
            hidden = true;
          }
        }
      }
      // Minimised chat pill along the bottom: when the free map is too narrow for both, stand on top of it
      const pill = document.getElementById("scic-atlas-ai-workspace-minimized")?.getBoundingClientRect();
      if (pill && pill.width > 0 && pill.left < left + w - 16 && pill.right > left + 16) {
        bottom = Math.max(bottom, Math.round(window.innerHeight - pill.top + 6));
      }
      const tourEl = isTourActive ? document.querySelector('[aria-label="AI Guided Portfolio Tour Controller"]') : null;
      if (tourEl) {
        // Narrating a tour: stand on the narration card's top-left corner, like a presenter at a screen
        const tr = (tourEl.firstElementChild ?? tourEl).getBoundingClientRect();
        left = Math.max(mapLeft + 12, Math.round(tr.left));
        bottom = Math.max(bottom, Math.round(window.innerHeight - tr.top + 4));
        // ...but never climb over the breadcrumb / command bar at the top of the map
        if (mapRect) bottom = Math.min(bottom, Math.max(24, Math.round(window.innerHeight - mapRect.top - 64 - h)));
      }
      next = { bottom, left, width: w, height: h, visualMode: "companion", bubbleSide, hidden, bubbleMax };
    } else {
      let rightOffset = 16;
      if (isDrawerOpen && isDesktop) {
        const drawerEl = document.querySelector('aside[aria-label^="Project Intelligence"]');
        if (drawerEl) {
          rightOffset = Math.max(440, Math.round(winW - drawerEl.getBoundingClientRect().left + 24));
        } else {
          rightOffset = (winW >= 1280 ? 430 : winW >= 1024 ? 410 : 380) + 12 + 24;
        }
      }
      next = { bottom: 20 + barLift, right: rightOffset, width: isDesktop ? 190 : 160, height: isDesktop ? 250 : 210, visualMode: "companion", bubbleSide: "right" };
    }

    // Only touch React state when something actually changed (the old loop re-rendered every frame)
    if (!sameLayout(layoutRef.current, next)) {
      layoutRef.current = next;
      setLayoutStyle(next);
    }
  }, [isOpen, isSpotlight, isDrawerOpen, mounted, autoStage, isTourActive]);

  useEffect(() => {
    syncLayout();
    // Drawer / workspace slide in; track their final geometry for a short window instead of forever
    let raf = 0;
    const until = performance.now() + 700;
    const loop = () => {
      syncLayout();
      if (performance.now() < until) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", syncLayout);
    // The tour card grows and shrinks as its narration wraps: keep standing on its top edge
    const tourTimer = isTourActive ? window.setInterval(syncLayout, 250) : 0;
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(tourTimer);
      window.removeEventListener("resize", syncLayout);
    };
  }, [syncLayout, isTourActive]);

  // ── Tap / click / drag ───────────────────────────────────────────────────────
  const dragRef = useRef<{ startX: number; moved: boolean; active: boolean }>({ startX: 0, moved: false, active: false });

  const handleAvatarTap = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }
      lastActivityRef.current = performance.now();
      playHolographicChime?.("wake");
      setIsTapInteracting(true);
      setTimeout(() => setIsTapInteracting(false), 900);

      tapCountRef.current += 1;
      const stamp = performance.now();
      tapTimesRef.current = [...tapTimesRef.current.filter((t) => stamp - t < 4000), stamp];
      const rapid = tapTimesRef.current.length >= 3;
      if (rapid) tapTimesRef.current = [];
      const now = new Date();
      const l = nextTapLine(
        {
          hour: now.getHours(),
          projectName: selectedProjectName,
          projectCategory: selectedProjectCategory,
          speak: canSpeak,
          tapCount: tapCountRef.current,
          personality,
          rapid,
        },
        lastLineIdRef.current
      );
      const first = tapCountRef.current === 1;
      const preparedTap = nextTapRef.current;
      nextTapRef.current = null;
      const usePrepared = !first && !rapid && tapCountRef.current % 5 !== 0 && !!preparedTap && preparedTap.id !== lastLineIdRef.current;
      presentLine(
        first
          ? greetingLine({ hour: now.getHours(), day: now.getDay(), tapCount: 1, personality, visit: visitRef.current, speak: canSpeak, favourite: favouriteName() })
          : usePrepared
          ? preparedTap!
          : l,
        { speak: true }
      );

      if (!speakNarration || voiceEnabled === false) {
        if (!playAudio) onClickAvatar();
      }
    },
    [selectedProjectName, selectedProjectCategory, personality, canSpeak, presentLine, playHolographicChime, speakNarration, voiceEnabled, playAudio, onClickAvatar]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAvatarTap();
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, moved: false, active: true };
    // capture so the release is always delivered, even if the pointer leaves the avatar
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const onPointerMoveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active || prefersReducedMotion) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 8) {
      d.moved = true;
      // a small look-around only: a big turn made him stand side-on to the viewer
      navigatorBus.dragYaw = Math.max(-0.4, Math.min(0.4, dx / 260));
    }
  };
  const endDrag = () => {
    dragRef.current.active = false;
    navigatorBus.dragYaw = 0;
    // a drag should never be read as a tap; clear the flag shortly after the click event fires
    if (dragRef.current.moved) {
      setTimeout(() => (dragRef.current.moved = false), 60);
      sayQuip("spin");
    }
  };

  // Hover dwell: hint bubble (and a short spoken line when Talkative is on)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = isSpeaking || isPreparingSpeech || isTourActive;
  }, [isSpeaking, isPreparingSpeech, isTourActive]);
  /** The line he will say if tapped next, chosen (and its voice prepared) while he is hovered */
  const nextTapRef = useRef<NavigatorLine | null>(null);
  const onPointerEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const speakHints = talkative && canSpeak;

    // Hovering usually comes just before a tap or a spoken hint: choose those lines now and get
    // their voice ready, so the sound starts the moment it is needed instead of a second later.
    let hint: NavigatorLine | null = null;
    if (canSpeak && !busyRef.current) {
      // (the hint first: it is needed soonest, and the voice prepares one line at a time)
      if (speakHints && performance.now() - lastSpokeAtRef.current > TALKATIVE_COOLDOWN_MS - TALKATIVE_DWELL_MS) {
        hint = hoverHint(lastLineIdRef.current, personality, true);
        prepareSpeech?.(hint.text);
      }
      if (tapCountRef.current > 0 && (tapCountRef.current + 1) % 5 !== 0) {
        const now = new Date();
        nextTapRef.current = nextTapLine(
          { hour: now.getHours(), projectName: selectedProjectName, projectCategory: selectedProjectCategory, speak: true, tapCount: tapCountRef.current + 1, personality },
          hint?.id ?? lastLineIdRef.current
        );
        prepareSpeech?.(nextTapRef.current.text);
      }
    }

    hoverTimerRef.current = setTimeout(() => {
      const now = performance.now();
      // Never talk over (or replace) a line that is being spoken or is still loading
      if (busyRef.current || voicedRef.current) return;
      if (speakHints) {
        // Talkative: a hint is always SPOKEN. Between hints he only looks up (no silent text,
        // which read as "the words came but the voice did not").
        if (hint && now - lastSpokeAtRef.current > TALKATIVE_COOLDOWN_MS) presentLine(hint, { speak: true });
        else fireReaction("tilt");
      } else {
        // Talkative off: no hint in the bubble (it would be words with no voice); he looks up
        fireReaction("tilt");
      }
    }, speakHints ? TALKATIVE_DWELL_MS : HOVER_DWELL_MS);
  };
  const onPointerLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!dragRef.current.active) navigatorBus.dragYaw = 0;
    navigatorBus.pointer.isDirectHover = false;
  };

  const toggleTalkative = () => {
    setTalkative((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(TALKATIVE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
    playHolographicChime?.("acknowledge");
  };

  const cyclePersonality = () => {
    const next = PERSONALITY_ORDER[(PERSONALITY_ORDER.indexOf(personality) + 1) % PERSONALITY_ORDER.length];
    setPersonalityState(next);
    storePersonality(next);
    playHolographicChime?.("acknowledge");
    lastQuipAtRef.current = performance.now();
    presentLine(personalityIntro(next));
  };

  const cycleLanguage = () => {
    const next: NavigatorLanguage = language === "taglish" ? "english" : "taglish";
    setLanguageState(next);
    storeLanguage(next);
    playHolographicChime?.("acknowledge");
    lastQuipAtRef.current = performance.now();
    presentLine(
      next === "taglish"
        ? { id: "lang-taglish", text: "Taglish mode. I'll mix in some Tagalog.", reaction: "nod" }
        : { id: "lang-english", text: "English only. Understood.", reaction: "nod" }
    );
  };

  // ── Walk controller ──
  // Whenever the layout engine gives him a new spot, he first stays where he visibly is (the
  // difference is held as a transform), and once the spot has settled he goes there: a quick
  // slide for a short step, a walk (recorded stride, full figure in frame) for a longer way.
  const spotRef = useRef<{ left: number; top: number; mode: string; hidden: boolean } | null>(null);
  const moveTimerRef = useRef(0);
  const walkEndRef = useRef(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    const rect = el.getBoundingClientRect();
    const spot = { left: rect.left - m.m41, top: rect.top - m.m42, mode: layoutStyle.visualMode, hidden: !!layoutStyle.hidden };
    const prev = spotRef.current;
    spotRef.current = spot;
    if (!prev) return;
    // where he is on screen now, relative to the new spot
    const dx = prev.left + m.m41 - spot.left;
    const dy = prev.top + m.m42 - spot.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.setProperty("--nav-move", "0s");
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    window.clearTimeout(moveTimerRef.current);
    window.clearTimeout(walkEndRef.current);
    navigatorBus.walk = null;
    moveTimerRef.current = window.setTimeout(() => {
      const dist = Math.abs(dx);
      const plain = prefersReducedMotion || spot.hidden || prev.hidden || spot.mode !== "companion" || prev.mode !== "companion" || dist < 110;
      if (plain) {
        el.style.setProperty("--nav-move", prefersReducedMotion ? "0s" : "0.35s");
        el.style.setProperty("--nav-ease", "cubic-bezier(0.16, 1, 0.3, 1)");
      } else {
        // the recording walks at about 150 px a second at this size; he crosses the screen at an
        // unhurried ~115 px a second, longer ways a little brisker (the stride is scaled to the
        // actual speed, so his feet do not slide)
        const seconds = Math.min(5.2, Math.max(1.4, dist / 115));
        const rate = Math.min(1.7, Math.max(0.7, dist / 150 / seconds));
        el.style.setProperty("--nav-move", `${seconds}s`);
        el.style.setProperty("--nav-ease", "linear");
        navigatorBus.walk = { dir: dx > 0 ? -1 : 1, until: performance.now() + seconds * 1000, rate };
        walkEndRef.current = window.setTimeout(() => {
          navigatorBus.walk = null;
        }, seconds * 1000);
      }
      el.style.transform = "translate(0px, 0px)";
    }, 280);
  }, [layoutStyle, prefersReducedMotion]);
  useEffect(
    () => () => {
      window.clearTimeout(moveTimerRef.current);
      window.clearTimeout(walkEndRef.current);
      navigatorBus.walk = null;
    },
    []
  );

  const cameraProp = useMemo(() => ({ position: [0, 1.25, 2.3] as [number, number, number], fov: 38 }), []);
  const glProp = useMemo(() => ({ antialias: true, alpha: true, powerPreference: "high-performance" as const }), []);

  const getContextualGreeting = useCallback(() => {
    if (selectedProjectName) return `Inspecting ${selectedProjectName}. Tap to analyze engineering specs.`;
    return greetingLine({ hour: new Date().getHours(), tapCount: 0 }).text;
  }, [selectedProjectName]);

  if (!mounted) return null;

  if (hasWebGlError) {
    return (
      <div className={cn("fixed bottom-5 right-4 z-25 pointer-events-auto", className)}>
        <button
          onClick={onClickAvatar}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-atlas-panel/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-xl hover:border-emerald-600/30 dark:hover:border-emerald-400/40 transition-colors"
          title="Open SCIC Atlas Assistant"
        >
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-mono font-bold">Atlas AI</span>
        </button>
      </div>
    );
  }

  const isBust = layoutStyle.visualMode === "bust";
  const isHeroic = layoutStyle.visualMode === "heroic_center";
  const onLeftSide = layoutStyle.bubbleSide === "left" && !isHeroic;
  // A spoken line is on screen immediately (dimmed) and lights up word by word as it is voiced,
  // so there is never an empty bubble while the voice is being prepared.
  const fullText = line ? line.text : getContextualGreeting();
  const litLen = !line ? fullText.length : voiced ? typedLen : prefersReducedMotion ? fullText.length : typedLen;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: layoutStyle.top !== undefined ? `${layoutStyle.top}px` : "auto",
        left: layoutStyle.left !== undefined ? `${layoutStyle.left}px` : "auto",
        bottom: layoutStyle.bottom !== undefined ? `${layoutStyle.bottom}px` : "auto",
        right: layoutStyle.right !== undefined ? `${layoutStyle.right}px` : "auto",
        width: `${layoutStyle.width}px`,
        height: `${layoutStyle.height}px`,
        // (stepped off stage on a map too narrow for him; he comes back when there is room)
        opacity: layoutStyle.hidden ? 0 : undefined,
        visibility: layoutStyle.hidden ? "hidden" : undefined,
        pointerEvents: layoutStyle.hidden ? "none" : undefined,
        zIndex: isBust
          ? ATLAS_Z_INDEX.AI_WORKSPACE_ACTIVE + 1
          : isHeroic
          ? ATLAS_Z_INDEX.AI_WORKSPACE_ACTIVE + 2
          : ATLAS_Z_INDEX.INSPECTION_DRAWER + 5,
        // (his position changes at once; the move between spots is the transform below, driven
        //  by the walk controller: a short slide for a small step, a walk for a longer way)
        transition:
          "width 0.35s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform var(--nav-move, 0s) var(--nav-ease, linear)",
        willChange: "width, height, transform",
      }}
      className={cn(
        "pointer-events-auto select-none",
        isBust ? "rounded-xl overflow-hidden shadow-md ring-1 ring-cyan-500/30" : "group",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* ─── FLOATING GLASSMORPHIC SPEECH BUBBLE ─── */}
      {!isBust && speechBubbleVisible && !isTourActive && (
        <div
          role="region"
          aria-label="SCIC Atlas Navigator Speech Box"
          aria-live="polite"
          className={cn(
            "absolute z-30 transition-opacity duration-300 pointer-events-auto",
            isHeroic
              ? "bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 w-[310px]"
              : onLeftSide
              ? "bottom-[calc(100%+8px)] left-0"
              : "bottom-[calc(100%+8px)] right-0"
          )}
          style={isHeroic ? undefined : { width: Math.min(260, layoutStyle.bubbleMax ?? 260) }}
        >
          <div className="relative rounded-2xl bg-white/95 dark:bg-atlas-sunken/95 backdrop-blur-xl border border-emerald-600/25 dark:border-emerald-400/30 shadow-xl p-3 text-slate-900 dark:text-white overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

            <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200 dark:border-white/10 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isSpeaking ? "bg-emerald-500" : "bg-emerald-400")} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isSpeaking ? "bg-emerald-600" : "bg-emerald-500")} />
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-300 uppercase">
                  {isSpeaking ? "Speaking" : isPreparingSpeech ? "Preparing voice" : "Field Navigator"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cyclePersonality();
                  }}
                  title={`Personality: ${PERSONALITY_LABEL[personality]} (click to change)`}
                  aria-label={`Personality: ${PERSONALITY_LABEL[personality]}. Click to change.`}
                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {personality === "playful" ? (
                    <Laugh className="w-3.5 h-3.5" />
                  ) : personality === "friendly" ? (
                    <Smile className="w-3.5 h-3.5" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleLanguage();
                  }}
                  title={`Language: ${LANGUAGE_LABEL[language]} (click to change)`}
                  aria-label={`Language: ${LANGUAGE_LABEL[language]}. Click to change.`}
                  className="px-1 py-0.5 rounded-md text-[9px] font-bold tracking-wide text-emerald-700 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {language === "taglish" ? "TL" : "EN"}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTalkative();
                  }}
                  aria-pressed={talkative}
                  title={talkative ? "Talkative on: speaks a short hint when you point at him" : "Talkative off: no hints when you point at him"}
                  className="p-1 rounded-md text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {talkative ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <MessageCircleOff className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {toggleVoiceNarration && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVoiceNarration();
                      playHolographicChime?.(voiceEnabled ? "deactivate" : "acknowledge");
                    }}
                    title={voiceEnabled ? "Mute Voice Narration" : "Enable Voice Narration"}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotlight(!isSpotlight);
                  }}
                  title={isSpotlight ? "Dock Navigator to Corner" : "Center Spotlight Focus"}
                  className={cn(
                    "p-1 rounded-md transition-colors cursor-pointer",
                    isHeroic ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/20" : "text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  {isHeroic ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeechBubbleVisible(false);
                  }}
                  title="Dismiss Bubble"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 select-text min-h-[2.6em]">
              &ldquo;
              <span className="text-slate-900 dark:text-white">{fullText.slice(0, litLen)}</span>
              {voiced && <span className="text-slate-400 dark:text-slate-500">{fullText.slice(litLen)}</span>}
              {(!voiced || litLen >= fullText.length) && <>&rdquo;</>}
            </p>

            <div className="flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-slate-200/70 dark:border-white/5">
              {/* Tapping him is the one way to make him speak; this row only offers the chat */}
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Tap him to hear more</span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickAvatar();
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                title="Open Assistant Workspace"
              >
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>Chat AI</span>
              </button>
            </div>

            <div
              className={cn(
                "absolute -bottom-2 w-3.5 h-3.5 bg-white dark:bg-atlas-sunken border-r border-b border-emerald-600/25 dark:border-emerald-400/30 transform rotate-45",
                isHeroic ? "left-1/2 -translate-x-1/2" : onLeftSide ? "left-10" : "right-10"
              )}
            />
          </div>
        </div>
      )}

      {/* Bubble folded away: keep a one-tap way into the chat */}
      {!isBust && !speechBubbleVisible && !isTourActive && !isOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClickAvatar();
          }}
          title="Open Atlas AI chat"
          className={cn(
            "absolute -top-3 z-30 flex items-center gap-1 h-6 px-2 rounded-full bg-white/95 dark:bg-atlas-sunken/95 backdrop-blur-md border border-emerald-500/35 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:text-slate-900 dark:hover:text-white hover:border-emerald-400 shadow-lg transition-colors cursor-pointer pointer-events-auto",
            onLeftSide ? "left-1" : "right-1"
          )}
        >
          <Sparkles className="w-3 h-3" />
          <span>Ask Atlas</span>
        </button>
      )}

      {/* ─── STAGE FOCUS AURA ─── */}
      {isHeroic && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-52 h-14 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
          <div className="absolute w-40 h-10 border border-emerald-500/40 rounded-full animate-ping opacity-35" />
          <div className="absolute w-48 h-12 border border-emerald-500/20 rounded-full" />
        </div>
      )}

      {/* ─── AVATAR CANVAS BUTTON ─── */}
      <button
        type="button"
        onClick={handleAvatarTap}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMoveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        aria-label={`SCIC Atlas Navigator 3D Character (Status: ${statusLabel}). Tap to speak, drag to turn.`}
        className={cn(
          "relative w-full h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-xl cursor-pointer touch-none",
          // standing: his arms may reach past his own box (see the canvas below); the bust is framed
          isBust ? "overflow-hidden" : "overflow-visible transition-transform active:scale-[0.98]"
        )}
      >
        {/* Soft ground shadow at his feet line, tuned to the map behind him */}
        {!isBust && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 bottom-3 h-3 w-[62%] -translate-x-1/2 rounded-[50%] blur-md"
            style={{
              background:
                mapStyle === "LIGHT" ? "rgba(15, 26, 21, 0.22)" : mapStyle === "SATELLITE" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.55)",
            }}
          />
        )}
        {/* The drawing area is wider than his box: recorded gestures (a wave, an open-arm
            "here it is") reach further out than his 190 px frame, and were cut off at its edge.
            Same height and same camera, so he stays the same size and in the same place; the
            extra width is see-through and lets clicks through to the map. */}
        <div
          className={cn(isBust ? "relative w-full h-full" : "pointer-events-none absolute inset-y-0 -left-[55%] -right-[55%]")}
          aria-hidden="true"
        >
          <Canvas
            dpr={[1, 2]}
            camera={cameraProp}
            gl={glProp}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
            onError={() => setHasWebGlError(true)}
            className="w-full h-full"
          >
            <AtlasNavigatorModel
              state={state}
              reaction={reaction}
              gazeTarget={gazeTarget}
              visualMode={layoutStyle.visualMode}
              reducedMotion={prefersReducedMotion}
              lipSyncRef={lipSyncRef}
              isTapInteracting={isTapInteracting}
              reactionNonce={reactionNonce}
              mapStyle={mapStyle}
            />
          </Canvas>
        </div>

        {!isBust && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-8px)] px-1.5 py-0.5 rounded-lg bg-white/90 dark:bg-atlas-sunken/90 backdrop-blur-md border border-emerald-600/20 dark:border-emerald-400/25 flex items-center justify-between gap-1 shadow-lg pointer-events-none">
            <div className="flex items-center gap-1 min-w-0">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isSpeaking
                    ? "bg-emerald-500 animate-pulse"
                    : state === "OFFLINE"
                    ? "bg-slate-500"
                    : state === "ERROR"
                    ? "bg-amber-400 animate-pulse"
                    : state === "NAVIGATING"
                    ? "bg-emerald-500 animate-ping"
                    : state === "SEARCHING" || state === "THINKING"
                    ? "bg-sky-400 animate-pulse"
                    : "bg-emerald-400"
                )}
              />
              <span className="text-[9px] font-mono font-bold text-slate-900 dark:text-white truncate">
                {isSpeaking ? "Speaking" : state === "IDLE" ? "Navigator" : state}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isHeroic && (
                <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded bg-emerald-500/15 border border-emerald-600/25 dark:border-emerald-400/30">
                  Focus
                </span>
              )}
              <span className="text-[8px] font-mono text-emerald-700 dark:text-emerald-300 font-bold px-1 rounded bg-emerald-500/10 border border-emerald-600/20 dark:border-emerald-400/20">
                ✦ {activeVoice}
              </span>
            </div>
          </div>
        )}
      </button>

      {isHeroic && (
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => setSpotlight(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 dark:bg-atlas-sunken/95 backdrop-blur-md border border-emerald-600/30 dark:border-emerald-400/40 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 hover:text-slate-900 dark:hover:text-white hover:border-emerald-600 dark:hover:border-emerald-400 shadow-xl transition-all cursor-pointer"
          >
            <CornerDownRight className="w-3 h-3" />
            <span>Dock to Corner</span>
            <span className="text-[9px] text-slate-400 ml-1">(Esc)</span>
          </button>
        </div>
      )}
    </div>
  );
};

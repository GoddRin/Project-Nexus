"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AtlasNavigatorState,
  AtlasNavigatorReaction,
  AtlasNavigatorGazeTarget,
} from "@/components/atlas/AtlasTokens";

export interface UseAtlasNavigatorStateOptions {
  isGenerating?: boolean;
  hasError?: boolean;
  currentToolEvents?: Array<{ step: string; status: "started" | "completed"; toolName: string; label?: string }>;
  isInputFocused?: boolean;
  isSpeaking?: boolean;
  isStreaming?: boolean;
  isOffline?: boolean;
  isMapPanning?: boolean;
  lastAppliedAction?: string | null;
  selectedProjectId?: string | null;
  selectedProjectName?: string | null;
  activeRegion?: string | null;
  isTourActive?: boolean;
}

export interface AtlasNavigatorStateResult {
  state: AtlasNavigatorState;
  reaction: AtlasNavigatorReaction;
  gazeTarget: AtlasNavigatorGazeTarget;
  statusLabel: string;
  triggerClickReaction: (forcedReaction?: AtlasNavigatorReaction) => void;
  isClickCoolingDown: boolean;
}

const CLICK_COOLDOWN_MS = 2000;
const REACTION_HOLD_MS = 1500;
const SUCCESS_HOLD_MS = 1800;
const ERROR_HOLD_MS = 2000;
const NAVIGATING_HOLD_MS = 2200;

function formatToolStatus(toolName: string, label?: string): string {
  if (label) return label;
  const lower = toolName.toLowerCase();
  if (lower.includes("search") || lower.includes("query") || lower.includes("find")) {
    return "Finding projects...";
  }
  if (lower.includes("region") || lower.includes("scope")) {
    return "Locating regional intelligence...";
  }
  if (lower.includes("corridor") || lower.includes("distance")) {
    return "Calculating project corridor...";
  }
  if (lower.includes("buffer") || lower.includes("perimeter")) {
    return "Analyzing geographic perimeter...";
  }
  if (lower.includes("footprint") || lower.includes("layer")) {
    return "Projecting geospatial footprint...";
  }
  if (lower.includes("compare")) {
    return "Analyzing project metrics...";
  }
  if (lower.includes("fly") || lower.includes("zoom") || lower.includes("navigate")) {
    return "Navigating coordinates...";
  }
  return "Analyzing project portfolio...";
}

export function useAtlasNavigatorState({
  isGenerating = false,
  hasError = false,
  currentToolEvents = [],
  isInputFocused = false,
  isSpeaking = false,
  isStreaming = false,
  isOffline = false,
  isMapPanning = false,
  lastAppliedAction = null,
  selectedProjectId = null,
  selectedProjectName = null,
  activeRegion = null,
  isTourActive = false,
}: UseAtlasNavigatorStateOptions): AtlasNavigatorStateResult {
  // Transient reaction state
  const [reaction, setReaction] = useState<AtlasNavigatorReaction>(null);
  const [isClickCoolingDown, setIsClickCoolingDown] = useState(false);

  // Timed state locks to prevent visual thrashing between micro-events
  const [lockedSuccess, setLockedSuccess] = useState(false);
  const [lockedError, setLockedError] = useState(false);
  const [lockedNavigating, setLockedNavigating] = useState(false);

  // Timers refs
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigatingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Previous generation tracker to detect completion -> SUCCESS transition
  const prevGeneratingRef = useRef(isGenerating);
  const prevActionRef = useRef(lastAppliedAction);
  const prevProjectRef = useRef(selectedProjectId);

  // Lock error state when hasError occurs
  useEffect(() => {
    if (hasError) {
      setLockedError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setLockedError(false);
      }, ERROR_HOLD_MS);
    }
  }, [hasError]);

  // Detect tool completions / actions
  useEffect(() => {
    // If generation just transitioned from true -> false without error
    if (prevGeneratingRef.current && !isGenerating && !isOffline && !hasError && !lockedError) {
      setLockedSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setLockedSuccess(false);
      }, SUCCESS_HOLD_MS);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, isOffline, hasError, lockedError]);

  // Detect map navigation actions (flyTo, tour step, project select)
  useEffect(() => {
    if (lastAppliedAction && lastAppliedAction !== prevActionRef.current) {
      const lower = lastAppliedAction.toLowerCase();
      if (
        lower.includes("fly") ||
        lower.includes("zoom") ||
        lower.includes("navigate") ||
        lower.includes("extent") ||
        lower.includes("tour") ||
        lower.includes("discovery")
      ) {
        setLockedNavigating(true);
        if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
        navigatingTimerRef.current = setTimeout(() => {
          setLockedNavigating(false);
          // Coordinated arrival sequence: look at map during flight, nod attentively on arrival
          setReaction("ATTENTIVE_NOD");
          if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
          reactionTimerRef.current = setTimeout(() => {
            setReaction(null);
          }, REACTION_HOLD_MS);
        }, NAVIGATING_HOLD_MS);
      }
    }
    prevActionRef.current = lastAppliedAction;
  }, [lastAppliedAction]);

  // Also trigger navigation glance when selected project changes, followed by arrival nod
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== prevProjectRef.current) {
      setLockedNavigating(true);
      if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
      navigatingTimerRef.current = setTimeout(() => {
        setLockedNavigating(false);
        // Coordinated arrival sequence: nod attentively on arrival
        setReaction("ATTENTIVE_NOD");
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = setTimeout(() => {
          setReaction(null);
        }, REACTION_HOLD_MS);
      }, NAVIGATING_HOLD_MS);
    }
    prevProjectRef.current = selectedProjectId;
  }, [selectedProjectId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
    };
  }, []);

  // Check active tool events (extract human-friendly label)
  const activeTool = currentToolEvents.find((e) => e.status === "started");

  const hasNavigatingTool = currentToolEvents.some(
    (e) =>
      e.status === "started" &&
      (e.toolName.includes("fly") ||
        e.toolName.includes("navigate") ||
        e.toolName.includes("zoom") ||
        e.toolName.includes("discovery") ||
        e.toolName.includes("footprint"))
  );

  const hasSearchingTool = currentToolEvents.some(
    (e) =>
      e.status === "started" &&
      (e.toolName.includes("search") ||
        e.toolName.includes("filter") ||
        e.toolName.includes("query") ||
        e.toolName.includes("layer") ||
        e.toolName.includes("gis") ||
        e.toolName.includes("database") ||
        e.toolName.includes("distance") ||
        e.toolName.includes("bound") ||
        e.toolName.includes("statistic") ||
        e.toolName.includes("timeline") ||
        e.toolName.includes("compare") ||
        e.toolName.includes("brief") ||
        e.toolName.includes("nexus"))
  );

  // Live network offline telemetry detection
  const [isBrowserOffline, setIsBrowserOffline] = useState(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const effectiveOffline = isOffline || isBrowserOffline;

  // Deterministic state precedence:
  // OFFLINE > ERROR > NAVIGATING > SEARCHING > SPEAKING > THINKING > SUCCESS > LISTENING > MAP_SCANNING > IDLE
  let state: AtlasNavigatorState = "IDLE";
  let gazeTarget: AtlasNavigatorGazeTarget = "USER";
  let statusLabel = "Ready to explore.";

  if (effectiveOffline) {
    state = "OFFLINE";
    gazeTarget = "USER";
    statusLabel = "Atlas AI is offline. Reconnecting to network...";
  } else if (hasError || lockedError) {
    state = "ERROR";
    gazeTarget = "USER";
    statusLabel = "Operation could not be completed.";
  } else if (hasNavigatingTool || lockedNavigating || isTourActive) {
    state = "NAVIGATING";
    gazeTarget = "MAP";
    statusLabel = activeTool
      ? formatToolStatus(activeTool.toolName, activeTool.label)
      : selectedProjectName
      ? `Navigating to ${selectedProjectName}...`
      : "Navigating coordinates...";
  } else if (hasSearchingTool) {
    state = "SEARCHING";
    gazeTarget = "HOLOGRAM";
    statusLabel = activeTool
      ? formatToolStatus(activeTool.toolName, activeTool.label)
      : "Searching Atlas GIS layers...";
  } else if (isStreaming || isSpeaking) {
    state = "SPEAKING";
    gazeTarget = "USER";
    statusLabel = "Reviewing project intelligence...";
  } else if (isGenerating) {
    state = "THINKING";
    gazeTarget = "HOLOGRAM";
    statusLabel = activeTool
      ? formatToolStatus(activeTool.toolName, activeTool.label)
      : "Analyzing project portfolio...";
  } else if (lockedSuccess) {
    state = "SUCCESS";
    gazeTarget = "USER";
    statusLabel = "Done.";
  } else if (isInputFocused) {
    state = "LISTENING";
    gazeTarget = "USER";
    statusLabel = "Listening...";
  } else if (isMapPanning) {
    // Real-time map browsing detection
    state = "SEARCHING";
    gazeTarget = "MAP";
    statusLabel = "Scanning map coordinates...";
  } else {
    state = "IDLE";
    if (selectedProjectName) {
      gazeTarget = "PROJECT";
      statusLabel = `Viewing ${selectedProjectName}`;
    } else if (activeRegion && activeRegion !== "ALL") {
      gazeTarget = "MAP";
      statusLabel = `Exploring ${activeRegion}`;
    } else {
      gazeTarget = "USER";
      statusLabel = "Ready to explore.";
    }
  }

  // Cooldown ref to guarantee atomic anti-spam across any render lifecycle
  const isClickCoolingDownRef = useRef(false);

  // Trigger approved transient click reaction with 2.0s anti-spam cooldown
  // Weighted table: 70% Attentive Nod, 15% Subtle Wave, 10% Map Scan, 5% Technical Acknowledge
  const triggerClickReaction = useCallback(
    (forcedReaction?: AtlasNavigatorReaction) => {
      if (isClickCoolingDownRef.current) return;

      isClickCoolingDownRef.current = true;
      setIsClickCoolingDown(true);

      let chosenReaction: AtlasNavigatorReaction = "ATTENTIVE_NOD";

      if (forcedReaction) {
        chosenReaction = forcedReaction;
      } else if (selectedProjectId) {
        // If inspecting a project, perform a map scan acknowledgment
        chosenReaction = "MAP_SCAN";
      } else {
        const roll = Math.random();
        if (roll < 0.70) {
          chosenReaction = "ATTENTIVE_NOD";
        } else if (roll < 0.85) {
          chosenReaction = "SUBTLE_WAVE";
        } else if (roll < 0.95) {
          chosenReaction = "MAP_SCAN";
        } else {
          chosenReaction = "TECHNICAL_ACKNOWLEDGE";
        }
      }

      setReaction(chosenReaction);

      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = setTimeout(() => {
        setReaction(null);
      }, REACTION_HOLD_MS);

      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        isClickCoolingDownRef.current = false;
        setIsClickCoolingDown(false);
      }, CLICK_COOLDOWN_MS);
    },
    [selectedProjectId]
  );

  return {
    state,
    reaction,
    gazeTarget,
    statusLabel,
    triggerClickReaction,
    isClickCoolingDown,
  };
}

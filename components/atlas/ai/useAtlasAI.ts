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
  onFlyToProject?: (target: { id?: string; coordinates?: { lat: number; lng: number }; zoom?: number; pitch?: number }) => void;
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
  onEnterDiscoveryScope?: (scope: "national" | "island" | "region" | "province", targetName?: string) => void;
  onHighlightProjects?: (projectIds: string[], fitBounds?: boolean) => void;
}

export function useAtlasAI(options: UseAtlasAIOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AtlasAIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentToolEvents, setCurrentToolEvents] = useState<Array<{ step: string; status: "started" | "completed"; toolName: string }>>([]);
  const [undoStack, setUndoStack] = useState<ReversibleStateSnapshot[]>([]);
  const [lastAppliedAction, setLastAppliedAction] = useState<string | null>(null);

  // Active Portfolio Tour State
  const [activeTour, setActiveTour] = useState<{
    tourId: string;
    tourTitle: string;
    stepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    currentStep: AtlasTourStepData;
  } | null>(null);
  const [cachedTourSteps, setCachedTourSteps] = useState<AtlasTourStepData[]>([]);

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
        "Summarize this project",
        "What's around here?",
        "When did this project start and what's next?",
        "Inspect engineering footprint",
        "Compare with Sabangan HEPP",
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

    if (step.camera?.center) {
      opts.onFlyToProject?.({
        coordinates: { lat: step.camera.center[1], lng: step.camera.center[0] },
        zoom: step.camera.zoom,
        pitch: step.camera.pitch,
      });
    }

    if (step.discoveryScope) {
      opts.onEnterDiscoveryScope?.(step.discoveryScope.scope, step.discoveryScope.targetName);
    }

    if (step.selectedProjectId) {
      opts.onSelectProject?.(step.selectedProjectId);
    } else {
      opts.onSelectProject?.(null);
    }

    if (step.highlightProjectIds && step.highlightProjectIds.length > 0) {
      opts.onHighlightProjects?.(step.highlightProjectIds, false);
    }
  }, []);

  // Tour Controller Methods
  const startTour = useCallback((tourId: string = "national-flagship-tour", initialStep: number = 0) => {
    try {
      const tourData = getGuidedTourData(tourId);
      const validIndex = Math.max(0, Math.min(initialStep, tourData.steps.length - 1));
      const step = tourData.steps[validIndex];

      setCachedTourSteps(tourData.steps);
      setActiveTour({
        tourId: tourData.tourId,
        tourTitle: tourData.tourTitle,
        stepIndex: validIndex,
        totalSteps: tourData.totalSteps,
        isPlaying: false,
        currentStep: step,
      });

      executeTourStep(step);
      setLastAppliedAction(`Started Portfolio Tour: Step ${validIndex + 1} of ${tourData.totalSteps}`);
    } catch (err) {
      console.error("[useAtlasAI] Failed to start guided tour:", err);
    }
  }, [executeTourStep]);

  const nextTourStep = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev || cachedTourSteps.length === 0) return null;
      if (prev.stepIndex >= prev.totalSteps - 1) {
        // Completed
        stateRef.current.onEnterDiscoveryScope?.("national");
        stateRef.current.onSelectProject?.(null);
        return null;
      }
      const nextIdx = prev.stepIndex + 1;
      const nextStep = cachedTourSteps[nextIdx];
      executeTourStep(nextStep);
      return {
        ...prev,
        stepIndex: nextIdx,
        currentStep: nextStep,
      };
    });
  }, [cachedTourSteps, executeTourStep]);

  const prevTourStep = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev || cachedTourSteps.length === 0) return null;
      if (prev.stepIndex <= 0) return prev;
      const prevIdx = prev.stepIndex - 1;
      const prevStep = cachedTourSteps[prevIdx];
      executeTourStep(prevStep);
      return {
        ...prev,
        stepIndex: prevIdx,
        currentStep: prevStep,
      };
    });
  }, [cachedTourSteps, executeTourStep]);

  const togglePlayPauseTour = useCallback(() => {
    setActiveTour((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null));
  }, []);

  const exitTour = useCallback(() => {
    setActiveTour(null);
    stateRef.current.onEnterDiscoveryScope?.("national");
    stateRef.current.onSelectProject?.(null);
    setLastAppliedAction("Exited Portfolio Tour");
  }, []);

  const jumpToTourStep = useCallback((index: number) => {
    setActiveTour((prev) => {
      if (!prev || cachedTourSteps.length === 0) return null;
      const validIndex = Math.max(0, Math.min(index, prev.totalSteps - 1));
      const targetStep = cachedTourSteps[validIndex];
      executeTourStep(targetStep);
      return {
        ...prev,
        stepIndex: validIndex,
        currentStep: targetStep,
      };
    });
  }, [cachedTourSteps, executeTourStep]);

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
          zoom: action.zoom,
          pitch: action.pitch,
        });
        setLastAppliedAction(`Flying map camera to project "${action.projectId}"`);
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
        startTour(action.tourId, action.stepIndex);
        setLastAppliedAction(`Started Guided Portfolio Tour`);
        break;
      }
    }

    setUndoStack((prev) => [snapshot, ...prev].slice(0, 10));
  }, [startTour]);

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
  };
}

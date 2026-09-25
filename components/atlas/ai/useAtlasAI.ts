"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AtlasAIAction, AtlasAISource } from "@/lib/atlas-ai/tools/types";
import { AtlasContextPayload } from "@/lib/atlas-ai/identity";

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
}

export function useAtlasAI(options: UseAtlasAIOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AtlasAIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentToolEvents, setCurrentToolEvents] = useState<Array<{ step: string; status: "started" | "completed"; toolName: string }>>([]);
  const [undoStack, setUndoStack] = useState<ReversibleStateSnapshot[]>([]);
  const [lastAppliedAction, setLastAppliedAction] = useState<string | null>(null);

  // References to latest state
  const stateRef = useRef(options);
  useEffect(() => {
    stateRef.current = options;
  }, [options]);

  // Context-Aware Suggestions based on current runtime view
  const suggestions = useCallback((): string[] => {
    const opts = stateRef.current;
    if (opts.selectedProjectId) {
      return [
        "What is this project?",
        "What's nearby within 50 km?",
        "Show its timeline and milestones",
        "Inspect verified engineering footprint",
        "Open in Project Nexus",
      ];
    }

    if (opts.geographicScope?.region && opts.geographicScope.region !== "ALL") {
      const reg = opts.geographicScope.region;
      return [
        `Summarize ${reg}`,
        `Show ongoing projects in ${reg}`,
        `Which projects have tunneling in ${reg}?`,
        "Show nearby river basins",
      ];
    }

    if (opts.activeFilters?.category && opts.activeFilters.category !== "ALL") {
      return [
        `How many ${opts.activeFilters.category} projects are ongoing?`,
        "Show geographic bounds for these projects",
        "Clear active filters",
      ];
    }

    // Default National View
    return [
      "Explore Region II (Cagayan Valley)",
      "Show ongoing hydropower projects",
      "How many total projects across the Philippines?",
      "Which projects have tunneling scope?",
      "Show major river basins and high-voltage grid",
    ];
  }, []);

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
    }

    setUndoStack((prev) => [snapshot, ...prev].slice(0, 10));
  }, []);

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
  };
}

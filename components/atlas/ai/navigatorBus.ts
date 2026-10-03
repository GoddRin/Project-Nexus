/**
 * Navigator Bus — mutable, non-React store read every frame by the 3D navigator.
 *
 * Map pan/zoom and pointer events fire at display rate. Routing them through React state
 * re-rendered the whole map client + avatar per frame (jank/flicker). Writers mutate this
 * object; the R3F `useFrame` loop reads it. No subscriptions, no re-renders.
 */
import type { NarrationHint } from "@/lib/atlas-ai/visemes";

export interface NavigatorBus {
  /** Screen-space (viewport px) point of the clicked / hovered / highlighted map location */
  peek: { x: number; y: number } | null;
  /** performance.now() of the last peek change (used to expire the look-at) */
  peekChangedAt: number;
  /** Pointer position relative to avatar, normalised [-1,1], plus hover flags */
  pointer: { x: number; y: number; isHovering: boolean; isDirectHover: boolean };
  /** Avatar centre in viewport px */
  avatarCenter: { x: number; y: number } | null;
  /** performance.now() of the last user map interaction (pan/zoom/click) */
  lastMapInteractionAt: number;
  /** Content classification of the current narration (drives matching gestures) */
  narrationHint: NarrationHint;
  /** One-shot request for an attention/gesture reaction ("tap", "greet", "point", ...) */
  pendingReaction: { id: string; at: number } | null;
  /** Microphone / voice capture currently active (drives Stage Focus + listening pose) */
  voiceActive: boolean;
  /** Turntable nudge (radians) while the user drags the character */
  dragYaw: number;
  /** For the answer being spoken: the stretches (character ranges in the spoken text) to stress */
  speechCues: { emphasis: Array<[number, number]> } | null;
}

export type NavigatorBusEvent =
  | "voice-start" | "voice-end" | "chat-focus" | "chat-blur" | "map-interaction" | "chat-open" | "chat-close"
  | "panel-open-right" | "panel-open-left" | "tour-step" | "weather-on" | "national-view";

export const navigatorBus: NavigatorBus = {
  peek: null,
  peekChangedAt: 0,
  pointer: { x: 0, y: 0, isHovering: false, isDirectHover: false },
  avatarCenter: null,
  lastMapInteractionAt: 0,
  narrationHint: null,
  pendingReaction: null,
  voiceActive: false,
  dragYaw: 0,
  speechCues: null,
};

// Low-frequency event channel (a handful per session, safe to bridge into React state)
const listeners = new Set<(e: NavigatorBusEvent) => void>();
export function subscribeNavigatorEvents(fn: (e: NavigatorBusEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function emitNavigatorEvent(e: NavigatorBusEvent): void {
  if (e === "voice-start") navigatorBus.voiceActive = true;
  if (e === "voice-end") navigatorBus.voiceActive = false;
  if (e === "map-interaction") navigatorBus.lastMapInteractionAt = performance.now();
  listeners.forEach((fn) => fn(e));
}

export function setNavigatorPeek(point: { x: number; y: number } | null): void {
  const prev = navigatorBus.peek;
  if (prev === point) return;
  if (prev && point && prev.x === point.x && prev.y === point.y) return;
  const wasNull = !prev;
  navigatorBus.peek = point;
  // Moving along with a panning map is not a "new" peek; only (re)arm on null <-> point changes
  if (wasNull || !point) navigatorBus.peekChangedAt = performance.now();
}

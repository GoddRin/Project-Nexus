/**
 * The Twin v2 store (docs/twin-v2/CONTRACTS.md section 5).
 *
 * A vanilla zustand store so the simulation and the engine can read it without React; components
 * subscribe through `useTwin` with a selector. Per-frame values never go in here.
 */
import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { useStore } from "zustand";
import type { LocationId, StageId } from "../data/types";

export type { StageId };
export type Tier = "low" | "medium" | "high" | "ultra";
export type WeatherState = "clear" | "overcast" | "rain" | "typhoon";
export type SelectionKind = "person" | "equipment" | "vehicle" | "facility" | "animal";
export type LayerId = "labels" | "people" | "vehicles" | "animals" | "flora" | "energy" | "section";

export const TIERS: readonly Tier[] = ["low", "medium", "high", "ultra"];
export const WEATHER_STATES: readonly WeatherState[] = ["clear", "overcast", "rain", "typhoon"];
export const SELECTION_KINDS: readonly SelectionKind[] = ["person", "equipment", "vehicle", "facility", "animal"];
export const LAYER_IDS: readonly LayerId[] = ["labels", "people", "vehicles", "animals", "flora", "energy", "section"];

export type TwinStore = {
  clock: { minutes: number; mode: "live" | "manual"; speed: number };
  weather: { state: WeatherState; source: "pagasa" | "simulated" };
  quality: { tier: Tier; auto: boolean };
  location: LocationId;
  projectDate: string | "today";
  camera: { place: string | null; following: string | null };
  selection: { kind: SelectionKind | null; id: string | null };
  layers: Record<LayerId, boolean>;
  stage: Record<string, StageId>;
  ui: { dock: string | null; searchOpen: boolean; reducedMotion: boolean; muted: boolean };
};

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  labels: true,
  people: true,
  vehicles: true,
  animals: true,
  flora: true,
  energy: false,
  section: false,
};

export function defaultTwinState(): TwinStore {
  return {
    // (minutes is filled by sim/clock.ts on its first tick)
    clock: { minutes: 0, mode: "live", speed: 1 },
    weather: { state: "clear", source: "simulated" },
    quality: { tier: "medium", auto: true },
    location: "powerhouse",
    projectDate: "today",
    camera: { place: null, following: null },
    selection: { kind: null, id: null },
    layers: { ...DEFAULT_LAYERS },
    stage: {},
    ui: { dock: null, searchOpen: false, reducedMotion: false, muted: false },
  };
}

export const twinStore = createStore<TwinStore>()(subscribeWithSelector(defaultTwinState));

export function useTwin<T>(selector: (s: TwinStore) => T): T {
  return useStore(twinStore, selector);
}

const set = twinStore.setState;

/** Every write to the store goes through one of these, so the same value is never set twice. */
export const twinActions = {
  setPlace(place: string | null) {
    if (twinStore.getState().camera.place !== place) set((s) => ({ camera: { ...s.camera, place } }));
  },
  setFollowing(following: string | null) {
    if (twinStore.getState().camera.following !== following) set((s) => ({ camera: { ...s.camera, following } }));
  },
  setLocation(location: LocationId) {
    if (twinStore.getState().location !== location) set((s) => ({ location, camera: { ...s.camera, place: null, following: null } }));
  },
  select(kind: SelectionKind, id: string) {
    const cur = twinStore.getState().selection;
    if (cur.kind !== kind || cur.id !== id) set({ selection: { kind, id } });
  },
  clearSelection() {
    if (twinStore.getState().selection.kind !== null) set({ selection: { kind: null, id: null } });
  },
  setWeather(state: WeatherState, source: "pagasa" | "simulated") {
    const cur = twinStore.getState().weather;
    if (cur.state !== state || cur.source !== source) set({ weather: { state, source } });
  },
  setQuality(tier: Tier, auto: boolean) {
    const cur = twinStore.getState().quality;
    if (cur.tier !== tier || cur.auto !== auto) set({ quality: { tier, auto } });
  },
  setProjectDate(projectDate: string) {
    if (twinStore.getState().projectDate !== projectDate) set({ projectDate });
  },
  setLayer(layer: LayerId, on: boolean) {
    if (twinStore.getState().layers[layer] !== on) set((s) => ({ layers: { ...s.layers, [layer]: on } }));
  },
  setLayers(layers: Record<LayerId, boolean>) {
    const cur = twinStore.getState().layers;
    if (LAYER_IDS.some((l) => cur[l] !== layers[l])) set({ layers: { ...layers } });
  },
  setReducedMotion(reducedMotion: boolean) {
    if (twinStore.getState().ui.reducedMotion !== reducedMotion) set((s) => ({ ui: { ...s.ui, reducedMotion } }));
  },
};

/**
 * URL state (docs/twin-v2/CONTRACTS.md section 6), both ways.
 *
 * `readUrlIntoStore` applies the query string to the store; `startUrlSync` writes the store back
 * with `history.replaceState`, at most twice a second, leaving every key it does not own
 * (`v`, `debug`, `project`, anything else) exactly as it found it. A key at its default is left out.
 */
import { LOCATION_IDS, type LocationId } from "../data/types";
import { clock } from "../sim/clock";
import {
  DEFAULT_LAYERS,
  LAYER_IDS,
  SELECTION_KINDS,
  TIERS,
  WEATHER_STATES,
  twinActions,
  twinStore,
  type LayerId,
  type SelectionKind,
  type Tier,
  type TwinStore,
  type WeatherState,
} from "./store";

const WRITE_EVERY_MS = 500;

function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

function formatTime(minutes: number): string {
  const m = Math.floor(((minutes % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
}

/** `?debug=1`: turns on `window.__TWIN__`. */
export function isDebugUrl(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";
}

export function readUrlIntoStore(search: string = window.location.search) {
  const q = new URLSearchParams(search);

  const loc = q.get("loc");
  if (loc && (LOCATION_IDS as readonly string[]).includes(loc)) twinActions.setLocation(loc as LocationId);

  const date = q.get("date");
  if (date && (date === "today" || /^\d{4}-\d{2}$/.test(date))) twinActions.setProjectDate(date);

  // (?preset= is v1's key for the same views)
  const place = q.get("place") ?? q.get("preset");
  twinActions.setPlace(place || null);

  const t = q.get("t");
  const minutes = t && t !== "live" ? parseTime(t) : null;
  if (minutes !== null) clock.setManual(minutes, 0);
  else if (twinStore.getState().clock.mode !== "live") clock.setLive();

  const wx = q.get("wx");
  if (wx && (WEATHER_STATES as readonly string[]).includes(wx)) twinActions.setWeather(wx as WeatherState, "simulated");

  const sel = q.get("sel");
  const [kind, ...idParts] = (sel ?? "").split(":");
  const id = idParts.join(":");
  if (id && (SELECTION_KINDS as readonly string[]).includes(kind)) twinActions.select(kind as SelectionKind, id);
  else twinActions.clearSelection();

  const layers = q.get("layers");
  if (layers !== null) {
    const on = new Set(layers.split(","));
    const next = {} as Record<LayerId, boolean>;
    for (const l of LAYER_IDS) next[l] = on.has(l);
    twinActions.setLayers(next);
  }

  const tier = q.get("q");
  if (tier && (TIERS as readonly string[]).includes(tier)) twinActions.setQuality(tier as Tier, false);
}

function writeStoreIntoQuery(s: TwinStore, q: URLSearchParams) {
  const put = (key: string, value: string | null) => (value === null ? q.delete(key) : q.set(key, value));
  put("loc", s.location === "powerhouse" ? null : s.location);
  put("date", s.projectDate === "today" ? null : s.projectDate);
  put("place", s.camera.place);
  q.delete("preset");
  put("t", s.clock.mode === "live" ? null : formatTime(s.clock.minutes));
  put("wx", s.weather.source === "simulated" && s.weather.state !== "clear" ? s.weather.state : null);
  put("sel", s.selection.kind && s.selection.id ? `${s.selection.kind}:${s.selection.id}` : null);
  put("layers", LAYER_IDS.every((l) => s.layers[l] === DEFAULT_LAYERS[l]) ? null : LAYER_IDS.filter((l) => s.layers[l]).join(","));
  put("q", s.quality.auto ? null : s.quality.tier);
}

/** Start writing store changes to the address bar and following back/forward. Returns the stop function. */
export function startUrlSync(): () => void {
  let timer: number | null = null;
  let lastWriteMs = 0;

  const write = () => {
    timer = null;
    lastWriteMs = performance.now();
    const q = new URLSearchParams(window.location.search);
    writeStoreIntoQuery(twinStore.getState(), q);
    // (colons and commas are legal in a query; leaving them readable keeps ?sel= and ?layers= tidy)
    const search = q.toString().replace(/%3A/g, ":").replace(/%2C/g, ",");
    if (search === window.location.search.replace(/^\?/, "")) return;
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
    } catch {
      // Safari refuses more than 100 history writes in 30 seconds; the next change tries again.
    }
  };

  const schedule = () => {
    if (timer !== null) return;
    timer = window.setTimeout(write, Math.max(0, WRITE_EVERY_MS - (performance.now() - lastWriteMs)));
  };

  const unsubscribe = twinStore.subscribe(schedule);
  const onPop = () => readUrlIntoStore();
  window.addEventListener("popstate", onPop);
  schedule();
  return () => {
    unsubscribe();
    window.removeEventListener("popstate", onPop);
    if (timer !== null) window.clearTimeout(timer);
  };
}

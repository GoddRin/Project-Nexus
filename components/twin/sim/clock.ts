/**
 * The site clock: minutes after midnight, Asia/Manila. No React.
 *
 * `live` reads the real time in Manila. `manual` starts from a set time and advances by `speed`
 * times real time (0 holds it still). The loop reads the exact value from `clock.minutes()` every
 * frame; the store is told at most four times a second, and only when the value has moved.
 */
import { twinStore } from "../state/store";

const DAY = 1440;
const MANILA_UTC_OFFSET_MIN = 480; // UTC+8, no daylight saving
const EMIT_EVERY_MS = 250;

const wrap = (m: number) => ((m % DAY) + DAY) % DAY;

export function manilaMinutesNow(nowMs: number = Date.now()): number {
  return wrap(nowMs / 60000 + MANILA_UTC_OFFSET_MIN);
}

let exact = manilaMinutesNow();
let lastEmitMs = -Infinity;
let emittedTenths = -1;

function emit(force: boolean) {
  const nowMs = performance.now();
  const tenths = Math.round(exact * 10);
  if (!force && (tenths === emittedTenths || nowMs - lastEmitMs < EMIT_EVERY_MS)) return;
  lastEmitMs = nowMs;
  emittedTenths = tenths;
  const minutes = tenths / 10;
  if (twinStore.getState().clock.minutes !== minutes) twinStore.setState((s) => ({ clock: { ...s.clock, minutes } }));
}

export const clock = {
  /** Exact minutes after midnight (0 to 1440, fractional). */
  minutes(): number {
    return exact;
  },

  /** The moment the clock shows, as a Date on today's Manila calendar day (for sun and moon position). */
  date(): Date {
    const dayMs = 86400000;
    const offsetMs = MANILA_UTC_OFFSET_MIN * 60000;
    const manilaMidnightUtc = Math.floor((Date.now() + offsetMs) / dayMs) * dayMs - offsetMs;
    return new Date(manilaMidnightUtc + exact * 60000);
  },

  /** Advance by `dt` seconds of real time. Called once a frame from the loop's sim stage. */
  tick(dt: number) {
    const { mode, speed } = twinStore.getState().clock;
    exact = mode === "live" ? manilaMinutesNow() : wrap(exact + (dt * speed) / 60);
    emit(false);
  },

  setLive() {
    exact = manilaMinutesNow();
    twinStore.setState((s) => ({ clock: { ...s.clock, mode: "live", speed: 1 } }));
    emit(true);
  },

  /** Switch to manual time at `minutes`, advancing at `speed` times real time (0 = held). */
  setManual(minutes: number, speed: number = 0) {
    exact = wrap(minutes);
    twinStore.setState((s) => ({ clock: { ...s.clock, mode: "manual", speed } }));
    emit(true);
  },

  setSpeed(speed: number) {
    if (twinStore.getState().clock.speed !== speed) twinStore.setState((s) => ({ clock: { ...s.clock, speed } }));
  },
};

export function formatClock(minutes: number): string {
  const m = Math.floor(wrap(minutes));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

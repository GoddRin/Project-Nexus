/**
 * Interface sound design: three soft synthesized tones, OFF by default.
 * No audio files; a few milliseconds of Web Audio each. Enabled state lives in localStorage.
 */
const KEY = "scic.ui.sounds";

export type UiTone = "tap" | "open" | "success";

let ctx: AudioContext | null = null;
const listeners = new Set<(on: boolean) => void>();

export function uiSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setUiSoundsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  listeners.forEach((fn) => fn(on));
  if (on) playUiTone("success", true);
}

export function onUiSoundsChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const TONES: Record<UiTone, Array<{ f: number; at: number; dur: number; gain: number }>> = {
  // short, dry tick for selecting something
  tap: [{ f: 520, at: 0, dur: 0.06, gain: 0.035 }],
  // rising fifth for a panel opening
  open: [
    { f: 392, at: 0, dur: 0.09, gain: 0.03 },
    { f: 587.3, at: 0.06, dur: 0.14, gain: 0.03 },
  ],
  // soft major third for something completing
  success: [
    { f: 523.3, at: 0, dur: 0.1, gain: 0.03 },
    { f: 659.3, at: 0.08, dur: 0.2, gain: 0.03 },
  ],
};

export function playUiTone(tone: UiTone, force = false): void {
  if (typeof window === "undefined") return;
  if (!force && !uiSoundsEnabled()) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const n of TONES[tone]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, now + n.at);
      g.gain.exponentialRampToValueAtTime(n.gain, now + n.at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + n.at);
      osc.stop(now + n.at + n.dur + 0.02);
    }
  } catch {
    // audio not available: stay silent
  }
}

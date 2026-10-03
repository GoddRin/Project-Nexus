/**
 * Main-thread handle for the in-browser voice. Client only. Nothing is downloaded until
 * `loadLocalVoice()` is called.
 *
 * Two engines speak the same worker protocol:
 *  - Piper (piperVoice.worker.ts), the default: runs on the CPU, so the page keeps drawing while
 *    it works and the lips stay with the voice.
 *  - Kokoro (localVoice.worker.ts): the better-sounding voice, but it needs the GPU to keep up and
 *    the page's drawing stalls while it generates (measured: 0.4 to 1.8 s per sentence), which
 *    shows as the mouth freezing mid-sentence. Opt in to audition it:
 *    localStorage["atlas.navigator.localVoiceEngine"] = "kokoro".
 */
export type LocalVoiceStatus = "idle" | "loading" | "ready" | "failed";

/** Kokoro voice ids worth auditioning for a male field engineer */
export const LOCAL_VOICE_CHOICES = ["am_michael", "am_fenrir", "am_puck", "am_eric", "am_onyx", "bm_george", "bm_fable"] as const;
export const DEFAULT_LOCAL_VOICE = "am_michael";
const VOICE_KEY = "atlas.navigator.localVoice";
const DEVICE_KEY = "atlas.navigator.localVoiceDevice";
const ENGINE_KEY = "atlas.navigator.localVoiceEngine";
export type LocalVoiceEngine = "piper" | "kokoro";

function storedEngine(): LocalVoiceEngine {
  try {
    return window.localStorage.getItem(ENGINE_KEY) === "kokoro" ? "kokoro" : "piper";
  } catch {
    return "piper";
  }
}

interface LocalVoiceState {
  status: LocalVoiceStatus;
  /** model download progress 0..1 while loading */
  progress: number;
  /** last measured synthesis speed: milliseconds of work per character of text */
  msPerChar: number;
  /** where the model runs once loaded */
  device: "webgpu" | "wasm" | null;
  /** synthesis time / audio time measured at load: below 1 is faster than real time */
  realtimeFactor: number;
  voice: string;
  engine: LocalVoiceEngine;
}

function storedVoice(): string {
  try {
    return window.localStorage.getItem(VOICE_KEY) || DEFAULT_LOCAL_VOICE;
  } catch {
    return DEFAULT_LOCAL_VOICE;
  }
}

const state: LocalVoiceState = { status: "idle", progress: 0, msPerChar: 0, device: null, realtimeFactor: 0, voice: DEFAULT_LOCAL_VOICE, engine: "piper" };

/** Slower than this and a sentence cannot be ready before the previous one finishes: speech would stall. */
const LIVE_SPEED_LIMIT = 0.8;
const listeners = new Set<(s: LocalVoiceState) => void>();
const pending = new Map<number, (blob: Blob | null) => void>();
let worker: Worker | null = null;
let nextId = 1;
let generation = 0;

const emit = () => listeners.forEach((fn) => fn({ ...state }));

function ensureWorker(): Worker | null {
  if (worker || typeof window === "undefined" || typeof Worker === "undefined") return worker;
  try {
    state.engine = storedEngine();
    // (two literal `new Worker(new URL(...))` calls: the bundler only follows literal paths)
    worker =
      state.engine === "kokoro"
        ? new Worker(new URL("./localVoice.worker.ts", import.meta.url), { type: "module" })
        : new Worker(new URL("./piperVoice.worker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    console.warn("[Atlas Voice] In-browser voice unavailable:", err);
    state.status = "failed";
    emit();
    return null;
  }
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data as
      | { type: "progress"; loaded: number; total: number }
      | { type: "ready"; device: "webgpu" | "wasm"; realtimeFactor: number }
      | { type: "failed"; error: string }
      | { type: "audio"; id: number; wav: ArrayBuffer | null; ms?: number; error?: string };
    if (m.type === "progress") {
      state.progress = m.total ? m.loaded / m.total : 0;
      emit();
    } else if (m.type === "ready") {
      state.status = "ready";
      state.device = m.device;
      state.realtimeFactor = m.realtimeFactor;
      state.progress = 1;
      if (m.realtimeFactor > LIVE_SPEED_LIMIT) {
        console.warn(
          `[Atlas Voice] In-browser voice runs at ${m.realtimeFactor.toFixed(1)}x real time on ${m.device}: too slow for live speech, the browser voice is used instead.`
        );
      }
      emit();
    } else if (m.type === "failed") {
      console.warn("[Atlas Voice] In-browser voice failed to load:", m.error);
      state.status = "failed";
      emit();
    } else if (m.type === "audio") {
      if (m.error) console.warn("[Atlas Voice] In-browser synthesis error:", m.error);
      const resolve = pending.get(m.id);
      pending.delete(m.id);
      resolve?.(m.wav ? new Blob([m.wav], { type: "audio/wav" }) : null);
    }
  };
  worker.onerror = (err) => {
    console.warn("[Atlas Voice] In-browser voice worker error:", err.message);
    state.status = "failed";
    pending.forEach((resolve) => resolve(null));
    pending.clear();
    emit();
  };
  return worker;
}

export function getLocalVoiceState(): LocalVoiceState {
  return { ...state };
}

export function onLocalVoiceState(fn: (s: LocalVoiceState) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Start downloading / loading the voice in the background (safe to call repeatedly). */
export function loadLocalVoice(): void {
  if (state.status !== "idle") return;
  const w = ensureWorker();
  if (!w) return;
  state.status = "loading";
  state.voice = storedVoice();
  emit();
  let device: "auto" | "webgpu" | "wasm" = "auto";
  try {
    const d = window.localStorage.getItem(DEVICE_KEY);
    if (d === "webgpu" || d === "wasm") device = d;
  } catch {}
  w.postMessage({ type: "load", device, voice: state.voice });
}

/** Loaded AND fast enough to speak live on this machine. */
export const isLocalVoiceReady = () => state.status === "ready" && state.realtimeFactor > 0 && state.realtimeFactor <= LIVE_SPEED_LIMIT;

/** Switch the in-browser voice (remembered for next time). */
export function setLocalVoice(voice: string): void {
  state.voice = voice;
  try {
    window.localStorage.setItem(VOICE_KEY, voice);
  } catch {}
  worker?.postMessage({ type: "voice", voice });
  emit();
}

/** Speak one chunk of text. Resolves to WAV audio, or null when the voice is not ready or was cancelled. */
export function localSynthesize(text: string): Promise<Blob | null> {
  // (auditioning through the dev hook works even when the voice is too slow to be used live)
  const w = state.status === "ready" ? ensureWorker() : null;
  if (!w || !text.trim()) return Promise.resolve(null);
  const id = nextId++;
  const started = performance.now();
  return new Promise<Blob | null>((resolve) => {
    pending.set(id, (blob) => {
      if (blob) state.msPerChar = (performance.now() - started) / Math.max(1, text.length);
      resolve(blob);
    });
    w.postMessage({ type: "speak", id, gen: generation, text });
  });
}

/** Drop everything still queued (a newer line has taken over). */
export function localVoiceCancel(): void {
  generation += 1;
  worker?.postMessage({ type: "cancel", gen: generation });
}

export interface SpeechChunk {
  text: string;
  /** index of the chunk's first character in the full spoken text */
  start: number;
}

/**
 * Cut a line into pieces that can be synthesized and played one after another. The first piece is
 * kept short so the voice starts quickly; later pieces are whole sentences (long ones are split
 * at a comma) and are synthesized while the earlier ones play.
 */
/** Measured on the GPU build: about half a second of work per second of speech. A first piece of
 *  this length (a clause, ~2.5 s of speech) is ready in a little over a second. */
const FIRST_PIECE_CHARS = 40;

export function splitSpeechChunks(text: string): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  // a sentence ends at punctuation FOLLOWED BY a space: "11.3 megawatts" must stay in one piece
  const boundary = /[.!?;:]+["”’)]*\s+/g;
  let m: RegExpExecArray | null;
  const pushPiece = (piece: string, start: number, limit: number) => {
    let rest = piece;
    let at = start;
    while (rest.trim().length > limit) {
      const cut = rest.slice(0, limit + 20).search(/,\s|\s[—–-]\s/);
      const idx = cut >= 14 ? cut + 1 : rest.lastIndexOf(" ", limit);
      if (idx <= 0) break;
      chunks.push({ text: rest.slice(0, idx), start: at });
      at += idx;
      rest = rest.slice(idx);
    }
    if (rest.trim()) chunks.push({ text: rest, start: at });
  };
  let from = 0;
  while ((m = boundary.exec(text))) {
    const end = m.index + m[0].length;
    pushPiece(text.slice(from, end), from, chunks.length === 0 ? FIRST_PIECE_CHARS : 150);
    from = end;
  }
  if (from < text.length) pushPiece(text.slice(from), from, chunks.length === 0 ? FIRST_PIECE_CHARS : 150);
  if (chunks.length === 0 && text.trim()) chunks.push({ text, start: 0 });
  // merge crumbs ("Sta." etc.) into their neighbour
  const merged: SpeechChunk[] = [];
  for (const c of chunks) {
    const last = merged[merged.length - 1];
    if (last && (c.text.trim().length < 12 || last.text.trim().length < 12)) last.text += c.text;
    else merged.push({ ...c });
  }
  return merged;
}

// Dev-only inspection hook: window.__atlasVoice
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __atlasVoice?: unknown }).__atlasVoice = {
    state: getLocalVoiceState,
    load: loadLocalVoice,
    synth: localSynthesize,
    use: setLocalVoice,
    voices: LOCAL_VOICE_CHOICES,
    chunks: splitSpeechChunks,
  };
}

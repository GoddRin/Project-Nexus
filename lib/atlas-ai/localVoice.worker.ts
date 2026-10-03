/// <reference lib="webworker" />
/**
 * In-browser voice (Kokoro-82M) running entirely on the user's machine, off the main thread.
 *
 * Why it exists: the browser's built-in speech gives the page no audio to analyse, so lips and
 * captions can only guess at it. This worker returns real audio, which goes through the same
 * audio-aligned lip-sync as the neural cloud voice, with no quota and no server round trip.
 *
 * The model is downloaded once from the Hugging Face hub and kept in the browser cache
 * (about 90 MB for the CPU build, about 310 MB for the faster GPU build). The session stays
 * loaded, so each sentence only costs its own synthesis time.
 *
 * Model: Kokoro-82M (Apache-2.0) via kokoro-js (Apache-2.0). Its phonemizer includes espeak-ng (GPL-3.0).
 */
// The self-contained browser build of kokoro-js is served as a static file (public/vendor) and
// loaded at run time: it locates its own WebAssembly files and must not go through the bundler.
const KOKORO_BUNDLE_URL = "/vendor/kokoro.web.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type Device = "webgpu" | "wasm";
type InMsg =
  | { type: "load"; device?: Device | "auto"; voice?: string }
  | { type: "voice"; voice: string }
  | { type: "speak"; id: number; gen: number; text: string }
  | { type: "cancel"; gen: number };

interface Kokoro {
  generate: (text: string, opts: { voice: string; speed?: number }) => Promise<{ audio: Float32Array; sampling_rate: number }>;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let tts: Kokoro | null = null;
let loading: Promise<Device> | null = null;
/** synthesis time / audio time, measured at load (below 1 = faster than real time) */
let realtimeFactor = 0;
let voice = "am_michael";
let minGen = 0;

async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    return !!gpu && !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function load(want: Device | "auto" = "auto"): Promise<Device> {
  loading ??= (async () => {
    // Measured: on the CPU this model speaks about three times SLOWER than real time, on a GPU it
    // keeps up. So the GPU build (a one-off download of about 310 MB) is used wherever WebGPU
    // exists; the CPU build (about 90 MB) is the fallback and is reported as too slow for live use.
    const order: Device[] = want === "wasm" ? ["wasm"] : (await hasWebGpu()) ? ["webgpu", "wasm"] : ["wasm"];
    let lastError: unknown = null;
    for (const device of order) {
      try {
        const { KokoroTTS } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ KOKORO_BUNDLE_URL);
        tts = (await KokoroTTS.from_pretrained(MODEL_ID, {
          // full precision on the GPU (quantised weights sound wrong there), 8-bit on the CPU
          dtype: device === "webgpu" ? "fp32" : "q8",
          device,
          progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
            if (p.status === "progress" && p.file?.endsWith(".onnx") && p.total) {
              ctx.postMessage({ type: "progress", loaded: p.loaded ?? 0, total: p.total });
            }
          },
        })) as Kokoro;
        // warm-up (the first run is always the slow one), then time a typical short sentence
        await tts.generate("Ready.", { voice });
        const started = performance.now();
        const probe = await tts.generate("Hard hat on, clipboard ready.", { voice });
        realtimeFactor = (performance.now() - started) / 1000 / Math.max(0.1, probe.audio.length / probe.sampling_rate);
        return device;
      } catch (err) {
        lastError = err;
        tts = null;
      }
    }
    throw lastError ?? new Error("no usable device");
  })();
  return loading;
}

function toWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0, o = 44; i < pcm.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(o, s < 0 ? s * 32768 : s * 32767, true);
  }
  return view.buffer;
}

// One job at a time, in order; jobs from a superseded line are skipped
let chain: Promise<void> = Promise.resolve();
ctx.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    minGen = Math.max(minGen, msg.gen);
    return;
  }
  if (msg.type === "voice") {
    voice = msg.voice;
    return;
  }
  if (msg.type === "load") {
    if (msg.voice) voice = msg.voice;
    load(msg.device).then(
      (device) => ctx.postMessage({ type: "ready", device, realtimeFactor }),
      (err) => {
        loading = null;
        ctx.postMessage({ type: "failed", error: String(err) });
      }
    );
    return;
  }
  chain = chain.then(async () => {
    if (msg.gen < minGen || !tts) {
      ctx.postMessage({ type: "audio", id: msg.id, wav: null });
      return;
    }
    try {
      const started = performance.now();
      const out = await tts.generate(msg.text, { voice, speed: 1 });
      const wav = toWav(out.audio, out.sampling_rate);
      ctx.postMessage(
        { type: "audio", id: msg.id, wav, ms: Math.round(performance.now() - started), seconds: out.audio.length / out.sampling_rate },
        [wav]
      );
    } catch (err) {
      ctx.postMessage({ type: "audio", id: msg.id, wav: null, error: String(err) });
    }
  });
};

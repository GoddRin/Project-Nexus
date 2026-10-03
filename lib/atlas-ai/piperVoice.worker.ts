/// <reference lib="webworker" />
/**
 * In-browser voice (Piper / VITS) running entirely on the user's machine, off the main thread.
 *
 * Why it exists: the browser's built-in speech gives the page no audio to analyse, so lips and
 * captions can only guess at it. This worker returns real audio, which goes through the same
 * audio-aligned lip-sync as the neural cloud voice, with no quota and no server round trip.
 *
 * The model (about 63 MB) and the phonemizer are downloaded once and kept in the Cache API.
 * The session stays loaded, so each sentence only costs its own synthesis time.
 *
 * It runs on the CPU, which is the point: the larger Kokoro voice (localVoice.worker.ts) needs the
 * GPU to keep up, and while it works there the page's own drawing stalls (measured: a freeze of
 * 0.4 to 1.8 s per sentence), so the mouth stops while the voice carries on.
 * Same message protocol as localVoice.worker.ts.
 *
 * Voice: en_US-joe-medium (dataset licensed CC0). Engine: Piper (MIT) on onnxruntime-web (MIT).
 * The phonemizer build includes espeak-ng (GPL-3.0) and is fetched from its public CDN at run time.
 */
import * as ort from "onnxruntime-web";
// The phonemizer glue ships inside @diffusionstudio/vits-web but is not exported by name;
// the package is pinned to 1.0.3 so this path is stable.
// @ts-expect-error untyped internal chunk
import { createPiperPhonemize } from "../../node_modules/@diffusionstudio/vits-web/dist/piper-DeOu3H9E.js";

const MODEL_URL =
  "https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/joe/medium/en_US-joe-medium.onnx";
const PHONEMIZE_BASE = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
const ORT_WASM_BASE = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/";
const CACHE_NAME = "atlas-piper-voice-v1";

type InMsg =
  | { type: "load" }
  | { type: "voice"; voice: string }
  | { type: "speak"; id: number; gen: number; text: string }
  | { type: "cancel"; gen: number };

interface VoiceConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  speaker_id_map?: Record<string, number>;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let session: ort.InferenceSession | null = null;
let config: VoiceConfig | null = null;
let phonWasm: ArrayBuffer | null = null;
let phonData: ArrayBuffer | null = null;
let loading: Promise<void> | null = null;
let minGen = 0;
/** synthesis time / audio time, measured at load (below 1 = faster than real time) */
let realtimeFactor = 0;

async function cachedFetch(url: string, onProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  } catch {
    cache = null; // storage unavailable (private window): fetch every time
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  const total = Number(res.headers.get("Content-Length") || 0);
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  try {
    await cache?.put(url, new Response(out.buffer.slice(0), { headers: { "Content-Type": "application/octet-stream" } }));
  } catch {
    // quota exceeded: still usable for this session
  }
  return out.buffer;
}

function load(): Promise<void> {
  loading ??= (async () => {
    ort.env.wasm.wasmPaths = ORT_WASM_BASE;
    // threads need a cross-origin-isolated page; without it a single thread is the safe choice
    ort.env.wasm.numThreads = ctx.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
    const [cfg, wasm, data, model] = await Promise.all([
      cachedFetch(`${MODEL_URL}.json`),
      cachedFetch(`${PHONEMIZE_BASE}.wasm`),
      cachedFetch(`${PHONEMIZE_BASE}.data`),
      cachedFetch(MODEL_URL, (loaded, total) => ctx.postMessage({ type: "progress", loaded, total })),
    ]);
    config = JSON.parse(new TextDecoder().decode(cfg)) as VoiceConfig;
    phonWasm = wasm;
    phonData = data;
    session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  })();
  return loading;
}

function phonemize(text: string): Promise<number[]> {
  return new Promise<number[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("phonemizer timed out")), 8000);
    createPiperPhonemize({
      print: (line: string) => {
        try {
          clearTimeout(timer);
          resolve(JSON.parse(line).phoneme_ids as number[]);
        } catch (e) {
          reject(e);
        }
      },
      printErr: (line: string) => console.warn("[piper phonemize]", line),
      wasmBinary: phonWasm!.slice(0),
      getPreloadedPackage: () => phonData!.slice(0),
      locateFile: (f: string) => (f.endsWith(".wasm") ? `${PHONEMIZE_BASE}.wasm` : f.endsWith(".data") ? `${PHONEMIZE_BASE}.data` : f),
    })
      .then((mod: { callMain: (args: string[]) => void }) => {
        mod.callMain(["-l", config!.espeak.voice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
      })
      .catch(reject);
  });
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

async function speak(text: string): Promise<ArrayBuffer> {
  await load();
  const ids = await phonemize(text);
  const cfg = config!;
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map((n) => BigInt(n))), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)])),
    scales: new ort.Tensor("float32", Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale, cfg.inference.noise_w])),
  };
  if (cfg.speaker_id_map && Object.keys(cfg.speaker_id_map).length) {
    feeds.sid = new ort.Tensor("int64", BigInt64Array.from([BigInt(0)]));
  }
  const result = await session!.run(feeds);
  return toWav(result.output.data as Float32Array, cfg.audio.sample_rate);
}

// One job at a time, in order; jobs from a superseded line are skipped
let chain: Promise<void> = Promise.resolve();
ctx.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    minGen = Math.max(minGen, msg.gen);
    return;
  }
  if (msg.type === "voice") return; // one voice
  if (msg.type === "load") {
    load()
      .then(async () => {
        // warm-up (the first run is always the slow one), then time a typical short sentence
        await speak("Ready.");
        const started = performance.now();
        const wav = await speak("Hard hat on, clipboard ready.");
        const seconds = (wav.byteLength - 44) / 2 / config!.audio.sample_rate;
        realtimeFactor = (performance.now() - started) / 1000 / Math.max(0.1, seconds);
      })
      .then(
      () => ctx.postMessage({ type: "ready", device: "wasm", realtimeFactor }),
      (err) => {
        loading = null;
        ctx.postMessage({ type: "failed", error: String(err) });
      }
    );
    return;
  }
  chain = chain.then(async () => {
    if (msg.gen < minGen) {
      ctx.postMessage({ type: "audio", id: msg.id, wav: null });
      return;
    }
    try {
      const started = performance.now();
      const wav = await speak(msg.text);
      ctx.postMessage({ type: "audio", id: msg.id, wav, ms: Math.round(performance.now() - started) }, [wav]);
    } catch (err) {
      ctx.postMessage({ type: "audio", id: msg.id, wav: null, error: String(err) });
    }
  });
};

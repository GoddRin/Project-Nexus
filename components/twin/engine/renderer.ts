/**
 * Renderer set-up: three.js WebGPURenderer with its automatic WebGL2 fallback (decided in P01a).
 *
 * sRGB output, AgX tone mapping, pixel ratio from the quality tier (engine/tiers.ts). The renderer is sized before
 * its first frame (a frame drawn at the canvas's default 300 x 150 left a black page once in the
 * P01a spike). A lost device or context is reported through `onLost`; the caller rebuilds by
 * mounting a fresh canvas.
 */
import * as THREE from "three/webgpu";
import type { Tier } from "../state/store";
import { pixelRatioNow } from "./tiers";

export type GraphicsSupport = "webgpu" | "webgl2" | "none";

/** What this browser offers. "webgpu" still falls back to WebGL2 if no adapter is granted. */
export function graphicsSupport(): GraphicsSupport {
  if (typeof navigator !== "undefined" && "gpu" in navigator) return "webgpu";
  try {
    if (document.createElement("canvas").getContext("webgl2")) return "webgl2";
  } catch {
    // fall through
  }
  return "none";
}

export type RendererBackend = "webgpu" | "webgl2";

export function backendOf(renderer: THREE.WebGPURenderer): RendererBackend {
  return (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? "webgpu" : "webgl2";
}

/** R3F resets these whenever it reconfigures the canvas, so the render stage re-applies them. */
export function applyOutput(renderer: THREE.WebGPURenderer) {
  if (renderer.outputColorSpace !== THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (renderer.toneMapping !== THREE.AgXToneMapping) renderer.toneMapping = THREE.AgXToneMapping;
}

export type RendererOptions = {
  tier: Tier;
  /** `?force=webgl`: run the WebGL2 fallback on a browser that has WebGPU (for testing). */
  forceWebGL?: boolean;
  /** The device or context is gone; nothing more can be drawn with this renderer. */
  onLost: (message: string) => void;
  /** An uncaptured GPU error (WebGPU validation or out-of-memory). */
  onError: (message: string) => void;
};

/** How long a freshly linked program is left alone before its result is asked for, milliseconds. */
const LINK_WAIT_MS = 300;

/**
 * WebGL2 fallback on a browser without KHR_parallel_shader_compile (Firefox): stop a shader compile
 * from freezing the page.
 *
 * There, `compileShader` and `linkProgram` return at once and the work happens in the browser's
 * graphics process; what blocks is asking for the result, which waits for it (measured: about 95 ms
 * per program on the Iris Xe laptop). three.js asks straight away unless the browser has the
 * parallel-compile extension, in which case it polls a "finished yet?" flag once a frame.
 *
 * This gives three.js a stand-in for that extension whose flag turns true once the program has
 * had LINK_WAIT_MS to compile in the background, so the real question is asked when the answer is
 * (almost always) ready. It applies only to pipelines compiled ahead of their first draw
 * (`renderer.compileAsync`, as engine/streaming.ts does); a draw that was never precompiled still
 * compiles on the spot. If a compile takes longer than the wait, the page blocks for the rest, as before.
 */
function deferLinkStatus(renderer: THREE.WebGPURenderer) {
  const backend = renderer.backend as unknown as { isWebGLBackend?: boolean; gl?: WebGL2RenderingContext; parallel?: { COMPLETION_STATUS_KHR: number } | null };
  const gl = backend.gl;
  if (!backend.isWebGLBackend || !gl || backend.parallel) return;

  /** A parameter name no real one uses: answered here, never passed to the browser. */
  const READY = 0x7fff_0001;
  const linkedAt = new WeakMap<WebGLProgram, number>();
  const linkProgram = gl.linkProgram.bind(gl);
  const getProgramParameter = gl.getProgramParameter.bind(gl);
  gl.linkProgram = (program) => {
    linkedAt.set(program, performance.now());
    linkProgram(program);
  };
  gl.getProgramParameter = (program, name) => {
    if (name !== READY) return getProgramParameter(program, name);
    return performance.now() - (linkedAt.get(program) ?? 0) >= LINK_WAIT_MS;
  };
  backend.parallel = { COMPLETION_STATUS_KHR: READY };
}

const started = new WeakMap<HTMLCanvasElement, Promise<THREE.WebGPURenderer>>();

/**
 * The renderer for a canvas, created on the first call. React Three Fiber calls its `gl` factory
 * again if the canvas re-renders while the first call is still starting; a second renderer on the
 * same canvas draws the sky and nothing else, so every call for a canvas gets the same one.
 */
export function createRenderer(canvas: HTMLCanvasElement, opts: RendererOptions): Promise<THREE.WebGPURenderer> {
  let renderer = started.get(canvas);
  if (!renderer) {
    renderer = startRenderer(canvas, opts);
    started.set(canvas, renderer);
  }
  return renderer;
}

async function startRenderer(canvas: HTMLCanvasElement, opts: RendererOptions): Promise<THREE.WebGPURenderer> {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    stencil: false,
    forceWebGL: opts.forceWebGL,
  });

  const box = (canvas.parentElement ?? canvas).getBoundingClientRect();
  renderer.setPixelRatio(pixelRatioNow(opts.tier));
  renderer.setSize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)), false);

  renderer.onDeviceLost = (info) => {
    console.warn(`[twin] ${info.api} device lost: ${info.message}`);
    opts.onLost(`${info.api}: ${info.message}`);
  };
  (renderer as unknown as { onError: (info: { api?: string; type?: string; message?: string }) => void }).onError = (info) => {
    const message = `${info.api ?? "GPU"} ${info.type ?? "error"}: ${info.message ?? ""}`;
    console.error(`[twin] ${message}`);
    opts.onError(message);
  };

  // once disposed it must not be handed out again
  const dispose = renderer.dispose.bind(renderer);
  renderer.dispose = () => {
    started.delete(canvas);
    dispose();
  };

  await renderer.init();
  deferLinkStatus(renderer);
  applyOutput(renderer);
  renderer.toneMappingExposure = 1;
  return renderer;
}

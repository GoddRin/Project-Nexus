/**
 * Quality tiers: what each of Low, Medium, High and Ultra turns on, the start-up probe that picks
 * one, and dynamic resolution, which lowers the pixel ratio when frames run long.
 *
 * Starting values (docs/twin-v2/MASTER-BRIEF.md section 5). P02c measures real content and
 * rewrites them. Only pixel ratio, draw distance, LOD bias and texture size have a consumer yet;
 * the shadow, occlusion, crowd, vegetation and light fields are read by the phases that build those.
 */
import * as THREE from "three/webgpu";
import { Fn, Loop, float, fract, length, sin, uv, vec3, vec4 } from "three/tsl";
import { twinStore, type Tier } from "../state/store";

export type TierSettings = {
  /** Upper limit on device pixel ratio. */
  pixelRatio: number;
  /** Shadow map side in pixels and number of sun cascades (P03b). */
  shadowMapSize: number;
  shadowCascades: number;
  /** Ambient occlusion: off, half resolution or full (P12a; full halves the frame rate on Iris Xe). */
  ambientOcclusion: "off" | "half" | "full";
  /** Metres beyond which placed assets are not drawn. */
  drawDistance: number;
  /** Multiplies every LOD switch distance: below 1 swaps to lighter meshes sooner. */
  lodBias: number;
  /** Most animated people in view (P07d), share of scattered vegetation kept (P04b). */
  crowd: number;
  vegetationDensity: number;
  /** Textures larger than this are scaled down when loaded. */
  textureSize: number;
  /** Real-time lights beside the sun (P03b). */
  lights: number;
  /** 95th-percentile frame time, in milliseconds, that dynamic resolution holds the tier to. */
  frameBudgetMs: number;
};

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  low: { pixelRatio: 1, shadowMapSize: 1024, shadowCascades: 1, ambientOcclusion: "off", drawDistance: 450, lodBias: 0.7, crowd: 16, vegetationDensity: 0.35, textureSize: 512, lights: 4, frameBudgetMs: 50 },
  medium: { pixelRatio: 1.25, shadowMapSize: 2048, shadowCascades: 2, ambientOcclusion: "half", drawDistance: 900, lodBias: 1, crowd: 40, vegetationDensity: 0.6, textureSize: 1024, lights: 8, frameBudgetMs: 33 },
  high: { pixelRatio: 1.5, shadowMapSize: 2048, shadowCascades: 3, ambientOcclusion: "half", drawDistance: 1600, lodBias: 1.4, crowd: 80, vegetationDensity: 0.85, textureSize: 2048, lights: 8, frameBudgetMs: 33 },
  ultra: { pixelRatio: 2, shadowMapSize: 4096, shadowCascades: 3, ambientOcclusion: "full", drawDistance: 3000, lodBias: 2, crowd: 120, vegetationDensity: 1, textureSize: 4096, lights: 8, frameBudgetMs: 25 },
};

/** Settings of the tier in the store. */
export function tierSettings(): TierSettings {
  return TIER_SETTINGS[twinStore.getState().quality.tier];
}

// ---- dynamic resolution -----------------------------------------------------------------------------

export const RESOLUTION_MIN = 0.6;
const RESOLUTION_STEP = 0.1;
const WINDOW_MS = 2000;
/** Stepping up draws about a quarter more pixels, so it needs this much room under the budget. */
const HEADROOM = 0.7;

let scale = 1;
let windowStart = 0;
let samples: number[] = [];
let calmWindows = 0;
/** Calm windows needed before stepping up; doubled each time a step up has to be undone. */
let patience = 2;
let lastStepUpMs = -Infinity;
let enabled = true;

/** The device pixel ratio to draw at now: the tier's cap, scaled down while frames run long. */
export function pixelRatioNow(tier: Tier = twinStore.getState().quality.tier): number {
  const full = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, TIER_SETTINGS[tier].pixelRatio);
  return Math.round(full * scale * 100) / 100;
}

export const resolution = {
  /** Share of the tier's pixel ratio in use, 0.6 to 1. */
  scale: () => scale,
  /** Start again from full resolution (a new tier, a new renderer). */
  reset() {
    scale = 1;
    samples = [];
    windowStart = 0;
    calmWindows = 0;
    patience = 2;
  },
  /** The bench measures at a fixed resolution: `?dynres=0`. */
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) resolution.reset();
  },
  /**
   * Feed one frame's duration. Every 2 seconds the 95th-percentile frame time of that window is
   * compared with the tier's budget: over it, resolution drops a step; well under it for long
   * enough, resolution rises a step. Returns true when the scale changed.
   */
  frame(frameMs: number, nowMs: number): boolean {
    if (!enabled || frameMs > 250) return false; // (a hidden or stalled tab is not a slow frame)
    if (windowStart === 0) windowStart = nowMs;
    samples.push(frameMs);
    if (nowMs - windowStart < WINDOW_MS) return false;

    const sorted = samples.sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const enough = sorted.length >= 20;
    samples = [];
    windowStart = nowMs;
    if (!enough) return false;

    const budget = tierSettings().frameBudgetMs;
    if (p95 > budget) {
      calmWindows = 0;
      if (scale <= RESOLUTION_MIN) return false;
      // a step up that did not hold: wait longer before trying again
      if (nowMs - lastStepUpMs < 3 * WINDOW_MS) patience = Math.min(patience * 2, 32);
      scale = Math.max(RESOLUTION_MIN, Math.round((scale - RESOLUTION_STEP) * 10) / 10);
      return true;
    }
    if (p95 < budget * HEADROOM && scale < 1) {
      if (++calmWindows < patience) return false;
      calmWindows = 0;
      lastStepUpMs = nowMs;
      scale = Math.min(1, Math.round((scale + RESOLUTION_STEP) * 10) / 10);
      return true;
    }
    calmWindows = 0;
    return false;
  },
};

// ---- start-up probe ---------------------------------------------------------------------------------

/**
 * What the office laptop this is built for (Intel Iris Xe, Chrome 154) scores on the probe, in
 * million shaded pixels per millisecond of frame time (see `createProbe`): 3.2 to 3.9 on WebGPU,
 * with an occasional 1.8 when the pass count had not finished doubling, and 0.9 to 1.2 on the
 * WebGL2 fallback, which runs the same shader more slowly. That laptop must land on Medium.
 *
 * The tier lines are multiples of the reference. Only the reference itself is measured: no faster
 * or slower machine has been tried, so the High, Ultra and Low lines are estimates for P02c to revisit.
 */
export const PROBE_REFERENCE: Record<string, number> = { webgpu: 3.5, webgl2: 1 };
const PROBE_LINES: [Tier, number][] = [
  ["ultra", 8],
  ["high", 3],
  ["medium", 0.3],
];
const PROBE_MS = 2000;
const PROBE_SIZE = [1280, 720] as const;
const PROBE_KEY = "twin.tier.v2";
const PROBE_KEEP_MS = 30 * 24 * 3600 * 1000;

export function tierForScore(score: number, backend: string, phone: boolean): Tier {
  const reference = PROBE_REFERENCE[backend] ?? PROBE_REFERENCE.webgl2;
  let tier: Tier = "low";
  for (const [name, line] of PROBE_LINES) {
    if (score >= line * reference) {
      tier = name;
      break;
    }
  }
  // a phone screen is small and its battery matters: never above Medium on its own
  if (phone && (tier === "high" || tier === "ultra")) tier = "medium";
  return tier;
}

function isPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 600;
}

type Remembered = { tier: Tier; score: number; backend: string; at: number };

/** The tier the probe chose on an earlier visit with the same backend, if recent. */
export function rememberedTier(backend: string): Remembered | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROBE_KEY) ?? "null") as Remembered | null;
    if (saved && saved.backend === backend && Date.now() - saved.at < PROBE_KEEP_MS && saved.tier in TIER_SETTINGS) return saved;
  } catch {
    // (storage can be blocked: the probe simply runs again)
  }
  return null;
}

let probing = false;
/** True while the start-up probe is measuring; streaming holds its work until it is done. */
export function isProbing(): boolean {
  return probing;
}

export type Probe = {
  /** Call once a frame, before the scene is drawn. Returns the result when the probe has finished. */
  frame: (frameMs: number) => { tier: Tier; score: number } | null;
  dispose: () => void;
};

/**
 * The 2-second start-up probe. Each frame it draws a fixed, moderately expensive full-screen
 * shader into an off-screen 1280 x 720 target several times; the number of passes doubles while
 * frames stay quick, so a fast card is not hidden behind the display's refresh rate. The score is
 * the most pixels shaded per millisecond of frame time that the card sustained. Zone streaming
 * waits for it (`isProbing`), so loading work does not show up as a slow card.
 */
export function createProbe(renderer: THREE.WebGPURenderer, backend: string): Probe {
  const target = new THREE.RenderTarget(PROBE_SIZE[0], PROBE_SIZE[1], { depthBuffer: false });
  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = Fn(() => {
    const p = vec3(uv(), 0.5).toVar();
    const acc = float(0).toVar();
    Loop(40, () => {
      p.assign(sin(p.mul(2.3).add(acc)).mul(1.7).add(p.yzx));
      acc.addAssign(length(p).mul(0.01));
    });
    return vec4(vec3(fract(acc)), 1);
  })();
  const quad = new THREE.QuadMesh(material);

  const megapixels = (PROBE_SIZE[0] * PROBE_SIZE[1]) / 1e6;
  let passes = 1;
  let elapsed = 0;
  let stageMs = 0;
  let stageFrames = 0;
  const stages: number[] = [];
  let warm = 0;
  let done = false;
  probing = true;

  const closeStage = () => {
    if (stageFrames >= 3) stages.push((passes * megapixels) / (stageMs / stageFrames));
  };

  return {
    frame(frameMs: number) {
      if (done) return null;
      const before = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      for (let i = 0; i < passes; i++) quad.render(renderer);
      renderer.setRenderTarget(before);
      if (++warm <= 3) return null; // (the first frames compile the shader)

      elapsed += frameMs;
      stageMs += frameMs;
      stageFrames++;
      // a stage lasts a quarter of a second; if its frames were quick, the next one doubles the load
      if (stageMs >= 250) {
        closeStage();
        const average = stageMs / stageFrames;
        stageMs = 0;
        stageFrames = 0;
        if (average < 24 && passes < 256) passes *= 2;
      }
      if (elapsed < PROBE_MS) return null;

      closeStage();
      done = true;
      probing = false;
      // the middle of the three best stages: one lucky quarter-second does not decide the tier
      const top = stages.sort((a, b) => b - a).slice(0, 3);
      const best = top[Math.floor(top.length / 2)] ?? 0;
      const tier = tierForScore(best, backend, isPhone());
      try {
        window.localStorage.setItem(PROBE_KEY, JSON.stringify({ tier, score: best, backend, at: Date.now() } satisfies Remembered));
      } catch {
        // (not remembered: the probe runs again next visit)
      }
      return { tier, score: best };
    },
    dispose() {
      probing = false;
      target.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}

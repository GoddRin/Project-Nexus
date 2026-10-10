/**
 * The one frame loop. Feature modules register a callback on a stage; nothing else in Twin v2
 * calls `useFrame`. Stages run in a fixed order every frame: sim, animation, camera, render.
 * Within a stage, callbacks run in the order they were added.
 */

export type LoopStage = "sim" | "animation" | "camera" | "render";
export type LoopCallback = (dt: number, elapsed: number) => void;

const ORDER: readonly LoopStage[] = ["sim", "animation", "camera", "render"];
const MAX_DT = 0.1; // a stalled tab must not turn into one giant step
const SAMPLES = 240;

const stages: Record<LoopStage, LoopCallback[]> = { sim: [], animation: [], camera: [], render: [] };
const frameMs = new Float32Array(SAMPLES);
const sorted = new Float32Array(SAMPLES);
let sampleCount = 0;
let sampleAt = 0;
let lastTickMs = 0;
let elapsed = 0;
let frames = 0;

export const loop = {
  /** Register `fn` on a stage. Returns the function that removes it. */
  add(stage: LoopStage, fn: LoopCallback): () => void {
    stages[stage].push(fn);
    return () => {
      const i = stages[stage].indexOf(fn);
      if (i >= 0) stages[stage].splice(i, 1);
    };
  },

  /** Run one frame. `dt` is seconds since the last frame. */
  tick(dt: number) {
    const nowMs = performance.now();
    if (lastTickMs > 0) {
      frameMs[sampleAt] = nowMs - lastTickMs;
      sampleAt = (sampleAt + 1) % SAMPLES;
      if (sampleCount < SAMPLES) sampleCount++;
    }
    lastTickMs = nowMs;

    const step = Math.min(Math.max(dt, 0), MAX_DT);
    elapsed += step;
    frames++;
    for (const stage of ORDER) {
      const list = stages[stage];
      for (let i = 0; i < list.length; i++) list[i](step, elapsed);
    }
  },

  /** Frames run since the page opened. */
  frames(): number {
    return frames;
  },

  /** Frame pacing over the last 240 frames (about 4 seconds at 60 fps). */
  timing(): { fps: number; ms: number; p95: number } {
    if (sampleCount === 0) return { fps: 0, ms: 0, p95: 0 };
    let sum = 0;
    for (let i = 0; i < sampleCount; i++) {
      sum += frameMs[i];
      sorted[i] = frameMs[i];
    }
    const view = sorted.subarray(0, sampleCount).sort();
    const ms = sum / sampleCount;
    return { fps: 1000 / ms, ms, p95: view[Math.min(sampleCount - 1, Math.floor(sampleCount * 0.95))] };
  },
};

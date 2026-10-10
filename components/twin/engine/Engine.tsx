"use client";

/**
 * Connects React Three Fiber to the frame loop: the only `useFrame` in Twin v2 lives here.
 * It also owns the sim stage's clock tick, the render stage (with the start-up tier probe and
 * dynamic resolution), zone streaming, and the `window.__TWIN__` debug hook
 * (docs/twin-v2/CONTRACTS.md section 7).
 */
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three/webgpu";
import { clock } from "../sim/clock";
import { twinActions, twinStore } from "../state/store";
import { isDebugUrl } from "../state/url";
import { assets } from "./assets";
import { cameraApi } from "./camera";
import { loop } from "./loop";
import { pickAt } from "./picking";
import { applyOutput, backendOf, type RendererBackend } from "./renderer";
import { startStreaming, streaming } from "./streaming";
import { createProbe, pixelRatioNow, rememberedTier, resolution, type Probe } from "./tiers";

export type TwinStats = {
  fps: number;
  ms: number;
  p95: number;
  calls: number;
  tris: number;
  programs: number;
  textures: number;
  geometries: number;
  heapMB: number;
  zonesLoaded: number;
  agents: number;
  // beyond the contract, added in P01c
  /** GPU memory the renderer holds (buffers, textures, pipelines), megabytes. */
  gpuMB: number;
  /** Real-time lights in the scene, the sun included. */
  lights: number;
  pixelRatio: number;
  /** Share of the tier's pixel ratio in use (dynamic resolution), 0.6 to 1. */
  resolution: number;
  streaming: ReturnType<typeof streaming.stats>;
};

let reactCommits = 0;
/** Counts React commits of the twin's tree (dev builds only; used to prove nothing re-renders per frame). */
export function countReactCommit() {
  reactCommits++;
}

/** What the start-up probe measured on this page, if it ran. */
let probed: { tier: string; score: number; remembered: boolean } | null = null;

function readStats(renderer: THREE.WebGPURenderer, scene: THREE.Object3D): TwinStats {
  const info = renderer.info;
  // (WebGPURenderer has no info.programs: the pipeline cache is the equivalent count)
  const pipelines = (renderer as unknown as { _pipelines?: { caches?: Map<unknown, unknown> } })._pipelines;
  const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  const memory = info.memory as unknown as { textures: number; geometries: number; total?: number };
  let lights = 0;
  scene.traverseVisible((o) => {
    const light = o as THREE.Light;
    if (light.isLight && !(light as unknown as { isAmbientLight?: boolean }).isAmbientLight && !(light as unknown as { isHemisphereLight?: boolean }).isHemisphereLight) lights++;
  });
  const stream = streaming.stats();
  return {
    ...loop.timing(),
    calls: info.render.drawCalls,
    tris: info.render.triangles,
    programs: pipelines?.caches?.size ?? 0,
    textures: memory.textures,
    geometries: memory.geometries,
    heapMB: heap ? heap.usedJSHeapSize / 1048576 : 0,
    zonesLoaded: stream.zonesLoaded,
    agents: 0,
    gpuMB: (memory.total ?? 0) / 1048576,
    lights,
    pixelRatio: renderer.getPixelRatio(),
    resolution: resolution.scale(),
    streaming: stream,
  };
}

export function Engine({ onFirstFrame }: { onFirstFrame: (backend: RendererBackend) => void }) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    // (read through get(), not captured: React Three Fiber may replace the camera while it starts)
    const live = () => get().gl as unknown as THREE.WebGPURenderer;
    const query = new URLSearchParams(window.location.search);

    // Tier: the user's choice (?q=), else what the probe chose on an earlier visit, else probe now.
    resolution.reset();
    resolution.setEnabled(query.get("dynres") !== "0");
    let probe: Probe | null = null;
    if (twinStore.getState().quality.auto) {
      const backend = backendOf(live());
      const remembered = query.get("probe") === "1" ? null : rememberedTier(backend);
      if (remembered) {
        twinActions.setQuality(remembered.tier, true);
        probed = { tier: remembered.tier, score: remembered.score, remembered: true };
      } else {
        probe = createProbe(live(), backend);
      }
    }
    const stopTier = twinStore.subscribe(
      (s) => s.quality.tier,
      () => resolution.reset(),
    );

    let drawn = 0;
    const stopSim = loop.add("sim", (dt) => clock.tick(dt));
    const stopRender = loop.add("render", (dt) => {
      const { gl, scene, camera, size, setDpr } = get();
      if (size.width < 2 || size.height < 2) return; // not laid out yet: never draw at the default 300 x 150
      const renderer = gl as unknown as THREE.WebGPURenderer;
      applyOutput(renderer);

      const frameMs = dt * 1000;
      if (probe) {
        const result = probe.frame(frameMs);
        if (result) {
          probe.dispose();
          probe = null;
          probed = { ...result, remembered: false };
          twinActions.setQuality(result.tier, true);
        }
      } else if (drawn >= 2) {
        resolution.frame(frameMs, performance.now());
      }
      // React Three Fiber puts its own pixel ratio back when the canvas is measured again, so the
      // wanted one is checked every frame and handed to it when they differ
      const ratio = pixelRatioNow();
      if (Math.abs(renderer.getPixelRatio() - ratio) > 0.005) setDpr(ratio);

      // (belt and braces: a camera whose aspect was never set draws nothing)
      const lens = camera as THREE.PerspectiveCamera;
      const aspect = size.width / size.height;
      if (lens.isPerspectiveCamera && Math.abs(lens.aspect - aspect) > 1e-4) {
        lens.aspect = aspect;
        lens.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
      // the loading screen stays up until the probe has chosen a tier
      if (!probe && ++drawn === 2) onFirstFrame(backendOf(renderer));
    });

    const hook = {
      get renderer() {
        return live();
      },
      get scene() {
        return get().scene;
      },
      get camera() {
        return get().camera;
      },
      store: twinStore,
      sim: { clock },
      stats: () => readStats(live(), get().scene as unknown as THREE.Object3D),
      // extras beyond the contract, for the checks in scripts/twin/
      get backend() {
        return backendOf(live());
      },
      rig: cameraApi,
      loop,
      reactCommits: () => reactCommits,
      pick: (clientX: number, clientY: number) => pickAt(clientX, clientY, live().domElement, get().camera)?.point.toArray() ?? null,
      streaming,
      assets,
      resolution,
      probe: () => probed,
    };
    const host = window as unknown as { __TWIN__?: unknown };
    if (isDebugUrl()) host.__TWIN__ = hook;

    return () => {
      stopSim();
      stopRender();
      stopTier();
      probe?.dispose();
      if (host.__TWIN__ === hook) delete host.__TWIN__;
    };
  }, [get, onFirstFrame]);

  // Priority 1 hands rendering to the loop's render stage.
  useFrame((_, dt) => loop.tick(dt), 1);
  return null;
}

/**
 * Streams zones of placed assets in and out around the camera (engine/streaming.ts). Mounted
 * after the camera rig, so LOD levels are chosen for the camera of the frame being drawn.
 */
export function ZoneStreamer() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { gl, scene, camera } = get();
    return startStreaming({
      scene: scene as unknown as THREE.Scene,
      camera: camera as unknown as THREE.PerspectiveCamera,
      renderer: gl as unknown as THREE.WebGPURenderer,
      viewHeight: () => get().size.height,
      testZones: new URLSearchParams(window.location.search).get("testzone") === "1",
    });
  }, [get]);

  return null;
}

"use client";

/**
 * Connects React Three Fiber to the frame loop: the only `useFrame` in Twin v2 lives here.
 * It also owns the sim stage's clock tick, the render stage, and the `window.__TWIN__` debug hook
 * (docs/twin-v2/CONTRACTS.md section 7).
 */
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three/webgpu";
import { clock } from "../sim/clock";
import { twinStore } from "../state/store";
import { isDebugUrl } from "../state/url";
import { cameraApi } from "./camera";
import { loop } from "./loop";
import { pickAt } from "./picking";
import { applyOutput, backendOf, type RendererBackend } from "./renderer";

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
};

let reactCommits = 0;
/** Counts React commits of the twin's tree (dev builds only; used to prove nothing re-renders per frame). */
export function countReactCommit() {
  reactCommits++;
}

function readStats(renderer: THREE.WebGPURenderer): TwinStats {
  const info = renderer.info;
  // (WebGPURenderer has no info.programs: the pipeline cache is the equivalent count)
  const pipelines = (renderer as unknown as { _pipelines?: { caches?: Map<unknown, unknown> } })._pipelines;
  const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return {
    ...loop.timing(),
    calls: info.render.drawCalls,
    tris: info.render.triangles,
    programs: pipelines?.caches?.size ?? 0,
    textures: info.memory.textures,
    geometries: info.memory.geometries,
    heapMB: heap ? heap.usedJSHeapSize / 1048576 : 0,
    zonesLoaded: 0,
    agents: 0,
  };
}

export function Engine({ onFirstFrame }: { onFirstFrame: (backend: RendererBackend) => void }) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    let drawn = 0;
    const stopSim = loop.add("sim", (dt) => clock.tick(dt));
    const stopRender = loop.add("render", () => {
      const { gl, scene, camera, size } = get();
      if (size.width < 2 || size.height < 2) return; // not laid out yet: never draw at the default 300 x 150
      const renderer = gl as unknown as THREE.WebGPURenderer;
      applyOutput(renderer);
      // (belt and braces: a camera whose aspect was never set draws nothing)
      const lens = camera as THREE.PerspectiveCamera;
      const aspect = size.width / size.height;
      if (lens.isPerspectiveCamera && Math.abs(lens.aspect - aspect) > 1e-4) {
        lens.aspect = aspect;
        lens.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
      if (++drawn === 2) onFirstFrame(backendOf(renderer));
    });

    // (read through get(), not captured: React Three Fiber may replace the camera while it starts)
    const live = () => get().gl as unknown as THREE.WebGPURenderer;
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
      stats: () => readStats(live()),
      // extras beyond the contract, for the checks in scripts/twin/check-shell.mjs
      get backend() {
        return backendOf(live());
      },
      rig: cameraApi,
      loop,
      reactCommits: () => reactCommits,
      pick: (clientX: number, clientY: number) => pickAt(clientX, clientY, live().domElement, get().camera)?.point.toArray() ?? null,
    };
    const host = window as unknown as { __TWIN__?: unknown };
    if (isDebugUrl()) host.__TWIN__ = hook;

    return () => {
      stopSim();
      stopRender();
      if (host.__TWIN__ === hook) delete host.__TWIN__;
    };
  }, [get, onFirstFrame]);

  // Priority 1 hands rendering to the loop's render stage.
  useFrame((_, dt) => loop.tick(dt), 1);
  return null;
}

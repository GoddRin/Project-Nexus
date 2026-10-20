"use client";

/**
 * Mounts the camp gate's staged loop (sim/gate-scene.ts) in the canvas: the pickup, the dog and
 * the barrier. Mounted after the zone streamer, whose barrier arm it moves.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three/webgpu";
import { startGateScene } from "../sim/gate-scene";
import { twinStore } from "../state/store";

export function GateSlice() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    let stop: (() => void) | null = null;
    // the gate is at the powerhouse location: its actors come and go with it
    const sync = () => {
      const here = twinStore.getState().location === "powerhouse";
      if (here && !stop) {
        const { gl, scene, camera } = get();
        stop = startGateScene({
          scene: scene as unknown as THREE.Scene,
          camera: camera as unknown as THREE.PerspectiveCamera,
          renderer: gl as unknown as THREE.WebGPURenderer,
          viewHeight: () => get().size.height,
        });
      } else if (!here && stop) {
        stop();
        stop = null;
      }
    };
    sync();
    const stopLocation = twinStore.subscribe((s) => s.location, sync);
    return () => {
      stopLocation();
      stop?.();
    };
  }, [get]);

  return null;
}

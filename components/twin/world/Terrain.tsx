"use client";

/**
 * The location's ground (P03a): the terrain built by scripts/twin/build-terrain.mts, drawn by
 * world/terrain.ts. Replaces P01b's temporary terrain. Sun, sky and light are world/SkyLight.tsx.
 *
 * A location without a built terrain (the weir and the midway portals until P05g and P05h) shows a
 * flat disc. The tiles choose their levels in the loop's camera stage, after the camera has moved.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { getLocation } from "../data/site";
import type { Location } from "../data/types";
import { loop } from "../engine/loop";
import { addPickSurface, addPickable, setGround } from "../engine/picking";
import { precompile } from "../engine/precompile";
import { twinStore } from "../state/store";
import { hasTerrain, loadTerrain, terrainTimings, type Terrain as LoadedTerrain } from "./terrain-tiles";

/** The loaded terrain, for checks (`window.__TWIN__.terrain`). */
export const terrainNow: { current: LoadedTerrain | null } = { current: null };

export function Terrain() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const scene = get().scene as unknown as THREE.Scene;
    let current: { dispose: () => void } | null = null;
    let abort: AbortController | null = null;

    const clear = () => {
      abort?.abort();
      abort = null;
      current?.dispose();
      current = null;
    };

    const flat = (location: Location) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(location.halfExtent, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x45512f, roughness: 1 }));
      disc.name = "ground";
      disc.receiveShadow = true;
      scene.add(disc);
      const removePick = addPickable(disc);
      current = {
        dispose: () => {
          removePick();
          scene.remove(disc);
          disc.geometry.dispose();
          (disc.material as THREE.Material).dispose();
        },
      };
    };

    const load = () => {
      clear();
      const location = getLocation(twinStore.getState().location);
      if (!hasTerrain(location.id)) return flat(location);
      const mine = (abort = new AbortController());
      loadTerrain(location.id, mine.signal)
        .then(async (terrain) => {
          if (!terrain) return flat(location);
          if (mine.signal.aborted) return terrain.dispose();
          const { gl, camera } = get();
          const renderer = gl as unknown as THREE.WebGPURenderer;
          const lens = camera as unknown as THREE.PerspectiveCamera;
          // every level of every tile set compiled before it is drawn: each level once, all copies on
          // every draw compiled before it is drawn: each level given copies at once, all draws compiled together
          terrain.forceLevel(-1);
          terrain.update(lens);
          const t0 = performance.now();
          await Promise.all(terrain.root.children.map((child) => precompile.object(renderer, scene, lens, child)));
          terrainTimings.compileMs = Math.round(performance.now() - t0);
          if (mine.signal.aborted) return terrain.dispose();
          terrain.forceLevel(null);
          terrainTimings.compiled = Math.round(performance.now());
          // the ground and rays are the terrain's from the moment it shows
          const removeGround = setGround(terrain.sampleY);
          const removePick = addPickSurface(terrain.raycast);
          const stopLoop = loop.add("camera", () => terrain.update(get().camera as unknown as THREE.PerspectiveCamera));
          terrain.update(lens);
          scene.add(terrain.root);
          terrainTimings.shown = Math.round(performance.now());
          terrainNow.current = terrain;
          current = {
            dispose: () => {
              stopLoop();
              removePick();
              removeGround();
              scene.remove(terrain.root);
              if (terrainNow.current === terrain) terrainNow.current = null;
              terrain.dispose();
            },
          };
        })
        .catch((e) => {
          if (mine.signal.aborted) return;
          console.error("[twin] terrain did not load", e);
          flat(location);
        });
    };
    load();
    const stopLocation = twinStore.subscribe((s) => s.location, load);
    return () => {
      stopLocation();
      clear();
    };
  }, [get]);

  return null;
}

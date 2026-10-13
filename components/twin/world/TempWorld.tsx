"use client";

/**
 * Temporary terrain for the scene shell (P01b): v1's terrain mesh, untextured, so there is ground
 * to move over. P03a replaces it. Sun, sky and light are world/SkyLight.tsx.
 *
 * Where a finished ground patch lies (the camp gate slice, P02a) this terrain is not drawn, so the
 * two do not fight for the same pixels. Locations other than the powerhouse have no terrain yet
 * and show a flat disc.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { abs, color, fract, mix, positionWorld, smoothstep } from "three/tsl";
import { createV1TerrainSampler, type V1TerrainMesh } from "@/lib/twin/terrain";
import gateLayout from "../data/sources/camp-gate-layout.json";
import { getLocation } from "../data/site";
import type { Location } from "../data/types";
import { addPickable, setGround } from "../engine/picking";
import { twinStore } from "../state/store";

const TERRAIN_URL = "/data/gis-terrain-mesh.json";

/** Plain forest-floor green with a faint line every 5 m of height, so slope and movement can be read. */
function groundMaterial(): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0 });
  const band = abs(fract(positionWorld.y.div(5)).sub(0.5));
  material.colorNode = mix(color(0x3f4d30), color(0x4d5b3a), smoothstep(0.47, 0.5, band).oneMinus());
  // not drawn under the finished ground patch (a hair inside its edge, so no gap shows between them)
  const [cx, , cz] = gateLayout.patch.centre;
  const half = gateLayout.patch.size / 2 - 0.05;
  const inside = abs(positionWorld.x.sub(cx)).lessThan(half).and(abs(positionWorld.z.sub(cz)).lessThan(half));
  material.maskNode = inside.not();
  return material;
}

async function loadTerrain(signal: AbortSignal): Promise<{ geometry: THREE.BufferGeometry; sampleY: (x: number, z: number) => number }> {
  const res = await fetch(TERRAIN_URL, { signal });
  if (!res.ok) throw new Error(`terrain ${res.status}`);
  const mesh = (await res.json()) as V1TerrainMesh & { indices: number[] };
  const sampler = createV1TerrainSampler(mesh);
  // v1 levels three areas of the raw mesh; the sampler holds those heights, so the surface drawn
  // is the same one the camera is kept above
  const positions = new Float32Array(mesh.positions);
  for (let v = 0; v < sampler.heights.length; v++) positions[v * 3 + 1] = sampler.heights[v];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(mesh.indices);
  geometry.computeVertexNormals();
  return { geometry, sampleY: sampler.sampleY };
}

export function TempWorld() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const scene = get().scene as unknown as THREE.Scene;
    const root = new THREE.Group();
    root.name = "temp-world";
    scene.add(root);

    const material = groundMaterial();
    let ground: THREE.Mesh | null = null;
    let removePickable: (() => void) | null = null;
    let removeGround: (() => void) | null = null;
    let abort: AbortController | null = null;

    const clearGround = () => {
      abort?.abort();
      removePickable?.();
      removePickable = null;
      if (ground) {
        root.remove(ground);
        ground.geometry.dispose();
        ground = null;
      }
      removeGround?.();
      removeGround = null;
    };

    const showGround = (geometry: THREE.BufferGeometry, sampleY: ((x: number, z: number) => number) | null) => {
      ground = new THREE.Mesh(geometry, material);
      ground.name = "ground";
      ground.receiveShadow = true;
      root.add(ground);
      removePickable = addPickable(ground);
      if (sampleY) removeGround = setGround(sampleY);
    };

    const flatGround = (location: Location) => {
      const disc = new THREE.CircleGeometry(location.halfExtent, 96);
      disc.rotateX(-Math.PI / 2);
      showGround(disc, null);
    };

    const loadLocation = () => {
      clearGround();
      const location = getLocation(twinStore.getState().location);
      if (location.id !== "powerhouse") return flatGround(location);
      const mine = (abort = new AbortController());
      loadTerrain(mine.signal)
        .then(({ geometry, sampleY }) => {
          if (mine.signal.aborted) return geometry.dispose();
          showGround(geometry, sampleY);
        })
        .catch((e) => {
          if (mine.signal.aborted) return;
          console.error("[twin] terrain did not load", e);
          flatGround(location);
        });
    };
    loadLocation();
    const stopLocation = twinStore.subscribe((s) => s.location, loadLocation);

    return () => {
      stopLocation();
      clearGround();
      scene.remove(root);
      material.dispose();
    };
  }, [get]);

  return null;
}

"use client";

/**
 * Temporary world for the scene shell (P01b): v1's terrain mesh, untextured, under one sun and a
 * flat sky, so there is ground to move over. P03a replaces the terrain and P03b the sky and light.
 *
 * The sun's direction is the real one for the clock time and the location (suncalc), which is
 * enough to see `?t=` take effect. Locations other than the powerhouse have no terrain yet and
 * show a flat disc.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { abs, color, fract, mix, positionWorld, smoothstep } from "three/tsl";
import { getMoonPosition, getPosition } from "suncalc";
import { createV1TerrainSampler, type V1TerrainMesh } from "@/lib/twin/terrain";
import { getLocation } from "../data/site";
import type { Location } from "../data/types";
import { loop } from "../engine/loop";
import { addPickable, setGround } from "../engine/picking";
import { clock } from "../sim/clock";
import { twinStore } from "../state/store";

const TERRAIN_URL = "/data/gis-terrain-mesh.json";

const SKY_DAY = new THREE.Color(0x9fc4e8);
const SKY_LOW = new THREE.Color(0xe9b98c);
const SKY_NIGHT = new THREE.Color(0x101a2c);
const SUN_HIGH = new THREE.Color(0xfff4e2);
const SUN_LOW = new THREE.Color(0xffb070);
const MOON = new THREE.Color(0x9db4d8);

/** Plain grey ground with a faint line every 5 m of height, so slope and movement can be read. */
function groundMaterial(): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0 });
  const band = abs(fract(positionWorld.y.div(5)).sub(0.5));
  material.colorNode = mix(color(0x6f746c), color(0x8f948b), smoothstep(0.47, 0.5, band).oneMinus());
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

/** Unit vector towards the sun (or the moon) in the location's frame, and its altitude in radians. */
function skyBody(body: "sun" | "moon", when: Date, location: Location, out: THREE.Vector3): number {
  const { lat, lon } = location.origin;
  const p = body === "sun" ? getPosition(when, lat, lon) : getMoonPosition(when, lat, lon);
  // suncalc measures azimuth from south, turning west; the frame's -Z axis bears yawToGridNorth from north
  const bearing = p.azimuth + Math.PI - location.yawToGridNorth;
  const flat = Math.cos(p.altitude);
  out.set(flat * Math.sin(bearing), Math.sin(p.altitude), -flat * Math.cos(bearing));
  return p.altitude;
}

export function TempWorld() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const scene = get().scene as unknown as THREE.Scene;
    const root = new THREE.Group();
    root.name = "temp-world";
    scene.add(root);

    const sky = new THREE.Color();
    scene.background = sky;
    const hemisphere = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a38, 0.9);
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    root.add(hemisphere, sun, sun.target);

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

    const direction = new THREE.Vector3();
    let litFor = NaN;
    const stopLoop = loop.add("sim", () => {
      const minutes = clock.minutes();
      if (Math.abs(minutes - litFor) < 0.05) return;
      litFor = minutes;
      const location = getLocation(twinStore.getState().location);
      const when = clock.date();
      const altitude = skyBody("sun", when, location, direction);
      // 0 at 6 degrees below the horizon, 1 from 10 degrees above it
      const day = THREE.MathUtils.smoothstep(altitude, -0.1, 0.17);
      const high = THREE.MathUtils.smoothstep(altitude, 0.05, 0.6);
      if (day > 0.02) {
        sun.color.lerpColors(SUN_LOW, SUN_HIGH, high);
        sun.intensity = 3 * day;
      } else {
        skyBody("moon", when, location, direction);
        if (direction.y < 0.05) direction.set(0.3, 0.8, 0.5).normalize();
        sun.color.copy(MOON);
        sun.intensity = 0.5;
      }
      sun.position.copy(direction).multiplyScalar(500);
      hemisphere.intensity = 0.3 + 0.6 * day; // (the night floor is high on purpose: the shell has no lamps yet)
      sky.lerpColors(SKY_NIGHT, SKY_LOW, day).lerp(SKY_DAY, high);
    });

    return () => {
      stopLoop();
      stopLocation();
      clearGround();
      scene.remove(root);
      if (scene.background === sky) scene.background = null;
      material.dispose();
      hemisphere.dispose();
      sun.dispose();
    };
  }, [get]);

  return null;
}

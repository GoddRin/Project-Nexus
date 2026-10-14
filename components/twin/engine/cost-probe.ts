/**
 * Marginal-cost probe (P02c): adds copies of real assets in front of the camera so a script can
 * time what each extra person, tree, vehicle or light costs. Debug hook only
 * (`window.__TWIN__.cost`, scripts/twin/cost.mjs); nothing in the app calls it.
 *
 * Copies stand on an arc at a fixed distance from the camera, inside the view, and are held at
 * one LOD level whatever their distance, so a level's cost is measured at a realistic size on
 * screen. People and vehicles are real actors (engine/actors.ts: own skeleton, mixer, one skinned
 * draw per level); trees and plants are one instanced set (engine/instances.ts), as streaming
 * draws them.
 */
import * as THREE from "three/webgpu";
import { acquireActorModel, createActor, releaseActorModel, type Actor } from "./actors";
import { assets } from "./assets";
import { createInstanceSet, type InstanceSet } from "./instances";
import { loop } from "./loop";
import { groundY } from "./picking";
import { TIER_SETTINGS, type TierSettings } from "./tiers";
import { twinActions, twinStore } from "../state/store";

type Ctx = { scene: () => THREE.Scene; camera: () => THREE.PerspectiveCamera; renderer: () => THREE.WebGPURenderer };

type Batch = { dispose: () => void };

const batches: Batch[] = [];
let ctx: Ctx | null = null;

/** Points on an arc `distance` m in front of the camera, spread over most of the view's width, in rows 1.6 m apart. */
function arc(n: number, distance: number, spacing: number): THREE.Vector3[] {
  const camera = ctx!.camera();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const heading = Math.atan2(forward.x, forward.z);
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2) * camera.aspect * 0.8;
  const out: THREE.Vector3[] = [];
  let row = 0;
  while (out.length < n) {
    const r = distance + row * 1.6;
    const across = Math.max(1, Math.floor((2 * halfFov * r) / spacing));
    for (let i = 0; i < across && out.length < n; i++) {
      const a = heading + (across === 1 ? 0 : -halfFov + (2 * halfFov * (i + (row % 2) * 0.5)) / across);
      const x = camera.position.x + Math.sin(a) * r;
      const z = camera.position.z + Math.cos(a) * r;
      out.push(new THREE.Vector3(x, groundY(x, z), z));
    }
    row++;
  }
  return out;
}

/** LOD scale that puts something `distance` m away at `level` (engine/lod.ts), for LOD distances d1, d2. */
function scaleFor(level: number, distance: number, d1: number, d2: number): number {
  if (level === 0) return 1e6;
  if (level === 1) return distance / Math.sqrt(d1 * d2);
  return distance / (d2 * 1.6);
}

async function addActors(id: string, n: number, level: number, distance: number, clip: string | null): Promise<number> {
  const model = await acquireActorModel(id);
  const spacing = Math.max(1.2, model.radius * (model.skinned ? 0.9 : 2.2));
  const spots = arc(n, distance, spacing);
  const scene = ctx!.scene();
  const camera = ctx!.camera();
  const actors: Actor[] = [];
  const [d1, d2] = model.entry.lodDistances;
  for (const spot of spots) {
    const actor = createActor(model);
    actor.object.position.copy(spot);
    actor.object.rotation.y = Math.atan2(camera.position.x - spot.x, camera.position.z - spot.z);
    const name = clip && model.clips.has(clip) ? clip : model.clips.keys().next().value;
    if (name) actor.play(name, { fade: 0, phase: Math.random() });
    scene.add(actor.object);
    actors.push(actor);
  }
  const stop = loop.add("sim", (dt) => {
    for (const actor of actors) {
      const d = camera.position.distanceTo(actor.object.position);
      actor.update(dt, camera.position, scaleFor(level, d, d1, d2), 1e6);
    }
  });
  batches.push({
    dispose() {
      stop();
      for (const actor of actors) actor.dispose();
      releaseActorModel(id);
    },
  });
  return actors.length;
}

async function addInstances(id: string, n: number, level: number, distance: number, spacing: number): Promise<number> {
  const asset = await assets.acquire(id);
  const spots = arc(n, distance, spacing);
  const set: InstanceSet = createInstanceSet(
    asset,
    spots.map((p, i) => ({ asset: id, p: [p.x, p.y, p.z] as [number, number, number], r: [0, i * 2.39, 0] as [number, number, number], s: 1 })),
  );
  const scene = ctx!.scene();
  const camera = ctx!.camera();
  const group = new THREE.Group();
  group.name = `cost:${id}`;
  for (const draw of set.draws) group.add(draw.mesh);
  scene.add(group);
  const [d1, d2] = asset.entry.lodDistances;
  const frustum = new THREE.Frustum();
  const view = new THREE.Matrix4();
  const stop = loop.add("camera", () => {
    view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(view, camera.coordinateSystem);
    set.update(camera, frustum, scaleFor(level, distance, d1, d2), 1e6, 0);
  });
  batches.push({
    dispose() {
      stop();
      group.removeFromParent();
      set.dispose();
      assets.release(id);
    },
  });
  return n;
}

function addLights(n: number, distance: number, shadow: boolean): number {
  const scene = ctx!.scene();
  const lights: THREE.Light[] = [];
  for (const spot of arc(n, distance, 4)) {
    const light = new THREE.PointLight(0xffd8a8, 2, 30, 2);
    light.position.set(spot.x, spot.y + 4, spot.z);
    if (shadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
    }
    scene.add(light);
    lights.push(light);
  }
  batches.push({
    dispose() {
      for (const light of lights) {
        light.removeFromParent();
        light.dispose();
      }
    },
  });
  return n;
}

const original = JSON.parse(JSON.stringify(TIER_SETTINGS)) as typeof TIER_SETTINGS;

export const costProbe = {
  attach(next: Ctx) {
    ctx = next;
  },
  /**
   * Add `n` copies of an asset at `level` (0 to 2), `distance` m from the camera.
   * People, animals and vehicles are actors; anything else is drawn instanced.
   */
  async add(id: string, n: number, options: { level?: number; distance?: number; clip?: string; spacing?: number } = {}): Promise<number> {
    if (!ctx) throw new Error("cost probe not attached");
    const { level = 0, distance = 12, clip = "idle", spacing = 3 } = options;
    const actor = /^(char|fauna|veh)\./.test(id);
    return actor ? addActors(id, n, level, distance, clip) : addInstances(id, n, level, distance, spacing);
  },
  /** Add `n` point lights (with a 512 px cube shadow each if `shadow`). */
  lights(n: number, options: { distance?: number; shadow?: boolean } = {}): number {
    if (!ctx) throw new Error("cost probe not attached");
    return addLights(n, options.distance ?? 10, options.shadow ?? false);
  },
  /** Remove everything the probe added. */
  clear() {
    while (batches.length) batches.pop()!.dispose();
  },
  /** Switch tier (held by hand, not chosen by the probe). */
  tier(tier: keyof typeof TIER_SETTINGS) {
    twinActions.setQuality(tier, false);
  },
  /**
   * Change the current tier's settings for a measurement (cascades, shadow map size, occlusion,
   * pixel ratio), and apply them by switching tier away and back. `reset` puts the built-in values back.
   */
  override(patch: Partial<TierSettings> | "reset") {
    const tier = twinStore.getState().quality.tier;
    if (patch === "reset") Object.assign(TIER_SETTINGS[tier], original[tier]);
    else Object.assign(TIER_SETTINGS[tier], patch);
    twinActions.setQuality(tier === "low" ? "medium" : "low", false);
    twinActions.setQuality(tier, false);
    return { ...TIER_SETTINGS[tier] };
  },
};

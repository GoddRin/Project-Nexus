/**
 * Actors: things that move on their own. A person or an animal (a skinned mesh with animation
 * clips), a vehicle (a body with wheels that turn), a barrier arm. Placed things that never move
 * are drawn in bulk by engine/instances.ts instead.
 *
 * An actor's model is a built asset like any other (data/assets.json): up to three levels named
 * <name>_LOD0.._LOD2 in one file. What differs is that the file's node tree is kept:
 *   - a skinned asset has one skeleton that all its levels are bound to, and one clip per motion;
 *   - a moving part (a wheel) is a child node of LOD0 carrying `twin_part`, `twin_pivot` (its pivot
 *     in the asset's frame) and, for some, `twin_axis` or `twin_radius` (scripts/blender/twin/twin_lib.py).
 *
 * Models are shared and counted: `acquireActorModel` / `releaseActorModel`. Each actor made from a
 * model has its own skeleton, mixer and part pivots, and shares the model's geometry and materials
 * (except lamp materials, named EMIT_..., which each actor owns so its lamps can be lit alone).
 *
 * No React here. The owner puts `actor.object` in the scene, moves it, and calls `actor.update`
 * once a frame.
 */
import * as THREE from "three/webgpu";
import { materialColor, materialRoughness, mix, normalWorld, vec3, vec4 } from "three/tsl";
import { clone as cloneWithSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ASSETS } from "../data/site";
import type { AssetEntry } from "../data/types";
import { assets } from "./assets";
import { CULLED, selectLod } from "./lod";
import { air } from "../world/air";

export type ActorModel = {
  entry: AssetEntry;
  /** The file's scene: never drawn, only copied. */
  template: THREE.Object3D;
  clips: Map<string, THREE.AnimationClip>;
  skinned: boolean;
  /** Bit mask of the levels present (bit 0 = LOD0). */
  levels: number;
  radius: number;
};

/** A part that turns: `steer` turns about the vertical through the pivot, `spin` about the part's own axle inside it. */
export type ActorPart = { steer: THREE.Group; spin: THREE.Group; radius: number; axis: THREE.Vector3 | null };

export type PlayOptions = {
  /** Seconds over which the clip takes over from the one playing. */
  fade?: number;
  /** Repeat (the default) or play once and hold the last pose. */
  loop?: boolean;
  /** Playback rate; 1 is as recorded. */
  speed?: number;
  /** Start this far into the clip, 0 to 1, so two actors on the same clip are not in step. */
  phase?: number;
};

export type Actor = {
  model: ActorModel;
  /** Add this to the scene and move it. Its origin is the asset's: on the ground, facing +Z. */
  object: THREE.Group;
  parts: Map<string, ActorPart>;
  /** Extras of the LOD0 node (a vehicle's lamp positions). */
  data: Record<string, unknown>;
  /** The level drawn after the last update, or -1 when it is beyond the draw distance. */
  level: number;
  /** Start a clip; returns its length in seconds (0 if the model has no such clip). */
  play: (clip: string, options?: PlayOptions) => number;
  /** The clip playing now. */
  playing: () => string | null;
  /** Change the playing clip's rate without restarting it. */
  setSpeed: (speed: number) => void;
  /** Brightness of the actor's lamp surfaces (materials named EMIT_...), 0 to 1 and beyond. */
  setGlow: (k: number) => void;
  /**
   * Once a frame: choose the level for this view and advance the animation.
   * @param k     engine/lod.ts `lodScale` for the view
   * @param cull  metres beyond which the actor is not drawn
   */
  update: (dt: number, eye: THREE.Vector3, k: number, cull: number) => void;
  dispose: () => void;
};

type Slot = { refs: number; promise: Promise<ActorModel>; loaded: ActorModel | null };
const slots = new Map<string, Slot>();
let alive = 0;

function levelOf(node: THREE.Object3D): number {
  if (typeof node.userData?.lod === "number") return node.userData.lod;
  const named = /_LOD([012])$/.exec(String(node.userData?.name ?? node.name));
  return named ? Number(named[1]) : -1;
}

/**
 * An actor's material as a node material that gets wet in rain, as placed things do
 * (engine/assets.ts): darker, with a sheen, the more the more a surface faces the sky.
 */
function weathered(material: THREE.Material): THREE.Material {
  const source = material as unknown as Record<string, unknown> & { isNodeMaterial?: boolean; isMeshPhysicalMaterial?: boolean; isMeshStandardMaterial?: boolean };
  if (source.isNodeMaterial || !source.isMeshStandardMaterial) return material;
  const node = source.isMeshPhysicalMaterial ? new THREE.MeshPhysicalNodeMaterial() : new THREE.MeshStandardNodeMaterial();
  const target = node as unknown as Record<string, unknown>;
  for (const key in source) {
    if (key !== "uuid" && key !== "type") target[key] = source[key];
  }
  const wet = air.wetness.mul(normalWorld.y.max(0).mul(0.6).add(0.4));
  node.colorNode = materialColor.mul(vec4(vec3(mix(1, 0.72, wet)), 1));
  node.roughnessNode = materialRoughness.mul(mix(1, 0.55, wet));
  return node;
}

async function load(entry: AssetEntry): Promise<ActorModel> {
  const gltf = await assets.gltf(entry);
  const template = gltf.scene as unknown as THREE.Object3D;
  template.updateMatrixWorld(true);
  let levels = 0;
  let skinned = false;
  const wetFor = new Map<THREE.Material, THREE.Material>();
  template.traverse((node) => {
    const level = levelOf(node);
    if (level >= 0 && level <= 2) levels |= 1 << level;
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
    const swap = (material: THREE.Material) => {
      let made = wetFor.get(material);
      if (!made) {
        made = weathered(material);
        wetFor.set(material, made);
        if (made !== material) material.dispose();
      }
      return made;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap"] as const) {
        const texture = (material as unknown as Record<string, THREE.Texture | null>)[key];
        if (texture?.isTexture) texture.anisotropy = 4;
      }
    }
  });
  if (!(levels & 1)) throw new Error(`actor ${entry.id}: no LOD0 node in ${entry.url}`);
  const box = new THREE.Box3(new THREE.Vector3(...entry.bounds.min), new THREE.Vector3(...entry.bounds.max));
  return {
    entry,
    template,
    clips: new Map((gltf.animations as unknown as THREE.AnimationClip[]).map((clip) => [clip.name, clip])),
    skinned,
    levels,
    // (a pose reaches past the rest pose's box: a lying dog is longer than a standing one)
    radius: box.getBoundingSphere(new THREE.Sphere()).radius * (skinned ? 1.5 : 1),
  };
}

function disposeModel(model: ActorModel) {
  const seen = new Set<unknown>();
  model.template.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!seen.has(mesh.geometry)) mesh.geometry.dispose();
    seen.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        const texture = value as THREE.Texture | null;
        if (texture?.isTexture && !seen.has(texture)) {
          seen.add(texture);
          texture.dispose();
        }
      }
      material.dispose();
    }
  });
}

/** Load an actor's model, or share the copy already loaded. Every acquire needs one release. */
export function acquireActorModel(id: string): Promise<ActorModel> {
  let slot = slots.get(id);
  if (!slot) {
    const entry = ASSETS.get(id);
    if (!entry) return Promise.reject(new Error(`unknown asset '${id}'`));
    const created: Slot = { refs: 0, loaded: null, promise: load(entry) };
    created.promise.then(
      (model) => {
        created.loaded = model;
        if (created.refs === 0) disposeModel(model); // released while it was still loading
      },
      () => {
        if (slots.get(id) === created) slots.delete(id);
      },
    );
    slots.set(id, created);
    slot = created;
  }
  slot.refs++;
  return slot.promise;
}

export function releaseActorModel(id: string) {
  const slot = slots.get(id);
  if (!slot || --slot.refs > 0) return;
  slots.delete(id);
  if (slot.loaded) disposeModel(slot.loaded);
}

/** Actors alive now (for the stats). */
export function actorCount(): number {
  return alive;
}

export function createActor(model: ActorModel): Actor {
  const object = new THREE.Group();
  object.name = `actor:${model.entry.id}`;
  const inner = cloneWithSkeleton(model.template as unknown as Parameters<typeof cloneWithSkeleton>[0]) as unknown as THREE.Object3D;
  object.add(inner);
  object.updateMatrixWorld(true);

  const lods: (THREE.Object3D | null)[] = [null, null, null];
  const glowing: { material: THREE.MeshStandardMaterial; full: number }[] = [];
  const own = new Map<THREE.Material, THREE.Material>();
  const partNodes: THREE.Object3D[] = [];
  inner.traverse((node) => {
    const level = levelOf(node);
    if (level >= 0 && level <= 2 && !lods[level]) lods[level] = node;
    if (typeof node.userData?.twin_part === "string") partNodes.push(node);
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    // (a skinned mesh's box is its rest pose's: the actor is culled as a whole, by distance, in update)
    if (model.skinned) mesh.frustumCulled = false;
    const swap = (material: THREE.Material): THREE.Material => {
      if (!material.name.startsWith("EMIT_")) return material;
      let mine = own.get(material);
      if (!mine) {
        mine = material.clone();
        own.set(material, mine);
        const lamp = mine as THREE.MeshStandardMaterial;
        glowing.push({ material: lamp, full: lamp.emissiveIntensity });
        lamp.emissiveIntensity = 0;
      }
      return mine;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    const transparent = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every((m) => m.transparent);
    mesh.castShadow = !transparent;
    mesh.receiveShadow = true;
  });
  const lod0 = lods[0]!;

  // each moving part goes under a pivot of its own at the place the asset says it turns about
  const parts = new Map<string, ActorPart>();
  const at = new THREE.Vector3();
  for (const node of partNodes) {
    const pivot = node.userData.twin_pivot as number[] | undefined;
    if (!pivot) continue;
    const steer = new THREE.Group();
    const spin = new THREE.Group();
    steer.name = `part:${node.userData.twin_part}`;
    steer.add(spin);
    lod0.add(steer);
    steer.position.copy(lod0.worldToLocal(at.set(pivot[0], pivot[1], pivot[2])));
    steer.updateMatrixWorld(true);
    spin.attach(node);
    const axis = node.userData.twin_axis as number[] | undefined;
    parts.set(String(node.userData.twin_part), {
      steer,
      spin,
      radius: Number(node.userData.twin_radius ?? 0),
      axis: axis ? new THREE.Vector3(axis[0], axis[1], axis[2]).normalize() : null,
    });
  }

  const mixer = model.clips.size ? new THREE.AnimationMixer(inner as unknown as THREE.Object3D) : null;
  let current: THREE.AnimationAction | null = null;
  let currentName: string | null = null;
  const [d1, d2] = model.entry.lodDistances;
  const hasLod2 = (model.levels & 4) !== 0;
  for (let i = 1; i < 3; i++) if (lods[i]) lods[i]!.visible = false;
  alive++;

  const actor: Actor = {
    model,
    object,
    parts,
    data: (lod0.userData ?? {}) as Record<string, unknown>,
    level: 0,

    play(name, options = {}) {
      const clip = model.clips.get(name);
      if (!mixer || !clip) return 0;
      const { fade = 0.25, loop = true, speed = 1, phase = 0 } = options;
      const action = mixer.clipAction(clip);
      if (action === current) {
        action.timeScale = speed;
        return clip.duration;
      }
      action.reset();
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = true;
      action.timeScale = speed;
      action.time = phase * clip.duration;
      if (current && fade > 0) action.crossFadeFrom(current, fade, false);
      else if (current) current.stop();
      action.play();
      current = action;
      currentName = name;
      return clip.duration;
    },

    playing: () => currentName,

    setSpeed(speed) {
      if (current) current.timeScale = speed;
    },

    setGlow(k) {
      for (const lamp of glowing) lamp.material.emissiveIntensity = lamp.full * k;
    },

    update(dt, eye, k, cull) {
      const distance = eye.distanceTo(object.position);
      const limit = hasLod2 ? cull : Math.min(cull, d2 * k);
      const level = object.visible ? selectLod(actor.level, distance, d1 * k, d2 * k, limit + model.radius, model.levels) : CULLED;
      if (level !== actor.level) {
        actor.level = level;
        for (let i = 0; i < 3; i++) if (lods[i]) lods[i]!.visible = i === level;
      }
      // (an actor nobody sees keeps its place in its clip, but its bones are not worked out)
      if (mixer && level !== CULLED) mixer.update(dt);
      else if (mixer && current) current.time = (current.time + dt * current.timeScale) % Math.max(0.001, current.getClip().duration);
    },

    dispose() {
      alive--;
      mixer?.stopAllAction();
      mixer?.uncacheRoot(inner as unknown as THREE.Object3D);
      object.removeFromParent();
      for (const material of own.values()) material.dispose();
      inner.traverse((node) => {
        const skinned = node as unknown as THREE.SkinnedMesh;
        if (skinned.isSkinnedMesh) skinned.skeleton.dispose();
      });
    },
  };
  return actor;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Static batching for the Digital Twin: many small meshes that never move are drawn as a few.
 *
 * WHY. The site model is built from thousands of small parts (a railing post, a desk leg, a
 * pipe bracket), each its own mesh and so its own draw call: about 5,700 a frame from the
 * overview. On an integrated graphics card that count, not the triangles or the lamps, is what
 * sets the frame rate (measured with scripts/bench-twin.mjs: halving the meshes took a frame
 * from 150 ms to 102 ms; switching every lamp off barely moved it).
 *
 * WHAT. Meshes that share ONE material object and have not moved for three seconds are
 * copied, in world space, into one merged mesh per material, and the originals are moved to a
 * render layer the camera does not draw. The merged mesh uses the very same material object,
 * so anything the scene does to that material (time of day, storm, X-ray) shows on it exactly
 * as before. Only small opaque meshes are taken (see `eligible`); animated characters,
 * instanced forests, glass and anything with its own shader are left alone.
 *
 * NOTHING ELSE CHANGES. The originals stay in the scene graph with their geometry, so pointer
 * events and ray casts hit them as before (the hidden layer is switched on for the ray casters:
 * see STATIC_BATCH_LAYER; the merged meshes ignore rays). Every frame each batched original is
 * checked: if it has moved, been hidden, been removed, or had its material or geometry
 * replaced, it is handed back to normal drawing on that frame and its batch is rebuilt without
 * it. A mesh that keeps changing is left out for good.
 *
 * `?batch=off` in the address turns this off; `window.__TWIN_BATCH__` reports what it is doing
 * and `window.__TWIN_BATCH__.setEnabled(false)` switches it at run time, for comparing.
 */

/** The render layer batched originals are parked on (the camera draws layer 0 only). Ray casters that must still hit them enable it. */
export const STATIC_BATCH_LAYER = 31;
const HIDDEN_MASK = (1 << STATIC_BATCH_LAYER) >>> 0;

const SCAN_MS = 500; // time between looks for new static meshes
const STILL_SCANS = 6; // a mesh must be unchanged for this many looks in a row (about 3 s)
const COOLDOWN_SCANS = 10; // after being handed back, it waits this many looks before it can be taken again
const MAX_HANDBACKS = 2; // handed back for moving this often (a worker who pauses, a door), it is left alone for good
const MAX_MESH_VERTICES = 3000;
const MAX_BATCH_VERTICES = 65_000; // (keeps every batch on 16-bit indices)
const MIN_BATCH = 2;
const OK_MATERIALS = new Set(["MeshStandardMaterial", "MeshPhysicalMaterial", "MeshBasicMaterial", "MeshLambertMaterial", "MeshPhongMaterial"]);
const ATTRS = ["normal", "uv", "uv1", "color", "tangent"] as const;

interface Track {
  mesh: THREE.Mesh;
  /** world matrix at the last look (while a candidate) or when it was merged (while batched) */
  world: Float64Array;
  still: number;
  cooldown: number;
  handbacks: number;
  batch: Batch | null;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  positionVersion: number;
  /** where this member's triangles sit in its batch's index (start, count) */
  indexStart: number;
  indexCount: number;
}
interface Batch {
  key: string;
  material: THREE.Material;
  members: Track[];
  mesh: THREE.Mesh | null;
  dirty: boolean;
  /** vertices of all members together */
  vertices: number;
  /** vertices still in the merged buffer that belong to members since handed back */
  holes: number;
}

const interleaved = (a: unknown): boolean => !!(a as { isInterleavedBufferAttribute?: boolean } | undefined)?.isInterleavedBufferAttribute;

/** Why a mesh is not taken (null: it can be) */
function ineligible(mesh: THREE.Mesh): string | null {
  const m = mesh.material as THREE.Material | THREE.Material[];
  const g = mesh.geometry;
  if ((mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return "skinned";
  if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || (mesh as unknown as { isBatchedMesh?: boolean }).isBatchedMesh) return "instanced";
  if (mesh.userData.__staticBatch) return "is a batch";
  if (Array.isArray(m)) return "several materials";
  if (!m || !OK_MATERIALS.has(m.type)) return "own shader";
  if (m.transparent || !m.visible || !m.colorWrite || m.depthTest === false) return "transparent";
  if (Object.prototype.hasOwnProperty.call(m, "onBeforeCompile")) return "shader hook";
  if (!g || !g.attributes.position || (g.morphAttributes && Object.keys(g.morphAttributes).length > 0)) return "morph";
  if (g.attributes.position.count > MAX_MESH_VERTICES || g.attributes.position.count === 0) return "large";
  if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return "draw range";
  for (const name of ["position", ...ATTRS]) if (interleaved(g.attributes[name])) return "interleaved";
  if (mesh.renderOrder !== 0 || !mesh.frustumCulled) return "render order";
  if (Object.prototype.hasOwnProperty.call(mesh, "onBeforeRender") || Object.prototype.hasOwnProperty.call(mesh, "onAfterRender")) return "render hook";
  if (mesh.layers.mask !== 1) return "layers";
  return null;
}

/** Drawn at all, and still in the scene: every ancestor visible, the chain reaching the scene */
function shown(mesh: THREE.Object3D, scene: THREE.Scene): boolean {
  let o: THREE.Object3D | null = mesh;
  while (o) {
    if (!o.visible) return false;
    if (o === scene) return true;
    o = o.parent;
  }
  return false;
}

function layoutKey(g: THREE.BufferGeometry): string {
  let k = g.index ? "i" : "n";
  for (const name of ATTRS) {
    const a = g.attributes[name] as THREE.BufferAttribute | undefined;
    k += a && !interleaved(a) ? `${name}${a.itemSize}${a.normalized ? "n" : ""}` : "-";
  }
  return k;
}

const _v = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _n = new THREE.Matrix3();

/** One geometry holding every member's geometry, moved into world space */
function merge(members: Track[]): THREE.BufferGeometry {
  let vertices = 0;
  let indices = 0;
  for (const t of members) {
    const g = t.geometry;
    vertices += g.attributes.position.count;
    indices += g.index ? g.index.count : g.attributes.position.count;
  }
  const first = members[0].geometry;
  const out = new THREE.BufferGeometry();
  const position = new Float32Array(vertices * 3);
  const extra: Partial<Record<(typeof ATTRS)[number], { array: Float32Array; size: number; normalized: boolean }>> = {};
  for (const name of ATTRS) {
    const a = first.attributes[name] as THREE.BufferAttribute | undefined;
    if (a) extra[name] = { array: new Float32Array(vertices * a.itemSize), size: a.itemSize, normalized: false };
  }
  const index = new Uint16Array(indices);
  let v0 = 0;
  let i0 = 0;
  for (const t of members) {
    const g = t.geometry;
    const world = t.mesh.matrixWorld;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    for (let i = 0; i < count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(world);
      position[(v0 + i) * 3] = _v.x;
      position[(v0 + i) * 3 + 1] = _v.y;
      position[(v0 + i) * 3 + 2] = _v.z;
    }
    _n.getNormalMatrix(world);
    for (const name of ATTRS) {
      const dst = extra[name];
      if (!dst) continue;
      const src = g.attributes[name] as THREE.BufferAttribute;
      const size = dst.size;
      if (name === "normal") {
        for (let i = 0; i < count; i++) {
          _v.fromBufferAttribute(src, i).applyMatrix3(_n).normalize();
          dst.array[(v0 + i) * 3] = _v.x;
          dst.array[(v0 + i) * 3 + 1] = _v.y;
          dst.array[(v0 + i) * 3 + 2] = _v.z;
        }
      } else if (name === "tangent") {
        for (let i = 0; i < count; i++) {
          _v.fromBufferAttribute(src, i).transformDirection(world);
          dst.array[(v0 + i) * 4] = _v.x;
          dst.array[(v0 + i) * 4 + 1] = _v.y;
          dst.array[(v0 + i) * 4 + 2] = _v.z;
          dst.array[(v0 + i) * 4 + 3] = src.getW(i);
        }
      } else {
        // (getComponent reads through normalisation, so byte colours arrive as 0..1)
        for (let i = 0; i < count; i++) for (let c = 0; c < size; c++) dst.array[(v0 + i) * size + c] = src.getComponent(i, c);
      }
    }
    t.indexStart = i0;
    if (g.index) {
      const src = g.index;
      for (let i = 0; i < src.count; i++) index[i0 + i] = src.getX(i) + v0;
      i0 += src.count;
    } else {
      for (let i = 0; i < count; i++) index[i0 + i] = v0 + i;
      i0 += count;
    }
    t.indexCount = i0 - t.indexStart;
    v0 += count;
  }
  out.setAttribute("position", new THREE.BufferAttribute(position, 3));
  for (const name of ATTRS) {
    const e = extra[name];
    if (e) out.setAttribute(name, new THREE.BufferAttribute(e.array, e.size));
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

export interface BatchReport {
  enabled: boolean;
  batches: number;
  batched: number;
  drawCallsSaved: number;
  handedBack: number;
  rebuilds: number;
  /** members taken out of a batch by blanking their triangles, without a rebuild */
  blanked: number;
  setEnabled: (on: boolean) => void;
  /** For tests: what a ray from the camera through a point on screen (-1..1) hits first, as the app's own ray casts see it */
  pick: (x: number, y: number) => string | null;
}

/** The batching itself, kept out of React: one instance per mounted scene */
class BatchEngine {
  private tracks = new Map<THREE.Mesh, Track>();
  private batches = new Map<string, Batch[]>();
  private lastScan = 0;
  private scene: THREE.Scene | null = null;
  readonly report: BatchReport = {
    enabled: true,
    batches: 0,
    batched: 0,
    drawCallsSaved: 0,
    handedBack: 0,
    rebuilds: 0,
    blanked: 0,
    setEnabled: (on: boolean) => {
      this.report.enabled = on;
      if (!on && this.scene) this.release(this.scene);
    },
    pick: (x: number, y: number) => {
      if (!this.scene || !this.camera) return null;
      _ray.layers.set(0);
      _ray.layers.enable(STATIC_BATCH_LAYER);
      _ray.setFromCamera(_ndc.set(x, y), this.camera);
      const hit = _ray.intersectObjects(this.scene.children, true)[0];
      return hit ? `${hit.object.uuid}@${hit.distance.toFixed(3)}` : null;
    },
  };
  private camera: THREE.Camera | null = null;

  /** Hand every original back to normal drawing and drop the merged meshes */
  release(scene: THREE.Scene) {
    for (const t of this.tracks.values()) if (t.batch) t.mesh.layers.mask = 1;
    for (const list of this.batches.values())
      for (const b of list)
        if (b.mesh) {
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
        }
    this.tracks.clear();
    this.batches.clear();
    this.report.batches = this.report.batched = this.report.drawCallsSaved = 0;
  }

  step(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    if (!this.report.enabled) return;
    const now = performance.now();

    // 1. every frame: is each batched original still exactly where and what it was?
    let changed = false;
    const blankedBefore = this.report.blanked;
    for (const t of this.tracks.values()) {
      const b = t.batch;
      if (!b) continue;
      const mesh = t.mesh;
      const e = mesh.matrixWorld.elements;
      const w = t.world;
      const still =
        e[12] === w[12] && e[13] === w[13] && e[14] === w[14] && e[0] === w[0] && e[1] === w[1] && e[2] === w[2] && e[4] === w[4] && e[5] === w[5] && e[6] === w[6] && e[8] === w[8] && e[9] === w[9] && e[10] === w[10];
      const same =
        still && mesh.material === t.material && mesh.geometry === t.geometry && mesh.layers.mask === HIDDEN_MASK && !t.material.transparent && t.material.visible &&
        (t.geometry.attributes.position as THREE.BufferAttribute).version === t.positionVersion && shown(mesh, scene);
      if (!same) {
        // hand it back to normal drawing, and take it out of its batch
        if (mesh.layers.mask === HIDDEN_MASK) mesh.layers.mask = 1;
        b.members.splice(b.members.indexOf(t), 1);
        const index = b.mesh?.geometry.index;
        if (index && !b.dirty && b.members.length >= MIN_BATCH) {
          // its triangles collapse to nothing; the room is reclaimed the next time the batch is rebuilt
          (index.array as Uint16Array).fill(0, t.indexStart, t.indexStart + t.indexCount);
          index.needsUpdate = true;
          b.holes += t.geometry.attributes.position.count;
          this.report.blanked++;
        } else {
          b.dirty = true;
        }
        b.vertices -= t.geometry.attributes.position.count;
        t.batch = null;
        t.still = 0;
        t.cooldown = COOLDOWN_SCANS;
        // (only moving counts against it: being hidden or re-dressed, as X-ray does, is not a habit)
        if (!still) t.handbacks++;
        this.report.handedBack++;
        changed = true;
      }
    }

    const blanked = this.report.blanked !== blankedBefore;

    // 2. every half second: look for meshes that have been still long enough to take
    const pending: Track[] = [];
    if (now - this.lastScan >= SCAN_MS) {
      this.lastScan = now;
      const seen = new Set<THREE.Mesh>();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        seen.add(mesh);
        const t = this.tracks.get(mesh);
        if (t?.batch) return;
        if (!t) {
          if (ineligible(mesh)) return;
          const fresh: Track = { mesh, world: new Float64Array(16), still: 0, cooldown: 0, handbacks: 0, batch: null, material: mesh.material as THREE.Material, geometry: mesh.geometry, positionVersion: 0, indexStart: 0, indexCount: 0 };
          fresh.world.set(mesh.matrixWorld.elements);
          this.tracks.set(mesh, fresh);
          return;
        }
        if (t.handbacks >= MAX_HANDBACKS) return;
        const e = mesh.matrixWorld.elements;
        if (t.cooldown > 0) {
          t.cooldown--;
          t.world.set(e);
          return;
        }
        let same = mesh.material === t.material && mesh.geometry === t.geometry;
        for (let i = 0; same && i < 16; i++) if (e[i] !== t.world[i]) same = false;
        if (!same || ineligible(mesh) || !shown(mesh, scene) || mesh.matrixWorld.determinant() <= 0) {
          t.still = 0;
          t.material = mesh.material as THREE.Material;
          t.geometry = mesh.geometry;
          t.world.set(e);
          return;
        }
        if (++t.still >= STILL_SCANS) pending.push(t);
      });
      // forget meshes that have left the scene
      for (const [mesh, t] of this.tracks) if (!seen.has(mesh) && !t.batch) this.tracks.delete(mesh);
    }

    // 3. put newcomers into batches (one material object and one vertex layout per batch). A mesh
    // with nothing to share a draw call with simply stays as it is, and is looked at again later.
    if (pending.length) {
      const groups = new Map<string, Track[]>();
      for (const t of pending) {
        const key = `${t.material.uuid}|${layoutKey(t.geometry)}`;
        const g = groups.get(key);
        if (g) g.push(t);
        else groups.set(key, [t]);
      }
      for (const [key, group] of groups) {
        let list = this.batches.get(key);
        for (let i = 0; i < group.length; i++) {
          const t = group[i];
          const need = t.geometry.attributes.position.count;
          let b = list?.find((x) => x.vertices + need <= MAX_BATCH_VERTICES);
          if (!b) {
            // a new batch needs at least two to be worth it
            if (group.length - i < MIN_BATCH) break;
            b = { key, material: t.material, members: [], mesh: null, dirty: false, vertices: 0, holes: 0 };
            if (!list) this.batches.set(key, (list = []));
            list.push(b);
          }
          b.members.push(t);
          b.vertices += need;
          b.dirty = true;
          t.batch = b;
          t.world.set(t.mesh.matrixWorld.elements);
          t.positionVersion = (t.geometry.attributes.position as THREE.BufferAttribute).version;
          changed = true;
        }
      }
    }

    // 4. rebuild what changed, on this same frame, so no frame is drawn from a stale batch
    if (!changed && !blanked) return;
    let batches = 0;
    let batched = 0;
    for (const [key, list] of this.batches) {
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if (b.dirty) {
          b.dirty = false;
          b.holes = 0;
          this.report.rebuilds++;
          if (b.mesh) {
            scene.remove(b.mesh);
            b.mesh.geometry.dispose();
            b.mesh = null;
          }
          if (b.members.length < MIN_BATCH) {
            // not worth a batch: the one that is left draws itself again
            for (const t of b.members) {
              t.mesh.layers.mask = 1;
              t.batch = null;
              t.still = 0;
            }
            list.splice(i, 1);
            continue;
          }
          const mesh = new THREE.Mesh(merge(b.members), b.material);
          mesh.name = "static-batch";
          mesh.userData.__staticBatch = true;
          mesh.matrixAutoUpdate = false;
          mesh.raycast = () => {}; // rays go to the originals, as they always did
          scene.add(mesh);
          b.mesh = mesh;
          for (const t of b.members) t.mesh.layers.mask = HIDDEN_MASK;
        }
        batches++;
        batched += b.members.length;
      }
      if (!list.length) this.batches.delete(key);
    }
    this.report.batches = batches;
    this.report.batched = batched;
    this.report.drawCallsSaved = batched - batches;
  }
}

export function StaticBatcher() {
  const scene = useThree((s) => s.scene);
  const raycaster = useThree((s) => s.raycaster);
  // (read once, before the first frame)
  const [off] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("batch") === "off");
  const engine = useRef<BatchEngine | null>(null);

  // pointer events must still reach the parked originals
  useEffect(() => {
    if (off) return;
    raycaster.layers.enable(STATIC_BATCH_LAYER);
    return () => raycaster.layers.disable(STATIC_BATCH_LAYER);
  }, [raycaster, off]);

  useEffect(() => {
    if (off) return;
    const e = new BatchEngine();
    engine.current = e;
    (window as unknown as { __TWIN_BATCH__?: BatchReport }).__TWIN_BATCH__ = e.report;
    return () => {
      e.release(scene);
      engine.current = null;
      delete (window as unknown as { __TWIN_BATCH__?: BatchReport }).__TWIN_BATCH__;
    };
  }, [scene, off]);

  // after every animation callback (priority 0), before the frame is drawn (the composer, priority 1)
  useFrame((state) => engine.current?.step(scene, state.camera), 0.5);

  return null;
}

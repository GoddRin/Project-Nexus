/**
 * Turns the placements of one asset into instanced draws: one per LOD part, however many copies
 * are placed. Each frame every copy picks its level by distance (engine/lod.ts) and copies outside
 * the view are left out, so a yard of 500 drums costs at most three draw calls and only the
 * triangles of the levels actually in sight.
 *
 * A draw is a plain mesh over an instanced geometry: the asset's vertex data plus four
 * per-copy attributes holding each copy's matrix (see `instancedMaterial` in engine/assets.ts for
 * why three's InstancedMesh is not used).
 */
import * as THREE from "three/webgpu";
import type { Placement } from "../data/types";
import { INSTANCE_COLUMNS, type LoadedAsset } from "./assets";
import { CULLED, selectLod } from "./lod";

export type InstanceDraw = { mesh: THREE.Mesh; level: number };

export type InstanceSet = {
  assetId: string;
  count: number;
  /** One instanced draw per LOD part. The owner adds them to the scene (streaming does it in slices). */
  draws: InstanceDraw[];
  /**
   * Choose levels for this view and fill the instance buffers.
   * @param k     engine/lod.ts `lodScale` for the view
   * @param cull  metres beyond which nothing is drawn (the tier's draw distance)
   * @param shadowReach  metres within which a shadow caster is kept even when it is out of view,
   *                     so a tree behind the camera still shades the road in front of it
   */
  update: (camera: THREE.Camera, frustum: THREE.Frustum, k: number, cull: number, shadowReach: number) => void;
  /** Copies drawn at each level after the last update, and how many were left out. */
  tally: () => { lod: [number, number, number]; hidden: number };
  dispose: () => void;
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const sphere = new THREE.Sphere();

/**
 * An attribute of this draw's own over the asset's vertex data. The numbers are shared in memory,
 * not copied, but the attribute object is new: three.js frees the GPU buffer of every attribute of
 * a geometry when that geometry is disposed, so two draws holding the same attribute object would
 * destroy each other's buffers (seen as "buffer used in submit while destroyed" when a zone
 * unloaded while its shell, or another zone, still drew the same asset).
 */
function ownAttribute<T extends THREE.BufferAttribute | THREE.InterleavedBufferAttribute>(attribute: T): T {
  const plain = attribute as THREE.BufferAttribute;
  if ((attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return attribute.clone() as T;
  const own = new THREE.BufferAttribute(plain.array, plain.itemSize, plain.normalized);
  own.gpuType = plain.gpuType;
  return own as T;
}

/** Show `count` copies of a draw (none: the draw is skipped altogether). */
export function setDrawCount(mesh: THREE.Mesh, count: number) {
  (mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = count;
  mesh.visible = count > 0;
}

export function createInstanceSet(asset: LoadedAsset, placements: Placement[]): InstanceSet {
  const n = placements.length;
  const centres = new Float32Array(n * 3);
  const radii = new Float32Array(n);
  const scales = new Float32Array(n);
  /** Level by distance alone (what hysteresis remembers) and the level actually drawn. */
  const chosen = new Int8Array(n);
  const drawn = new Int8Array(n).fill(-2);

  // placement matrix times each part's own matrix, worked out once
  const world = new Float32Array(n * 16);
  for (let i = 0; i < n; i++) {
    const place = placements[i];
    m.compose(p.fromArray(place.p), q.setFromEuler(e.set(place.r[0], place.r[1], place.r[2], "XYZ")), s.setScalar(place.s));
    m.toArray(world, i * 16);
    p.copy(asset.centre).applyMatrix4(m).toArray(centres, i * 3);
    radii[i] = asset.radius * place.s;
    scales[i] = place.s;
  }

  type Bucket = InstanceDraw & { baked: Float32Array; buffer: THREE.InstancedInterleavedBuffer };
  const buckets: Bucket[] = [];
  const byLevel: Bucket[][] = [[], [], []];

  asset.lods.forEach((parts, level) => {
    for (const part of parts ?? []) {
      const baked = new Float32Array(n * 16);
      for (let i = 0; i < n; i++) {
        m.fromArray(world, i * 16).multiply(part.matrix).toArray(baked, i * 16);
      }
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.index = part.geometry.index ? ownAttribute(part.geometry.index) : null;
      for (const name of Object.keys(part.geometry.attributes)) geometry.setAttribute(name, ownAttribute(part.geometry.attributes[name]));
      const buffer = new THREE.InstancedInterleavedBuffer(new Float32Array(n * 16), 16, 1);
      buffer.setUsage(THREE.DynamicDrawUsage);
      INSTANCE_COLUMNS.forEach((name, column) => geometry.setAttribute(name, new THREE.InterleavedBufferAttribute(buffer, 4, column * 4)));
      geometry.instanceCount = 0;

      const mesh = new THREE.Mesh(geometry, part.instanced);
      mesh.name = `${asset.entry.id}:LOD${level}`;
      mesh.visible = false;
      // copies are culled one by one below, and a draw with none in view is switched off
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.receiveShadow = true;
      mesh.castShadow = asset.castsShadow && !part.instanced.transparent;
      const bucket = { mesh, level, baked, buffer };
      buckets.push(bucket);
      byLevel[level].push(bucket);
    }
  });

  const [d1, d2] = asset.entry.lodDistances;
  const hasLod2 = (asset.levels & 4) !== 0;
  const counts: [number, number, number] = [0, 0, 0];
  let hidden = n;

  return {
    assetId: asset.entry.id,
    count: n,
    draws: buckets,

    update(camera, frustum, k, cull, shadowReach) {
      const keepNear = asset.castsShadow ? shadowReach : 0;
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      const lod1 = d1 * k;
      const lod2 = d2 * k;
      // an asset with no LOD2 is culled where LOD2 would begin, or at the draw distance if that is nearer
      const limit = hasLod2 ? cull : Math.min(cull, lod2);
      let changed = false;
      for (let i = 0; i < n; i++) {
        const x = centres[i * 3];
        const y = centres[i * 3 + 1];
        const z = centres[i * 3 + 2];
        const distance = Math.hypot(x - cx, y - cy, z - cz) / scales[i];
        let level = selectLod(chosen[i], distance, lod1, lod2, limit, asset.levels);
        chosen[i] = level;
        if (level !== CULLED) {
          sphere.center.set(x, y, z);
          sphere.radius = radii[i];
          if (!frustum.intersectsSphere(sphere) && distance * scales[i] - radii[i] > keepNear) level = CULLED;
        }
        if (level !== drawn[i]) {
          drawn[i] = level;
          changed = true;
        }
      }
      if (!changed) return;

      counts[0] = counts[1] = counts[2] = 0;
      for (let i = 0; i < n; i++) {
        const level = drawn[i];
        if (level === CULLED) continue;
        const slot = counts[level]++;
        const list = byLevel[level];
        for (let b = 0; b < list.length; b++) {
          const from = list[b].baked;
          const to = list[b].buffer.array as Float32Array;
          const src = i * 16;
          const dst = slot * 16;
          for (let c = 0; c < 16; c++) to[dst + c] = from[src + c];
        }
      }
      hidden = n - counts[0] - counts[1] - counts[2];
      for (const bucket of buckets) {
        const count = counts[bucket.level];
        setDrawCount(bucket.mesh, count);
        if (count > 0) bucket.buffer.needsUpdate = true;
      }
    },

    tally: () => ({ lod: [counts[0], counts[1], counts[2]], hidden }),

    dispose() {
      for (const bucket of buckets) {
        bucket.mesh.removeFromParent();
        // (frees this draw's GPU buffers; the vertex data itself and the material belong to the asset)
        bucket.mesh.geometry.dispose();
      }
    },
  };
}

/**
 * Turns the placements of one asset into instanced draws: one per LOD part, however many copies
 * are placed. Each frame every copy picks its level by distance (engine/lod.ts) and copies outside
 * the view are left out, so a yard of 500 drums costs at most three draw calls and only the
 * triangles of the levels actually in sight.
 */
import * as THREE from "three/webgpu";
import type { Placement } from "../data/types";
import type { LoadedAsset } from "./assets";
import { CULLED, selectLod } from "./lod";

export type InstanceDraw = { mesh: THREE.InstancedMesh; level: number };

export type InstanceSet = {
  assetId: string;
  count: number;
  /** One instanced mesh per LOD part. The owner adds them to the scene (streaming does it in slices). */
  draws: InstanceDraw[];
  /**
   * Choose levels for this view and fill the instance buffers.
   * @param k     engine/lod.ts `lodScale` for the view
   * @param cull  metres beyond which nothing is drawn (the tier's draw distance)
   */
  update: (camera: THREE.Camera, frustum: THREE.Frustum, k: number, cull: number) => void;
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

  type Bucket = InstanceDraw & { baked: Float32Array };
  const buckets: Bucket[] = [];
  const byLevel: Bucket[][] = [[], [], []];
  const all = new THREE.Box3();
  for (let i = 0; i < n; i++) all.expandByPoint(p.fromArray(centres, i * 3));
  const bounds = all.getBoundingSphere(new THREE.Sphere());
  bounds.radius += asset.radius * 1.1;

  asset.lods.forEach((parts, level) => {
    for (const part of parts ?? []) {
      const baked = new Float32Array(n * 16);
      for (let i = 0; i < n; i++) {
        m.fromArray(world, i * 16).multiply(part.matrix).toArray(baked, i * 16);
      }
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, n);
      mesh.name = `${asset.entry.id}:LOD${level}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.visible = false;
      // copies are culled one by one below; the mesh as a whole is tested against all of them
      mesh.boundingSphere = bounds;
      mesh.matrixAutoUpdate = false;
      const bucket = { mesh, level, baked };
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

    update(camera, frustum, k, cull) {
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
          if (!frustum.intersectsSphere(sphere)) level = CULLED;
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
          const to = list[b].mesh.instanceMatrix.array as Float32Array;
          const src = i * 16;
          const dst = slot * 16;
          for (let c = 0; c < 16; c++) to[dst + c] = from[src + c];
        }
      }
      hidden = n - counts[0] - counts[1] - counts[2];
      for (const bucket of buckets) {
        const count = counts[bucket.level];
        bucket.mesh.count = count;
        bucket.mesh.visible = count > 0;
        if (count > 0) bucket.mesh.instanceMatrix.needsUpdate = true;
      }
    },

    tally: () => ({ lod: [counts[0], counts[1], counts[2]], hidden }),

    dispose() {
      for (const bucket of buckets) {
        bucket.mesh.removeFromParent();
        // (the geometry and material belong to the asset; this frees the instance buffer only)
        bucket.mesh.dispose();
      }
    },
  };
}

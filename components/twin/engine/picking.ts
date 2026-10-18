/**
 * Picking: what is under a screen point. Meshes register here with a bounding-volume hierarchy
 * (three-mesh-bvh), so a ray costs microseconds whatever the triangle count.
 * Also holds the ground-height function the camera uses to stay above the terrain.
 */
import * as THREE from "three/webgpu";
import { CENTER, MeshBVH, acceleratedRaycast } from "three-mesh-bvh";

const pickables: THREE.Object3D[] = [];
const raycaster = new THREE.Raycaster();
(raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
const ndc = new THREE.Vector2();

/** Make `mesh` pickable. Returns the function that removes it and frees its hierarchy. */
export function addPickable(mesh: THREE.Mesh, quick = false): () => void {
  // (cast: drei carries its own copy of three-mesh-bvh, whose typings also claim `boundsTree`)
  const geometry = mesh.geometry as unknown as { boundsTree?: MeshBVH };
  // `quick`: split at the middle and stop at larger leaves, which builds several times faster for a
  // mesh registered while the user is looking (a streamed ground patch); rays are a little slower
  if (!geometry.boundsTree) geometry.boundsTree = new MeshBVH(mesh.geometry, quick ? { strategy: CENTER, maxLeafSize: 32 } : undefined);
  mesh.raycast = acceleratedRaycast;
  pickables.push(mesh);
  return () => {
    const i = pickables.indexOf(mesh);
    if (i >= 0) pickables.splice(i, 1);
    geometry.boundsTree = undefined;
  };
}

/**
 * Surfaces drawn on the graphics card from data (the terrain, P03a), which rays cannot test as
 * meshes: each answers a ray with the distance to its first hit, or null.
 */
type Surface = (ray: THREE.Ray) => { distance: number; object: THREE.Object3D } | null;
const surfaces: Surface[] = [];
export function addPickSurface(fn: Surface): () => void {
  surfaces.push(fn);
  return () => {
    const i = surfaces.indexOf(fn);
    if (i >= 0) surfaces.splice(i, 1);
  };
}

/** The nearest surface under a point of the canvas, given in client pixels. */
export function pickAt(clientX: number, clientY: number, dom: HTMLElement, camera: THREE.Camera): THREE.Intersection | null {
  const rect = dom.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  let best: THREE.Intersection | null = hits.length > 0 ? hits[0] : null;
  for (const surface of surfaces) {
    const hit = surface(raycaster.ray);
    if (hit && (!best || hit.distance < best.distance))
      best = { distance: hit.distance, point: raycaster.ray.at(hit.distance, new THREE.Vector3()), object: hit.object } as THREE.Intersection;
  }
  return best;
}

type GroundFn = (x: number, z: number) => number;
const FLAT: GroundFn = () => 0;
let ground: GroundFn = FLAT;

/**
 * Set the ground-height function for the loaded location. Returns the function that puts flat
 * ground back, which does nothing if someone else has set the ground since.
 */
export function setGround(fn: GroundFn): () => void {
  ground = fn;
  return () => {
    if (ground === fn) ground = FLAT;
  };
}

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
const overrides: { rect: Rect; fn: GroundFn }[] = [];

/**
 * A finer piece of ground laid over the location's own (a detailed patch): inside `rect` its height
 * is used instead. Returns the function that takes it away.
 */
export function addGroundOverride(rect: Rect, fn: GroundFn): () => void {
  const entry = { rect, fn };
  overrides.push(entry);
  return () => {
    const i = overrides.indexOf(entry);
    if (i >= 0) overrides.splice(i, 1);
  };
}

/** Ground height in metres (local Y) at a local position. */
export function groundY(x: number, z: number): number {
  for (let i = overrides.length - 1; i >= 0; i--) {
    const r = overrides[i].rect;
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return overrides[i].fn(x, z);
  }
  return ground(x, z);
}

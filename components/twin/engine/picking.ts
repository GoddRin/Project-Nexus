/**
 * Picking: what is under a screen point. Meshes register here with a bounding-volume hierarchy
 * (three-mesh-bvh), so a ray costs microseconds whatever the triangle count.
 * Also holds the ground-height function the camera uses to stay above the terrain.
 */
import * as THREE from "three/webgpu";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";

const pickables: THREE.Object3D[] = [];
const raycaster = new THREE.Raycaster();
(raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
const ndc = new THREE.Vector2();

/** Make `mesh` pickable. Returns the function that removes it and frees its hierarchy. */
export function addPickable(mesh: THREE.Mesh): () => void {
  // (cast: drei carries its own copy of three-mesh-bvh, whose typings also claim `boundsTree`)
  const geometry = mesh.geometry as unknown as { boundsTree?: MeshBVH };
  if (!geometry.boundsTree) geometry.boundsTree = new MeshBVH(mesh.geometry);
  mesh.raycast = acceleratedRaycast;
  pickables.push(mesh);
  return () => {
    const i = pickables.indexOf(mesh);
    if (i >= 0) pickables.splice(i, 1);
    geometry.boundsTree = undefined;
  };
}

/** The nearest surface under a point of the canvas, given in client pixels. */
export function pickAt(clientX: number, clientY: number, dom: HTMLElement, camera: THREE.Camera): THREE.Intersection | null {
  const rect = dom.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  return hits.length > 0 ? hits[0] : null;
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

/** Ground height in metres (local Y) at a local position. */
export function groundY(x: number, z: number): number {
  return ground(x, z);
}

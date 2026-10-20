/**
 * The blended ground: four layers (compacted laterite road, mud, grass, leaf litter) mixed by a
 * painted mask and by each layer's own height, so gravel sits proud of mud and grass grows out of
 * the low spots; and wetness, which darkens the ground, gives it a sheen and fills the puddles the
 * mask marks.
 *
 * Textures are built by scripts/twin/build-ground-textures.mjs (data/ground.json lists them); the
 * mask of a patch is painted by scripts/blender/twin/gate_ground.py and read by position on the
 * ground. The layers are laid out in world metres, so they run unbroken across patches.
 *
 * Also here: the patch's part in picking and in keeping the camera above the ground, which the
 * instanced draw it is rendered with cannot do.
 */
import * as THREE from "three/webgpu";
import { float, mix, normalWorld, positionWorld, smoothstep, texture, transformNormalToView, vec2, vec3, vec4 } from "three/tsl";
import groundFile from "../data/ground.json";
import type { Placement } from "../data/types";
import { addGroundOverride, addPickable } from "../engine/picking";
import { air } from "./air";

type Layer = { id: string; sizeM: number; cr: string; nh: string };
const LAYERS = groundFile.layers as Layer[];
const PATCHES = groundFile.patches as unknown as Record<string, { mask: string; min: [number, number]; size: number }>;

/** How much each layer darkens when wet (bare earth a lot, grass hardly), in the order of data/ground.json. */
const POROSITY: Record<string, number> = { road: 0.85, mud: 1, grass: 0.35, litter: 0.75 };
/** Colour correction per layer: the grass source is a dry lawn, the site's is lush. */
const TINT: Record<string, [number, number, number]> = { road: [1.06, 0.98, 0.92], mud: [1, 0.97, 0.92], grass: [0.62, 1.0, 0.5], litter: [0.95, 0.9, 0.8] };

/**
 * Layers whose relief texture (normal, occlusion, height) is read. Grass and leaf litter go without:
 * they lie under the plants, their relief hardly shows, and every texture read for every pixel of
 * ground is paid for across most of the picture.
 */
const RELIEF: Record<string, boolean> = { road: true, mud: true, grass: false, litter: false };

export type GroundTextures = { load: (url: string) => Promise<THREE.Texture>; release: (url: string) => void };

/** The texture addresses a patch's material needs, for loading and for letting go. */
export function groundTextureUrls(patchId: string): string[] {
  const patch = PATCHES[patchId];
  if (!patch) throw new Error(`no ground patch '${patchId}' in data/ground.json`);
  return [...LAYERS.flatMap((l) => (RELIEF[l.id] ? [l.cr, l.nh] : [l.cr])), patch.mask];
}

/** The ground material of a patch. `textures` are in the order of `groundTextureUrls`. */
export function groundMaterial(patchId: string, textures: THREE.Texture[]): THREE.MeshStandardNodeMaterial {
  const patch = PATCHES[patchId];
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const maskTexture = textures[textures.length - 1];
  // which of `textures` belongs to which layer
  let next = 0;
  const slots = LAYERS.map((layer) => ({ cr: next++, nh: RELIEF[layer.id] ? next++ : -1 }));
  const reliefTextures = new Set(slots.map((slot) => textures[slot.nh]));
  textures.forEach((t) => {
    if (t === maskTexture) return;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Eight layer textures are read for every pixel of ground, and the ground is most of the picture:
    // on an integrated card sharpening them all at glancing angles (anisotropy 4) cost about 5 ms a
    // frame. The colour keeps a little; relief and height, which blur harmlessly, keep none.
    t.anisotropy = reliefTextures.has(t) ? 1 : 2;
  });
  maskTexture.wrapS = maskTexture.wrapT = THREE.ClampToEdgeWrapping;

  type F = THREE.Node<"float">;
  const at = positionWorld.xz;
  // (by position, not by the mesh's UVs: the mask is a map of the ground itself)
  const mask = texture(maskTexture, at.sub(vec2(patch.min[0], patch.min[1])).div(patch.size));
  const grass: F = mask.r.add(mask.g).add(mask.b).oneMinus().max(0);
  const amounts: Record<string, F> = { road: mask.r, mud: mask.g, litter: mask.b, grass };

  // each layer's share is its painted amount sharpened by its height, so the taller one wins a border
  const samples = LAYERS.map((layer, i) => {
    const where = at.div(layer.sizeM);
    const cr = texture(textures[slots[i].cr], where);
    // (no relief texture: flat, unoccluded, of middling height)
    const nh: THREE.Node<"vec4"> = slots[i].nh >= 0 ? texture(textures[slots[i].nh], where) : vec4(0.5, 0.5, 1, 0.5);
    const amount = amounts[layer.id];
    const share: F = amount.mul(nh.a.mul(0.85).add(0.15).pow(2.2)).add(amount.mul(0.02));
    return { layer, cr, nh, share };
  });
  let total: F = float(1e-4);
  for (const sample of samples) total = total.add(sample.share);

  let colour: THREE.Node<"vec3"> = vec3(0);
  let rough: F = float(0);
  let bump: THREE.Node<"vec2"> = vec2(0);
  let occlusion: F = float(0);
  let height: F = float(0);
  let porosity: F = float(0);
  for (const { layer, cr, nh, share } of samples) {
    const w: F = share.div(total);
    const tint = TINT[layer.id];
    colour = colour.add(cr.rgb.mul(vec3(tint[0], tint[1], tint[2])).mul(w));
    rough = rough.add(cr.a.mul(w));
    bump = bump.add(nh.rg.mul(2).sub(1).mul(w));
    occlusion = occlusion.add(nh.b.mul(w));
    height = height.add(nh.a.mul(w));
    porosity = porosity.add(w.mul(POROSITY[layer.id]));
  }

  // water stands where the mask allows it, in the low parts of the surface first
  const wet = air.wetness;
  const level = wet.mul(1.25).sub(0.2);
  const puddle: F = smoothstep(level.oneMinus(), level.oneMinus().add(0.18), mask.a.mul(height.mul(-0.4).add(1.15)));
  const damp = wet.mul(porosity);
  colour = colour.mul(mix(float(1), float(0.5), damp));
  colour = mix(colour, colour.mul(vec3(0.42, 0.38, 0.33)), puddle.mul(0.85));
  rough = mix(rough.mul(mix(float(1), float(0.86), wet)), float(0.035), puddle);

  // standing water lies flat: the layers' relief fades out under it
  const lean: THREE.Node<"vec2"> = mix(bump.mul(1.15), vec2(0, 0), puddle);
  // (the layers lie flat in world x and z, so their tangent frame is the world's own)
  const normal = normalWorld.add(vec3(lean.x, 0, lean.y)).normalize();

  material.colorNode = vec4(colour, 1);
  material.roughnessNode = rough.clamp(0.03, 1);
  material.normalNode = transformNormalToView(normal);
  material.aoNode = mix(occlusion, float(1), puddle);
  return material;
}

/**
 * Make a ground patch pickable and tell the camera how high it is. `geometry` is the patch's mesh
 * (a regular grid, in any vertex order), `matrix` its own matrix inside the asset.
 */
export function registerGroundPatch(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, place: Placement): () => void {
  const position = geometry.getAttribute("position");
  const world = new THREE.Matrix4().compose(new THREE.Vector3(...place.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(place.r[0], place.r[1], place.r[2], "XYZ")), new THREE.Vector3(place.s, place.s, place.s)).multiply(matrix);

  // heights on a grid, binned by position because mesh compression reorders the vertices
  const n = Math.round(Math.sqrt(position.count));
  const points = new Float32Array(position.count * 3);
  const v = new THREE.Vector3();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(world);
    v.toArray(points, i * 3);
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minZ = Math.min(minZ, v.z);
    maxZ = Math.max(maxZ, v.z);
  }
  const stepX = (maxX - minX) / (n - 1);
  const stepZ = (maxZ - minZ) / (n - 1);
  const grid = new Float32Array(n * n).fill(place.p[1]);
  for (let i = 0; i < position.count; i++) {
    const ix = Math.min(n - 1, Math.max(0, Math.round((points[i * 3] - minX) / stepX)));
    const iz = Math.min(n - 1, Math.max(0, Math.round((points[i * 3 + 2] - minZ) / stepZ)));
    grid[iz * n + ix] = points[i * 3 + 1];
  }
  const sampleY = (x: number, z: number) => {
    const fx = Math.min(n - 1.001, Math.max(0, (x - minX) / stepX));
    const fz = Math.min(n - 1.001, Math.max(0, (z - minZ) / stepZ));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const a = grid[iz * n + ix];
    const b = grid[iz * n + ix + 1];
    const c = grid[(iz + 1) * n + ix];
    const d = grid[(iz + 1) * n + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  };

  // an unseen copy for rays (the drawn copy is an instanced draw, which rays cannot test)
  const own = new THREE.BufferGeometry();
  own.setAttribute("position", new THREE.BufferAttribute(points, 3));
  if (geometry.index) own.setIndex(new THREE.BufferAttribute(geometry.index.array, 1));
  const mesh = new THREE.Mesh(own);
  mesh.visible = false;
  mesh.updateMatrixWorld();
  const removePickable = addPickable(mesh, true);
  const removeGround = addGroundOverride({ minX, maxX, minZ, maxZ }, sampleY);
  return () => {
    removePickable();
    removeGround();
    own.dispose();
  };
}
